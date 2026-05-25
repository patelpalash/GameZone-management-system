import { NextResponse } from "next/server";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PaytmChecksum from "paytmchecksum";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      stationId, 
      durationMinutes, 
      totalCost, 
      isPrebook, 
      scheduledStartTime, 
      scheduledEndTime,
      userId,
      userName
    } = body;

    const mid = process.env.NEXT_PUBLIC_PAYTM_MID || "YOUR_TEST_MID";
    const merchantKey = process.env.PAYTM_MERCHANT_KEY || "YOUR_TEST_KEY";
    const website = process.env.NEXT_PUBLIC_PAYTM_WEBSITE || "WEBSTAGING";
    const env = process.env.NEXT_PUBLIC_PAYTM_ENV || "stage";

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Create a pending payment booking document in Firestore using orderId as doc ID
    const bookingRef = doc(db, "bookings", orderId);
    await setDoc(bookingRef, {
      id: orderId,
      stationId,
      userId,
      userName: userName || "Anonymous",
      durationMinutes,
      totalCost,
      status: "pending_payment",
      transactionId: "",
      startTime: null,
      endTime: null,
      isPrebook: !!isPrebook,
      scheduledStartTime: scheduledStartTime ? Timestamp.fromDate(new Date(scheduledStartTime)) : null,
      scheduledEndTime: scheduledEndTime ? Timestamp.fromDate(new Date(scheduledEndTime)) : null,
      createdAt: Timestamp.now(),
    });

    // 2. Prepare Paytm payload
    const callbackUrl = `${new URL(request.url).origin}/api/paytm/callback`;

    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: mid,
        websiteName: website,
        orderId: orderId,
        txnAmount: {
          value: Number(totalCost).toFixed(2),
          currency: "INR",
        },
        userInfo: {
          custId: userId,
        },
        callbackUrl: callbackUrl,
        payMode: {
          filter: [
            {
              mode: "UPI"
            }
          ]
        }
      },
      head: {
        signature: ""
      }
    };

    // 3. Generate Checksum signature
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      merchantKey
    );

    paytmParams.head.signature = checksum;

    // 4. Call Paytm Initiate Transaction API
    const domain = env === "prod" ? "securegw.paytm.in" : "securestage.paytmpayments.com";
    const url = `https://${domain}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paytmParams),
    });

    const result = await response.json();

    if (result.body && result.body.resultInfo && result.body.resultInfo.resultStatus === "S") {
      return NextResponse.json({
        success: true,
        txnToken: result.body.txnToken,
        orderId: orderId,
        amount: Number(totalCost).toFixed(2),
        mid: mid,
      });
    } else {
      console.error("Paytm initiate transaction failure:", result);
      return NextResponse.json({
        success: false,
        error: result.body?.resultInfo?.resultMsg || "Failed to initiate transaction with Paytm",
      }, { status: 500 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in Paytm initiate API route:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Internal Server Error",
    }, { status: 500 });
  }
}
