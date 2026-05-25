"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, Timestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/types";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerificationQueue() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "==", "pending"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings: Booking[] = [];
      snapshot.forEach((docSnap) => {
        bookings.push({ id: docSnap.id, ...docSnap.data() } as Booking);
      });
      setPendingBookings(bookings);
    }, (error) => {
      console.error("Error listening to pending bookings:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirm = async (booking: Booking) => {
    try {
      const batch = writeBatch(db);
      
      const bookingRef = doc(db, "bookings", booking.id);
      const stationRef = doc(db, "stations", booking.stationId);

      if (booking.isPrebook) {
        // Confirmed prebooking does not lock the station yet
        batch.update(bookingRef, {
          status: "confirmed",
        });
      } else {
        const now = new Date();
        const endTime = new Date(now.getTime() + booking.durationMinutes * 60000);

        batch.update(bookingRef, {
          status: "active",
          startTime: Timestamp.fromDate(now),
          endTime: Timestamp.fromDate(endTime),
        });

        batch.update(stationRef, {
          status: "occupied",
          currentSessionId: booking.id,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error confirming booking:", error);
    }
  };

  const handleReject = async (booking: Booking) => {
    try {
      const batch = writeBatch(db);

      const bookingRef = doc(db, "bookings", booking.id);
      const stationRef = doc(db, "stations", booking.stationId);

      // Mark booking as completed/cancelled
      batch.update(bookingRef, { status: "completed" });

      // Free the station back to available
      batch.update(stationRef, {
        status: "available",
        currentSessionId: null,
      });

      await batch.commit();
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  return (
    <div className="bg-black border-2 border-cyan-500/40 cyber-cut h-full flex flex-col">
      <div className="border-b border-cyan-500/30 p-4 flex items-center gap-2 bg-cyan-500/5">
        <Clock className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-black tracking-widest uppercase text-cyan-400">Verification_Queue</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pendingBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-600 font-mono text-sm">
            &gt; NO_PENDING_TRANSACTIONS<br/>
            &gt; QUEUE_CLEAR
          </div>
        ) : (
          <AnimatePresence>
            {pendingBookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-800 hover:bg-cyan-500/5 transition-colors gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-bold text-white tracking-widest uppercase">
                    NODE: <span className="text-cyan-400">{booking.stationId}</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    TXN: <span className="font-mono text-yellow-400">{booking.transactionId}</span>
                  </p>
                  {booking.isPrebook && booking.scheduledStartTime && (
                    <p className="text-[10px] text-pink-400 font-mono tracking-widest uppercase">
                      PREBOOK: {booking.scheduledStartTime.toDate().toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {booking.scheduledStartTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 font-mono">
                    {booking.durationMinutes}min &bull; ₹{booking.totalCost}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    className="p-2 border border-pink-500/50 text-pink-500 hover:bg-pink-500/10 transition-colors"
                    onClick={() => handleReject(booking)}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleConfirm(booking)}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase text-sm cyber-cut flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    CONFIRM
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
