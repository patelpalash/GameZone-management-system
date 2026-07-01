"use client";

import { useState, useMemo, useEffect } from "react";
import { InventorySale, InventoryItem } from "@/lib/financeApi";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, AlertCircle, PackageX, ShoppingCart, ArrowUpDown } from "lucide-react";

export default function InventorySalesHistory({ sales }: { sales: InventorySale[] }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof InventorySale | 'date', direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inventory"), (snap) => {
      const data: InventoryItem[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as InventoryItem));
      setItems(data);
    });
    return () => unsub();
  }, []);

  // Calculate KPIs
  const { mostSelling, mostProfitable, outOfStock, lowStock } = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    items.forEach(item => {
      if (item.stockLevel === 0) outOfStock++;
      else if (item.stockLevel <= 5) lowStock++;
    });

    const itemStats: Record<string, { qty: number, profit: number, name: string }> = {};
    sales.forEach(sale => {
      if (!itemStats[sale.itemId]) itemStats[sale.itemId] = { qty: 0, profit: 0, name: sale.itemName };
      itemStats[sale.itemId].qty += sale.quantity;
      itemStats[sale.itemId].profit += sale.totalProfit;
    });

    let bestSeller = { name: "N/A", qty: 0 };
    let bestProfit = { name: "N/A", profit: 0 };

    Object.values(itemStats).forEach(stat => {
      if (stat.qty > bestSeller.qty) {
        bestSeller = { name: stat.name, qty: stat.qty };
      }
      if (stat.profit > bestProfit.profit) {
        bestProfit = { name: stat.name, profit: stat.profit };
      }
    });

    return { mostSelling: bestSeller, mostProfitable: bestProfit, outOfStock, lowStock };
  }, [sales, items]);

  const sortedSales = useMemo(() => {
    const sortable = [...sales];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let valA = a[sortConfig.key as keyof InventorySale] as unknown as string | number;
        let valB = b[sortConfig.key as keyof InventorySale] as unknown as string | number;
        
        if (sortConfig.key === 'date') {
          const getTime = (val: unknown) => {
            const t = val as { toMillis?: () => number };
            return typeof t?.toMillis === 'function' ? t.toMillis() : new Date(val as string | number || 0).getTime();
          };
          valA = getTime(a.createdAt);
          valB = getTime(b.createdAt);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [sales, sortConfig]);

  const requestSort = (key: keyof InventorySale | 'date') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 border border-slate-800 bg-slate-900/50 cyber-cut flex flex-col gap-2 hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-2 text-cyan-500 font-bold text-xs uppercase tracking-widest"><ShoppingCart className="w-4 h-4"/> Most_Selling</div>
          <div className="text-xl font-black text-white">{mostSelling.name} <span className="text-sm text-cyan-500 font-mono">({mostSelling.qty}x)</span></div>
        </div>
        <div className="p-4 border border-slate-800 bg-slate-900/50 cyber-cut flex flex-col gap-2 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-widest"><TrendingUp className="w-4 h-4"/> Most_Profitable</div>
          <div className="text-xl font-black text-white">{mostProfitable.name} <span className="text-sm text-emerald-500 font-mono">(₹{mostProfitable.profit})</span></div>
        </div>
        <div className="p-4 border border-slate-800 bg-red-950/20 cyber-cut flex flex-col gap-2 hover:border-red-500/50 transition-colors">
          <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-widest"><PackageX className="w-4 h-4"/> Out_of_Stock</div>
          <div className="text-xl font-black text-white">{outOfStock} <span className="text-sm text-red-500 font-mono">items</span></div>
        </div>
        <div className="p-4 border border-slate-800 bg-orange-950/20 cyber-cut flex flex-col gap-2 hover:border-orange-500/50 transition-colors">
          <div className="flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest"><AlertCircle className="w-4 h-4"/> Low_Stock</div>
          <div className="text-xl font-black text-white">{lowStock} <span className="text-sm text-orange-500 font-mono">items (&le;5)</span></div>
        </div>
      </div>

      {/* Grid View */}
      <div className="border-2 border-slate-800 bg-slate-900/50 cyber-cut overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
          <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Inventory Transaction History</h3>
          <div className="text-xs font-mono text-slate-500">{sales.length} RECORDS</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono text-xs uppercase">
              <tr>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('date')}>
                  <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('itemName')}>
                  <div className="flex items-center gap-1">Item Name <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('quantity')}>
                  <div className="flex items-center gap-1">Qty <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('totalRevenue')}>
                  <div className="flex items-center gap-1">Revenue <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('totalProfit')}>
                  <div className="flex items-center gap-1">Profit <ArrowUpDown className="w-3 h-3"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:text-cyan-400 transition-colors" onClick={() => requestSort('paymentMethod')}>
                  <div className="flex items-center gap-1">Method <ArrowUpDown className="w-3 h-3"/></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-mono text-xs uppercase">No sales history found for this period.</td>
                </tr>
              ) : (
                sortedSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono">{sale.createdAt?.toDate().toLocaleString() || "N/A"}</td>
                    <td className="p-4 font-bold text-white">{sale.itemName}</td>
                    <td className="p-4 font-mono text-cyan-400">{sale.quantity}</td>
                    <td className="p-4 font-mono text-emerald-400">₹{sale.totalRevenue}</td>
                    <td className="p-4 font-mono text-emerald-500">₹{sale.totalProfit}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded border ${sale.paymentMethod === 'UPI' ? 'border-purple-500 text-purple-400 bg-purple-500/10' : 'border-yellow-500 text-yellow-400 bg-yellow-500/10'}`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
