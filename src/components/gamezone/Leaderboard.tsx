"use client";

import { Trophy, Medal, Crown } from "lucide-react";

// Static leaderboard data for demo purposes.
// In production, this would come from a Firestore query aggregating totalHoursPlayed.
const LEADERBOARD_DATA = [
  { rank: 1, name: "PHANTOM_X", hours: 342, badge: "LEGENDARY" },
  { rank: 2, name: "N3ON_BLITZ", hours: 289, badge: "DIAMOND" },
  { rank: 3, name: "CYB3R_WOLF", hours: 256, badge: "DIAMOND" },
  { rank: 4, name: "SHADOW_OPS", hours: 198, badge: "PLATINUM" },
  { rank: 5, name: "GLiTCH_404", hours: 175, badge: "PLATINUM" },
  { rank: 6, name: "VORT3X_", hours: 143, badge: "GOLD" },
  { rank: 7, name: "NULL_PTR", hours: 128, badge: "GOLD" },
  { rank: 8, name: "BYTE_RUSH", hours: 102, badge: "SILVER" },
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

export default function Leaderboard() {
  return (
    <div className="bg-black border-2 border-yellow-400/30 cyber-cut-reverse overflow-hidden">
      <div className="border-b border-yellow-400/30 p-4 flex items-center gap-2 bg-yellow-400/5">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="text-lg font-black tracking-widest uppercase text-yellow-400">Top_Players</h2>
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {LEADERBOARD_DATA.map((player) => (
          <div 
            key={player.rank} 
            className={`flex items-center gap-4 px-4 py-3 hover:bg-yellow-400/5 transition-colors ${
              player.rank <= 3 ? "bg-yellow-400/[0.02]" : ""
            }`}
          >
            <div className="w-8 flex justify-center shrink-0">
              {getRankIcon(player.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-black tracking-widest uppercase text-sm truncate ${
                player.rank === 1 ? "text-yellow-400 text-neon-yellow" : "text-white"
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
