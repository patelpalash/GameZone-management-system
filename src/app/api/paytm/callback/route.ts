import { NextResponse } from "next/server";
import { doc, getDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PaytmChecksum from "paytmchecksum";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const paytmParams: Record<string, string> = {};
    let checksum = "";

    formData.forEach((value, key) => {
      if (key === "CHECKSUMHASH") {
        checksum = value.toString();
      } else {
        paytmParams[key] = value.toString();
      }
    });

    const merchantKey = process.env.PAYTM_MERCHANT_KEY || "YOUR_TEST_KEY";

    // 1. Verify Paytm Checksum Signature
    const isVerifySignature = PaytmChecksum.verifySignature(
      paytmParams,
      merchantKey,
      checksum
    );

    const redirectUrl = new URL("/dashboard", request.url);

    if (!isVerifySignature) {
      console.error("Paytm Checksum Verification Failed");
      redirectUrl.searchParams.set("payment", "failed");
      redirectUrl.searchParams.set("reason", "SIGNATURE_MISMATCH");
      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    const orderId = paytmParams.ORDERID;
    const status = paytmParams.STATUS;
    const txnId = paytmParams.TXNID || "";
    const respMsg = paytmParams.RESPMSG || "Payment failed";

    const bookingRef = doc(db, "bookings", orderId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      console.error("Booking not found for Order ID:", orderId);
      redirectUrl.searchParams.set("payment", "failed");
      redirectUrl.searchParams.set("reason", "BOOKING_NOT_FOUND");
      return NextResponse.redirect(redirectUrl.toString(), 303);
    }

    const bookingData = bookingSnap.data();

    if (status === "TXN_SUCCESS") {
      const batch = writeBatch(db);

      if (bookingData.isPrebook) {
        // Confirmed prebooking stays available but status changes to confirmed
        batch.update(bookingRef, {
          status: "confirmed",
          transactionId: txnId,
          paymentMethod: "UPI"
        });
      } else {
        // Immediate session starts playing right now
        const now = new Date();
        const endTime = new Date(now.getTime() + bookingData.durationMinutes * 60000);
        const stationRef = doc(db, "stations", bookingData.stationId);

        batch.update(bookingRef, {
          status: "active",
          startTime: Timestamp.fromDate(now),
          endTime: Timestamp.fromDate(endTime),
          transactionId: txnId,
          paymentMethod: "UPI"
        });

        batch.update(stationRef, {
          status: "occupied",
          currentSessionId: orderId
        });
      }

      await batch.commit();

      redirectUrl.searchParams.set("payment", "success");
      redirectUrl.searchParams.set("orderId", orderId);
    } else {
      // Payment failed: mark booking as completed/cancelled
      const batch = writeBatch(db);
      batch.update(bookingRef, {
        status: "completed", // equivalent to ended/cancelled
        transactionId: txnId,
        paymentMethod: "UPI"
      });
      await batch.commit();

      redirectUrl.searchParams.set("payment", "failed");
      redirectUrl.searchParams.set("reason", respMsg);
    }

    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in Paytm callback API route:", err);
    const redirectUrl = new URL("/dashboard", request.url);
    redirectUrl.searchParams.set("payment", "failed");
    redirectUrl.searchParams.set("reason", err.message || "INTERNAL_SERVER_ERROR");
    return NextResponse.redirect(redirectUrl.toString(), 303);
  }
}
