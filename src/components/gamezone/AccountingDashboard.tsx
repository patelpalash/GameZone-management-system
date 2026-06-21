"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, getDocs, addDoc, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { DollarSign, TrendingUp, MonitorPlay, Gamepad2, CreditCard, Banknote, Plus, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountingDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pcRevenue, setPcRevenue] = useState(0);
  const [consoleRevenue, setConsoleRevenue] = useState(0);
  
  const [cashRevenue, setCashRevenue] = useState(0);
  const [upiRevenue, setUpiRevenue] = useState(0);

  const [chartData, setChartData] = useState<{name: string, revenue: number}[]>([]);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [stationId, setStationId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

  const handleDurationChange = (val: string) => {
    setDurationMinutes(val);
    if (stationId && val && !isNaN(Number(val))) {
      const station = stations.find(s => s.id === stationId);
      if (station) {
        const calculated = Math.round((station.pricePerHour / 60) * Number(val));
        setAmount(calculated.toString());
      }
    }
  };

  const handleStationChange = (val: string) => {
    setStationId(val);
    if (val && durationMinutes && !isNaN(Number(durationMinutes))) {
      const station = stations.find(s => s.id === val);
      if (station) {
        const calculated = Math.round((station.pricePerHour / 60) * Number(durationMinutes));
        setAmount(calculated.toString());
      }
    }
  };

  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const nowVal = Timestamp.now();
      const mockTxnId = "CASH-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      if (stationId) {
        const selectedStation = stations.find(s => s.id === stationId);
        if (!selectedStation) {
          setErrorMsg("Selected station not found");
          setIsSubmitting(false);
          return;
        }
        if (selectedStation.status !== "available") {
          setErrorMsg(`Station ${selectedStation.name} is not available (Current status: ${selectedStation.status})`);
          setIsSubmitting(false);
          return;
        }
        if (!durationMinutes || isNaN(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
          setErrorMsg("Please specify session duration in minutes");
          setIsSubmitting(false);
          return;
        }

        const durationVal = Number(durationMinutes);
        const startTime = Timestamp.fromDate(new Date());
        const endTime = Timestamp.fromDate(new Date(Date.now() + durationVal * 60 * 1000));

        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings"));
        const stationDocRef = doc(db, "stations", stationId);

        const newBooking = {
          id: bookingDocRef.id,
          stationId: stationId,
          userId: user?.uid || "walk-in-admin",
          userName: note || "Walk-in Cash Customer",
          durationMinutes: durationVal,
          totalCost: Number(amount),
          status: "active",
          transactionId: mockTxnId,
          paymentMethod: "Cash",
          startTime: startTime,
          endTime: endTime,
          createdAt: nowVal,
          isPrebook: false,
          notes: note || "Manual offline live session entry"
        };

        batch.set(bookingDocRef, newBooking);
        batch.update(stationDocRef, {
          status: "occupied",
          currentSessionId: bookingDocRef.id
        });

        await batch.commit();
        setSuccessMsg(`Logged & Activated ₹${amount} offline session for ${selectedStation.name} (Txn: ${mockTxnId})`);
      } else {
        const newBooking = {
          stationId: "general",
          userId: user?.uid || "walk-in-admin",
          userName: note || "Walk-in Cash Customer",
          durationMinutes: 0,
          totalCost: Number(amount),
          status: "completed",
          transactionId: mockTxnId,
          paymentMethod: "Cash",
          startTime: nowVal,
          endTime: nowVal,
          createdAt: nowVal,
          isPrebook: false,
          notes: note || "Manual admin cash entry"
        };

        await addDoc(collection(db, "bookings"), newBooking);
        setSuccessMsg(`Logged ₹${amount} cash entry (Txn: ${mockTxnId})`);
      }
      
      setAmount("");
      setNote("");
      setStationId("");
      setDurationMinutes("");
    } catch (err) {
      console.error("Error logging cash transaction:", err);
      setErrorMsg("Failed to register cash entry. Check logs.");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  useEffect(() => {
    // 1. Fetch all stations to know their types
    const fetchStations = async () => {
      const snap = await getDocs(collection(db, "stations"));
      const data: Station[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Station));
      setStations(data);
    };
    fetchStations();

    const q = query(collection(db, "bookings"), where("status", "==", "completed"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
      
      // Sort on client side by endTime ascending
      data.sort((a, b) => {
        const timeA = a.endTime?.toDate?.()?.getTime() || (a.endTime?.seconds ? a.endTime.seconds * 1000 : 0);
        const timeB = b.endTime?.toDate?.()?.getTime() || (b.endTime?.seconds ? b.endTime.seconds * 1000 : 0);
        return timeA - timeB;
      });
      
      setBookings(data);
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (!b.endTime) return false;
      
      let bDate: Date;
      if (typeof b.endTime.toDate === "function") {
        bDate = b.endTime.toDate();
      } else if (b.endTime.seconds) {
        bDate = new Date(b.endTime.seconds * 1000);
      } else {
        bDate = new Date(b.endTime as unknown as string);
      }
      
      const checkDate = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate());

      if (startDateStr) {
        const start = new Date(startDateStr);
        const checkStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (checkDate < checkStart) return false;
      }

      if (endDateStr) {
        const end = new Date(endDateStr);
        const checkEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (checkDate > checkEnd) return false;
      }

      return true;
    });
  }, [bookings, startDateStr, endDateStr]);

  const exportToCSV = () => {
    if (filteredBookings.length === 0) return;

    const headers = ["Order ID", "Station ID", "User Name", "Duration (Min)", "Total Cost (INR)", "Payment Method", "Timestamp"];
    const rows = filteredBookings.map(b => {
      let bDateStr = "";
      if (b.endTime) {
        if (typeof b.endTime.toDate === "function") {
          bDateStr = b.endTime.toDate().toISOString();
        } else if (b.endTime.seconds) {
          bDateStr = new Date(b.endTime.seconds * 1000).toISOString();
        } else {
          bDateStr = new Date(b.endTime as unknown as string).toISOString();
        }
      }
      return [
        b.id,
        b.stationId,
        b.userName || "Walk-in",
        b.durationMinutes,
        b.totalCost,
        b.paymentMethod || "UPI",
        bDateStr
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance_ledger_${startDateStr || "start"}_to_${endDateStr || "end"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (stations.length === 0) return;

    let total = 0;
    let pcRev = 0;
    let consoleRev = 0;
    let cashRev = 0;
    let upiRev = 0;
    
    // Group by date for chart (Format: DD/MM)
    const dailyMap: Record<string, number> = {};

    filteredBookings.forEach(booking => {
      const amount = booking.totalCost;
      total += amount;

      // Hardware ROI
      const station = stations.find(s => s.id === booking.stationId);
      if (station) {
        if (station.type === "PC") pcRev += amount;
        else consoleRev += amount;
      }

      // Payment Type
      if (booking.paymentMethod === "Cash") cashRev += amount;
      else upiRev += amount;

      // Daily Chart Data
      if (booking.endTime) {
        let bDate: Date;
        if (typeof booking.endTime.toDate === "function") {
          bDate = booking.endTime.toDate();
        } else if (booking.endTime.seconds) {
          bDate = new Date(booking.endTime.seconds * 1000);
        } else {
          bDate = new Date(booking.endTime as unknown as string);
        }
        const dateStr = bDate.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + amount;
      }
    });

    setTotalRevenue(total);
    setPcRevenue(pcRev);
    setConsoleRevenue(consoleRev);
    setCashRevenue(cashRev);
    setUpiRevenue(upiRev);

    // Convert map to array for Recharts
    const chartArr = Object.keys(dailyMap).map(date => ({
      name: date,
      revenue: dailyMap[date]
    }));
    setChartData(chartArr);

  }, [filteredBookings, stations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-emerald-500/30">
        <h2 className="text-2xl font-black tracking-widest uppercase text-emerald-500 text-neon-emerald flex items-center gap-2">
           <TrendingUp className="w-6 h-6" /> FINANCE_LEDGER
        </h2>
      </div>

      {/* Date Filter & Export Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 border border-slate-800 bg-slate-950/40 cyber-cut">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">From:</span>
            <input 
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">To:</span>
            <input 
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          {(startDateStr || endDateStr) && (
            <button 
              onClick={() => { setStartDateStr(""); setEndDateStr(""); }}
              className="px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-950/20 text-xs font-bold tracking-wider uppercase font-mono transition-all"
            >
              RESET_FILTER
            </button>
          )}
        </div>
        <button
          onClick={exportToCSV}
          disabled={filteredBookings.length === 0}
          className="px-4 py-2 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cyber-cut-reverse disabled:opacity-50"
        >
          <Download size={14} /> EXPORT_CSV ({filteredBookings.length})
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border-2 border-emerald-500/50 bg-emerald-950/20 cyber-cut relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-xs font-bold tracking-widest text-emerald-500/70 uppercase">Total_Revenue</p>
          <h3 className="text-4xl font-black text-emerald-500 mt-2 glow-emerald">₹{totalRevenue.toLocaleString()}</h3>
        </div>

        <div className="p-4 border-2 border-cyan-500/50 bg-cyan-950/20 cyber-cut relative overflow-hidden">
          <p className="text-xs font-bold tracking-widest text-cyan-500/70 uppercase flex items-center gap-1"><MonitorPlay className="w-3 h-3"/> PC_Revenue</p>
          <h3 className="text-3xl font-black text-cyan-500 mt-2 glow-cyan">₹{pcRevenue.toLocaleString()}</h3>
        </div>

        <div className="p-4 border-2 border-pink-500/50 bg-pink-950/20 cyber-cut relative overflow-hidden">
          <p className="text-xs font-bold tracking-widest text-pink-500/70 uppercase flex items-center gap-1"><Gamepad2 className="w-3 h-3"/> Console_Revenue</p>
          <h3 className="text-3xl font-black text-pink-500 mt-2 glow-pink">₹{consoleRevenue.toLocaleString()}</h3>
        </div>
        
        <div className="p-4 border-2 border-yellow-400/50 bg-yellow-400/5 cyber-cut flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center text-sm font-mono text-yellow-400/80">
            <span className="flex items-center gap-1"><CreditCard className="w-3 h-3"/> UPI:</span>
            <span className="font-bold text-white">₹{upiRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-mono text-yellow-400/80">
            <span className="flex items-center gap-1"><Banknote className="w-3 h-3"/> CASH:</span>
            <span className="font-bold text-white">₹{cashRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="xl:col-span-2 p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut-reverse">
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6">Revenue_Trend (Last 7 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip 
                  cursor={{ fill: '#0f172a' }}
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#10b981', color: '#10b981', borderRadius: 0, fontFamily: 'monospace' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offline Payment Logger */}
        <div className="p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut">
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4">Log_Offline_Transaction</h3>
          <p className="text-xs text-slate-500 font-mono mb-6">
            &gt; Use this to manually log over-the-counter cash payments that bypass the digital UPI gateway.
          </p>
          
          <form onSubmit={handleLogCash} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
              <input 
                type="number" 
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black border border-slate-700 text-emerald-500 font-bold p-3 focus:outline-none focus:border-emerald-500" 
                placeholder="0.00" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Note / Customer Name</label>
              <input 
                type="text" 
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500" 
                placeholder="e.g. Walk-in Cash / Player Name" 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Station Node (Optional)</label>
              <select
                value={stationId}
                onChange={(e) => handleStationChange(e.target.value)}
                className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              >
                <option value="">None (General Revenue)</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
            </div>

            {stationId && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Session Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  placeholder="e.g. 60"
                />
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-500 font-mono font-bold">&gt; ERROR: {errorMsg}</p>
            )}
            
            {successMsg && (
              <p className="text-xs text-emerald-500 font-mono font-bold">&gt; SUCCESS: {successMsg}</p>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-500 font-black tracking-widest uppercase hover:bg-emerald-500 hover:text-black transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4"/>
              )}
              {isSubmitting ? "PROCESSING..." : "LOG_CASH_ENTRY"}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction List Table */}
      <div className="p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut">
        <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4">Transaction_Log</h3>
        <p className="text-xs text-slate-500 font-mono mb-6">
          &gt; Showing {filteredBookings.length} completed transactions for the active filter range.
        </p>

        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 bg-black font-mono text-slate-500 text-sm">
            NO_RECORDS_DETECTED
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Order ID / Txn</th>
                  <th className="py-3 px-4">Operative</th>
                  <th className="py-3 px-4">Node</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredBookings.slice().reverse().map((booking) => {
                  let bDate: Date | null = null;
                  if (booking.endTime) {
                    if (typeof booking.endTime.toDate === "function") {
                      bDate = booking.endTime.toDate();
                    } else if (booking.endTime.seconds) {
                      bDate = new Date(booking.endTime.seconds * 1000);
                    } else {
                      bDate = new Date(booking.endTime as unknown as string);
                    }
                  }
                  return (
                    <tr key={booking.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">
                        {bDate ? bDate.toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        }) : "—"}
                      </td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">{booking.id}</td>
                      <td className="py-3 px-4 text-slate-300">{booking.userName || "Walk-in"}</td>
                      <td className="py-3 px-4 text-slate-300 uppercase">
                        {stations.find(s => s.id === booking.stationId)?.name || booking.stationId || "General"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 border text-[10px] font-black uppercase ${
                          booking.paymentMethod === "Cash" ? "border-green-500/50 text-green-400 bg-green-950/20" : "border-cyan-500/50 text-cyan-400 bg-cyan-950/20"
                        }`}>
                          {booking.paymentMethod || "UPI"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">₹{booking.totalCost}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
