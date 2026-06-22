"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Station, Booking } from "@/types";
import { Loader2, TerminalSquare, Calendar as CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { areIntervalsOverlapping, format } from "date-fns";

// PhonePe redirect flow does not require client-side SDK scripts

interface BookingModalProps {
  station: Station | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitPayment?: (
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

export default function BookingModal({ station, isOpen, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect if using PhonePe test merchant ID
  const isTestMode = process.env.NEXT_PUBLIC_PHONEPE_MERCHANT_ID?.startsWith("PGTEST");

  // Prebooking states
  const [isPrebook, setIsPrebook] = useState(true);
  const [prebookDate, setPrebookDate] = useState<Date | undefined>(undefined);
  const [prebookTime, setPrebookTime] = useState("");
  const [stationBookings, setStationBookings] = useState<Booking[]>([]);

  // UI selection helper states
  const [customTimeActive, setCustomTimeActive] = useState(false);

  // Auto-populate date on prebook activate
  useEffect(() => {
    if (isPrebook && !prebookDate) {
      setPrebookDate(new Date());
    }
  }, [isPrebook, prebookDate]);

  // Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsPrebook(true);
      setPrebookDate(undefined);
      setPrebookTime("");
      setSelectedDuration(60);
      setError(null);
      setCustomTimeActive(false);
    }
  }, [isOpen]);

  // Fetch active, pending, or confirmed bookings for this station to check overlaps
  useEffect(() => {
    if (!isOpen || !station) return;

    const q = query(
      collection(db, "bookings"),
      where("stationId", "==", station.id),
      where("status", "in", ["pending", "pending_payment", "confirmed", "active"])
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
    if (isPrebook && (!prebookDate || !prebookTime)) return null;

    let start: Date;
    if (isPrebook && prebookDate) {
      const timeParts = prebookTime.split(":");
      if (timeParts.length < 2) return null;

      start = new Date(prebookDate);
      start.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
    } else {
      start = new Date();
    }
    const end = new Date(start.getTime() + selectedDuration * 60000);

    for (const b of stationBookings) {
      if (b.status === "pending_payment" && b.createdAt) {
        const createdAtMs = typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : new Date(b.createdAt as unknown as string).getTime();
        const ageInMs = Date.now() - createdAtMs;
        const fifteenMinutes = 15 * 60 * 1000;
        if (ageInMs > fifteenMinutes) {
          continue;
        }
      }

      let bStart: Date;
      let bEnd: Date;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeToDate = (ts: any) => typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      
      if (b.scheduledStartTime && b.scheduledEndTime) {
        bStart = safeToDate(b.scheduledStartTime);
        bEnd = safeToDate(b.scheduledEndTime);
      } else if (b.startTime && b.endTime) {
        bStart = safeToDate(b.startTime);
        bEnd = safeToDate(b.endTime);
      } else {
        continue; // Skip bookings that don't have timings
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
  }, [isPrebook, prebookDate, prebookTime, selectedDuration, stationBookings]);

  // Generate dynamic half-hourly time slots
  const timeSlots = useMemo(() => {
    if (!prebookDate) return [];
    const slots = [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const prebookStr = format(prebookDate, "yyyy-MM-dd");
    const isToday = prebookStr === todayStr;
    
    let startHour = 9; // System operations open at 9:00 AM
    let startMinute = 0;
    
    if (isToday) {
      const now = new Date();
      const currentMin = now.getMinutes();
      if (currentMin < 30) {
        now.setMinutes(30, 0, 0);
      } else {
        now.setHours(now.getHours() + 1, 0, 0, 0);
      }
      // Buffer of 30 mins to allow payment / setup
      const prepTime = new Date(now.getTime() + 30 * 60000);
      startHour = prepTime.getHours();
      startMinute = prepTime.getMinutes() === 0 ? 0 : 30;
    }
    
    const endHour = 23; // System operations close at 11:59 PM
    let currentHour = startHour;
    let currentMin = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin <= 30)) {
      const hh = String(currentHour).padStart(2, "0");
      const mm = String(currentMin).padStart(2, "0");
      const timeStr = `${hh}:${mm}`;
      
      const suffix = currentHour >= 12 ? "PM" : "AM";
      const displayHour = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const displayLabel = `${String(displayHour).padStart(2, "0")}:${mm} ${suffix}`;
      
      slots.push({ value: timeStr, label: displayLabel });
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin = 0;
      }
    }
    
    return slots;
  }, [prebookDate]);

  // Filter bookings for the selected prebookDate
  const bookingsForSelectedDate = useMemo(() => {
    if (!prebookDate) return [];
    const prebookStr = format(prebookDate, "yyyy-MM-dd");
    return stationBookings.filter(b => {
      let bDate: Date;
      if (b.scheduledStartTime) {
        bDate = b.scheduledStartTime.toDate();
      } else if (b.startTime) {
        bDate = b.startTime.toDate();
      } else {
        return false;
      }
      return format(bDate, "yyyy-MM-dd") === prebookStr;
    });
  }, [stationBookings, prebookDate]);

  // Check conflict status of each slot in real-time
  const isSlotConflicted = (slotTime: string) => {
    if (!prebookDate) return false;
    const timeParts = slotTime.split(":");
    if (timeParts.length < 2) return false;

    const start = new Date(prebookDate);
    start.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
    const end = new Date(start.getTime() + selectedDuration * 60000);

    if (start.getTime() < Date.now()) return true;

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

      if (b.scheduledStartTime && b.scheduledEndTime) {
        bStart = safeToDate(b.scheduledStartTime);
        bEnd = safeToDate(b.scheduledEndTime);
      } else if (b.startTime && b.endTime) {
        bStart = safeToDate(b.startTime);
        bEnd = safeToDate(b.endTime);
      } else {
        continue;
      }

      try {
        if (areIntervalsOverlapping(
          { start, end },
          { start: bStart, end: bEnd }
        )) {
          return true;
        }
      } catch {}
    }
    return false;
  };

  if (!station) return null;

  const totalCost = (station.pricePerHour / 60) * selectedDuration;
  
  const handleProceedPayment = async () => {
    if (conflictError) return;
    if (isPrebook && (!prebookDate || !prebookTime)) return;
    
    if (isPrebook && prebookDate) {
      const timeParts = prebookTime.split(":");
      if (timeParts.length >= 2) {
        const start = new Date(prebookDate);
        start.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
        if (start.getTime() < Date.now()) {
          setError("START_TIME_MUST_BE_IN_FUTURE");
          return;
        }
      }
    }

    if (!user) {
      console.error("User session not found");
      return;
    }

    if (station.status === "maintenance") {
      setError("This node is under maintenance and cannot be allocated.");
      return;
    }
    if (!isPrebook && station.status === "occupied") {
      setError("This node is currently occupied by another operative.");
      return;
    }

    let startVal: Date | null = null;
    let endVal: Date | null = null;

    if (isPrebook && prebookDate && prebookTime) {
      const timeParts = prebookTime.split(":");
      startVal = new Date(prebookDate);
      startVal.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
      endVal = new Date(startVal.getTime() + selectedDuration * 60000);
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken(true);
      const response = await fetch("/api/phonepe/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          stationId: station.id,
          durationMinutes: selectedDuration,
          totalCost: totalCost,
          isPrebook: isPrebook,
          scheduledStartTime: startVal ? startVal.toISOString() : null,
          scheduledEndTime: endVal ? endVal.toISOString() : null,
          userId: user.uid,
          userName: user.displayName || user.email || "Anonymous",
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to initiate payment session.");
        setIsSubmitting(false);
        return;
      }

      // Redirect user to PhonePe payment page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError("Payment URL not returned from server.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Failed to proceed to payment:", err);
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred. Please try again.";
      if (errMsg.includes("Failed to fetch") || errMsg.includes("Network Error")) {
        setError("Network Error: Could not reach the payment gateway. Please disable ad-blockers or check your connection.");
      } else {
        setError(errMsg);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-xl bg-black border-2 border-cyan-500 shadow-[0_0_30px_rgba(0,240,255,0.2)] p-0 gap-0 cyber-cut overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-cyan-500 text-black p-4 flex items-center justify-between shrink-0">
          <DialogTitle className="text-2xl font-black tracking-widest uppercase flex items-center gap-2 m-0">
            <TerminalSquare size={24} />
            SECURE_UPLINK :: {station.name}
          </DialogTitle>
          <span className="text-xs font-mono font-bold tracking-widest">AWAITING_FUNDS</span>
        </div>

        <div className="p-6 space-y-6 bg-black/90 relative z-10 overflow-y-auto">
          
          {/* Prebook Date/Time Selectors */}
          {isPrebook && (
            <div className="space-y-4 p-4 border border-cyan-500/30 bg-cyan-950/10 animate-fade-in">
              {/* Date Selection HUD */}
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1 mb-2">
                  <CalendarIcon className="w-3.5 h-3.5" /> Select Date
                </label>
                <div className="flex justify-center p-2 bg-black border border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                  <style>
                    {`
                      .rdp {
                        --rdp-cell-size: 35px;
                        --rdp-accent-color: #06b6d4;
                        --rdp-background-color: rgba(6, 182, 212, 0.2);
                        color: #cbd5e1;
                        font-family: monospace;
                        margin: 0;
                      }
                      .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                        background-color: var(--rdp-accent-color);
                        color: #000;
                        font-weight: bold;
                        border-radius: 0;
                        box-shadow: 0 0 10px var(--rdp-accent-color);
                      }
                      .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                        background-color: var(--rdp-background-color);
                        color: #06b6d4;
                        border-radius: 0;
                      }
                      .rdp-day_today {
                        color: #06b6d4;
                        font-weight: bold;
                        border: 1px solid #06b6d4;
                        border-radius: 0;
                      }
                      .rdp-button {
                        border-radius: 0;
                      }
                    `}
                  </style>
                  <DayPicker
                    mode="single"
                    selected={prebookDate}
                    onSelect={(date) => {
                      if (date) setPrebookDate(date);
                    }}
                    disabled={{ before: new Date() }}
                  />
                </div>
              </div>

              {/* Time Selection HUD */}
              <div className="space-y-3 mt-4">
                <label className="text-[10px] text-cyan-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Start Time
                </label>
                
                {prebookDate ? (
                  <div className="space-y-3">
                    {/* Reserved Slots Timeline */}
                    {bookingsForSelectedDate.length > 0 && (
                      <div className="space-y-1.5 p-2 bg-red-950/20 border border-red-500/20 cyber-cut-reverse">
                        <p className="text-[9px] text-red-400 uppercase tracking-widest font-black flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                          Reserved Slots on this Date:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {bookingsForSelectedDate.map(b => {
                            let start: Date;
                            let end: Date;
                            if (b.scheduledStartTime && b.scheduledEndTime) {
                              start = b.scheduledStartTime.toDate();
                              end = b.scheduledEndTime.toDate();
                            } else if (b.startTime && b.endTime) {
                              start = b.startTime.toDate();
                              end = b.endTime.toDate();
                            } else {
                              return null;
                            }
                            const startStr = start.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
                            const endStr = end.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
                            return (
                              <span key={b.id} className="px-2 py-0.5 bg-red-950 border border-red-900/60 text-red-400 text-[9px] font-mono">
                                {startStr} - {endStr}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto p-1 border border-slate-800 bg-black/40">
                      {timeSlots.filter(slot => !isSlotConflicted(slot.value)).length === 0 ? (
                        <div className="col-span-full py-4 text-center text-red-400 font-mono text-[10px] uppercase tracking-wider">
                          &gt; NO_SLOTS_AVAILABLE_ON_THIS_DATE
                        </div>
                      ) : (
                        timeSlots
                          .filter(slot => !isSlotConflicted(slot.value))
                          .map((slot) => {
                            const selected = prebookTime === slot.value;
                            return (
                              <button
                                key={slot.value}
                                type="button"
                                onClick={() => {
                                  setPrebookTime(slot.value);
                                  setCustomTimeActive(false);
                                }}
                                className={`px-1 py-2 text-[10px] font-black tracking-widest font-mono border text-center transition-all uppercase ${
                                  selected && !customTimeActive
                                    ? "bg-cyan-500 text-black border-cyan-400 glow-cyan"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30"
                                }`}
                              >
                                {slot.label}
                              </button>
                            );
                          })
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTimeActive(!customTimeActive);
                          if (!customTimeActive) setPrebookTime("");
                        }}
                        className="text-[10px] text-slate-500 hover:text-cyan-400 uppercase font-mono tracking-wider transition-colors"
                      >
                        {customTimeActive ? "Select from Time Slots" : "Enter Custom Time"}
                      </button>
                    </div>

                    {customTimeActive && (
                      <input
                        type="time"
                        value={prebookTime}
                        onChange={(e) => setPrebookTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 font-mono text-xs focus:border-cyan-500 focus:outline-none animate-fade-in"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500 font-mono italic">&gt; Select a date first to view available time slots.</p>
                )}
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

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cost Display */}
          <div className="p-6 border border-cyan-500/30 bg-cyan-950/20 cyber-cut-reverse flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs text-cyan-500 uppercase tracking-[0.2em]">REQUIRED_FUNDS</p>
              <p className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(252,238,10,0.5)]">₹{totalCost.toFixed(2)}</p>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono space-y-1">
              <p>&gt; SECURE GATEWAY: PHONEPE</p>
              <p>&gt; PAYMENT MODE: CARD/UPI/NETBANKING</p>
              <p>&gt; INSTANT AUTO-ACTIVATION</p>
            </div>
          </div>
        </div>

        {/* Test Mode Indicator */}
        {isTestMode && (
          <div className="mx-6 mb-2 px-3 py-2 bg-yellow-950/60 border border-yellow-500/50 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <p className="text-[10px] font-mono text-yellow-400">
              SANDBOX MODE — Using PhonePe test credentials.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex border-t border-slate-800 bg-black shrink-0">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 text-slate-400 hover:text-white hover:bg-slate-900 font-bold tracking-widest uppercase transition-colors"
          >
            ABORT
          </button>
          <button 
            disabled={isSubmitting || !!conflictError || (isPrebook && (!prebookDate || !prebookTime))} 
            onClick={handleProceedPayment}
            className="flex-1 py-4 font-black tracking-widest uppercase transition-colors disabled:bg-slate-800 disabled:text-slate-600 bg-cyan-500 hover:bg-cyan-400 text-black"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center animate-pulse"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> PROVISIONING...</span>
            ) : (
              "PROCEED TO PAY"
            )}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
