"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Crown, Loader2 } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Booking } from "@/types";

interface LeaderboardPlayer {
  rank: number;
  name: string;
  hours: number;
  badge: "LEGENDARY" | "DIAMOND" | "PLATINUM" | "GOLD" | "SILVER";
}

const STATIC_FALLBACKS = [
  { name: "PHANTOM_X", hours: 342 },
  { name: "N3ON_BLITZ", hours: 289 },
  { name: "CYB3R_WOLF", hours: 256 },
  { name: "SHADOW_OPS", hours: 198 },
  { name: "GLiTCH_404", hours: 175 },
  { name: "VORT3X_", hours: 143 },
  { name: "NULL_PTR", hours: 128 },
  { name: "BYTE_RUSH", hours: 102 },
];

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-xs font-mono text-slate-500">{rank}</span>;
};

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case "LEGENDARY": return "text-yellow-400 border-yellow-400/50 bg-yellow-400/10";
    case "DIAMOND": return "text-cyan-400 border-cyan-400/50 bg-cyan-400/10";
    case "PLATINUM": return "text-slate-300 border-slate-400/50 bg-slate-400/10";
    case "GOLD": return "text-amber-500 border-amber-500/50 bg-amber-500/10";
    default: return "text-slate-500 border-slate-600 bg-slate-800";
  }
};

const getBadgeLabel = (hours: number): "LEGENDARY" | "DIAMOND" | "PLATINUM" | "GOLD" | "SILVER" => {
  if (hours >= 100) return "LEGENDARY";
  if (hours >= 50) return "DIAMOND";
  if (hours >= 20) return "PLATINUM";
  if (hours >= 5) return "GOLD";
  return "SILVER";
};

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to completed and active bookings to calculate total duration per user
    const q = query(
      collection(db, "bookings"),
      where("status", "in", ["completed", "active"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userPlaytime: Record<string, { name: string; minutes: number }> = {};

      snapshot.forEach((docSnap) => {
        const b = docSnap.data() as Booking;
        if (!b.userId) return;
        
        const current = userPlaytime[b.userId] || {
          name: b.userName || "PLAYER_" + b.userId.substring(0, 4).toUpperCase(),
          minutes: 0
        };
        current.minutes += b.durationMinutes || 0;
        userPlaytime[b.userId] = current;
      });

      // Map to list
      const aggregatedList = Object.values(userPlaytime).map((data) => {
        const hours = Math.round((data.minutes / 60) * 10) / 10;
        return {
          name: data.name,
          hours
        };
      });

      // Sort by hours played descending
      aggregatedList.sort((a, b) => b.hours - a.hours);

      // Merge with static fallbacks if we have less than 8 entries to keep look-and-feel
      const finalPlayers: LeaderboardPlayer[] = [];
      const usedNames = new Set(aggregatedList.map(p => p.name.toUpperCase()));

      // Put real players first
      aggregatedList.forEach((player, idx) => {
        finalPlayers.push({
          rank: idx + 1,
          name: player.name,
          hours: player.hours,
          badge: getBadgeLabel(player.hours)
        });
      });

      // Fill remaining slots with static players who don't duplicate real players
      let fallbackIndex = 0;
      while (finalPlayers.length < 8 && fallbackIndex < STATIC_FALLBACKS.length) {
        const fallback = STATIC_FALLBACKS[fallbackIndex++];
        if (!usedNames.has(fallback.name.toUpperCase())) {
          finalPlayers.push({
            rank: finalPlayers.length + 1,
            name: fallback.name,
            hours: fallback.hours,
            badge: getBadgeLabel(fallback.hours)
          });
        }
      }

      // Re-sort final list to ensure fallbacks are placed correctly in the rank
      finalPlayers.sort((a, b) => b.hours - a.hours);
      
      // Update ranks based on new sorted positions
      const reranked = finalPlayers.map((p, idx) => ({
        ...p,
        rank: idx + 1
      }));

      setPlayers(reranked);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-black border-2 border-yellow-400/30 cyber-cut-reverse overflow-hidden">
      <div className="border-b border-yellow-400/30 p-4 flex items-center justify-between bg-yellow-400/5">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400 animate-pulse" />
          <h2 className="text-lg font-black tracking-widest uppercase text-yellow-400 font-mono">Top_Players</h2>
        </div>
        {loading && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {players.map((player) => (
          <div 
            key={`${player.rank}-${player.name}`} 
            className={`flex items-center gap-4 px-4 py-3 hover:bg-yellow-400/5 transition-colors ${
              player.rank <= 3 ? "bg-yellow-400/[0.02]" : ""
            }`}
          >
            <div className="w-8 flex justify-center shrink-0">
              {getRankIcon(player.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-black tracking-widest uppercase text-sm truncate ${
                player.rank === 1 ? "text-yellow-400 text-neon-yellow font-mono" : "text-white font-mono"
              }`}>
                {player.name}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-mono text-slate-400">{player.hours}h</p>
            </div>
            <div className={`px-2 py-0.5 text-[9px] font-black tracking-widest uppercase border cyber-cut shrink-0 ${getBadgeColor(player.badge)}`}>
              {player.badge}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

