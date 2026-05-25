import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/types";

export function useBookings(userId: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Query bookings that belong to this user. Filter status locally to avoid needing a Firestore composite index.
    const q = query(
      collection(db, "bookings"), 
      where("userId", "==", userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach((doc) => {
        const booking = { id: doc.id, ...doc.data() } as Booking;
        if (booking.status === "pending" || booking.status === "active") {
          data.push(booking);
        }
      });
      
      setBookings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching bookings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { bookings, loading };
}
