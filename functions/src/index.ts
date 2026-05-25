import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// This function runs every 1 minute
export const checkExpiringBookings = functions.pubsub.schedule("every 1 minutes").onRun(async (context) => {
  const now = new Date();
  
  // Calculate the time 10 minutes from now
  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60000);
  
  // To avoid sending multiple notifications, we check a 1-minute window
  // e.g., bookings expiring between exactly 9.5 and 10.5 minutes from now
  const windowStart = new Date(tenMinutesFromNow.getTime() - 30000); // 10 mins - 30 sec
  const windowEnd = new Date(tenMinutesFromNow.getTime() + 30000);   // 10 mins + 30 sec

  try {
    const activeBookingsSnapshot = await db.collection("bookings")
      .where("status", "==", "active")
      .where("endTime", ">=", admin.firestore.Timestamp.fromDate(windowStart))
      .where("endTime", "<=", admin.firestore.Timestamp.fromDate(windowEnd))
      .get();

    if (activeBookingsSnapshot.empty) {
      console.log("No bookings expiring in exactly 10 minutes.");
      return null;
    }

    const promises: Promise<any>[] = [];

    activeBookingsSnapshot.forEach((doc) => {
      const booking = doc.data();
      console.log(`[WHATSAPP TRIGGER] Alerting User ${booking.userId} for Station ${booking.stationId}! Session ends in 10 minutes.`);
      
      // Here is where you would integrate the official WhatsApp Business API (e.g., Twilio or Meta Graph API)
      /*
      const promise = fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer YOUR_ACCESS_TOKEN`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "USER_PHONE_NUMBER",
          type: "template",
          template: {
            name: "session_expiring",
            language: { code: "en_US" }
          }
        })
      });
      promises.push(promise);
      */
    });

    await Promise.all(promises);
    return null;

  } catch (error) {
    console.error("Error checking expiring bookings:", error);
    return null;
  }
});
