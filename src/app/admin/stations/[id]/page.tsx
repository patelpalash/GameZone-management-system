"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Station, Booking } from "@/types";
import AdminGuard from "@/components/gamezone/AdminGuard";
import Link from "next/link";
import { ArrowLeft, Activity, CalendarDays, History, Clock } from "lucide-react";

export default function StationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [station, setStation] = useState<Station | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

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

    fetchData();
  }, [id]);

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

  const renderBookingCard = (b: Booking, type: 'active' | 'future' | 'past') => {
    const borderColor = type === 'active' ? 'border-pink-500/50' : type === 'future' ? 'border-cyan-500/50' : 'border-slate-700';
    const bgColor = type === 'active' ? 'bg-pink-500/5' : type === 'future' ? 'bg-cyan-500/5' : 'bg-slate-900/50';
    const textColor = type === 'active' ? 'text-pink-400' : type === 'future' ? 'text-cyan-400' : 'text-slate-400';

    const start = b.startTime?.toDate() || b.scheduledStartTime?.toDate();
    const end = b.endTime?.toDate() || b.scheduledEndTime?.toDate();

    return (
      <div key={b.id} className={`p-4 border ${borderColor} ${bgColor} cyber-cut mb-3 hover:border-opacity-100 transition-colors`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className={`font-black tracking-wider uppercase ${textColor} text-lg`}>{b.userName || "WALK_IN_USER"}</div>
          </div>
          <div className={`text-[10px] font-black tracking-widest px-2 py-1 border ${borderColor} ${textColor} bg-slate-950/80 cyber-cut-reverse uppercase`}>
            {b.status}
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
            <span className="text-slate-500">TIMEFRAME</span>
            <div className="text-right">
              <div>{start ? start.toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}</div>
              <div className="text-slate-500">to {end ? end.toLocaleString("en-US", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : "N/A"}</div>
            </div>
          </div>
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
    </AdminGuard>
  );
}
