"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, PackagePlus, ShoppingCart, Loader2 } from "lucide-react";
import { InventoryItem, addInventoryItem, getInventoryItems, sellInventoryItem, updateInventoryItem } from "@/lib/financeApi";

export default function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "snack", costPrice: "", sellingPrice: "", stockLevel: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{name: string, costPrice: string, sellingPrice: string}>({ name: "", costPrice: "", sellingPrice: "" });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getInventoryItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.costPrice || !newItem.sellingPrice || !newItem.stockLevel) return;

    setSubmitting(true);
    setError(null);
    try {
      await addInventoryItem({
        name: newItem.name,
        category: newItem.category as "snack" | "drink" | "other",
        costPrice: Number(newItem.costPrice),
        sellingPrice: Number(newItem.sellingPrice),
        stockLevel: Number(newItem.stockLevel)
      });
      setShowAddForm(false);
      setNewItem({ name: "", category: "snack", costPrice: "", sellingPrice: "", stockLevel: "" });
      fetchItems();
    } catch (err) {
      console.error("Error adding item:", err);
      setError((err as Error).message || "Failed to add inventory item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStock = async (item: InventoryItem, adjustment: number) => {
    try {
      const newStock = Math.max(0, item.stockLevel + adjustment);
      await updateInventoryItem(item.id, { stockLevel: newStock });
      fetchItems();
    } catch (err) {
      console.error("Error updating stock:", err);
    }
  };

  const handleSell = async (item: InventoryItem, method: "Cash" | "UPI") => {
    try {
      await sellInventoryItem(item, 1, method);
      fetchItems();
    } catch (err) {
      alert("Error selling item: " + (err as Error).message);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditData({
      name: item.name,
      costPrice: item.costPrice.toString(),
      sellingPrice: item.sellingPrice.toString()
    });
  };

  const saveEdit = async (id: string) => {
    try {
      await updateInventoryItem(id, {
        name: editData.name,
        costPrice: Number(editData.costPrice),
        sellingPrice: Number(editData.sellingPrice)
      });
      setEditingId(null);
      fetchItems();
    } catch (err) {
      alert("Error updating item: " + (err as Error).message);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black tracking-widest text-emerald-500 uppercase">Inventory & Sales</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500 hover:bg-emerald-500 hover:text-black font-black uppercase text-xs tracking-widest cyber-cut transition-all flex items-center gap-2"
        >
          <PackagePlus className="w-4 h-4" /> ADD_ITEM
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddItem} className="p-4 border border-emerald-500/30 bg-emerald-950/10 cyber-cut grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {error && (
            <div className="md:col-span-6 p-2 bg-red-950/30 border border-red-500/50 text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Item Name</label>
            <input 
              type="text" 
              required
              disabled={submitting}
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-emerald-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Category</label>
            <select 
              value={newItem.category}
              disabled={submitting}
              onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-emerald-500 outline-none disabled:opacity-50"
            >
              <option value="snack">Snack</option>
              <option value="drink">Drink</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cost (₹)</label>
            <input 
              type="number" required min="0"
              disabled={submitting}
              value={newItem.costPrice}
              onChange={(e) => setNewItem({...newItem, costPrice: e.target.value})}
              className="w-full bg-black border border-slate-700 text-pink-400 p-2 text-xs focus:border-emerald-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Price (₹)</label>
            <input 
              type="number" required min="0"
              disabled={submitting}
              value={newItem.sellingPrice}
              onChange={(e) => setNewItem({...newItem, sellingPrice: e.target.value})}
              className="w-full bg-black border border-slate-700 text-emerald-400 p-2 text-xs focus:border-emerald-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stock</label>
            <input 
              type="number" required min="0"
              disabled={submitting}
              value={newItem.stockLevel}
              onChange={(e) => setNewItem({...newItem, stockLevel: e.target.value})}
              className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-emerald-500 outline-none disabled:opacity-50" 
            />
          </div>
          <div className="md:col-span-6 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting}
              className="px-4 py-2 bg-emerald-500 text-black font-black uppercase text-xs hover:bg-emerald-400 cyber-cut transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> SAVING...
                </>
              ) : (
                "SAVE_INVENTORY_ITEM"
              )}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const isEditing = editingId === item.id;
          const displayCost = isEditing ? Number(editData.costPrice) : item.costPrice;
          const displaySell = isEditing ? Number(editData.sellingPrice) : item.sellingPrice;
          const profitMargin = displaySell - displayCost;
          const isLowStock = item.stockLevel < 5;
          
          return (
            <div key={item.id} className={`p-4 border ${isLowStock ? 'border-red-500/50 bg-red-950/10' : 'border-slate-800 bg-slate-900/50'} cyber-cut flex flex-col justify-between gap-4`}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editData.name} 
                      onChange={e => setEditData({...editData, name: e.target.value})}
                      className="bg-black border border-emerald-500 text-white px-1 py-0.5 text-xs w-3/4 outline-none"
                    />
                  ) : (
                    <h4 className="font-bold text-white uppercase tracking-wider truncate mr-2" title={item.name}>{item.name}</h4>
                  )}
                  <span className="text-[9px] font-mono px-1.5 py-0.5 border border-slate-600 text-slate-400 uppercase shrink-0">{item.category}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono mb-1 gap-2">
                  <span className="text-slate-500 flex items-center gap-1">
                    Cost: ₹
                    {isEditing ? (
                      <input type="number" value={editData.costPrice} onChange={e => setEditData({...editData, costPrice: e.target.value})} className="bg-black border border-emerald-500 w-12 px-1 text-white outline-none" />
                    ) : (
                      item.costPrice
                    )}
                  </span>
                  <span className="text-emerald-500 font-bold flex items-center gap-1">
                    Sell: ₹
                    {isEditing ? (
                      <input type="number" value={editData.sellingPrice} onChange={e => setEditData({...editData, sellingPrice: e.target.value})} className="bg-black border border-emerald-500 w-12 px-1 text-emerald-400 outline-none" />
                    ) : (
                      item.sellingPrice
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-pink-400">
                  <span>Profit: ₹{profitMargin || 0}</span>
                  <div className="flex items-center gap-2">
                    <span>Margin: {Math.round((profitMargin/displaySell)*100) || 0}%</span>
                    {isEditing ? (
                      <button onClick={() => saveEdit(item.id)} className="text-emerald-400 hover:text-white px-1 underline">Save</button>
                    ) : (
                      <button onClick={() => startEdit(item)} className="text-cyan-500 hover:text-white px-1 underline">Edit</button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                <div className="flex items-center gap-2 bg-black border border-slate-800 rounded-full overflow-hidden">
                  <button onClick={() => handleUpdateStock(item, -1)} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800"><Minus className="w-3 h-3" /></button>
                  <span className={`text-xs font-mono font-bold w-6 text-center ${isLowStock ? 'text-red-500' : 'text-white'}`}>{item.stockLevel}</span>
                  <button onClick={() => handleUpdateStock(item, 1)} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800"><Plus className="w-3 h-3" /></button>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleSell(item, "Cash")}
                    disabled={item.stockLevel <= 0 || isEditing}
                    className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest cyber-cut disabled:opacity-50 flex items-center gap-1 transition-all"
                    title="Sell via Cash"
                  >
                    <ShoppingCart className="w-3 h-3" /> CASH
                  </button>
                  <button 
                    onClick={() => handleSell(item, "UPI")}
                    disabled={item.stockLevel <= 0 || isEditing}
                    className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest cyber-cut disabled:opacity-50 flex items-center gap-1 transition-all"
                    title="Sell via UPI"
                  >
                    UPI
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 p-8 border border-slate-800 border-dashed text-center">
            <p className="text-sm font-mono text-slate-500 uppercase">NO_INVENTORY_ITEMS_FOUND</p>
          </div>
        )}
      </div>
    </div>
  );
}
