"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Station, Booking } from "@/types";
import { Loader2, TerminalSquare, Calendar, Clock, AlertTriangle } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BookingModalProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitPayment: (
    stationId: string, 
    durationMinutes: number, 
    totalCost: number, 
    transactionId: string,
    isPrebook: boolean,
    scheduledStartTime: Date | null,
    scheduledEndTime: Date | null
  ) => Promise<void>;
}

const DURATIONS = [
  { label: "30_MIN", minutes: 30 },
  { label: "1_HR", minutes: 60 },
  { label: "2_HR", minutes: 120 },
  { label: "4_HR", minutes: 240 },
  { label: "FULL_DAY", minutes: 720 },
];

export default function BookingModal({ station, isOpen, onClose, onSubmitPayment }: BookingModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [transactionId, setTransactionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prebooking states
  const [isPrebook, setIsPrebook] = useState(false);
  const [prebookDate, setPrebookDate] = useState("");
  const [prebookTime, setPrebookTime] = useState("");
  const [stationBookings, setStationBookings] = useState<Booking[]>([]);

  // Fetch active, pending, or confirmed bookings for this station to check overlaps
  useEffect(() => {
    if (!isOpen || !station) return;

    const q = query(
      collection(db, "bookings"),
      where("stationId", "==", station.id),
      where("status", "in", ["pending", "confirmed", "active"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Booking);
      });
      setStationBookings(list);
    }, (err) => {
      console.error("Error fetching bookings for validation:", err);
    });

    return () => unsubscribe();
  }, [isOpen, station]);

  // Compute conflict logic in real-time
  const conflictError = useMemo(() => {
    if (!isPrebook || !prebookDate || !prebookTime) return null;

    const dateParts = prebookDate.split("-");
    const timeParts = prebookTime.split(":");
    if (dateParts.length < 3 || timeParts.length < 2) return null;

    const start = new Date(
      Number(dateParts[0]),
      Number(dateParts[1]) - 1,
      Number(dateParts[2]),
      Number(timeParts[0]),
      Number(timeParts[1])
    );
    const end = new Date(start.getTime() + selectedDuration * 60000);

    if (start.getTime() < Date.now()) {
      return "START_TIME_MUST_BE_IN_FUTURE";
    }

    for (const b of stationBookings) {
      let bStart: Date;
      let bEnd: Date;

      if (b.isPrebook && b.scheduledStartTime && b.scheduledEndTime) {
        bStart = b.scheduledStartTime.toDate();
        bEnd = b.scheduledEndTime.toDate();
      } else if (b.startTime && b.endTime) {
        bStart = b.startTime.toDate();
        bEnd = b.endTime.toDate();
      } else {
        continue; // Skip immediate bookings that haven't been approved yet
      }

      // Overlap formula: start < bEnd && end > bStart
      if (start.getTime() < bEnd.getTime() && end.getTime() > bStart.getTime()) {
        const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const formatDate = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `CONFLICT: Occupied on ${formatDate(bStart)} from ${formatTime(bStart)} to ${formatTime(bEnd)}`;
      }
    }

    return null;
  }, [isPrebook, prebookDate, prebookTime, selectedDuration, stationBookings]);

  if (!station) return null;

  const totalCost = (station.pricePerHour / 60) * selectedDuration;
  
  const upiId = "9173848696@ptsbi"; 
  const upiUrl = `upi://pay?pa=${upiId}&pn=GameZone&am=${totalCost.toFixed(2)}&tn=Booking_${station.id}`;

  const handleSubmit = async () => {
    if (!transactionId.trim() || conflictError) return;
    
    let startVal: Date | null = null;
    let endVal: Date | null = null;

    if (isPrebook && prebookDate && prebookTime) {
      const dateParts = prebookDate.split("-");
      const timeParts = prebookTime.split(":");
      startVal = new Date(
        Number(dateParts[0]),
        Number(dateParts[1]) - 1,
        Number(dateParts[2]),
        Number(timeParts[0]),
        Number(timeParts[1])
      );
      endVal = new Date(startVal.getTime() + selectedDuration * 60000);
    }

    setIsSubmitting(true);
    try {
      await onSubmitPayment(
        station.id, 
        selectedDuration, 
        totalCost, 
        transactionId,
        isPrebook,
        startVal,
        endVal
      );
      setTransactionId(""); 
      setIsPrebook(false);
      setPrebookDate("");
      setPrebookTime("");
      onClose();
    } catch (error) {
      console.error("Failed to submit payment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsPrebook(false);
        setPrebookDate("");
        setPrebookTime("");
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-xl bg-black border-2 border-cyan-500 shadow-[0_0_30px_rgba(0,240,255,0.2)] p-0 gap-0 cyber-cut overflow-hidden">
        
        {/* Header */}
        <div className="bg-cyan-500 text-black p-4 flex items-center justify-between">
          <DialogTitle className="text-2xl font-black tracking-widest uppercase flex items-center gap-2 m-0">
            <TerminalSquare size={24} />
            SECURE_UPLINK :: {station.name}
          </DialogTitle>
          <span className="text-xs font-mono font-bold tracking-widest">AWAITING_FUNDS</span>
        </div>

        <div className="p-6 space-y-6 bg-black/90 relative z-10">
          
          {/* Prebook Toggle */}
          <div className="flex items-center justify-between p-3 border border-cyan-500/20 bg-cyan-950/5 cyber-cut-reverse">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white uppercase tracking-wider">Prebook for Later</p>
              <p className="text-[10px] text-slate-500 font-mono">Reserve a future slot for this node</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrebook(!isPrebook)}
              className={`w-12 h-6 flex items-center p-1 cursor-pointer transition-colors duration-200 border ${
                isPrebook ? "bg-cyan-500 border-cyan-400 justify-end" : "bg-slate-900 border-slate-700 justify-start"
              }`}
            >
              <span className={`w-4 h-4 bg-white shadow-md transition-transform duration-200 ${isPrebook ? "bg-black" : ""}`} />
            </button>
          </div>

          {/* Prebook Date/Time Selectors */}
          {isPrebook && (
            <div className="grid grid-cols-2 gap-4 p-4 border border-cyan-500/30 bg-cyan-950/10 animate-fade-in">
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Select Date
                </label>
                <input
                  type="date"
                  value={prebookDate}
                  onChange={(e) => setPrebookDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Start Time
                </label>
                <input
                  type="time"
                  value={prebookTime}
                  onChange={(e) => setPrebookTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Duration Selector */}
          <div>
            <p className="text-xs text-cyan-400 mb-2 uppercase tracking-[0.2em] font-bold">SELECT_DURATION</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((dur) => (
                <button
                  key={dur.minutes}
                  onClick={() => setSelectedDuration(dur.minutes)}
                  className={`
                    px-4 py-2 text-sm font-bold tracking-widest cyber-cut-reverse transition-all uppercase
                    ${selectedDuration === dur.minutes 
                      ? "bg-yellow-400 text-black glow-yellow" 
                      : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-400"}
                  `}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conflict Display */}
          {conflictError && (
            <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{conflictError}</span>
            </div>
          )}

          {/* QR & Cost */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 border border-cyan-500/30 bg-cyan-950/20 cyber-cut-reverse">
            <div className="flex-1 w-full space-y-2">
              <p className="text-xs text-cyan-500 uppercase tracking-[0.2em]">REQ_FUNDS</p>
              <p className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(252,238,10,0.5)]">₹{totalCost.toFixed(2)}</p>
              <p className="text-xs text-slate-400 font-mono pt-2 border-t border-slate-800">
                &gt; SCAN WITH UPI<br/>
                &gt; TRANSFER EXACT AMOUNT
              </p>
            </div>
            <div className="bg-white p-3 cyber-cut">
              <QRCodeSVG value={upiUrl} size={120} />
            </div>
          </div>

          {/* Transaction Input */}
          <div className="space-y-2">
            <label htmlFor="transactionId" className="text-xs text-cyan-400 uppercase tracking-[0.2em] font-bold">
              INPUT_TXN_HASH (UTR)
            </label>
            <div className="flex gap-0 cyber-cut-reverse bg-slate-900 border border-slate-700 focus-within:border-cyan-500 focus-within:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all">
              <span className="p-3 text-slate-500 font-mono border-r border-slate-700">&gt;_</span>
              <input
                id="transactionId"
                placeholder="000000000000"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="bg-transparent w-full p-3 text-white font-mono outline-none tracking-widest placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex border-t border-slate-800 bg-black">
          <button 
            onClick={() => {
              setIsPrebook(false);
              setPrebookDate("");
              setPrebookTime("");
              onClose();
            }} 
            className="flex-1 py-4 text-slate-400 hover:text-white hover:bg-slate-900 font-bold tracking-widest uppercase transition-colors"
          >
            ABORT
          </button>
          <button 
            disabled={!transactionId.trim() || isSubmitting || !!conflictError || (isPrebook && (!prebookDate || !prebookTime))} 
            onClick={handleSubmit}
            className="flex-1 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase transition-colors disabled:bg-slate-800 disabled:text-slate-600"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center animate-pulse"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> PROCESSING</span>
            ) : (
              "TRANSMIT"
            )}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
