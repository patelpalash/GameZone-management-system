"use client";

import { Station, Booking } from "@/types";
import { PcCase, Gamepad2, Loader2, AlertCircle } from "lucide-react";
import LiveTimer from "./LiveTimer";
import { getGameFromCatalog } from "@/lib/gameCatalog";

interface StationCardProps {
  station: Station;
  endTime?: Date | null;
  onBookNow: (station: Station) => void;
  confirmedBookings?: Booking[];
}

export default function StationCard({ station, endTime, onBookNow, confirmedBookings }: StationCardProps) {
  const isAvailable = station.status === "available";
  const isPending = station.status === "pending";
  const isOccupied = station.status === "occupied";
  const isMaintenance = station.status === "maintenance";

  return (
    <div className={`
      relative overflow-hidden cyber-cut border-2 p-5 flex flex-col justify-between min-h-[250px] transition-all bg-card/80 backdrop-blur-sm
      ${isAvailable ? "border-cyan-500 hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]" : ""}
      ${isPending ? "border-yellow-500 shadow-[0_0_15px_rgba(252,238,10,0.2)]" : ""}
      ${isOccupied ? "border-pink-600 shadow-[0_0_15px_rgba(255,0,60,0.2)]" : ""}
      ${isMaintenance ? "border-slate-700 opacity-60" : ""}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-3">
          {station.type === "PC" ? (
            <PcCase className="text-cyan-400" size={28} />
          ) : (
            <Gamepad2 className="text-cyan-400" size={28} />
          )}
          <h2 className="text-3xl font-bold tracking-widest text-white uppercase">{station.name}</h2>
        </div>
        <div className={`px-2 py-1 text-xs font-bold tracking-widest uppercase border cyber-cut-reverse
            ${isAvailable ? "border-cyan-500 text-cyan-400 bg-cyan-500/10" : ""}
            ${isPending ? "border-yellow-500 text-yellow-400 bg-yellow-500/10" : ""}
            ${isOccupied ? "border-pink-500 text-pink-400 bg-pink-500/10" : ""}
            ${isMaintenance ? "border-slate-500 text-slate-400 bg-slate-800" : ""}
        `}>
          {station.status}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 flex-1">
        <div>
          <p className="text-[10px] text-cyan-500/70 uppercase tracking-[0.2em] mb-1">SYSTEM_SPECS</p>
          <div className="flex flex-wrap gap-2">
            {station.specs.map((spec) => (
              <span key={spec} className="text-xs bg-slate-900 border border-slate-700 text-slate-300 px-2 py-1 cyber-cut-reverse uppercase font-semibold">
                {spec}
              </span>
            ))}
          </div>
        </div>
        
        <div>
          <p className="text-[10px] text-cyan-500/70 uppercase tracking-[0.2em] mb-2 font-bold">INSTALLED_GAMES</p>
          <div className="flex flex-wrap gap-2 pb-1 max-w-full overflow-hidden">
            {station.games.map((game, idx) => {
              const isString = typeof game === "string";
              const gameName = isString ? game : game.name;
              let posterUrl = isString ? null : game.posterUrl;

              if (!posterUrl) {
                const resolved = getGameFromCatalog(gameName);
                posterUrl = resolved.posterUrl;
              }

              return (
                <div 
                  key={`${gameName}-${idx}`} 
                  className={`relative group w-14 h-20 border bg-slate-950 overflow-hidden transition-all duration-300 shadow-lg shrink-0 ${
                    station.type === 'PC' ? 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'border-pink-500/30 hover:border-pink-400 hover:shadow-[0_0_10px_rgba(255,0,127,0.3)]'
                  }`}
                  title={gameName}
                >
                  <img 
                    src={posterUrl} 
                    alt={gameName} 
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 text-[8px] font-black text-center text-white tracking-wider uppercase transition-opacity duration-200 leading-tight pointer-events-none">
                    {gameName}
                  </div>
                </div>
              );
            })}
            {station.games.length === 0 && (
              <span className="text-xs text-slate-600 font-mono italic">NO_GAMES_INSTALLED</span>
            )}
          </div>
        </div>

        {/* Upcoming Prebookings Display */}
        {confirmedBookings && confirmedBookings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
            <p className="text-[10px] text-yellow-500/80 uppercase tracking-widest font-bold font-mono">NEXT_RESERVATION:</p>
            <div className="space-y-1">
              {[...confirmedBookings]
                .sort((a, b) => (a.scheduledStartTime?.toMillis() || 0) - (b.scheduledStartTime?.toMillis() || 0))
                .slice(0, 1) // Just show the next one to keep the user card clean
                .map(b => {
                  const bDate = b.scheduledStartTime?.toDate();
                  if (!bDate) return null;
                  const isToday = bDate.toDateString() === new Date().toDateString();
                  const timeStr = bDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
                  const dateStr = isToday ? "Today" : bDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  
                  return (
                    <div key={b.id} className="text-xs text-yellow-400 font-mono font-semibold flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 bg-yellow-400 animate-pulse rounded-full"></span>
                      <span>{dateStr} @ {timeStr}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-black text-white">₹{station.pricePerHour}</span>
          <span className="text-xs text-cyan-500/70 uppercase tracking-widest mb-1">/HR</span>
        </div>

        {isAvailable && (
          <button 
            type="button"
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest px-6 py-2 cyber-cut glow-yellow transition-all active:scale-95 relative z-10 cursor-pointer select-none"
            onClick={(e) => { e.stopPropagation(); onBookNow(station); }}
          >
            INITIATE
          </button>
        )}

        {isPending && (
          <div className="flex items-center text-yellow-400 text-xs font-bold tracking-widest animate-pulse">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            VERIFYING_TXN
          </div>
        )}

        {isOccupied && (
          <div className="text-right">
            <p className="text-[10px] text-pink-500 uppercase tracking-widest">T-MINUS</p>
            <LiveTimer endTime={endTime || new Date()} />
          </div>
        )}

        {isMaintenance && (
          <div className="flex items-center text-slate-500 text-xs font-bold tracking-widest">
            <AlertCircle className="w-4 h-4 mr-1" />
            OFFLINE
          </div>
        )}
      </div>
    </div>
  );
}
