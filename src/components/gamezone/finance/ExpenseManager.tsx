"use client";

import { useState } from "react";
import { Plus, Loader2, Edit, Trash2, Save, X } from "lucide-react";
import { Expense, logExpense, updateExpense, deleteExpense } from "@/lib/financeApi";

export default function ExpenseManager({ expenses, dateLabel = "Selected Period" }: { expenses: Expense[], dateLabel?: string }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: "", category: "Rent", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit expense state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");


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
    } catch (err) {
      console.error("Error logging expense:", err);
      setError((err as Error).message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (exp: Expense) => {
    setEditingId(exp.id || null);
    setEditAmount(exp.amount.toString());
    setEditCategory(exp.category);
    setEditNote(exp.note);
  };

  const saveEdit = async (id: string) => {
    if (!editAmount || !editCategory) return;
    try {
      await updateExpense(id, {
        amount: Number(editAmount),
        category: editCategory,
        note: editNote || editCategory
      });
      setEditingId(null);
    } catch (err) {
      alert("Failed to update expense: " + (err as Error).message);
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    if (!exp.id) return;
    const confirmDelete = window.confirm(`⚠️ WARNING: Are you sure you want to delete the expense of ₹${exp.amount} for "${exp.note || exp.category}"? This will permanently remove it and update the ledger.`);
    if (!confirmDelete) return;

    try {
      await deleteExpense(exp.id);
    } catch (err) {
      alert("Failed to delete expense: " + (err as Error).message);
    }
  };


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
          <p className="text-[10px] font-bold tracking-widest text-pink-500/70 uppercase">Total_Expenses ({dateLabel})</p>
          <h3 className="text-3xl font-black text-pink-500 mt-2 glow-pink">₹{totalExpenses.toLocaleString()}</h3>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-950 p-4 cyber-cut">
        <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-3">&gt; EXPENSE_LEDGER ({dateLabel})</h4>
        <div className="overflow-x-auto overflow-y-auto max-h-[350px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
              <tr className="bg-pink-950/20 border-b-2 border-pink-500/50 text-pink-500 uppercase text-[10px] tracking-widest font-black">
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Note / Description</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => {
                const isEditing = editingId === exp.id;
                const date = exp.createdAt?.toDate ? exp.createdAt.toDate() : new Date(exp.createdAt as unknown as string);
                const dateStr = date.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                  <tr key={exp.id} className="border-b border-slate-800/80 hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 text-slate-500">{dateStr}</td>
                    <td className="p-3 text-white">
                      {isEditing ? (
                        <select 
                          value={editCategory} 
                          onChange={e => setEditCategory(e.target.value)}
                          className="bg-black border border-pink-500/50 text-white p-1 text-xs w-full focus:outline-none"
                        >
                          <option value="Rent">Rent</option>
                          <option value="Electricity">Electricity</option>
                          <option value="Internet">Internet</option>
                          <option value="Hardware">Hardware / Repairs</option>
                          <option value="Game Licenses">Game Licenses</option>
                          <option value="Staff Wages">Staff Wages</option>
                          <option value="Misc">Miscellaneous</option>
                        </select>
                      ) : (
                        <span className="px-1.5 py-0.5 border border-pink-500/30 text-pink-400/90 text-[10px] font-bold uppercase rounded bg-pink-500/5">
                          {exp.category}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={editNote} 
                          onChange={e => setEditNote(e.target.value)}
                          className="bg-black border border-pink-500/50 text-white p-1 text-xs w-full focus:outline-none font-mono"
                        />
                      ) : (
                        exp.note
                      )}
                    </td>
                    <td className="p-3 text-right text-pink-400 font-bold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          value={editAmount} 
                          onChange={e => setEditAmount(e.target.value)}
                          className="bg-black border border-pink-500/50 text-pink-400 p-1 text-xs w-20 text-right focus:outline-none"
                        />
                      ) : (
                        `₹${exp.amount}`
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => saveEdit(exp.id || "")} className="p-1 bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500 hover:text-black transition-colors rounded" title="Save">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors rounded" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => startEdit(exp)} className="p-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-500 hover:text-black transition-colors rounded" title="Edit">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteExpense(exp)} className="p-1 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white transition-colors rounded" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-600 font-mono">
                    NO_OPERATING_EXPENSES_LOGGED_IN_PAST_30_DAYS
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
