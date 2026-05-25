"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { DollarSign, TrendingUp, MonitorPlay, Gamepad2, CreditCard, Banknote, Plus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AccountingDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pcRevenue, setPcRevenue] = useState(0);
  const [consoleRevenue, setConsoleRevenue] = useState(0);
  
  const [cashRevenue, setCashRevenue] = useState(0);
  const [upiRevenue, setUpiRevenue] = useState(0);

  const [chartData, setChartData] = useState<{name: string, revenue: number}[]>([]);

  useEffect(() => {
    // 1. Fetch all stations to know their types
    const fetchStations = async () => {
      const snap = await getDocs(collection(db, "stations"));
      const data: Station[] = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Station));
      setStations(data);
    };
    fetchStations();

    // 2. Listen to completed bookings
    const q = query(collection(db, "bookings"), where("status", "==", "completed"), orderBy("endTime", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (stations.length === 0 || bookings.length === 0) return;

    let total = 0;
    let pcRev = 0;
    let consoleRev = 0;
    let cashRev = 0;
    let upiRev = 0;
    
    // Group by date for chart (Format: DD/MM)
    const dailyMap: Record<string, number> = {};

    bookings.forEach(booking => {
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
        const dateStr = booking.endTime.toDate().toLocaleDateString("en-GB", { day: '2-digit', month: 'short' });
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
    setChartData(chartArr.slice(-7)); // Last 7 days

  }, [bookings, stations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-emerald-500/30">
        <h2 className="text-2xl font-black tracking-widest uppercase text-emerald-500 text-neon-emerald flex items-center gap-2">
           <TrendingUp className="w-6 h-6" /> FINANCE_LEDGER
        </h2>
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
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
              <input type="number" className="w-full bg-black border border-slate-700 text-emerald-500 font-bold p-3 focus:outline-none focus:border-emerald-500" placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Note / Customer Name</label>
              <input type="text" className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500" placeholder="e.g. Walk-in Cash" />
            </div>
            <button className="w-full py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-500 font-black tracking-widest uppercase hover:bg-emerald-500 hover:text-black transition-colors flex justify-center items-center gap-2">
              <Plus className="w-4 h-4"/> LOG_CASH_ENTRY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
