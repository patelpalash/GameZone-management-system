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

    // Query bookings that belong to this user. Return all bookings and sort locally.
    const q = query(
      collection(db, "bookings"), 
      where("userId", "==", userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Booking);
      });
      
      // Sort by createdAt desc on client side
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toDate?.()?.getTime() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
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
