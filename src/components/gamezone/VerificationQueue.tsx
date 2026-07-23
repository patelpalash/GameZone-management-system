"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, onSnapshot, doc, Timestamp, writeBatch, getDoc, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { CheckCircle2, Clock, XCircle, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VerificationQueue() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const unsubStations = onSnapshot(collection(db, "stations"), (snapshot) => {
      const list: Station[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Station);
      });
      setStations(list);
    });

    return () => unsubStations();
  }, []);

  useEffect(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Fetch only today's bookings for the live feed
    const q = query(
      collection(db, "bookings"),
      where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings: Booking[] = [];
      snapshot.forEach((docSnap) => {
        bookings.push({ id: docSnap.id, ...docSnap.data() } as Booking);
      });
      setAllBookings(bookings);
    }, (error) => {
      console.error("Error listening to recent bookings:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirm = async (booking: Booking) => {
    try {
      const batch = writeBatch(db);
      
      const bookingRef = doc(db, "bookings", booking.id);
      const stationRef = doc(db, "stations", booking.stationId);

      if (booking.isPrebook) {
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
      const bookingRef = doc(db, "bookings", booking.id);
      const stationRef = doc(db, "stations", booking.stationId);

      const stationSnap = await getDoc(stationRef);
      const stationData = stationSnap.exists() ? stationSnap.data() : null;

      const batch = writeBatch(db);

      batch.update(bookingRef, { status: "failed" });

      if (stationData && stationData.currentSessionId === booking.id) {
        batch.update(stationRef, {
          status: "available",
          currentSessionId: null,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error rejecting booking:", error);
    }
  };

  const stationMap = useMemo(() => {
    const map: Record<string, string> = {};
    stations.forEach(s => {
      map[s.id] = s.name;
    });
    return map;
  }, [stations]);

  const filteredBookings = useMemo(() => {
    return allBookings.filter(b => {
      if (searchQuery) {
        const qLower = searchQuery.toLowerCase();
        const matchName = b.userName?.toLowerCase().includes(qLower);
        const matchTxn = b.transactionId?.toLowerCase().includes(qLower);
        const matchStation = stationMap[b.stationId]?.toLowerCase().includes(qLower);
        if (!matchName && !matchTxn && !matchStation) return false;
      }
      
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      
      if (filterType === "online" && b.transactionId === "OFFLINE_CASH") return false;
      if (filterType === "offline" && b.transactionId !== "OFFLINE_CASH") return false;

      return true;
    });
  }, [allBookings, searchQuery, filterStatus, filterType, stationMap]);

  return (
    <div className="bg-black border-2 border-cyan-500/40 cyber-cut h-[450px] xl:h-full flex flex-col">
      <div className="border-b border-cyan-500/30 p-4 bg-cyan-500/5 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-black tracking-widest uppercase text-cyan-400">TRANSACTION_LOG</h2>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] font-mono text-cyan-400/50 uppercase tracking-widest border border-cyan-500/20 px-2 py-1">Live Feed</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Name or TXN ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white pl-10 pr-3 py-2 text-sm font-mono focus:border-cyan-500 focus:outline-none placeholder:text-slate-600 transition-colors"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 text-xs font-mono">
            <div className="flex-1 flex items-center border border-slate-700 bg-slate-900 px-2 overflow-hidden">
              <Filter className="w-3 h-3 text-slate-500 shrink-0 mr-2" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-transparent text-slate-300 py-2 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">Status: ALL</option>
                <option value="pending">PENDING</option>
                <option value="confirmed">CONFIRMED</option>
                <option value="active">ACTIVE</option>
                <option value="completed">COMPLETED</option>
                <option value="failed">FAILED</option>
              </select>
            </div>
            
            <div className="flex-1 flex items-center border border-slate-700 bg-slate-900 px-2 overflow-hidden">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-transparent text-slate-300 py-2 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="all">Type: ALL</option>
                <option value="online">ONLINE</option>
                <option value="offline">OFFLINE</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-600 font-mono text-sm">
            &gt; NO_MATCHING_TRANSACTIONS<br/>
            &gt; QUEUE_CLEAR
          </div>
        ) : (
          <AnimatePresence>
            {filteredBookings.map((booking) => {
              const isOffline = booking.transactionId === "OFFLINE_CASH";
              const isPending = booking.status === "pending";

              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-800 hover:bg-slate-900/80 transition-colors gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-white tracking-widest uppercase">
                        NODE: <span className="text-cyan-400">{stationMap[booking.stationId] || booking.stationId}</span>
                      </p>
                      <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 uppercase ${
                        isOffline ? "bg-yellow-900/50 text-yellow-500 border border-yellow-500/30" : "bg-blue-900/50 text-blue-400 border border-blue-500/30"
                      }`}>
                        {isOffline ? "OFFLINE" : "ONLINE"}
                      </span>
                      {!isPending && (
                        <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 uppercase border ${
                          booking.status === 'completed' ? 'border-green-500/50 text-green-400 bg-green-950/30' :
                          booking.status === 'active' ? 'border-pink-500/50 text-pink-400 bg-pink-950/30' :
                          booking.status === 'failed' ? 'border-red-500/50 text-red-500 bg-red-950/30' :
                          'border-cyan-500/50 text-cyan-400 bg-cyan-950/30'
                        }`}>
                          {booking.status}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-400 truncate">
                      {booking.userName || "Unknown User"} 
                      {booking.userPhone && <span className="text-xs text-slate-500 ml-2 font-mono">({booking.userPhone})</span>}
                      <span className="text-slate-600 ml-2">{"//"}</span> TXN: <span className="font-mono text-yellow-400 text-xs">{booking.transactionId}</span>
                    </p>
                    
                    {booking.isPrebook && booking.scheduledStartTime && (
                      <p className="text-[10px] text-pink-400 font-mono tracking-widest uppercase mt-1">
                        PREBOOK: {(typeof booking.scheduledStartTime.toDate === 'function' ? booking.scheduledStartTime.toDate() : new Date(booking.scheduledStartTime as unknown as string)).toLocaleDateString([], { month: 'short', day: 'numeric' })} @ {(typeof booking.scheduledStartTime.toDate === 'function' ? booking.scheduledStartTime.toDate() : new Date(booking.scheduledStartTime as unknown as string)).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 font-mono flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                      <span>{booking.durationMinutes}min &bull; ₹{booking.totalCost}</span>
                      <span>{booking.createdAt ? (typeof booking.createdAt.toDate === 'function' ? booking.createdAt.toDate() : new Date(booking.createdAt as unknown as string)).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</span>
                    </p>
                  </div>
                  
                  {isPending && (
                    <div className="flex gap-2 shrink-0 self-end sm:self-auto mt-2 sm:mt-0">
                      <button 
                        className="p-2 border border-pink-500/50 text-pink-500 hover:bg-pink-500/10 transition-colors"
                        onClick={() => handleReject(booking)}
                        title="Reject Booking"
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
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
