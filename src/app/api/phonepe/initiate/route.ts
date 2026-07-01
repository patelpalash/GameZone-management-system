import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

import { getPhonePeToken } from "@/lib/phonepe";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify Firebase ID token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }
    const idToken = authHeader.split("Bearer ")[1];
    let verifiedUser;
    try {
      verifiedUser = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const {
      stationId,
      durationMinutes,
      isPrebook,
      scheduledStartTime,
      scheduledEndTime,
      userName,
      userPhone,
    } = body;

    // Input validation
    if (!stationId || typeof stationId !== "string") {
      return NextResponse.json({ success: false, error: "Invalid station ID." }, { status: 400 });
    }
    if (!durationMinutes || durationMinutes < 30 || durationMinutes > 480) {
      return NextResponse.json({ success: false, error: "Duration must be between 30 and 480 minutes." }, { status: 400 });
    }

    const clientId = process.env.PHONEPE_CLIENT_ID || "";
    const clientSecret = process.env.PHONEPE_CLIENT_SECRET || "";
    const baseUrl = process.env.PHONEPE_BASE_URL;

    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: "PhonePe configuration is missing." },
        { status: 500 }
      );
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "PhonePe V2 credentials are not configured on the server.",
        },
        { status: 500 }
      );
    }

    // Fetch station pricePerHour to perform secure server-side cost calculation
    const stationSnap = await adminDb.collection("stations").doc(stationId).get();
    if (!stationSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Station not found on the mainframe." },
        { status: 404 }
      );
    }
    const stationData = stationSnap.data()!;
    const pricePerHour = stationData.pricePerHour || 100;
    const serverCalculatedCost = Number(((pricePerHour / 60) * durationMinutes).toFixed(2));

    // Validate station availability and prevent overlaps
    if (isPrebook && scheduledStartTime && scheduledEndTime) {
      const reqStart = new Date(scheduledStartTime).getTime();
      const reqEnd = new Date(scheduledEndTime).getTime();

      const existingBookingsSnap = await adminDb.collection("bookings")
        .where("stationId", "==", stationId)
        .where("status", "in", ["confirmed", "active", "pending_payment"])
        .get();

      for (const doc of existingBookingsSnap.docs) {
        const b = doc.data();
        
        // Skip expired pending_payment bookings
        if (b.status === "pending_payment" && b.createdAt) {
           const createdAtMs = typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
           const ageInMs = Date.now() - createdAtMs;
           if (ageInMs > 15 * 60 * 1000) continue;
        }

        let bStart: number;
        let bEnd: number;

        if (b.scheduledStartTime && b.scheduledEndTime) {
          bStart = typeof b.scheduledStartTime.toDate === 'function' ? b.scheduledStartTime.toDate().getTime() : new Date(b.scheduledStartTime).getTime();
          bEnd = typeof b.scheduledEndTime.toDate === 'function' ? b.scheduledEndTime.toDate().getTime() : new Date(b.scheduledEndTime).getTime();
        } else if (b.startTime && b.endTime) {
          bStart = typeof b.startTime.toDate === 'function' ? b.startTime.toDate().getTime() : new Date(b.startTime).getTime();
          bEnd = typeof b.endTime.toDate === 'function' ? b.endTime.toDate().getTime() : new Date(b.endTime).getTime();
        } else {
          continue;
        }

        // Overlap logic: max(start1, start2) < min(end1, end2)
        if (Math.max(reqStart, bStart) < Math.min(reqEnd, bEnd)) {
          return NextResponse.json(
            { success: false, error: "Time slot is already occupied." },
            { status: 409 }
          );
        }
      }
    } else if (!isPrebook) {
      if (stationData.status === "occupied") {
        return NextResponse.json(
          { success: false, error: "Station is currently occupied." },
          { status: 409 }
        );
      }
    }

    const orderId = `ORD_${randomBytes(16).toString('hex')}`;

    // 1. Create a pending_payment booking in Firestore via Admin SDK
    const bookingRef = adminDb.collection("bookings").doc(orderId);
    await bookingRef.set({
      id: orderId,
      stationId,
      userId: verifiedUser.uid,
      userName: verifiedUser.name || userName || "Anonymous",
      userPhone: userPhone || "",
      durationMinutes,
      totalCost: serverCalculatedCost,
      status: "pending_payment",
      transactionId: "",
      startTime: null,
      endTime: null,
      isPrebook: !!isPrebook,
      scheduledStartTime: scheduledStartTime
        ? new Date(scheduledStartTime)
        : null,
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime) : null,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. Fetch Authorization Token
    const accessToken = await getPhonePeToken();

    // 3. Initiate payment via V2 checkout pay API
    const origin = new URL(request.url).origin;
    const amountInPaise = Math.round(serverCalculatedCost * 100);

    const payPayload = {
      merchantOrderId: orderId,
      amount: amountInPaise,
      paymentFlow: {
        type: "PG_CHECKOUT",
        merchantUrls: {
          redirectUrl: `${origin}/api/phonepe/callback?orderId=${orderId}`,
        },
      },
    };

    const payResponse = await fetch(`${baseUrl}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(payPayload),
    });

    const result = await payResponse.json();

    if (result.redirectUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: result.redirectUrl,
        orderId,
      });
    } else {
      console.error("PhonePe Pay page initiation failed:", result);
      return NextResponse.json(
        {
          success: false,
          error:
            result.message || "Failed to initiate payment page with PhonePe",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in PhonePe initiate API route:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
