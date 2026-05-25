"use client";

import { useState } from "react";
import { Plus, X, Server, Gamepad2, AlertCircle } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Station, Game } from "@/types";
import { useStations } from "@/hooks/useStations";
import GameSearchBar from "./GameSearchBar";

export default function HardwareManager() {
  const { stations } = useStations();
  const [name, setName] = useState("");
  const [type, setType] = useState<"PC" | "PS5" | "Xbox">("PC");
  const [pricePerHour, setPricePerHour] = useState<number>(100);
  
  const [specInput, setSpecInput] = useState("");
  const [specs, setSpecs] = useState<string[]>([]);
  
  const [games, setGames] = useState<Game[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddSpec = () => {
    if (specInput.trim() && !specs.includes(specInput.trim())) {
      setSpecs([...specs, specInput.trim()]);
      setSpecInput("");
    }
  };

  const handleRemoveSpec = (specToRemove: string) => {
    setSpecs(specs.filter(s => s !== specToRemove));
  };

  const handleAddGame = (game: Game) => {
    setGames([...games, game]);
  };

  const handleRemoveGame = (gameToRemove: Game) => {
    setGames(games.filter(g => g.name !== gameToRemove.name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("STATION_NAME_REQUIRED");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const stationId = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      
      const newStation: Station = {
        id: stationId,
        name: name.trim(),
        type,
        pricePerHour: Number(pricePerHour),
        specs,
        games,
        status: "available",
        currentSessionId: null,
        orderIndex: stations.length, // Put it at the end of the list
      };

      await setDoc(doc(db, "stations", stationId), newStation);
      
      // Reset form
      setName("");
      setSpecs([]);
      setGames([]);
      // keep type and price as they might add multiple similar machines
    } catch (err) {
      console.error(err);
      setError("FAILED_TO_PROVISION_HARDWARE");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 border-2 border-yellow-400/30 p-6 cyber-cut-reverse">
      <div className="flex items-center gap-3 mb-6 border-b-2 border-yellow-400/20 pb-4">
        <Server className="w-6 h-6 text-yellow-400" />
        <h2 className="text-xl font-black tracking-widest text-yellow-400 uppercase">PROVISION_NEW_NODE</h2>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-950/50 border border-red-500 text-red-500 text-sm font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Node_ID (Name)</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PC-01"
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Hardware_Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as "PC" | "PS5" | "Xbox")}
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all appearance-none"
            >
              <option value="PC">PC (The Grid)</option>
              <option value="PS5">PS5 (The Lounge)</option>
              <option value="Xbox">XBOX (The Lounge)</option>
            </select>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Base_Rate (₹/hr)</label>
            <input 
              type="number" 
              value={pricePerHour}
              onChange={(e) => setPricePerHour(Number(e.target.value))}
              min="0"
              className="w-full bg-slate-900 border border-slate-700 text-white p-3 font-mono text-sm focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-all"
            />
          </div>
        </div>

        {/* Specs Array */}
        <div className="space-y-2 p-4 border border-slate-800 bg-slate-900/50">
          <label className="text-xs font-bold text-slate-400 tracking-widest uppercase">Hardware_Specs</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={specInput}
              onChange={(e) => setSpecInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpec())}
              placeholder="e.g. RTX 4090"
              className="flex-1 bg-slate-900 border border-slate-700 text-white p-2 font-mono text-sm focus:border-cyan-500 focus:outline-none"
            />
            <button type="button" onClick={handleAddSpec} className="px-4 bg-slate-800 text-cyan-500 hover:bg-slate-700 border border-slate-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {specs.map(spec => (
              <span key={spec} className="px-2 py-1 bg-cyan-950 border border-cyan-500/50 text-cyan-500 text-xs font-mono flex items-center gap-1">
                {spec}
                <button type="button" onClick={() => handleRemoveSpec(spec)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        </div>

        {/* Games Array */}
        <div className="space-y-2 p-4 border border-slate-800 bg-slate-900/50">
          <label className="text-xs font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" /> Installed_Software (Games)
          </label>
          <GameSearchBar onAddGame={handleAddGame} excludeGames={games} />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {games.map(game => (
              <div 
                key={game.name} 
                className="relative group border border-pink-500/30 bg-pink-950/10 p-2 flex flex-col items-center text-center cyber-cut-reverse overflow-hidden hover:border-pink-500 transition-colors"
              >
                {game.posterUrl ? (
                  <img 
                    src={game.posterUrl} 
                    alt={game.name} 
                    className="w-16 h-24 object-cover border border-slate-800 mb-2 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-16 h-24 bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 mb-2">N/A</div>
                )}
                <span className="text-[10px] font-bold text-white uppercase tracking-wider line-clamp-2 max-w-[120px]">
                  {game.name}
                </span>
                <button 
                  type="button" 
                  onClick={() => handleRemoveGame(game)} 
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white hover:bg-red-600 transition-colors rounded-sm opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-yellow-400 text-black font-black tracking-widest uppercase text-lg cyber-cut glow-yellow transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? "PROVISIONING..." : "INITIALIZE_NODE"}
        </button>
      </form>
    </div>
  );
}
