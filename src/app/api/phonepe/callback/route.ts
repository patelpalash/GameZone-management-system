import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

async function getPhonePeToken(): Promise<string> {
  const tokenUrl = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
  const clientId = process.env.PHONEPE_CLIENT_ID || process.env.NEXT_PUBLIC_PHONEPE_CLIENT_ID || "";
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION || "1";
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET || "";

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_version", clientVersion);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.access_token) {
    return data.access_token;
  } else {
    throw new Error(
      data.error_description || data.error || "Failed to fetch PhonePe OAuth token"
    );
  }
}

async function processPaymentStatus(
  orderId: string,
  state: string,
  txnId: string
) {
  try {
    const bookingRef = adminDb.collection("bookings").doc(orderId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      console.error("Booking not found for Order ID:", orderId);
      return false;
    }

    const bookingData = bookingSnap.data()!;

    // Already processed
    if (bookingData.status === "active" || bookingData.status === "confirmed") {
      return true;
    }

    if (state === "COMPLETED") {
      const batch = adminDb.batch();

      if (bookingData.isPrebook) {
        batch.update(bookingRef, {
          status: "confirmed",
          transactionId: txnId,
          paymentMethod: "PhonePe_UPI",
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const now = new Date();
        const endTime = new Date(
          now.getTime() + bookingData.durationMinutes * 60000
        );
        const stationRef = adminDb
          .collection("stations")
          .doc(bookingData.stationId);

        batch.update(bookingRef, {
          status: "active",
          startTime: now,
          endTime,
          transactionId: txnId,
          paymentMethod: "PhonePe_UPI",
          updatedAt: FieldValue.serverTimestamp(),
        });

        batch.update(stationRef, {
          status: "occupied",
          currentSessionId: orderId,
        });
      }

      await batch.commit();
      return true;
    } else {
      // Failed payment
      await bookingRef.update({
        status: "failed",
        transactionId: txnId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return false;
    }
  } catch (error) {
    console.error("Error processing payment status in Firestore:", error);
    return false;
  }
}

// GET route: Browser redirect from PhonePe payment page
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  const redirectUrl = new URL("/dashboard", request.url);

  if (!orderId) {
    redirectUrl.searchParams.set("payment", "failed");
    redirectUrl.searchParams.set("reason", "MISSING_ORDER_ID");
    return NextResponse.redirect(redirectUrl.toString(), 303);
  }

  try {
    const baseUrl =
      process.env.PHONEPE_BASE_URL ||
      "https://api-preprod.phonepe.com/apis/pg-sandbox";

    // 1. Fetch OAuth Token
    const accessToken = await getPhonePeToken();

    // 2. Query Status via PhonePe V2 status API
    const response = await fetch(
      `${baseUrl}/checkout/v2/order/${orderId}/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
      }
    );

    const result = await response.json();

    if (result.state) {
      const state = result.state; // e.g. COMPLETED, FAILED, PENDING
      const txnId = result.merchantOrderId || orderId;

      const isSuccess = await processPaymentStatus(orderId, state, txnId);

      if (isSuccess) {
        redirectUrl.searchParams.set("payment", "success");
        redirectUrl.searchParams.set("orderId", orderId);
      } else {
        redirectUrl.searchParams.set("payment", "failed");
        redirectUrl.searchParams.set("reason", `Payment status: ${state}`);
      }
    } else {
      console.error("PhonePe status check failed response:", result);
      redirectUrl.searchParams.set("payment", "failed");
      redirectUrl.searchParams.set(
        "reason",
        result.message || "STATUS_CHECK_FAILED"
      );
    }

    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in PhonePe GET callback:", err);
    redirectUrl.searchParams.set("payment", "failed");
    redirectUrl.searchParams.set("reason", "INTERNAL_ERROR");
    return NextResponse.redirect(redirectUrl.toString(), 303);
  }
}

// POST route: Server-to-server webhook callback from PhonePe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = body.merchantOrderId;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Missing order id" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.PHONEPE_BASE_URL ||
      "https://api-preprod.phonepe.com/apis/pg-sandbox";

    // 1. Fetch OAuth Token
    const accessToken = await getPhonePeToken();

    // 2. Query PhonePe status API directly (passive verification, 100% secure)
    const response = await fetch(
      `${baseUrl}/checkout/v2/order/${orderId}/status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
        },
      }
    );

    const result = await response.json();

    if (result.state) {
      const state = result.state;
      const txnId = result.merchantOrderId || orderId;
      await processPaymentStatus(orderId, state, txnId);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in PhonePe POST webhook:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
