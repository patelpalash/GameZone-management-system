import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    const bookingsSnap = await adminDb.collection("bookings").get();
    
    // Group offline bookings by phone number
    const offlineUsersMap = new Map<string, {
      phone: string;
      name: string;
      totalHoursPlayed: number;
      totalSpent: number;
    }>();

    bookingsSnap.forEach(doc => {
      const b = doc.data();
      // Check if it's an offline booking (created by admin, usually has userPhone populated and no real user account or is flagged)
      if (b.userPhone && typeof b.userPhone === 'string' && b.userPhone.trim().length === 10) {
        const phone = b.userPhone.trim();
        const duration = Number(b.durationMinutes) || 0;
        const cost = Number(b.totalCost) || 0;
        const name = b.userName || "Walk-in Guest";

        if (!offlineUsersMap.has(phone)) {
          offlineUsersMap.set(phone, {
            phone,
            name,
            totalHoursPlayed: duration / 60,
            totalSpent: cost
          });
        } else {
          const existing = offlineUsersMap.get(phone)!;
          existing.totalHoursPlayed += duration / 60;
          existing.totalSpent += cost;
          // Prefer non-default names if available
          if (existing.name === "Walk-in Guest" && name !== "Walk-in Guest") {
            existing.name = name;
          }
        }
      }
    });

    // Batch write to users collection
    const batch = adminDb.batch();
    let count = 0;

    for (const [phone, data] of offlineUsersMap.entries()) {
      const offlineUserId = `offline_${phone}`;
      const userRef = adminDb.collection("users").doc(offlineUserId);
      
      batch.set(userRef, {
        id: offlineUserId,
        name: data.name,
        phone: data.phone,
        isOffline: true,
        totalHoursPlayed: data.totalHoursPlayed,
        totalSpent: data.totalSpent,
      }, { merge: true });
      count++;
      
      // Firestore batch limit is 500
      if (count % 499 === 0) {
        await batch.commit();
      }
    }

    if (count % 499 !== 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, message: `Migrated ${count} offline user profiles successfully.` });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
