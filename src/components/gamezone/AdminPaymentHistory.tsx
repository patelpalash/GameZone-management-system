"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, getDocs, doc, updateDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { History, Search, Filter, Edit, Trash2, Save, X } from "lucide-react";

export default function AdminPaymentHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editMethod, setEditMethod] = useState<string>("");

  const handleDelete = async (booking: Booking) => {
    if (confirm("Are you sure you want to refund/void this payment record? This will log a refund in the financial ledger and mark it as voided.")) {
      try {
        const batch = writeBatch(db);
        
        // 1. Mark booking as refunded
        batch.update(doc(db, "bookings", booking.id), { status: "refunded" });
        
        // 2. Log an expense for the refund so the ledger balances properly
        if (booking.totalCost && booking.totalCost > 0) {
          batch.set(doc(collection(db, "expenses")), {
            amount: booking.totalCost,
            category: "Refund",
            note: `Refund/Void for booking: ${booking.userName || booking.id}`,
            createdAt: Timestamp.now(),
            createdBy: "admin"
          });
        }

        await batch.commit();
      } catch (err) {
        console.error("Error refunding record:", err);
        alert("Failed to refund record.");
      }
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateDoc(doc(db, "bookings", id), {
        totalCost: editCost,
        status: editStatus,
        paymentMethod: editMethod
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error updating record:", err);
      alert("Failed to update record.");
    }
  };

  const startEditing = (booking: Booking) => {
    setEditingId(booking.id);
    setEditCost(booking.totalCost || 0);
    setEditStatus(booking.status);
    setEditMethod(booking.paymentMethod || "UPI");
  };

  useEffect(() => {
    // Fetch stations for mapping stationId to name
    const fetchStations = async () => {
      const snap = await getDocs(collection(db, "stations"));
      const data: Station[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Station));
      setStations(data);
    };
    fetchStations();

    // Fetch all bookings
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
      
      // Sort by createdAt descending
      data.sort((a, b) => {
        const timeA = typeof a.createdAt?.toDate === 'function' ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0));
        const timeB = typeof b.createdAt?.toDate === 'function' ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0));
        return timeB - timeA;
      });
      
      setBookings(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter(b => {
      // Filter out non-cost / pending slots
      const isValidStatus = ["completed", "active", "confirmed"].includes(b.status);
      const hasCost = b.totalCost !== undefined && b.totalCost > 0;
      
      if (!isValidStatus && !hasCost) return false;

      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      
      if (methodFilter !== "all") {
        const method = b.paymentMethod || "UPI"; // Default to UPI for legacy
        if (method !== methodFilter) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.userName?.toLowerCase().includes(q);
        const matchesId = b.id.toLowerCase().includes(q) || b.transactionId?.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });

    if (dateSort === "asc") {
      filtered.reverse(); // Since it's already sorted DESC, reversing makes it ASC
    }

    return filtered;
  }, [bookings, searchQuery, statusFilter, methodFilter, dateSort]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-yellow-500/30">
        <h2 className="text-2xl font-black tracking-widest uppercase text-yellow-500 text-neon-yellow flex items-center gap-2">
           <History className="w-6 h-6" /> PAYMENT_HISTORY
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 border border-slate-800 bg-slate-900/50 cyber-cut">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by Order ID, Txn ID, or Player Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black border border-slate-700 text-yellow-500 pl-10 pr-4 py-2 text-sm font-mono focus:outline-none focus:border-yellow-500 transition-colors"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="text-slate-500 w-4 h-4" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black border border-slate-700 text-slate-300 py-2 px-3 text-sm font-mono focus:outline-none focus:border-yellow-500"
          >
            <option value="all">ALL_STATUS</option>
            <option value="completed">COMPLETED</option>
            <option value="active">ACTIVE</option>
            <option value="confirmed">CONFIRMED</option>
          </select>

          <select 
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-black border border-slate-700 text-slate-300 py-2 px-3 text-sm font-mono focus:outline-none focus:border-yellow-500"
          >
            <option value="all">ALL_METHODS</option>
            <option value="Cash">CASH</option>
            <option value="UPI">UPI</option>
          </select>

          <select 
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as "desc" | "asc")}
            className="bg-black border border-slate-700 text-slate-300 py-2 px-3 text-sm font-mono focus:outline-none focus:border-yellow-500"
          >
            <option value="desc">NEWEST_FIRST</option>
            <option value="asc">OLDEST_FIRST</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-800 bg-black cyber-cut relative overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-yellow-500/70 uppercase text-xs tracking-widest">
                <th className="py-4 px-4 font-bold whitespace-nowrap">Date & Time</th>
                <th className="py-4 px-4 font-bold whitespace-nowrap">Order / Txn ID</th>
                <th className="py-4 px-4 font-bold whitespace-nowrap">Player Name</th>
                <th className="py-4 px-4 font-bold whitespace-nowrap">Station</th>
                <th className="py-4 px-4 font-bold whitespace-nowrap">Duration</th>
                <th className="py-4 px-4 font-bold text-right whitespace-nowrap">Amount (₹)</th>
                <th className="py-4 px-4 font-bold text-center whitespace-nowrap">Status / Mode</th>
                <th className="py-4 px-4 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-mono text-sm">
                    NO_PAYMENT_RECORDS_FOUND
                  </td>
                </tr>
              ) : (
                filteredBookings.map(booking => {
                  let bDate: Date | null = null;
                  const timeField = booking.createdAt || booking.startTime || booking.endTime;
                  if (timeField) {
                    if (typeof timeField.toDate === "function") {
                      bDate = timeField.toDate();
                    } else if (timeField.seconds) {
                      bDate = new Date(timeField.seconds * 1000);
                    } else {
                      bDate = new Date(timeField as unknown as string);
                    }
                  }

                  const station = stations.find(s => s.id === booking.stationId);
                  const stationDisplay = station ? `${station.name} (${station.type})` : booking.stationId || "General";

                  return (
                    <tr key={booking.id} className="hover:bg-slate-900/40 transition-colors group">
                      <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {bDate ? (
                          <>
                            <div className="text-slate-300 font-bold">{bDate.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-slate-500">{bDate.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                          </>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-cyan-400 font-bold text-xs">{booking.id}</div>
                        {booking.transactionId && <div className="text-slate-500 text-[10px] mt-0.5">{booking.transactionId}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold text-white uppercase text-xs">
                        <div>{booking.userName || "Walk-in"}</div>
                        {booking.userPhone && (
                          <div className="text-[10px] text-slate-500 font-mono font-normal normal-case mt-0.5">
                            {booking.userPhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs uppercase whitespace-nowrap">
                        {stationDisplay}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs whitespace-nowrap">
                        {booking.durationMinutes || 0} min
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {editingId === booking.id ? (
                          <input 
                            type="number" 
                            value={editCost} 
                            onChange={(e) => setEditCost(Number(e.target.value))}
                            className="w-20 bg-slate-900 border border-slate-700 text-emerald-400 px-2 py-1 focus:outline-none"
                          />
                        ) : (
                          <span className="font-black text-emerald-400 tracking-wider">₹{booking.totalCost || 0}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {editingId === booking.id ? (
                          <div className="flex flex-col gap-1">
                            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs text-white p-1">
                              <option value="completed">completed</option>
                              <option value="active">active</option>
                              <option value="confirmed">confirmed</option>
                              <option value="pending_payment">pending_payment</option>
                              <option value="failed">failed</option>
                            </select>
                            <input type="text" value={editMethod} onChange={(e) => setEditMethod(e.target.value)} className="bg-slate-900 border border-slate-700 text-xs text-white p-1" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 border text-[10px] font-black uppercase ${
                              booking.status === "completed" ? "border-green-500/50 text-green-400 bg-green-950/20" :
                              booking.status === "active" ? "border-cyan-500/50 text-cyan-400 bg-cyan-950/20" :
                              booking.status === "confirmed" ? "border-yellow-500/50 text-yellow-400 bg-yellow-950/20" :
                              "border-slate-500/50 text-slate-400 bg-slate-900/50"
                            }`}>
                              {booking.status}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                              {booking.paymentMethod || "UPI"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingId === booking.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleUpdate(booking.id)} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-black transition-colors" title="Save">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEditing(booking)} className="p-1.5 bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(booking)}
                              className="p-2 bg-red-950/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                              title="Refund / Void"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
