"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { Station, Booking } from "@/types";
import AdminGuard from "@/components/gamezone/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Activity, CalendarDays, History, Clock, PowerOff, Edit, Trash2, Receipt, XCircle, X } from "lucide-react";
import { getGameFromCatalog } from "@/lib/gameCatalog";

export default function StationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [station, setStation] = useState<Station | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editDuration, setEditDuration] = useState<number>(60);
  const [editPaymentMode, setEditPaymentMode] = useState<"CASH" | "ONLINE">("CASH");

  const fetchData = async () => {
    try {
      const stationDoc = await getDoc(doc(db, "stations", id));
      if (stationDoc.exists()) {
        setStation({ id: stationDoc.id, ...stationDoc.data() } as Station);
      }

      const q = query(
        collection(db, "bookings"),
        where("stationId", "==", id)
      );
      const bookingDocs = await getDocs(q);
      const fetchedBookings: Booking[] = [];
      bookingDocs.forEach((d) => {
        fetchedBookings.push({ id: d.id, ...d.data() } as Booking);
      });

      // Sort bookings by start time
      fetchedBookings.sort((a, b) => {
        const timeA = a.startTime?.toMillis() || a.scheduledStartTime?.toMillis() || 0;
        const timeB = b.startTime?.toMillis() || b.scheduledStartTime?.toMillis() || 0;
        return timeB - timeA; // sort descending so newest/current is first
      });

      setBookings(fetchedBookings);
    } catch (err) {
      console.error("Failed to fetch station details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEndSession = async (booking: Booking) => {
    if (!window.confirm(`END SESSION for ${booking.userName || "WALK_IN_USER"}? This will mark the booking as completed and free the station.`)) return;
    setActionLoading(booking.id);
    try {
      const batch = writeBatch(db);
      const bookingRef = doc(db, "bookings", booking.id);
      batch.update(bookingRef, { status: "completed" });
      const stationRef = doc(db, "stations", id);
      batch.update(stationRef, { status: "available", currentSessionId: null });
      await batch.commit();
      await fetchData();
    } catch (err) {
      console.error("Failed to end session", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    if (!window.confirm(`CANCEL booking for ${booking.userName || "WALK_IN_USER"}? This action cannot be undone.`)) return;
    setActionLoading(booking.id);
    try {
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, { status: "failed" });
      await fetchData();
    } catch (err) {
      console.error("Failed to cancel booking", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    if (!window.confirm(`DELETE booking record for ${booking.userName || "WALK_IN_USER"}? This will permanently remove it from the database.`)) return;
    setActionLoading(booking.id);
    try {
      await deleteDoc(doc(db, "bookings", booking.id));
      await fetchData();
    } catch (err) {
      console.error("Failed to delete booking", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBooking || !station) return;
    setActionLoading(editingBooking.id);
    
    try {
      const bookingRef = doc(db, "bookings", editingBooking.id);
      const updates: Record<string, unknown> = {
        userName: editUserName,
        durationMinutes: editDuration,
        transactionId: editPaymentMode === "CASH" ? "OFFLINE_CASH" : "OFFLINE_ONLINE",
        paymentMethod: editPaymentMode === "CASH" ? "Cash" : "Online"
      };

      const newCost = Number(((station.pricePerHour / 60) * editDuration).toFixed(2));
      updates.totalCost = newCost;

      if (editingBooking.status === "active" && editingBooking.startTime) {
        const start = editingBooking.startTime.toDate();
        const newEnd = new Date(start.getTime() + editDuration * 60000);
        updates.endTime = Timestamp.fromDate(newEnd);
      } else if (editingBooking.scheduledStartTime) {
        const start = editingBooking.scheduledStartTime.toDate();
        const newEnd = new Date(start.getTime() + editDuration * 60000);
        updates.scheduledEndTime = Timestamp.fromDate(newEnd);
      }

      await updateDoc(bookingRef, updates);
      setEditingBooking(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to update booking", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-slate-950 p-6 flex justify-center items-center">
          <div className="text-cyan-400 font-mono tracking-widest animate-pulse">LOADING_DATA...</div>
        </div>
      </AdminGuard>
    );
  }

  if (!station) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-slate-950 p-6 flex flex-col items-center justify-center gap-4 cyber-grid">
          <div className="text-red-500 font-mono tracking-widest text-xl bg-slate-900 border border-red-500/50 p-6 cyber-cut">ERROR: STATION_NOT_FOUND</div>
          <Link href="/admin" className="px-6 py-3 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 font-mono cyber-cut transition-colors font-bold tracking-widest">
            RETURN_TO_GRID
          </Link>
        </div>
      </AdminGuard>
    );
  }

  // Active session could be the one currently in progress.
  // In our DB, an active session usually has status 'active'.
  const activeSession = bookings.find(b => b.status === 'active');
  const futureSlots = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').sort((a, b) => {
    const timeA = a.scheduledStartTime?.toMillis() || 0;
    const timeB = b.scheduledStartTime?.toMillis() || 0;
    return timeA - timeB; // ascending for future
  });
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'failed').sort((a, b) => {
    const timeA = a.startTime?.toMillis() || a.scheduledStartTime?.toMillis() || 0;
    const timeB = b.startTime?.toMillis() || b.scheduledStartTime?.toMillis() || 0;
    return timeB - timeA; // descending for past
  });

  const getPaymentBadge = (transactionId: string) => {
    if (transactionId === "OFFLINE_CASH") return "CASH";
    if (transactionId === "OFFLINE_ONLINE") return "ONLINE";
    return "ONLINE";
  };

  const renderBookingCard = (b: Booking, type: 'active' | 'future' | 'past') => {
    const borderColor = type === 'active' ? 'border-pink-500/50' : type === 'future' ? 'border-cyan-500/50' : 'border-slate-700';
    const bgColor = type === 'active' ? 'bg-pink-500/5' : type === 'future' ? 'bg-cyan-500/5' : 'bg-slate-900/50';
    const textColor = type === 'active' ? 'text-pink-400' : type === 'future' ? 'text-cyan-400' : 'text-slate-400';

    const start = b.startTime?.toDate() || b.scheduledStartTime?.toDate();
    const end = b.endTime?.toDate() || b.scheduledEndTime?.toDate();
    const isProcessing = actionLoading === b.id;
    const paymentMode = getPaymentBadge(b.transactionId);

    return (
      <div key={b.id} className={`p-4 border ${borderColor} ${bgColor} cyber-cut mb-3 hover:border-opacity-100 transition-colors`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className={`font-black tracking-wider uppercase ${textColor} text-lg`}>{b.userName || "WALK_IN_USER"}</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Payment Mode Badge */}
            <div className={`text-[10px] font-black tracking-widest px-2 py-1 border cyber-cut-reverse uppercase ${
              paymentMode === "CASH"
                ? "text-yellow-400 border-yellow-400/50 bg-yellow-400/10"
                : "text-green-400 border-green-400/50 bg-green-400/10"
            }`}>
              {paymentMode}
            </div>
            {/* Status Badge */}
            <div className={`text-[10px] font-black tracking-widest px-2 py-1 border ${borderColor} ${textColor} bg-slate-950/80 cyber-cut-reverse uppercase`}>
              {b.status}
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-500">DURATION</span>
            <span className="text-white">{b.durationMinutes} MIN</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-500">PAYMENT</span>
            <span className={b.status === 'completed' || b.status === 'confirmed' || b.status === 'active' ? 'text-green-400' : 'text-yellow-400'}>
              {b.status.toUpperCase()} (₹{b.totalCost || 0})
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-500">TXN ID</span>
            <span className="text-slate-300 truncate max-w-[180px]" title={b.transactionId}>{b.transactionId || "N/A"}</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-500">TIMEFRAME</span>
            <div className="text-right">
              <div>{start ? start.toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}</div>
              <div className="text-slate-500">to {end ? end.toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-row gap-2 mt-4 pt-3 border-t border-slate-800/80">
          {type === 'active' && (
            <button
              onClick={() => handleEndSession(b)}
              disabled={isProcessing}
              className="flex-1 py-2 text-[10px] font-black tracking-widest uppercase border border-pink-500/50 text-pink-400 bg-pink-500/10 hover:bg-pink-500/30 hover:border-pink-400 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
              title="END SESSION"
            >
              <PowerOff className="w-4 h-4" /> <span className="hidden sm:inline">END</span>
            </button>
          )}

          {type === 'future' && (
            <button
              onClick={() => handleCancelBooking(b)}
              disabled={isProcessing}
              className="flex-1 py-2 text-[10px] font-black tracking-widest uppercase border border-yellow-400/50 text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/30 hover:border-yellow-300 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
              title="CANCEL BOOKING"
            >
              <XCircle className="w-4 h-4" /> <span className="hidden sm:inline">CANCEL</span>
            </button>
          )}

          <button
            onClick={async () => {
              const { downloadReceipt } = await import("@/lib/receiptGenerator");
              downloadReceipt(b, station);
            }}
            disabled={b.status === "failed"}
            className="flex-1 py-2 text-[10px] font-black tracking-widest uppercase border border-cyan-500/50 text-cyan-400 bg-cyan-950/20 hover:bg-cyan-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
            title="PRINT RECEIPT"
          >
            <Receipt className="w-4 h-4" /> <span className="hidden sm:inline">RECEIPT</span>
          </button>

          <button
            onClick={() => {
              setEditingBooking(b);
              setEditUserName(b.userName || "");
              setEditDuration(b.durationMinutes || 60);
              setEditPaymentMode(getPaymentBadge(b.transactionId) as "CASH" | "ONLINE");
            }}
            disabled={isProcessing}
            className="flex-1 py-2 text-[10px] font-black tracking-widest uppercase border border-indigo-500/50 text-indigo-400 bg-indigo-950/20 hover:bg-indigo-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
            title="EDIT BOOKING"
          >
            <Edit className="w-4 h-4" /> <span className="hidden sm:inline">EDIT</span>
          </button>

          <button
            onClick={() => handleDeleteBooking(b)}
            disabled={isProcessing}
            className="flex-1 py-2 text-[10px] font-black tracking-widest uppercase border border-red-500/50 text-red-500 bg-red-950/20 hover:bg-red-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
            title="DELETE RECORD"
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">DELETE</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 p-4 sm:p-8 cyber-grid relative">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 bg-slate-900/80 p-6 border border-slate-800 cyber-cut shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <Link href="/admin" className="p-3 bg-slate-950 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500 transition-colors cyber-cut">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-widest uppercase flex items-center gap-3">
                <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                {station.name} <span className="text-cyan-500/50 font-light hidden sm:inline">{"//"}</span>
              </h1>
              <div className="text-sm font-mono text-slate-500 mt-2 flex gap-4">
                <span>NODE_ID: {station.id}</span>
                <span>TYPE: <span className="text-slate-300">{station.type}</span></span>
              </div>
            </div>
            <div className={`px-6 py-3 border font-black tracking-widest text-sm cyber-cut ${
              station.status === 'available' ? "text-cyan-400 border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]" :
              station.status === 'occupied' ? "text-pink-400 border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]" :
              station.status === 'pending' ? "text-yellow-400 border-yellow-400 bg-yellow-400/10" :
              "text-slate-500 border-slate-600 bg-slate-800"
            }`}>
              {station.status.toUpperCase()}
            </div>
          </div>

          {/* System Specs and Games */}
          {(station.specs?.length > 0 || station.games?.length > 0) && (
            <div className="bg-slate-900/50 border border-slate-800 p-6 cyber-cut mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] text-cyan-500/70 uppercase tracking-[0.2em] mb-3 font-bold">SYSTEM_SPECS</p>
                <div className="flex flex-wrap gap-2">
                  {station.specs?.map((spec) => (
                    <span key={spec} className="text-xs bg-slate-950 border border-slate-700 text-slate-300 px-3 py-1.5 cyber-cut-reverse uppercase font-semibold">
                      {spec}
                    </span>
                  ))}
                  {(!station.specs || station.specs.length === 0) && (
                    <span className="text-xs text-slate-600 font-mono italic">NO_SPECS_DEFINED</span>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] text-cyan-500/70 uppercase tracking-[0.2em] mb-3 font-bold">INSTALLED_GAMES</p>
                <div className="flex flex-wrap gap-3 max-w-full">
                  {station.games?.map((game, idx) => {
                    const isString = typeof game === "string";
                    const gameName = isString ? game : game.name;
                    let posterUrl = isString ? null : game.posterUrl;

                    if (!posterUrl) {
                      const resolved = getGameFromCatalog(gameName);
                      posterUrl = resolved.posterUrl;
                    }

                    return (
                      <div 
                        key={`${gameName}-${idx}`} 
                        className={`relative group w-16 h-24 border bg-slate-950 overflow-hidden shadow-lg shrink-0 ${
                          station.type === 'PC' ? 'border-cyan-500/30' : 'border-pink-500/30'
                        }`}
                        title={gameName}
                      >
                        <img 
                          src={posterUrl} 
                          alt={gameName} 
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 text-[9px] font-black text-center text-white tracking-wider uppercase transition-opacity duration-200 leading-tight pointer-events-none">
                          {gameName}
                        </div>
                      </div>
                    );
                  })}
                  {(!station.games || station.games.length === 0) && (
                    <span className="text-xs text-slate-600 font-mono italic">NO_GAMES_INSTALLED</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Active Session */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-pink-500 uppercase tracking-widest border-b-2 border-pink-500/30 pb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" /> ACTIVE_SESSION
              </h2>
              {activeSession ? renderBookingCard(activeSession, 'active') : (
                <div className="text-slate-500 font-mono text-sm border-2 border-slate-800 border-dashed p-8 text-center bg-slate-900/30">
                  NO_ACTIVE_SESSION
                </div>
              )}
            </div>

            {/* Future Slots */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-cyan-500 uppercase tracking-widest border-b-2 border-cyan-500/30 pb-3 flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> FUTURE_SLOTS
              </h2>
              <div className="space-y-4">
                {futureSlots.length > 0 ? futureSlots.map(b => renderBookingCard(b, 'future')) : (
                  <div className="text-slate-500 font-mono text-sm border-2 border-slate-800 border-dashed p-8 text-center bg-slate-900/30">
                    NO_UPCOMING_RESERVATIONS
                  </div>
                )}
              </div>
            </div>

            {/* Past Bookings */}
            <div className="space-y-4 lg:border-l lg:border-slate-800 lg:pl-8">
              <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest border-b-2 border-slate-600/50 pb-3 flex items-center gap-2">
                <History className="w-5 h-5" /> PAST_BOOKINGS
              </h2>
              <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {pastBookings.length > 0 ? pastBookings.map(b => renderBookingCard(b, 'past')) : (
                  <div className="text-slate-500 font-mono text-sm border-2 border-slate-800 border-dashed p-8 text-center bg-slate-900/30">
                    NO_HISTORY_FOUND
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-indigo-500/50 cyber-cut w-full max-w-md p-6 relative shadow-[0_0_50px_rgba(99,102,241,0.2)]">
            <button 
              onClick={() => setEditingBooking(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Edit className="w-5 h-5" /> EDIT_BOOKING
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">GUEST NAME</label>
                <input 
                  type="text" 
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">DURATION (MINUTES)</label>
                <select 
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono appearance-none"
                >
                  <option value={30}>30 MIN</option>
                  <option value={60}>1 HR (60 MIN)</option>
                  <option value={90}>1.5 HR (90 MIN)</option>
                  <option value={120}>2 HR (120 MIN)</option>
                  <option value={150}>2.5 HR (150 MIN)</option>
                  <option value={180}>3 HR (180 MIN)</option>
                  <option value={210}>3.5 HR (210 MIN)</option>
                  <option value={240}>4 HR (240 MIN)</option>
                  <option value={270}>4.5 HR (270 MIN)</option>
                  <option value={300}>5 HR (300 MIN)</option>
                  <option value={720}>FULL DAY (720 MIN)</option>
                </select>
                <p className="text-[10px] text-yellow-500/70 mt-1 font-mono">&gt; Modifying duration will automatically recalculate total cost and update the end time.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">PAYMENT MODE</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditPaymentMode("CASH")}
                    className={`flex-1 py-2 text-xs font-black tracking-widest uppercase border transition-colors ${
                      editPaymentMode === "CASH" 
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500" 
                        : "bg-slate-900 text-slate-500 border-slate-700 hover:border-yellow-500/50"
                    }`}
                  >
                    CASH
                  </button>
                  <button
                    onClick={() => setEditPaymentMode("ONLINE")}
                    className={`flex-1 py-2 text-xs font-black tracking-widest uppercase border transition-colors ${
                      editPaymentMode === "ONLINE" 
                        ? "bg-green-500/20 text-green-400 border-green-500" 
                        : "bg-slate-900 text-slate-500 border-slate-700 hover:border-green-500/50"
                    }`}
                  >
                    ONLINE
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleSaveEdit}
                  disabled={!!actionLoading}
                  className="w-full py-4 bg-indigo-500 text-black font-black tracking-widest uppercase cyber-cut hover:bg-indigo-400 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "SAVING..." : "SAVE CHANGES"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminGuard>
  );
}
