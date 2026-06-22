"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, addDoc, Timestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { DollarSign, TrendingUp, MonitorPlay, Gamepad2, CreditCard, Banknote, Plus, Download, Store, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { DoubleEntryLedger, LedgerTransaction } from "./finance/DoubleEntryLedger";
import ExpenseManager from "./finance/ExpenseManager";
import InventoryManager from "./finance/InventoryManager";
import { getExpensesForDateRange, getInventorySalesForDateRange, Expense, InventorySale } from "@/lib/financeApi";

export default function AccountingDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);

  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");

  const [activeTab, setActiveTab] = useState<"ledger" | "inventory" | "expenses">("ledger");

  // Offline log state
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [stationId, setStationId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // 1. Fetch Stations
    const fetchStations = async () => {
      onSnapshot(collection(db, "stations"), (snap) => {
        const data: Station[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() } as Station));
        setStations(data);
      });
    };
    fetchStations();

    // 2. Fetch Bookings
    const q = query(collection(db, "bookings"), where("status", "==", "completed"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Booking));
      setBookings(data);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Finance Data
  useEffect(() => {
    const fetchFinance = async () => {
      try {
        const start = startDateStr ? new Date(startDateStr) : new Date(0); // Epoch if none
        const end = endDateStr ? new Date(endDateStr) : new Date(2100, 1, 1);
        
        // Include time up to the end of the day for endDate
        end.setHours(23, 59, 59, 999);

        const exp = await getExpensesForDateRange(start, end);
        const invSales = await getInventorySalesForDateRange(start, end);
        
        setExpenses(exp);
        setInventorySales(invSales);
      } catch (err) {
        console.error("Finance fetch error:", err);
      }
    };
    fetchFinance();
  }, [startDateStr, endDateStr]);

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
        if (checkDate < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
      }

      if (endDateStr) {
        const end = new Date(endDateStr);
        if (checkDate > new Date(end.getFullYear(), end.getMonth(), end.getDate())) return false;
      }

      return true;
    });
  }, [bookings, startDateStr, endDateStr]);

  // Aggregate Master Ledger
  const ledgerTransactions: LedgerTransaction[] = useMemo(() => {
    const txList: LedgerTransaction[] = [];
    
    // 1. Add Bookings Revenue
    filteredBookings.forEach(b => {
      const bDate = typeof b.endTime?.toDate === "function" ? b.endTime.toDate() : new Date(b.endTime as unknown as string);
      txList.push({
        id: b.id,
        dateStr: bDate.toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: bDate.getTime(),
        description: `Booking: ${b.userName || "Walk-in"} (${stations.find(s => s.id === b.stationId)?.name || b.stationId})`,
        type: 'revenue',
        amount: b.totalCost
      });
    });

    // 2. Add Inventory Sales Revenue
    inventorySales.forEach(sale => {
      const sDate = sale.createdAt.toDate();
      txList.push({
        id: sale.id || Math.random().toString(),
        dateStr: sDate.toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: sDate.getTime(),
        description: `Inventory Sale: ${sale.quantity}x ${sale.itemName}`,
        type: 'revenue',
        amount: sale.totalRevenue
      });
    });

    // 3. Add Expenses
    expenses.forEach(exp => {
      const eDate = exp.createdAt.toDate();
      txList.push({
        id: exp.id || Math.random().toString(),
        dateStr: eDate.toLocaleString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }),
        timestamp: eDate.getTime(),
        description: `Expense (${exp.category}): ${exp.note}`,
        type: 'expense',
        amount: exp.amount
      });
    });

    return txList.sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
  }, [filteredBookings, inventorySales, expenses, stations]);

  // Calculate Metrics
  const { totalRev, totalExp, pcRev, consoleRev, cashRev, upiRev, invRev } = useMemo(() => {
    let tr = 0, te = 0, pr = 0, cr = 0, cash = 0, upi = 0, inv = 0;

    filteredBookings.forEach(b => {
      tr += b.totalCost;
      const st = stations.find(s => s.id === b.stationId);
      if (st?.type === 'PC') pr += b.totalCost;
      else if (st?.type === 'PS5' || st?.type === 'Xbox') cr += b.totalCost;

      if (b.paymentMethod === "Cash") cash += b.totalCost;
      else upi += b.totalCost;
    });

    inventorySales.forEach(s => {
      tr += s.totalRevenue;
      inv += s.totalRevenue;
      cash += s.totalRevenue; // Assuming snacks are usually cash. Adapt if you track UPI for snacks.
    });

    expenses.forEach(e => {
      te += e.amount;
    });

    return { totalRev: tr, totalExp: te, pcRev: pr, consoleRev: cr, cashRev: cash, upiRev: upi, invRev: inv };
  }, [filteredBookings, inventorySales, expenses, stations]);

  const netProfit = totalRev - totalExp;

  // Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const dataMap: Record<string, { name: string, revenue: number, expenses: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dataMap[dateStr] = { name: dateStr, revenue: 0, expenses: 0 };
    }

    ledgerTransactions.forEach(tx => {
      const d = new Date(tx.timestamp);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dataMap[dateStr]) {
        if (tx.type === 'revenue') dataMap[dateStr].revenue += tx.amount;
        else dataMap[dateStr].expenses += tx.amount;
      }
    });

    return Object.values(dataMap);
  }, [ledgerTransactions]);

  const handleDurationChange = (val: string) => {
    setDurationMinutes(val);
    if (stationId && val && !isNaN(Number(val))) {
      const station = stations.find(s => s.id === stationId);
      if (station) setAmount(Math.round((station.pricePerHour / 60) * Number(val)).toString());
    }
  };

  const handleStationChange = (val: string) => {
    setStationId(val);
    if (val && durationMinutes && !isNaN(Number(durationMinutes))) {
      const station = stations.find(s => s.id === val);
      if (station) setAmount(Math.round((station.pricePerHour / 60) * Number(durationMinutes)).toString());
    }
  };

  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Please enter a valid amount");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(""); setSuccessMsg("");

    try {
      const nowVal = Timestamp.now();
      const mockTxnId = "CASH-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      
      if (stationId) {
        const selectedStation = stations.find(s => s.id === stationId);
        if (!selectedStation) throw new Error("Station not found");
        if (selectedStation.status !== "available") throw new Error(`Station is ${selectedStation.status}`);
        
        const durationVal = Number(durationMinutes);
        const startTime = Timestamp.fromDate(new Date());
        const endTime = Timestamp.fromDate(new Date(Date.now() + durationVal * 60 * 1000));

        const batch = writeBatch(db);
        const bookingDocRef = doc(collection(db, "bookings"));
        const stationDocRef = doc(db, "stations", stationId);

        batch.set(bookingDocRef, {
          id: bookingDocRef.id,
          stationId, userId: user?.uid || "admin",
          userName: note || "Walk-in Cash Customer",
          durationMinutes: durationVal, totalCost: Number(amount),
          status: "active", transactionId: mockTxnId, paymentMethod: "Cash",
          startTime, endTime, createdAt: nowVal, isPrebook: false,
          notes: note || "Manual offline live session entry"
        });
        batch.update(stationDocRef, { status: "occupied", currentSessionId: bookingDocRef.id });
        await batch.commit();
        setSuccessMsg(`Logged & Activated ₹${amount} offline session for ${selectedStation.name}`);
      } else {
        await addDoc(collection(db, "bookings"), {
          stationId: "general", userId: user?.uid || "admin",
          userName: note || "Walk-in Cash Customer", durationMinutes: 0,
          totalCost: Number(amount), status: "completed", transactionId: mockTxnId,
          paymentMethod: "Cash", startTime: nowVal, endTime: nowVal, createdAt: nowVal,
          isPrebook: false, notes: note || "Manual admin cash entry"
        });
        setSuccessMsg(`Logged ₹${amount} cash entry`);
      }
      setAmount(""); setNote(""); setStationId(""); setDurationMinutes("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message || "Failed to register cash entry");
      } else {
        setErrorMsg("Failed to register cash entry");
      }
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    }
  };

  const exportToCSV = () => {
    if (ledgerTransactions.length === 0) return;
    const headers = ["Timestamp", "Description", "Type", "Amount (INR)"];
    const rows = ledgerTransactions.map(tx => [
      new Date(tx.timestamp).toISOString(),
      tx.description,
      tx.type,
      tx.amount
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `master_ledger_${startDateStr || "all"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-emerald-500/30">
        <h2 className="text-2xl font-black tracking-widest uppercase text-emerald-500 flex items-center gap-2">
           <TrendingUp className="w-6 h-6" /> MASTER_LEDGER
        </h2>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("ledger")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all ${activeTab === 'ledger' ? 'bg-emerald-500 text-black' : 'border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}>Overview</button>
          <button onClick={() => setActiveTab("inventory")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all ${activeTab === 'inventory' ? 'bg-cyan-500 text-black' : 'border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10'}`}>Inventory</button>
          <button onClick={() => setActiveTab("expenses")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all ${activeTab === 'expenses' ? 'bg-pink-500 text-black' : 'border border-pink-500/30 text-pink-500 hover:bg-pink-500/10'}`}>Expenses</button>
        </div>
      </div>

      {activeTab === "inventory" && <InventoryManager />}
      {activeTab === "expenses" && <ExpenseManager />}

      {activeTab === "ledger" && (
        <div className="space-y-6 animate-fade-in">
          {/* Date Filter & Export Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 border border-slate-800 bg-slate-950/40 cyber-cut">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono">From:</span>
                <input type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase font-mono">To:</span>
                <input type="date" value={endDateStr} onChange={(e) => setEndDateStr(e.target.value)} className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500" />
              </div>
              {(startDateStr || endDateStr) && (
                <button onClick={() => { setStartDateStr(""); setEndDateStr(""); }} className="px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-950/20 text-xs font-bold tracking-wider uppercase font-mono">RESET</button>
              )}
            </div>
            <button onClick={exportToCSV} disabled={ledgerTransactions.length === 0} className="px-4 py-2 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest hover:bg-emerald-400 flex gap-2 cyber-cut-reverse disabled:opacity-50">
              <Download size={14} /> EXPORT_CSV
            </button>
          </div>

          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 border-2 cyber-cut relative overflow-hidden group ${netProfit >= 0 ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-red-500/50 bg-red-950/20'}`}>
              <div className="absolute top-0 right-0 p-2 opacity-10"><DollarSign className="w-24 h-24" /></div>
              <p className="text-xs font-bold tracking-widest uppercase opacity-70">Net_Profit</p>
              <h3 className={`text-4xl font-black mt-2 ${netProfit >= 0 ? 'text-emerald-500 glow-emerald' : 'text-red-500 glow-red'}`}>₹{netProfit.toLocaleString()}</h3>
            </div>

            <div className="p-4 border-2 border-cyan-500/50 bg-cyan-950/20 cyber-cut flex flex-col justify-center gap-2">
              <div className="flex justify-between items-center text-xs font-mono text-cyan-500/80 uppercase tracking-wider">
                <span className="flex items-center gap-1"><MonitorPlay className="w-3 h-3"/> PC Rev</span>
                <span className="font-bold text-white">₹{pcRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-cyan-500/80 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3"/> Console Rev</span>
                <span className="font-bold text-white">₹{consoleRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono text-cyan-500/80 uppercase tracking-wider border-t border-cyan-500/30 pt-1 mt-1">
                <span className="flex items-center gap-1"><Store className="w-3 h-3"/> Inventory</span>
                <span className="font-bold text-white">₹{invRev.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 border-2 border-pink-500/50 bg-pink-950/20 cyber-cut flex flex-col justify-center gap-2 relative">
              <p className="text-xs font-bold tracking-widest text-pink-500/70 uppercase flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Total_Expenses</p>
              <h3 className="text-3xl font-black text-pink-500 mt-2 glow-pink">₹{totalExp.toLocaleString()}</h3>
            </div>
            
            <div className="p-4 border-2 border-yellow-400/50 bg-yellow-400/5 cyber-cut flex flex-col justify-center gap-2">
              <div className="flex justify-between items-center text-sm font-mono text-yellow-400/80">
                <span className="flex items-center gap-1"><CreditCard className="w-3 h-3"/> UPI:</span>
                <span className="font-bold text-white">₹{upiRev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono text-yellow-400/80">
                <span className="flex items-center gap-1"><Banknote className="w-3 h-3"/> CASH:</span>
                <span className="font-bold text-white">₹{cashRev.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="xl:col-span-2 p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut-reverse">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-6">Revenue vs Expenses (Last 7 Days)</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip cursor={{ fill: '#0f172a' }} contentStyle={{ backgroundColor: '#020617', borderColor: '#10b981', color: '#10b981', fontFamily: 'monospace' }} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[2, 2, 0, 0]} name="Revenue" />
                    <Bar dataKey="expenses" fill="#ec4899" radius={[2, 2, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Offline Payment Logger */}
            <div className="p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4">Log_Offline_Booking</h3>
              <p className="text-[10px] text-slate-500 font-mono mb-4 border-b border-slate-800 pb-2">
                Use this to log walk-in console/PC sessions. For Snacks/Drinks, use the Inventory Tab.
              </p>
              
              <form onSubmit={handleLogCash} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
                  <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-black border border-slate-700 text-emerald-500 font-bold p-3 focus:outline-none focus:border-emerald-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Customer / Note</label>
                  <input type="text" required value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500" placeholder="Walk-in" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Station Node</label>
                  <select value={stationId} onChange={(e) => handleStationChange(e.target.value)} className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500 font-mono text-xs">
                    <option value="">None (General Revenue)</option>
                    {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                  </select>
                </div>

                {stationId && (
                  <div className="animate-fade-in">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Duration (Min)</label>
                    <input type="number" required min="1" value={durationMinutes} onChange={(e) => handleDurationChange(e.target.value)} className="w-full bg-black border border-slate-700 text-white p-3 focus:outline-none focus:border-emerald-500 font-mono text-xs" />
                  </div>
                )}

                {errorMsg && <p className="text-xs text-red-500 font-mono">&gt; {errorMsg}</p>}
                {successMsg && <p className="text-xs text-emerald-500 font-mono">&gt; {successMsg}</p>}

                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-500 font-black tracking-widest uppercase hover:bg-emerald-500 hover:text-black transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4"/>}
                  LOG_BOOKING
                </button>
              </form>
            </div>
          </div>

          <DoubleEntryLedger transactions={ledgerTransactions} />
        </div>
      )}
    </div>
  );
}
