"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking, Station } from "@/types";
import { DollarSign, TrendingUp, MonitorPlay, Gamepad2, CreditCard, Banknote, Download, Store, TrendingDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DoubleEntryLedger, LedgerTransaction } from "./finance/DoubleEntryLedger";
import ExpenseManager from "./finance/ExpenseManager";
import InventorySalesHistory from "./finance/InventorySalesHistory";
import { Expense, InventorySale } from "@/lib/financeApi";

export default function AccountingDashboard({ initialTab = "ledger" }: { initialTab?: "ledger" | "inventory_sales" | "expenses" }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);

  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDateStr, setEndDateStr] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [chartDays, setChartDays] = useState<number>(7);

  const quickSelectValue = useMemo(() => {
    if (!startDateStr && !endDateStr) return 'all';
    if (!endDateStr && startDateStr) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = new Date(startDateStr);
      start.setHours(0,0,0,0);
      const diff = Math.round((today.getTime() - start.getTime()) / (1000 * 3600 * 24));
      if (diff === 0) return '0';
      if (diff === 7) return '7';
      if (diff === 10) return '10';
      if (diff === 15) return '15';
      if (diff === 30) return '30';
      if (diff === 365) return '365';
    }
    return 'custom';
  }, [startDateStr, endDateStr]);

  const [activeTab, setActiveTab] = useState<"ledger" | "inventory_sales" | "expenses">(initialTab);

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

    // 2. Fetch Bookings (include refunded so the ledger shows the original revenue, balanced by the refund expense)
    const q = query(collection(db, "bookings"), where("status", "in", ["completed", "refunded", "active", "confirmed"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Booking));
      setBookings(data);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Finance Data
  useEffect(() => {
    const dashboardStart = startDateStr ? new Date(startDateStr + "T00:00:00").getTime() : 0;
    const dashboardEnd = endDateStr ? new Date(endDateStr + "T23:59:59.999").getTime() : new Date(2100, 1, 1).getTime();
    
    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - chartDays);
    chartStart.setHours(0,0,0,0);
    
    const fetchStart = new Date(Math.min(dashboardStart, chartStart.getTime()));
    const fetchEnd = new Date(Math.max(dashboardEnd, Date.now()));

    const qExp = query(
      collection(db, "expenses"),
      where("createdAt", ">=", Timestamp.fromDate(fetchStart)),
      where("createdAt", "<=", Timestamp.fromDate(fetchEnd)),
      orderBy("createdAt", "desc")
    );
    const unsubExp = onSnapshot(qExp, (snap) => {
      const data: Expense[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Expense));
      setExpenses(data);
    });

    const qInv = query(
      collection(db, "inventory_sales"),
      where("createdAt", ">=", Timestamp.fromDate(fetchStart)),
      where("createdAt", "<=", Timestamp.fromDate(fetchEnd)),
      orderBy("createdAt", "desc")
    );
    const unsubInv = onSnapshot(qInv, (snap) => {
      const data: InventorySale[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as InventorySale));
      setInventorySales(data);
    });

    return () => {
      unsubExp();
      unsubInv();
    };
  }, [startDateStr, endDateStr, chartDays]);

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
        const start = new Date(startDateStr + "T00:00:00");
        if (checkDate < new Date(start.getFullYear(), start.getMonth(), start.getDate())) return false;
      }

      if (endDateStr) {
        const end = new Date(endDateStr + "T00:00:00");
        if (checkDate > new Date(end.getFullYear(), end.getMonth(), end.getDate())) return false;
      }

      return true;
    });
  }, [bookings, startDateStr, endDateStr]);

  // Unified Transactions List (Unfiltered)
  const allTransactions = useMemo(() => {
    const txList: LedgerTransaction[] = [];
    
    // 1. Add Bookings Revenue
    bookings.forEach(b => {
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

    return txList.sort((a, b) => b.timestamp - a.timestamp);
  }, [bookings, inventorySales, expenses, stations]);

  const ledgerTransactions = useMemo(() => {
    const dashboardStart = startDateStr ? new Date(startDateStr + "T00:00:00").getTime() : 0;
    const dashboardEnd = endDateStr ? new Date(endDateStr + "T23:59:59.999").getTime() : new Date(2100, 1, 1).getTime();
    return allTransactions.filter(tx => tx.timestamp >= dashboardStart && tx.timestamp <= dashboardEnd);
  }, [allTransactions, startDateStr, endDateStr]);

  const { totalRev, totalExp, pcRev, consoleRev, cashRev, upiRev, invRev } = useMemo(() => {
    const dashboardStart = startDateStr ? new Date(startDateStr + "T00:00:00").getTime() : 0;
    const dashboardEnd = endDateStr ? new Date(endDateStr + "T23:59:59.999").getTime() : new Date(2100, 1, 1).getTime();

    let tr = 0, te = 0, pr = 0, cr = 0, cash = 0, upi = 0, inv = 0;

    filteredBookings.forEach(b => {
      if (b.status === "refunded") return; // Net zero impact on KPIs

      tr += b.totalCost;
      const st = stations.find(s => s.id === b.stationId);
      if (st?.type === 'PC') pr += b.totalCost;
      else if (st?.type === 'PS5' || st?.type === 'Xbox') cr += b.totalCost;

      const amt = b.totalCost;
      const cashAmt = b.splitCash || 0;
      const onlineAmt = b.splitOnline || 0;

      if (b.paymentMethod === "Cash") {
        cash += amt;
      } else if (b.paymentMethod === "Split") {
        cash += cashAmt;
        upi += onlineAmt;
      } else {
        upi += amt;
      }
    });

    inventorySales.forEach(s => {
      const t = s.createdAt.toDate().getTime();
      if (t < dashboardStart || t > dashboardEnd) return;
      tr += s.totalRevenue;
      inv += s.totalRevenue;
      if (s.paymentMethod === "Split") {
        cash += (s.splitCash || 0);
        upi += (s.splitOnline || 0);
      } else if (s.paymentMethod === "Cash" || !s.paymentMethod) {
        cash += s.totalRevenue;
      } else {
        upi += s.totalRevenue;
      }
    });

    expenses.forEach(e => {
      const t = e.createdAt.toDate().getTime();
      if (t < dashboardStart || t > dashboardEnd) return;
      te += e.amount;
    });

    return { totalRev: tr, totalExp: te, pcRev: pr, consoleRev: cr, cashRev: cash, upiRev: upi, invRev: inv };
  }, [filteredBookings, inventorySales, expenses, stations, startDateStr, endDateStr]);

  const netProfit = totalRev - totalExp;

  // Chart Data (Dynamic Dates independent of ledger)
  const chartData = useMemo(() => {
    const dataMap: Record<string, { name: string, revenue: number, expenses: number, timestamp: number }> = {};
    
    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - chartDays);
    chartStart.setHours(0,0,0,0);
    const chartStartMs = chartStart.getTime();

    allTransactions.forEach(tx => {
      if (tx.timestamp < chartStartMs) return;

      const d = new Date(tx.timestamp);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!dataMap[dateStr]) {
        dataMap[dateStr] = { name: dateStr, revenue: 0, expenses: 0, timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() };
      }
      
      if (tx.type === 'revenue') dataMap[dateStr].revenue += tx.amount;
      else dataMap[dateStr].expenses += tx.amount;
    });

    return Object.values(dataMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [allTransactions, chartDays]);

  // Revenue breakdown for PieChart
  const pieData = useMemo(() => {
    return [
      { name: "PC Revenue", value: pcRev, color: "#06b6d4" },
      { name: "Console Revenue", value: consoleRev, color: "#8b5cf6" },
      { name: "Inventory", value: invRev, color: "#f59e0b" },
    ].filter(item => item.value > 0);
  }, [pcRev, consoleRev, invRev]);

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

  const exportToPDF = () => {
    if (ledgerTransactions.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    let html = `
      <html>
        <head>
          <title>Master Ledger - ${startDateStr || 'All Time'}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .profit { color: #16a34a; font-weight: bold; }
            .expense { color: #dc2626; font-weight: bold; }
            .header { text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>MASTER LEDGER</h2>
            <p>Date Range: ${startDateStr || 'Start'} to ${endDateStr || 'Today'}</p>
          </div>
          <table>
            <thead>
              <tr><th>Date & Time</th><th>Description</th><th>Debit (In)</th><th>Credit (Out)</th></tr>
            </thead>
            <tbody>
    `;
    
    // Sort chronological for PDF
    const sortedForPdf = [...ledgerTransactions].sort((a,b) => a.timestamp - b.timestamp);
    
    sortedForPdf.forEach(tx => {
      const isExpense = tx.type === 'expense' || tx.type === 'refund';
      html += `
        <tr>
          <td>${new Date(tx.timestamp).toLocaleString()}</td>
          <td>${tx.description}</td>
          <td class="profit">${!isExpense ? '+₹' + tx.amount.toLocaleString() : '-'}</td>
          <td class="expense">${isExpense ? '-₹' + tx.amount.toLocaleString() : '-'}</td>
        </tr>
      `;
    });
    
    html += `
            </tbody>
          </table>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 pb-2 border-b border-emerald-500/30 gap-4">
        <h2 className="text-2xl font-black tracking-widest uppercase text-emerald-500 flex items-center gap-2">
           <TrendingUp className="w-6 h-6" /> MASTER_LEDGER
        </h2>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto pb-2 md:pb-0">
          <button onClick={() => setActiveTab("ledger")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all shrink-0 ${activeTab === 'ledger' ? 'bg-emerald-500 text-black' : 'border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}>Overview</button>
          <button onClick={() => setActiveTab("inventory_sales")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all shrink-0 ${activeTab === 'inventory_sales' ? 'bg-cyan-500 text-black' : 'border border-cyan-500/30 text-cyan-500 hover:bg-cyan-500/10'}`}>Inventory_Payments</button>
          <button onClick={() => setActiveTab("expenses")} className={`px-4 py-2 font-black uppercase text-xs tracking-widest cyber-cut transition-all shrink-0 ${activeTab === 'expenses' ? 'bg-pink-500 text-black' : 'border border-pink-500/30 text-pink-500 hover:bg-pink-500/10'}`}>Expenses</button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 border border-slate-800 bg-slate-950/40 cyber-cut">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <select 
            value={quickSelectValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all') {
                setStartDateStr(''); setEndDateStr('');
              } else if (val !== 'custom') {
                const d = new Date();
                d.setDate(d.getDate() - parseInt(val));
                setStartDateStr(d.toISOString().split('T')[0]);
                setEndDateStr('');
              }
            }}
            className="bg-black border border-slate-800 text-cyan-500 text-xs font-mono p-2 focus:outline-none focus:border-cyan-500 cursor-pointer uppercase tracking-widest"
          >
            <option value="custom" disabled hidden>Custom Range</option>
            <option value="0">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="10">Last 10 Days</option>
            <option value="15">Last 15 Days</option>
            <option value="30">Monthly</option>
            <option value="365">Yearly</option>
            <option value="all">All Time</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">From:</span>
            <input type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase font-mono">To:</span>
            <input type="date" value={endDateStr} onChange={(e) => setEndDateStr(e.target.value)} className="bg-black border border-slate-800 text-emerald-500 text-xs font-mono p-2 focus:outline-none focus:border-emerald-500" />
          </div>
          {(startDateStr || endDateStr) && (
            <button onClick={() => { setStartDateStr(""); setEndDateStr(""); }} className="w-full sm:w-auto px-3 py-1.5 border border-red-500/50 text-red-400 hover:bg-red-950/20 text-xs font-bold tracking-wider uppercase font-mono mt-2 sm:mt-0">RESET</button>
          )}
        </div>
        
        {activeTab === "ledger" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
            <button onClick={exportToCSV} disabled={ledgerTransactions.length === 0} className="w-full sm:w-auto px-4 py-2 bg-emerald-500 text-black font-black uppercase text-xs tracking-widest hover:bg-emerald-400 flex justify-center items-center gap-2 cyber-cut-reverse disabled:opacity-50">
              <Download size={14} /> EXPORT_CSV
            </button>
            <button onClick={exportToPDF} disabled={ledgerTransactions.length === 0} className="w-full sm:w-auto px-4 py-2 bg-pink-500 text-black font-black uppercase text-xs tracking-widest hover:bg-pink-400 flex justify-center items-center gap-2 cyber-cut-reverse disabled:opacity-50">
              <Download size={14} /> EXPORT_PDF
            </button>
          </div>
        )}
      </div>

      {activeTab === "inventory_sales" && <InventorySalesHistory sales={inventorySales} />}
      {activeTab === "expenses" && <ExpenseManager expenses={expenses} dateLabel={quickSelectValue === 'all' ? 'All Time' : quickSelectValue === '0' ? 'Today' : quickSelectValue === 'custom' ? 'Custom Range' : `Last ${quickSelectValue} Days`} />}

      {activeTab === "ledger" && (
        <div className="space-y-6 animate-fade-in">

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
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Revenue vs Expenses</h3>
                  <select 
                    value={chartDays} 
                    onChange={(e) => setChartDays(Number(e.target.value))}
                    className="mt-1 bg-slate-950 border border-slate-800 text-cyan-500 font-mono text-xs px-2 py-1 rounded outline-none"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={15}>Last 15 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                  </select>
                </div>
                <div className="flex bg-slate-950 border border-slate-800 rounded overflow-hidden">
                  <button 
                    onClick={() => setChartType("bar")}
                    className={`px-3 py-1 text-xs font-mono font-bold transition-colors ${chartType === 'bar' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                  >BAR</button>
                  <button 
                    onClick={() => setChartType("line")}
                    className={`px-3 py-1 text-xs font-mono font-bold transition-colors ${chartType === 'line' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
                  >LINE</button>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff', fontFamily: 'monospace' }} cursor={{fill: '#1e293b'}} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} name="Revenue" />
                      <Line type="monotone" dataKey="expenses" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} activeDot={{ r: 6 }} name="Expenses" />
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', color: '#fff', fontFamily: 'monospace' }} cursor={{fill: '#1e293b'}} />
                      <Bar dataKey="revenue" stackId="a" fill="#10b981" name="Revenue" maxBarSize={50} />
                      <Bar dataKey="expenses" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} name="Expenses" maxBarSize={50} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Breakdown Pie Chart */}
            <div className="p-6 border-2 border-slate-800 bg-slate-900/50 cyber-cut flex flex-col">
              <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4 text-center">Revenue Breakdown</h3>
              <div className="flex-1 min-h-[250px] w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', color: '#f8fafc', fontFamily: 'monospace' }} 
                        itemStyle={{ color: '#f8fafc' }}
                        formatter={(value: unknown) => [`₹${(Number(value) || 0).toLocaleString()}`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-xs uppercase">
                    NO_REVENUE_DATA
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-3 h-3 block" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DoubleEntryLedger transactions={ledgerTransactions} />
        </div>
      )}
    </div>
  );
}
