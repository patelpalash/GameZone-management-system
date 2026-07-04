import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// Helper to format phone number to E.164 without '+' for WhatsApp (e.g. 919876543210)
function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return "";
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  // If it is a 10-digit number, prepend the default country code (default 91 for India)
  if (cleaned.length === 10) {
    const countryCode = process.env.DEFAULT_COUNTRY_CODE || "91";
    return countryCode + cleaned;
  }
  return cleaned;
}

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

    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "session_expiring";

    if (!phoneId || !accessToken) {
      console.warn("WhatsApp credentials not set (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN is missing). Skipping WhatsApp sends.");
    }

    const promises: Promise<any>[] = [];

    activeBookingsSnapshot.forEach((docSnap) => {
      const booking = docSnap.data();
      const userPhone = booking.userPhone;
      const userName = booking.userName || "Walk-in Guest";
      const stationId = booking.stationId || "Station";

      console.log(`[EXPIRING ALERT] Booking expiring in 10 mins for user: ${userName}, phone: ${userPhone}`);

      if (phoneId && accessToken && userPhone) {
        const formattedPhone = formatPhoneNumber(userPhone);
        if (formattedPhone) {
          console.log(`[WHATSAPP SEND] Sending expiring session template to: ${formattedPhone}`);
          const promise = fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: formattedPhone,
              type: "template",
              template: {
                name: templateName,
                language: { code: "en_US" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: userName },
                      { type: "text", text: stationId },
                    ],
                  },
                ],
              },
            }),
          })
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
              console.error(`[WHATSAPP ERROR] Failed to send message:`, data);
            } else {
              console.log(`[WHATSAPP SUCCESS] Message sent successfully:`, data);
            }
            return data;
          })
          .catch((err) => {
            console.error(`[WHATSAPP FETCH EXCEPTION] Error:`, err);
          });
          
          promises.push(promise);
        }
      }
    });

    await Promise.all(promises);
    return null;

  } catch (error) {
    console.error("Error checking expiring bookings:", error);
    return null;
  }
});
