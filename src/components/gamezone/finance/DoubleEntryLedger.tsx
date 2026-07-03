import React, { useState, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, ArrowUpDown } from 'lucide-react';

export interface LedgerTransaction {
  id: string;
  dateStr: string;
  timestamp: number;
  description: string;
  type: 'revenue' | 'expense' | 'refund';
  amount: number;
}

interface DoubleEntryLedgerProps {
  transactions: LedgerTransaction[];
}

export const DoubleEntryLedger: React.FC<DoubleEntryLedgerProps> = ({ transactions }) => {
  const [sortField, setSortField] = useState<'timestamp' | 'amount'>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const computedTx = useMemo(() => {
    let runningBalance = 0;
    return [...transactions]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(tx => {
        if (tx.type === 'revenue') runningBalance += tx.amount;
        else runningBalance -= tx.amount; // expense and refund
        return { ...tx, balanceAfter: runningBalance };
      });
  }, [transactions]);

  const sortedTx = useMemo(() => {
    return [...computedTx].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (sortDir === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });
  }, [computedTx, sortField, sortDir]);

  const toggleSort = (field: 'timestamp' | 'amount') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="border-2 border-slate-800 bg-slate-900/50 cyber-cut p-6 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6 border-b border-emerald-500/30 pb-4">
        <Activity className="w-6 h-6 text-emerald-400" />
        <h2 className="text-lg font-black tracking-widest text-emerald-500 uppercase">
          Master_Ledger
        </h2>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[450px] xl:max-h-[600px]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
            <tr className="bg-emerald-950/40 border-b-2 border-emerald-500/50 text-emerald-500 uppercase text-[10px] tracking-widest font-black">
              <th className="p-3 whitespace-nowrap cursor-pointer hover:bg-emerald-900/30 transition-colors" onClick={() => toggleSort('timestamp')}>
                <div className="flex items-center gap-1">Date & Time <ArrowUpDown className="w-3 h-3"/></div>
              </th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Debit (In)</th>
              <th className="p-3 text-right">Credit (Out)</th>
              <th className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-emerald-900/30 transition-colors" onClick={() => toggleSort('amount')}>
                <div className="flex items-center justify-end gap-1">Balance <ArrowUpDown className="w-3 h-3"/></div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTx.map((tx, idx) => {
              const isExpense = tx.type === 'expense' || tx.type === 'refund';

              return (
                <tr 
                  key={tx.id} 
                  className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${idx % 2 === 0 ? 'bg-black/20' : 'bg-transparent'}`}
                >
                  <td className="p-3 text-slate-400 text-xs font-mono whitespace-nowrap">{tx.dateStr}</td>
                  <td className="p-3 text-slate-200 text-sm">{tx.description}</td>
                  <td className="p-3 text-right text-emerald-400 font-mono font-bold text-sm">
                    {!isExpense ? (
                      <div className="flex items-center justify-end gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +₹{tx.amount.toLocaleString()}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-3 text-right text-pink-500 font-mono font-bold text-sm">
                    {isExpense ? (
                      <div className="flex items-center justify-end gap-1">
                        <ArrowDownRight className="w-3 h-3" />
                        -₹{tx.amount.toLocaleString()}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="p-3 text-right font-mono font-black text-cyan-400 text-sm">
                    ₹{tx.balanceAfter.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 uppercase font-mono text-xs border border-dashed border-slate-800 mt-4">
                  NO_TRANSACTIONS_FOUND
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
