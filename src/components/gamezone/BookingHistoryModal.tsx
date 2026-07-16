"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Station, Booking } from "@/types";
import { downloadReceipt } from "@/lib/receiptGenerator";
import {
  X,
  Receipt,
  User,
  Clock,
  CreditCard,
  Calendar,
  CheckCircle2,
  Zap,
  Timer,
  AlertCircle,
  IndianRupee,
  Wifi,
  Trash2,
} from "lucide-react";

interface BookingHistoryModalProps {
  station: Station;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:          { label: "LIVE SESSION",   color: "text-green-400",  bg: "bg-green-950/40 border-green-500",   icon: Zap },
  confirmed:       { label: "CONFIRMED",      color: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-500", icon: CheckCircle2 },
  completed:       { label: "COMPLETED",      color: "text-slate-400",  bg: "bg-slate-900/40 border-slate-600",   icon: Timer },
  pending:         { label: "PENDING VERIFY", color: "text-orange-400", bg: "bg-orange-950/40 border-orange-500", icon: AlertCircle },
  pending_payment: { label: "AWAITING PAY",  color: "text-red-400",    bg: "bg-red-950/40 border-red-500",       icon: CreditCard },
  failed:          { label: "FAILED",         color: "text-red-500",    bg: "bg-red-950/40 border-red-600",       icon: AlertCircle },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  UPI:         { label: "UPI",        color: "text-cyan-400" },
  PhonePe_UPI: { label: "PHONEPE UPI", color: "text-purple-400" },
  UPI_MOCK:    { label: "SIMULATED",  color: "text-yellow-400" },
  Cash:        { label: "CASH",       color: "text-green-400" },
  Online:      { label: "ONLINE",     color: "text-blue-400" },
  Split:       { label: "SPLIT",      color: "text-orange-400" },
};

function formatDateTime(ts: { toDate: () => Date } | null | undefined): { date: string; time: string } | null {
  if (!ts) return null;
  const d = ts.toDate();
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type FilterStatus = "all" | "active" | "confirmed" | "completed";

export default function BookingHistoryModal({ station, onClose }: BookingHistoryModalProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("stationId", "==", station.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data: Booking[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Booking));
      
      // Sort on client side by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toDate?.()?.getTime() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching station bookings:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [station.id]);

  const handleDeleteBooking = async (booking: Booking) => {
    if (!window.confirm("Are you sure you want to permanently delete this booking?")) return;

    try {
      const batch = writeBatch(db);
      
      // If it's an active booking, free up the station
      if (booking.status === "active") {
        const stationRef = doc(db, "stations", booking.stationId);
        batch.update(stationRef, {
          status: "available",
          currentSessionId: null
        });
      }

      // Delete the booking record
      const bookingRef = doc(db, "bookings", booking.id);
      batch.delete(bookingRef);

      await batch.commit();
    } catch (err) {
      console.error("Failed to delete booking:", err);
      alert("Failed to delete booking. See console for details.");
    }
  };

  const filtered = filter === "all"
    ? bookings.filter(b => b.status !== "pending_payment") // hide incomplete payment sessions
    : bookings.filter(b => b.status === filter);

  // Stats
  const totalRevenue = bookings
    .filter(b => b.status === "active" || b.status === "completed")
    .reduce((sum, b) => sum + (b.totalCost || 0), 0);
  const totalSessions = bookings.filter(b => b.status === "completed" || b.status === "active").length;
  const activeSessions = bookings.filter(b => b.status === "active").length;
  const confirmedSessions = bookings.filter(b => b.status === "confirmed").length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-black border-2 border-cyan-500/60 cyber-cut shadow-[0_0_40px_rgba(0,240,255,0.15)]">

        {/* Header */}
        <div className="bg-cyan-500 text-black p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-black tracking-widest uppercase">
                BOOKING_LOG :: {station.name}
              </h2>
              <p className="text-[10px] font-mono font-bold tracking-widest opacity-70">
                Real-time payment & session records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-black/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 border-b border-slate-800 shrink-0">
          {[
            { label: "TOTAL REV", value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, color: "text-yellow-400" },
            { label: "SESSIONS",  value: totalSessions, icon: Timer,     color: "text-cyan-400" },
            { label: "LIVE NOW",  value: activeSessions, icon: Wifi,     color: "text-green-400" },
            { label: "UPCOMING",  value: confirmedSessions, icon: Calendar, color: "text-orange-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-3 text-center border-r border-slate-800 last:border-r-0 bg-slate-950/50">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <p className={`text-lg font-black ${color}`}>{value}</p>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-slate-800 shrink-0 bg-slate-950/30">
          {(["all", "active", "confirmed", "completed"] as FilterStatus[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 text-[10px] font-black tracking-widest uppercase transition-colors ${
                filter === f
                  ? "bg-cyan-500 text-black"
                  : "text-slate-500 hover:text-white hover:bg-slate-900"
              }`}
            >
              {f === "all" ? "ALL RECORDS" : f.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Booking List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-cyan-500">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono tracking-widest">FETCHING_RECORDS...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Receipt className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-mono tracking-widest uppercase">NO RECORDS FOUND</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filtered.map((booking) => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.completed;
                const StatusIcon = statusCfg.icon;
                const paymentCfg = booking.paymentMethod ? PAYMENT_CONFIG[booking.paymentMethod] : null;

                const startDt = formatDateTime(booking.startTime || booking.scheduledStartTime);
                const endDt   = formatDateTime(booking.endTime   || booking.scheduledEndTime);

                return (
                  <div
                    key={booking.id}
                    className="p-4 hover:bg-slate-900/30 transition-colors"
                  >
                    {/* Row Top: Name + Status + Amount */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-white text-sm truncate tracking-wide">
                            {booking.userName || "ANONYMOUS"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">{booking.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {(booking.status === "completed" || booking.status === "active" || booking.status === "confirmed") && (
                          <button
                            type="button"
                            onClick={() => downloadReceipt(booking, station)}
                            className="p-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Print Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteBooking(booking)}
                          className="p-1.5 bg-red-950/30 border border-red-900/50 hover:bg-red-900/50 hover:border-red-500 text-red-500/70 hover:text-red-400 transition-colors"
                          title="Delete Booking"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-black tracking-widest border ${statusCfg.bg} ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusCfg.label}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-yellow-400 leading-none">₹{(booking.totalCost || 0).toFixed(0)}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{formatDuration(booking.durationMinutes)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Row Bottom: Time details + Payment method */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-10">
                      {/* Start Time */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-cyan-500/60 shrink-0" />
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                            {booking.isPrebook ? "SCHEDULED" : "STARTED"}
                          </p>
                          {startDt ? (
                            <p className="text-xs text-white font-mono">{startDt.date} {startDt.time}</p>
                          ) : (
                            <p className="text-xs text-slate-600 font-mono italic">—</p>
                          )}
                        </div>
                      </div>

                      {/* End Time */}
                      <div className="flex items-center gap-1.5">
                        <Timer className="w-3 h-3 text-pink-500/60 shrink-0" />
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">ENDS</p>
                          {endDt ? (
                            <p className="text-xs text-white font-mono">{endDt.date} {endDt.time}</p>
                          ) : (
                            <p className="text-xs text-slate-600 font-mono italic">—</p>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3 text-yellow-500/60 shrink-0" />
                        <div>
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest">PAYMENT</p>
                          {paymentCfg ? (
                            <p className={`text-xs font-black ${paymentCfg.color}`}>{paymentCfg.label}</p>
                          ) : (
                            <p className="text-xs text-slate-600 font-mono italic">N/A</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transaction ID (if exists) */}
                    {booking.transactionId && (
                      <div className="mt-2 pl-10 flex items-center gap-1.5">
                        <p className="text-[9px] text-slate-600 font-mono tracking-wide">
                          TXN: <span className="text-slate-500">{booking.transactionId}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 flex items-center justify-between shrink-0 bg-black">
          <p className="text-[10px] text-slate-600 font-mono tracking-widest">
            {filtered.length} RECORD{filtered.length !== 1 ? "S" : ""} · LIVE SYNC
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-900 font-bold tracking-widest uppercase text-xs transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
