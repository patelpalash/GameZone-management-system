"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Station, Booking } from "@/types";
import { Loader2, AlertTriangle, User, UserPlus } from "lucide-react";
import { writeBatch, doc, Timestamp, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { areIntervalsOverlapping } from "date-fns";

interface OfflineBookingModalProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  stationBookings?: Booking[];
}

const DURATIONS = [
  { label: "30_MIN", minutes: 30 },
  { label: "1_HR", minutes: 60 },
  { label: "1.5_HR", minutes: 90 },
  { label: "2_HR", minutes: 120 },
  { label: "2.5_HR", minutes: 150 },
  { label: "3_HR", minutes: 180 },
  { label: "3.5_HR", minutes: 210 },
  { label: "4_HR", minutes: 240 },
  { label: "4.5_HR", minutes: 270 },
  { label: "5_HR", minutes: 300 },
  { label: "FULL_DAY", minutes: 720 },
];

export default function OfflineBookingModal({ station, isOpen, onClose, stationBookings = [] }: OfflineBookingModalProps) {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [paymentMode, setPaymentMode] = useState<"Cash" | "Online">("Cash");
  const [guestName, setGuestName] = useState("Walk-in Guest");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDuration(60);
      setPaymentMode("Cash");
      setGuestName("Walk-in Guest");
      setError(null);
    }
  }, [isOpen]);

  if (!station) return null;

  const totalCost = (station.pricePerHour / 60) * selectedDuration;
  
  const conflictError = (() => {
    const start = new Date();
    const end = new Date(start.getTime() + selectedDuration * 60000);

    for (const b of stationBookings) {
      if (b.status === "pending_payment" && b.createdAt) {
        const ageInMs = Date.now() - b.createdAt.toMillis();
        const fifteenMinutes = 15 * 60 * 1000;
        if (ageInMs > fifteenMinutes) {
          continue;
        }
      }

      let bStart: Date;
      let bEnd: Date;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeToDate = (ts: any) => typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);

      if (b.startTime && b.endTime) {
        bStart = safeToDate(b.startTime);
        bEnd = safeToDate(b.endTime);
      } else if (b.scheduledStartTime && b.scheduledEndTime) {
        bStart = safeToDate(b.scheduledStartTime);
        bEnd = safeToDate(b.scheduledEndTime);
      } else {
        continue;
      }

      try {
        if (areIntervalsOverlapping(
          { start, end },
          { start: bStart, end: bEnd }
        )) {
          const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
          const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
          return `CONFLICT: Occupied on ${formatDate(bStart)} from ${formatTime(bStart)} to ${formatTime(bEnd)}`;
        }
      } catch {
        // Invalid dates
      }
    }
    return null;
  })();
  
  const handleAssignWalkIn = async () => {
    if (conflictError) return;
    if (!user) {
      setError("Admin session not found");
      return;
    }

    if (station.status !== "available") {
      setError("This node is not available. It must be vacant to assign a walk-in.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const newBookingRef = doc(collection(db, "bookings"));
      
      const now = new Date();
      const endTime = new Date(now.getTime() + selectedDuration * 60000);

      // Create standard booking record marked as offline/cash
      batch.set(newBookingRef, {
        id: newBookingRef.id,
        stationId: station.id,
        userId: user.uid, // The admin creating the booking
        userName: guestName.trim() || "Walk-in Guest",
        durationMinutes: selectedDuration,
        totalCost: Number(totalCost.toFixed(2)),
        status: "active",
        transactionId: paymentMode === "Cash" ? "OFFLINE_CASH" : "OFFLINE_ONLINE",
        paymentMethod: paymentMode,
        startTime: Timestamp.fromDate(now),
        endTime: Timestamp.fromDate(endTime),
        isPrebook: false,
        scheduledStartTime: null,
        scheduledEndTime: null,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      // Update station status to occupied
      const stationRef = doc(db, "stations", station.id);
      batch.update(stationRef, {
        status: "occupied",
        currentSessionId: newBookingRef.id,
      });

      await batch.commit();
      onClose();
    } catch (err) {
      console.error("Failed to assign walk-in:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-xl bg-black border-2 border-yellow-500 shadow-[0_0_30px_rgba(252,238,10,0.2)] p-0 gap-0 cyber-cut overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-yellow-400 text-black p-4 flex items-center justify-between shrink-0">
          <DialogTitle className="text-2xl font-black tracking-widest uppercase flex items-center gap-2 m-0">
            <UserPlus size={24} />
            ASSIGN_WALK-IN :: {station.name}
          </DialogTitle>
          <span className="text-xs font-mono font-bold tracking-widest">OFFLINE_ENTRY</span>
        </div>

        <div className="p-6 space-y-6 bg-black/90 relative z-10 overflow-y-auto">
          
          {/* Guest Name Input */}
          <div className="space-y-2">
            <label className="text-xs text-yellow-500 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
              <User className="w-4 h-4" /> Guest Name (Optional)
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-500 focus:outline-none placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Duration Selector */}
          <div>
            <p className="text-xs text-yellow-500 mb-2 uppercase tracking-[0.2em] font-bold">SELECT_DURATION</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((dur) => (
                <button
                  key={dur.minutes}
                  onClick={() => setSelectedDuration(dur.minutes)}
                  className={`
                    px-4 py-2 text-sm font-bold tracking-widest cyber-cut-reverse transition-all uppercase
                    ${selectedDuration === dur.minutes 
                      ? "bg-yellow-400 text-black glow-yellow" 
                      : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-400"}
                  `}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <p className="text-xs text-yellow-500 mb-2 uppercase tracking-[0.2em] font-bold">PAYMENT_MODE</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMode("Cash")}
                className={`flex-1 py-3 text-sm font-black tracking-widest cyber-cut uppercase transition-colors border ${
                  paymentMode === "Cash" 
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                    : "bg-slate-900 border-slate-700 text-slate-500 hover:text-yellow-400 hover:border-yellow-500/50"
                }`}
              >
                CASH
              </button>
              <button
                onClick={() => setPaymentMode("Online")}
                className={`flex-1 py-3 text-sm font-black tracking-widest cyber-cut uppercase transition-colors border ${
                  paymentMode === "Online" 
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                    : "bg-slate-900 border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/50"
                }`}
              >
                ONLINE (UPI)
              </button>
            </div>
          </div>

          {/* Error Display */}
          {conflictError && (
            <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{conflictError}</span>
            </div>
          )}
          {error && !conflictError && (
            <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cost Display */}
          <div className="p-6 border border-yellow-500/30 bg-yellow-950/20 cyber-cut-reverse flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-yellow-500 uppercase tracking-[0.2em]">TOTAL_AMOUNT</p>
              <p className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(252,238,10,0.5)]">₹{totalCost.toFixed(2)}</p>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono space-y-1">
              <p>&gt; ASSIGN MODE: OFFLINE ({paymentMode.toUpperCase()})</p>
              <p>&gt; STATUS: INSTANT AUTO-ACTIVATION</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex border-t border-slate-800 bg-black shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 text-slate-400 hover:text-white hover:bg-slate-900 font-bold tracking-widest uppercase transition-colors"
          >
            ABORT
          </button>
          <button 
            disabled={isSubmitting || !!conflictError} 
            onClick={handleAssignWalkIn}
            className="flex-1 py-4 font-black tracking-widest uppercase transition-colors disabled:bg-slate-800 disabled:text-slate-600 bg-yellow-400 hover:bg-yellow-300 text-black"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center animate-pulse"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> PROVISIONING...</span>
            ) : (
              "ASSIGN & START NODE"
            )}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
