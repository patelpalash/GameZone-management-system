"use client";

import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Expense, logExpense, getExpensesForDateRange } from "@/lib/financeApi";

export default function ExpenseManager() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", category: "Rent", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Fetch last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      const data = await getExpensesForDateRange(start, end);
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category) return;

    setSubmitting(true);
    setError(null);
    try {
      await logExpense({
        amount: Number(newExpense.amount),
        category: newExpense.category,
        note: newExpense.note || newExpense.category,
        createdBy: "admin"
      });
      setShowAddForm(false);
      setNewExpense({ amount: "", category: "Rent", note: "" });
      fetchExpenses();
    } catch (err) {
      console.error("Error logging expense:", err);
      setError((err as Error).message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-pink-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-widest text-pink-500 uppercase">Operating_Expenses</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-pink-500/20 text-pink-400 border border-pink-500 hover:bg-pink-500 hover:text-black font-black uppercase text-xs tracking-widest cyber-cut transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> LOG_EXPENSE
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleLogExpense} className="p-4 border border-pink-500/30 bg-pink-950/10 cyber-cut grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {error && (
            <div className="md:col-span-4 p-2 bg-red-950/30 border border-red-500/50 text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
            <input 
              type="number" required min="1"
              disabled={submitting}
              value={newExpense.amount}
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
              className="w-full bg-black border border-slate-700 text-pink-400 p-2 text-xs focus:border-pink-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
            <select 
              value={newExpense.category}
              disabled={submitting}
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
              className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-pink-500 outline-none disabled:opacity-50"
            >
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Internet">Internet</option>
              <option value="Hardware">Hardware / Repairs</option>
              <option value="Game Licenses">Game Licenses</option>
              <option value="Staff Wages">Staff Wages</option>
              <option value="Misc">Miscellaneous</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Description / Note</label>
            <input 
              type="text" 
              disabled={submitting}
              value={newExpense.note}
              onChange={(e) => setNewExpense({...newExpense, note: e.target.value})}
              placeholder="E.g., Monthly electricity bill"
              className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-pink-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="px-4 py-2 bg-pink-500 text-black font-black uppercase text-xs hover:bg-pink-400 cyber-cut transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> SAVING...
                </>
              ) : (
                "SAVE_EXPENSE"
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border-2 border-pink-500/50 bg-pink-950/20 cyber-cut">
          <p className="text-[10px] font-bold tracking-widest text-pink-500/70 uppercase">Total_Expenses (30d)</p>
          <h3 className="text-3xl font-black text-pink-500 mt-2 glow-pink">₹{totalExpenses.toLocaleString()}</h3>
        </div>
      </div>
    </div>
  );
}
