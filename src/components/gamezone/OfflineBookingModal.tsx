"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Station, Booking } from "@/types";
import { Loader2, AlertTriangle, User, UserPlus, Phone, Calendar as CalendarIcon, Clock } from "lucide-react";
import { writeBatch, doc, Timestamp, collection, query, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { areIntervalsOverlapping, format } from "date-fns";

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
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scheduling states
  const [isPrebook, setIsPrebook] = useState(false);
  const [prebookDate, setPrebookDate] = useState<Date | undefined>(new Date(new Date().setHours(0, 0, 0, 0)));
  const [prebookTime, setPrebookTime] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [closures, setClosures] = useState<any[]>([]);
  const [shopOpenTime, setShopOpenTime] = useState("09:00");
  const [shopCloseTime, setShopCloseTime] = useState("23:00");
  const [weekendOpenTime, setWeekendOpenTime] = useState("09:00");
  const [weekendCloseTime, setWeekendCloseTime] = useState("23:00");
  const [extraControllerPrice, setExtraControllerPrice] = useState(50);

  const [extraControllers, setExtraControllers] = useState(0);
  const [customTotalAmount, setCustomTotalAmount] = useState<string>("");
  const [localControllerPrice, setLocalControllerPrice] = useState<string>("50");

  // Fetch closures and shop hours
  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "closures"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setClosures(list);
    });

    const hoursUnsub = onSnapshot(doc(db, "settings", "shop_hours"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.openTime) setShopOpenTime(data.openTime);
        if (data.closeTime) setShopCloseTime(data.closeTime);
        if (data.weekendOpenTime) setWeekendOpenTime(data.weekendOpenTime);
        if (data.weekendCloseTime) setWeekendCloseTime(data.weekendCloseTime);
      }
    });

    const pricingUnsub = onSnapshot(doc(db, "settings", "pricing"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.extraControllerPrice === "number") {
          setExtraControllerPrice(data.extraControllerPrice);
          setLocalControllerPrice(data.extraControllerPrice.toString());
        }
      }
    });

    return () => {
      unsubscribe();
      hoursUnsub();
      pricingUnsub();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedDuration(60);
      setPaymentMode("Cash");
      setGuestName("Walk-in Guest");
      setPhone("");
      setError(null);
      setIsPrebook(false);
      setPrebookDate(new Date(new Date().setHours(0, 0, 0, 0)));
      setPrebookTime("");
      setExtraControllers(0);
      setCustomTotalAmount("");
    }
  }, [isOpen]);

  // Generate dynamic half-hourly time slots matching user side logic
  const timeSlots = useMemo(() => {
    if (!prebookDate) return [];
    const slots = [];
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const prebookStr = format(prebookDate, "yyyy-MM-dd");
    const isToday = prebookStr === todayStr;
    const isWeekend = prebookDate.getDay() === 0 || prebookDate.getDay() === 6;
    
    const [openH, openM] = (isWeekend ? weekendOpenTime : shopOpenTime).split(":").map(Number);
    const [closeH, closeM] = (isWeekend ? weekendCloseTime : shopCloseTime).split(":").map(Number);
    
    let startHour = openH;
    let startMinute = openM;
    
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
      const prepStartH = prepTime.getHours();
      const prepStartM = prepTime.getMinutes() === 0 ? 0 : 30;

      // Only override if prepTime is later than opening time
      if (prepStartH > openH || (prepStartH === openH && prepStartM > openM)) {
        startHour = prepStartH;
        startMinute = prepStartM;
      }
    }
    
    const endHour = closeH;
    let currentHour = startHour;
    let currentMin = startMinute;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin <= closeM)) {
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
  }, [prebookDate, shopOpenTime, shopCloseTime, weekendOpenTime, weekendCloseTime]);


  const isSlotConflicted = useCallback((slotTime: string) => {
    if (!prebookDate) return false;
    const timeParts = slotTime.split(":");
    if (timeParts.length < 2) return false;

    const start = new Date(prebookDate);
    start.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
    const end = new Date(start.getTime() + selectedDuration * 60000);

    if (start.getTime() < Date.now()) return true;

    for (const b of stationBookings) {
      if (b.status === "pending_payment" && b.createdAt) {
        const createdAtMs = typeof b.createdAt.toMillis === 'function' 
          ? b.createdAt.toMillis() 
          : new Date(b.createdAt as unknown as string).getTime();
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
          return true;
        }
      } catch {}
    }

    // Check against shop closures
    for (const c of closures) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeToDate = (ts: any) => typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      if (!c.startTime || !c.endTime) continue;
      const cStart = safeToDate(c.startTime);
      const cEnd = safeToDate(c.endTime);
      try {
        if (areIntervalsOverlapping(
          { start, end },
          { start: cStart, end: cEnd }
        )) {
          return true;
        }
      } catch {}
    }

    return false;
  }, [prebookDate, selectedDuration, stationBookings, closures]);

  // Set first available time slot automatically
  useEffect(() => {
    if (isPrebook && timeSlots.length > 0 && !prebookTime) {
      const available = timeSlots.filter(s => !isSlotConflicted(s.value));
      if (available.length > 0) {
        setPrebookTime(available[0].value);
      }
    }
  }, [isPrebook, timeSlots, prebookTime, isSlotConflicted]);


  if (!station) return null;

  const calculatedTotalCost = (station.pricePerHour / 60) * selectedDuration + (extraControllers * extraControllerPrice);
  const finalTotalCost = customTotalAmount !== "" ? Number(customTotalAmount) : calculatedTotalCost;

  const conflictError = (() => {
    let start: Date;
    if (isPrebook && prebookDate && prebookTime) {
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
        const createdAtMs = typeof b.createdAt.toMillis === 'function' 
          ? b.createdAt.toMillis() 
          : new Date(b.createdAt as unknown as string).getTime();
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
        continue;
      }
    }

    // Check against shop closures
    for (const c of closures) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeToDate = (ts: any) => typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      if (!c.startTime || !c.endTime) continue;
      const cStart = safeToDate(c.startTime);
      const cEnd = safeToDate(c.endTime);
      try {
        if (areIntervalsOverlapping(
          { start, end },
          { start: cStart, end: cEnd }
        )) {
          return `CONFLICT: Scheduled shop closure (${c.reason})`;
        }
      } catch {
        continue;
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

    if (!isPrebook && station.status !== "available") {
      setError("This node is not available. It must be vacant to assign a walk-in immediately.");
      return;
    }

    if (!phone || phone.trim().length !== 10) {
      setError("Customer phone number must be exactly 10 digits.");
      return;
    }

    if (isPrebook && (!prebookDate || !prebookTime)) {
      setError("Please select a date and time slot.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const newBookingRef = doc(collection(db, "bookings"));
      
      let start: Date;
      if (isPrebook) {
        const timeParts = prebookTime.split(":");
        start = new Date(prebookDate!);
        start.setHours(Number(timeParts[0]), Number(timeParts[1]), 0, 0);
      } else {
        start = new Date();
      }
      const endTime = new Date(start.getTime() + selectedDuration * 60000);

      // Create standard booking record marked as offline/cash
      batch.set(newBookingRef, {
        id: newBookingRef.id,
        stationId: station.id,
        userId: user.uid, // The admin creating the booking
        userName: guestName.trim() || "Walk-in Guest",
        userPhone: phone.trim(),
        durationMinutes: selectedDuration,
        totalCost: Number(finalTotalCost.toFixed(2)),
        extraControllers: extraControllers,
        status: isPrebook ? "confirmed" : "active",
        transactionId: paymentMode === "Cash" ? "OFFLINE_CASH" : "OFFLINE_ONLINE",
        paymentMethod: paymentMode,
        startTime: isPrebook ? null : Timestamp.fromDate(start),
        endTime: isPrebook ? null : Timestamp.fromDate(endTime),
        isPrebook: isPrebook,
        scheduledStartTime: isPrebook ? Timestamp.fromDate(start) : null,
        scheduledEndTime: isPrebook ? Timestamp.fromDate(endTime) : null,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      });

      // Update station status to occupied ONLY if starting now
      if (!isPrebook) {
        const stationRef = doc(db, "stations", station.id);
        batch.update(stationRef, {
          status: "occupied",
          currentSessionId: newBookingRef.id,
        });
      }

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
      <DialogContent className="sm:max-w-xl bg-black border-2 border-yellow-500 shadow-[0_0_30px_rgba(252,238,10,0.2)] p-0 gap-0 cyber-cut overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        
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

          {/* Customer Phone Input */}
          <div className="space-y-2">
            <label className="text-xs text-yellow-500 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
              <Phone className="w-4 h-4" /> Customer Phone Number (Mandatory)
            </label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-500 focus:outline-none placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Assign Mode Toggles */}
          <div className="space-y-2">
            <p className="text-xs text-yellow-500 uppercase tracking-[0.2em] font-bold">ASSIGN_MODE</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsPrebook(false)}
                className={`flex-1 py-3 text-sm font-black tracking-widest cyber-cut uppercase transition-colors border ${
                  !isPrebook 
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                    : "bg-slate-900 border-slate-700 text-slate-500 hover:text-yellow-400 hover:border-yellow-400/50"
                }`}
              >
                ASSIGN NOW
              </button>
              <button
                onClick={() => setIsPrebook(true)}
                className={`flex-1 py-3 text-sm font-black tracking-widest cyber-cut uppercase transition-colors border ${
                  isPrebook 
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]" 
                    : "bg-slate-900 border-slate-700 text-slate-500 hover:text-yellow-400 hover:border-yellow-400/50"
                }`}
              >
                SCHEDULE LATER
              </button>
            </div>
          </div>

          {/* Calendar scheduler for scheduling later */}
          {isPrebook && (
            <div className="space-y-4 p-4 border border-yellow-500/30 bg-yellow-950/10">
              <div className="space-y-2">
                <label className="text-[10px] text-yellow-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1 mb-2">
                  <CalendarIcon className="w-3.5 h-3.5" /> Select Date
                </label>
                <div className="flex justify-center p-2 sm:p-4 bg-black border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] w-full overflow-x-auto">
                  <style>
                    {`
                      .rdp {
                        --rdp-cell-size: 34px;
                        --rdp-accent-color: #eab308;
                        --rdp-background-color: rgba(234, 179, 8, 0.2);
                        color: #cbd5e1;
                        font-family: monospace;
                        margin: 0;
                        font-size: 13px;
                      }
                      .rdp-month { margin: 0; width: 100%; }
                      .rdp-table { width: 100%; max-width: 100%; }
                      .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                        background-color: var(--rdp-accent-color);
                        color: #000;
                        font-weight: bold;
                        border-radius: 0;
                        box-shadow: 0 0 10px var(--rdp-accent-color);
                      }
                      .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                        background-color: var(--rdp-background-color);
                        color: #eab308;
                        border-radius: 0;
                      }
                      .rdp-day_today {
                        color: #eab308;
                        font-weight: bold;
                        border: 1px solid #eab308;
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
                      if (date) {
                        const d = new Date(date);
                        d.setHours(0, 0, 0, 0);
                        setPrebookDate(d);
                      }
                    }}
                    disabled={{ before: new Date(new Date().setHours(0,0,0,0)) }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-yellow-400 uppercase tracking-[0.2em] font-bold flex items-center gap-1 mb-2">
                  <Clock className="w-3.5 h-3.5" /> Select Time Slot
                </label>
                {timeSlots.filter(slot => !isSlotConflicted(slot.value)).length > 0 ? (
                  <select
                    value={prebookTime}
                    onChange={(e) => setPrebookTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-500 focus:outline-none"
                  >
                    {timeSlots
                      .filter(slot => !isSlotConflicted(slot.value))
                      .map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="p-3 bg-slate-900 border border-slate-700 text-slate-500 text-xs font-mono text-center">
                    No time slots available for this date.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Duration Selector */}
          <div>
            <p className="text-xs text-yellow-500 mb-2 uppercase tracking-[0.2em] font-bold">SELECT_DURATION</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((dur) => (
                <button
                  key={dur.minutes}
                  onClick={() => {
                    setSelectedDuration(dur.minutes);
                    setCustomTotalAmount(""); // Reset custom amount on duration change
                  }}
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
                    : "bg-slate-900 border-slate-700 text-slate-500 hover:text-yellow-400 hover:border-yellow-400/50"
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

          {/* Extra Controllers */}
          {(station.type === "PS5" || station.type === "Xbox" || station.type === "PC") && (
            <div>
              <div className="text-xs text-yellow-500 mb-2 uppercase tracking-[0.2em] font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  EXTRA_CONTROLLERS
                  <span className="text-slate-400 font-mono text-[10px] lowercase flex items-center gap-1 bg-black px-2 py-1 rounded border border-slate-800">
                    (+₹ 
                    <input 
                      type="number" 
                      value={localControllerPrice}
                      onChange={(e) => setLocalControllerPrice(e.target.value)}
                      onBlur={async () => {
                        const val = Number(localControllerPrice);
                        if (!isNaN(val) && val >= 0) {
                          setExtraControllerPrice(val);
                          await setDoc(doc(db, "settings", "pricing"), {
                            extraControllerPrice: val,
                            updatedAt: Timestamp.now()
                          }, { merge: true });
                        } else {
                          setLocalControllerPrice(extraControllerPrice.toString());
                        }
                      }}
                      className="bg-transparent border-b border-yellow-500/50 w-8 text-yellow-500 focus:outline-none focus:border-yellow-400 text-center"
                    /> 
                    each)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-4 p-3 bg-slate-900 border border-slate-700">
                <button
                  onClick={() => {
                    if (extraControllers > 0) {
                      setExtraControllers(prev => prev - 1);
                      setCustomTotalAmount("");
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-black border border-slate-600 text-yellow-500 hover:bg-slate-800 disabled:opacity-50 font-bold"
                  disabled={extraControllers === 0}
                >
                  -
                </button>
                <span className="text-2xl font-black text-white w-8 text-center">{extraControllers}</span>
                <button
                  onClick={() => {
                    setExtraControllers(prev => prev + 1);
                    setCustomTotalAmount("");
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-black border border-slate-600 text-yellow-500 hover:bg-slate-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Cost Display and Custom Override */}
          <div className="p-6 border border-yellow-500/30 bg-yellow-950/20 cyber-cut-reverse flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-xs text-yellow-500 uppercase tracking-[0.2em] font-bold">TOTAL_AMOUNT (₹)</label>
              <input
                type="number"
                min="0"
                value={customTotalAmount !== "" ? customTotalAmount : calculatedTotalCost.toFixed(2)}
                onChange={(e) => setCustomTotalAmount(e.target.value)}
                className="w-full bg-black border border-yellow-500/50 text-5xl font-black text-yellow-400 p-2 focus:outline-none focus:border-yellow-400 drop-shadow-[0_0_10px_rgba(252,238,10,0.2)]"
              />
              {customTotalAmount !== "" && (
                <p className="text-xs text-cyan-400 font-mono italic">Custom price override active</p>
              )}
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono space-y-1">
              <p>&gt; ASSIGN MODE: OFFLINE ({paymentMode.toUpperCase()})</p>
              <p>&gt; STATUS: {isPrebook ? "SCHEDULED (CONFIRMED)" : "INSTANT AUTO-ACTIVATION"}</p>
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
            disabled={isSubmitting || !!conflictError || phone.trim().length !== 10 || (isPrebook && !prebookTime)} 
            onClick={handleAssignWalkIn}
            className="flex-1 py-4 font-black tracking-widest uppercase transition-colors disabled:bg-slate-800 disabled:text-slate-600 bg-yellow-400 hover:bg-yellow-300 text-black"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center animate-pulse"><Loader2 className="w-5 h-5 mr-2 animate-spin" /> PROVISIONING...</span>
            ) : isPrebook ? (
              "SCHEDULE OFFLINE SLOT"
            ) : (
              "ASSIGN & START NODE"
            )}
          </button>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
