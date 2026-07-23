"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Tournament, TournamentRegistration } from "@/types";
import { 
  Trophy, ArrowLeft, Maximize2, Edit3, Check, X, Sparkles, Users, Save
} from "lucide-react";

interface Match {
  id: number;
  round: "round1" | "semi" | "final";
  title: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  assignedStations?: string;
}

function BracketContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tournamentId = searchParams.get("id");

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTId, setSelectedTId] = useState<string | null>(tournamentId);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  // Match State for Interactive Bracket
  const [matches, setMatches] = useState<Match[]>([]);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Big Screen Team Name & Roster Manager Modal State
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTeamsState, setRosterTeamsState] = useState<{ teamName: string; contactPhone: string; players: string[] }[]>([]);

  // Individual Match Edit State
  const [editTeamAName, setEditTeamAName] = useState("");
  const [editTeamBName, setEditTeamBName] = useState("");
  const [editScoreA, setEditScoreA] = useState(0);
  const [editScoreB, setEditScoreB] = useState(0);
  const [editRosterA, setEditRosterA] = useState<string[]>([]);
  const [editRosterB, setEditRosterB] = useState<string[]>([]);

  // Fetch Tournaments from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Tournament);
      });
      setTournaments(list);
      
      if (list.length > 0) {
        if (selectedTId) {
          const found = list.find(t => t.id === selectedTId);
          setSelectedTournament(found || list[0]);
        } else {
          setSelectedTournament(list[0]);
          setSelectedTId(list[0].id);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedTId]);

  // Generate or Load Bracket Matches when Selected Tournament changes
  useEffect(() => {
    if (!selectedTournament) return;

    const maxTeams = selectedTournament.maxTeams || 8;
    const teams = selectedTournament.registeredTeams || [];
    
    // Prepare Roster Teams State
    const initialRosters: { teamName: string; contactPhone: string; players: string[] }[] = [];
    for (let i = 0; i < maxTeams; i++) {
      const existing = teams[i];
      initialRosters.push({
        teamName: existing?.teamName || `Team ${i + 1}`,
        contactPhone: existing?.contactPhone || "",
        players: existing?.players || ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]
      });
    }
    setRosterTeamsState(initialRosters);

    // Generate Round 1 Matchups
    const matchCount = Math.max(2, Math.floor(maxTeams / 2));
    const generated: Match[] = [];

    for (let i = 0; i < matchCount; i++) {
      const teamAData = initialRosters[i * 2];
      const teamBData = initialRosters[i * 2 + 1];

      generated.push({
        id: i + 1,
        round: "round1",
        title: `Match #${i + 1}`,
        teamA: teamAData?.teamName || `Team ${i * 2 + 1}`,
        teamB: teamBData?.teamName || `Team ${i * 2 + 2}`,
        scoreA: 0,
        scoreB: 0,
        winner: null,
        assignedStations: selectedTournament.stationType ? `${selectedTournament.stationType} Station ${i + 1}` : undefined
      });
    }

    // Add Semi Final Matches
    generated.push({
      id: matchCount + 1,
      round: "semi",
      title: "Semi Final 1",
      teamA: "Winner Match 1",
      teamB: "Winner Match 2",
      scoreA: 0,
      scoreB: 0,
      winner: null
    });

    generated.push({
      id: matchCount + 2,
      round: "semi",
      title: "Semi Final 2",
      teamA: "Winner Match 3",
      teamB: "Winner Match 4",
      scoreA: 0,
      scoreB: 0,
      winner: null
    });

    // Add Grand Final Match
    generated.push({
      id: matchCount + 3,
      round: "final",
      title: "🏆 GRAND FINAL",
      teamA: "Winner Semi 1",
      teamB: "Winner Semi 2",
      scoreA: 0,
      scoreB: 0,
      winner: null
    });

    setMatches(generated);
  }, [selectedTournament]);

  // Open Edit Modal for a Match
  const handleOpenEditMatch = (m: Match) => {
    setEditingMatch(m);
    setEditTeamAName(m.teamA);
    setEditTeamBName(m.teamB);
    setEditScoreA(m.scoreA);
    setEditScoreB(m.scoreB);

    // Find rosters if available
    const teams = selectedTournament?.registeredTeams || [];
    const tA = teams.find(t => t.teamName === m.teamA);
    const tB = teams.find(t => t.teamName === m.teamB);

    setEditRosterA(tA?.players || ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]);
    setEditRosterB(tB?.players || ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]);
  };

  // Save Match Updates & Advance Winner
  const handleSaveMatch = async () => {
    if (!editingMatch || !selectedTournament) return;

    const updatedMatches = matches.map(m => {
      if (m.id === editingMatch.id) {
        const winnerName = editScoreA > editScoreB ? editTeamAName : editScoreB > editScoreA ? editTeamBName : null;
        return {
          ...m,
          teamA: editTeamAName,
          teamB: editTeamBName,
          scoreA: editScoreA,
          scoreB: editScoreB,
          winner: winnerName
        };
      }
      return m;
    });

    setMatches(updatedMatches);

    // Update Tournament Team Names in Firestore if changed
    const currentTeams = [...(selectedTournament.registeredTeams || [])];
    let teamsChanged = false;

    // Find and update team A
    const idxA = currentTeams.findIndex(t => t.teamName === editingMatch.teamA);
    if (idxA !== -1) {
      currentTeams[idxA] = { ...currentTeams[idxA], teamName: editTeamAName, players: editRosterA };
      teamsChanged = true;
    }

    const idxB = currentTeams.findIndex(t => t.teamName === editingMatch.teamB);
    if (idxB !== -1) {
      currentTeams[idxB] = { ...currentTeams[idxB], teamName: editTeamBName, players: editRosterB };
      teamsChanged = true;
    }

    if (teamsChanged && selectedTournament.id) {
      try {
        await updateDoc(doc(db, "tournaments", selectedTournament.id), {
          registeredTeams: currentTeams
        });
      } catch (err) {
        console.error("Error updating rosters in Firestore:", err);
      }
    }

    setEditingMatch(null);
  };

  // Save All Team Names & Rosters from Big Screen Modal
  const handleSaveAllRosters = async () => {
    if (!selectedTournament?.id) return;

    try {
      const updatedRegistrations: TournamentRegistration[] = rosterTeamsState.map(rt => ({
        teamName: rt.teamName,
        players: rt.players,
        contactPhone: rt.contactPhone,
        registeredBy: "admin",
        registeredAt: Timestamp.now()
      }));

      await updateDoc(doc(db, "tournaments", selectedTournament.id), {
        registeredTeams: updatedRegistrations
      });

      // Update Round 1 Matchups in State
      setMatches(prev => {
        return prev.map(m => {
          if (m.round === "round1") {
            const teamAData = rosterTeamsState[(m.id - 1) * 2];
            const teamBData = rosterTeamsState[(m.id - 1) * 2 + 1];
            return {
              ...m,
              teamA: teamAData?.teamName || m.teamA,
              teamB: teamBData?.teamName || m.teamB
            };
          }
          return m;
        });
      });

      setShowRosterModal(false);
    } catch (err) {
      console.error("Error saving rosters to Firestore:", err);
      alert("Failed to save team names");
    }
  };

  // Toggle Fullscreen Mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.log(err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const round1List = matches.filter(m => m.round === "round1");
  const semiList = matches.filter(m => m.round === "semi");
  const finalMatch = matches.find(m => m.round === "final");

  return (
    <div className="min-h-screen bg-slate-950 text-white font-mono p-4 md:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black border-2 border-pink-500/40 p-4 cyber-cut">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="p-2 bg-slate-900 border border-slate-700 hover:border-pink-500 text-slate-300 hover:text-white rounded transition-colors"
            title="Back to Admin"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-xl md:text-2xl font-black text-pink-500 tracking-wider uppercase">
                {selectedTournament?.title || "BIG SCREEN BRACKET ENGINE"}
              </h1>
            </div>
            <p className="text-xs text-cyan-400">
              🎮 {selectedTournament?.gameName || "Esports"} • Interactive Live Bracket & Roster Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Edit Team Names Button */}
          <button
            onClick={() => setShowRosterModal(true)}
            className="px-3.5 py-2 bg-pink-500/20 text-pink-400 border border-pink-500 hover:bg-pink-500 hover:text-black font-bold text-xs uppercase cyber-cut transition-all flex items-center gap-1.5 shadow-md shadow-pink-500/10"
          >
            <Edit3 className="w-4 h-4" /> EDIT TEAM NAMES ({selectedTournament?.maxTeams || 8} TEAMS)
          </button>

          {/* Tournament Selector */}
          <select
            value={selectedTId || ""}
            onChange={(e) => setSelectedTId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs font-mono p-2 rounded outline-none focus:border-pink-500"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.gameName})
              </option>
            ))}
          </select>

          <button
            onClick={toggleFullScreen}
            className="px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500 hover:bg-cyan-500 hover:text-black font-bold text-xs uppercase cyber-cut transition-all flex items-center gap-1.5"
          >
            <Maximize2 className="w-4 h-4" /> FULLSCREEN TV MODE
          </button>
        </div>
      </div>

      {/* Main Cyberpunk Bracket Tree View */}
      <div className="bg-black/90 border-2 border-slate-800 p-6 cyber-cut-reverse space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-black tracking-widest text-yellow-400 uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" /> LIVE INTERACTIVE BRACKET (CLICK ANY TEAM OR MATCH TO EDIT)
          </h2>
          <span className="text-xs text-slate-400">
            Click team/match card → Rename Team & Edit Rosters → Advance Winner!
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center pt-4">
          {/* Round 1 Column (Quarter Finals / Round of 16) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">
              ROUND 1 / QUARTERS ({round1List.length} MATCHES)
            </h3>
            {round1List.map((m) => (
              <div
                key={m.id}
                onClick={() => handleOpenEditMatch(m)}
                className="p-4 bg-slate-950 border-2 border-slate-800 hover:border-pink-500 rounded cursor-pointer transition-all hover:scale-[1.02] shadow-lg group relative overflow-hidden"
              >
                <div className="flex justify-between items-center text-[10px] text-pink-500 font-bold mb-2">
                  <span>{m.title}</span>
                  {m.assignedStations && <span className="text-cyan-400">📍 {m.assignedStations}</span>}
                </div>

                <div className="space-y-1.5 text-xs font-bold">
                  <div className={`flex justify-between items-center p-2 rounded ${m.winner === m.teamA ? "bg-emerald-950/80 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-cyan-300 hover:bg-slate-800"}`}>
                    <span className="truncate flex items-center gap-1.5">
                      {m.teamA} <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="font-mono text-sm">{m.scoreA}</span>
                  </div>

                  <div className={`flex justify-between items-center p-2 rounded ${m.winner === m.teamB ? "bg-emerald-950/80 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-yellow-400 hover:bg-slate-800"}`}>
                    <span className="truncate flex items-center gap-1.5">
                      {m.teamB} <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <span className="font-mono text-sm">{m.scoreB}</span>
                  </div>
                </div>

                <div className="mt-2 text-[9px] text-slate-500 group-hover:text-pink-400 flex items-center justify-end gap-1">
                  <Edit3 className="w-3 h-3" /> Click to Edit Team Names, Roster & Score
                </div>
              </div>
            ))}
          </div>

          {/* Semi Finals Column */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">
              SEMI FINALS
            </h3>
            {semiList.map((m) => (
              <div
                key={m.id}
                onClick={() => handleOpenEditMatch(m)}
                className="p-4 bg-slate-950 border-2 border-cyan-500/40 hover:border-cyan-400 rounded cursor-pointer transition-all hover:scale-[1.02] shadow-lg group relative overflow-hidden"
              >
                <div className="flex justify-between items-center text-[10px] text-cyan-400 font-bold mb-2">
                  <span>{m.title}</span>
                  <span className="text-slate-500">BO3</span>
                </div>

                <div className="space-y-1.5 text-xs font-bold">
                  <div className={`flex justify-between items-center p-2 rounded ${m.winner === m.teamA ? "bg-emerald-950/80 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-white"}`}>
                    <span className="truncate">{m.teamA}</span>
                    <span className="font-mono text-sm">{m.scoreA}</span>
                  </div>

                  <div className={`flex justify-between items-center p-2 rounded ${m.winner === m.teamB ? "bg-emerald-950/80 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-white"}`}>
                    <span className="truncate">{m.teamB}</span>
                    <span className="font-mono text-sm">{m.scoreB}</span>
                  </div>
                </div>

                <div className="mt-2 text-[9px] text-slate-500 group-hover:text-cyan-400 flex items-center justify-end gap-1">
                  <Edit3 className="w-3 h-3" /> Click to Edit Score
                </div>
              </div>
            ))}
          </div>

          {/* Grand Finals & Champion Column */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">
              GRAND FINAL CHAMPIONSHIP
            </h3>

            {finalMatch && (
              <div
                onClick={() => handleOpenEditMatch(finalMatch)}
                className="p-5 bg-yellow-950/20 border-2 border-yellow-500 hover:border-yellow-400 rounded cursor-pointer transition-all hover:scale-[1.02] shadow-xl group relative overflow-hidden glow-yellow"
              >
                <div className="flex justify-between items-center text-xs text-yellow-400 font-black mb-3">
                  <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4" /> {finalMatch.title}</span>
                  <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 font-bold rounded">BO5</span>
                </div>

                <div className="space-y-2 text-sm font-bold">
                  <div className={`flex justify-between items-center p-2.5 rounded ${finalMatch.winner === finalMatch.teamA ? "bg-emerald-950 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-white"}`}>
                    <span className="truncate">{finalMatch.teamA}</span>
                    <span className="font-mono text-base">{finalMatch.scoreA}</span>
                  </div>

                  <div className={`flex justify-between items-center p-2.5 rounded ${finalMatch.winner === finalMatch.teamB ? "bg-emerald-950 border border-emerald-500 text-emerald-400" : "bg-slate-900 text-white"}`}>
                    <span className="truncate">{finalMatch.teamB}</span>
                    <span className="font-mono text-base">{finalMatch.scoreB}</span>
                  </div>
                </div>

                {finalMatch.winner && (
                  <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500 text-yellow-400 text-center rounded font-black text-sm uppercase tracking-wider animate-bounce">
                    👑 TOURNAMENT CHAMPION: {finalMatch.winner}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Match & Roster Modal */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-pink-500 p-6 cyber-cut max-w-2xl w-full space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-pink-500 uppercase flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> EDIT TEAM NAMES, ROSTER & SCORE ({editingMatch.title})
              </h3>
              <button onClick={() => setEditingMatch(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team A Edit */}
              <div className="p-4 bg-slate-900/80 border border-cyan-500/40 rounded space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase">TEAM A CONFIG</h4>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editTeamAName}
                    onChange={(e) => setEditTeamAName(e.target.value)}
                    className="w-full bg-black border border-slate-700 text-cyan-400 font-bold p-2 text-xs focus:border-cyan-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Match Score</label>
                  <input
                    type="number"
                    min="0"
                    value={editScoreA}
                    onChange={(e) => setEditScoreA(Number(e.target.value))}
                    className="w-full bg-black border border-slate-700 text-white font-bold p-2 text-sm focus:border-cyan-500 outline-none"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <label className="text-[10px] text-slate-400 uppercase block font-bold">Player Roster</label>
                  {editRosterA.map((pName, pIdx) => (
                    <input
                      key={pIdx}
                      type="text"
                      value={pName}
                      onChange={(e) => {
                        const updated = [...editRosterA];
                        updated[pIdx] = e.target.value;
                        setEditRosterA(updated);
                      }}
                      className="w-full bg-black border border-slate-800 text-slate-300 p-1.5 text-xs outline-none focus:border-cyan-500"
                    />
                  ))}
                </div>
              </div>

              {/* Team B Edit */}
              <div className="p-4 bg-slate-900/80 border border-yellow-500/40 rounded space-y-3">
                <h4 className="text-xs font-bold text-yellow-400 uppercase">TEAM B CONFIG</h4>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Team Name</label>
                  <input
                    type="text"
                    value={editTeamBName}
                    onChange={(e) => setEditTeamBName(e.target.value)}
                    className="w-full bg-black border border-slate-700 text-yellow-400 font-bold p-2 text-xs focus:border-yellow-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Match Score</label>
                  <input
                    type="number"
                    min="0"
                    value={editScoreB}
                    onChange={(e) => setEditScoreB(Number(e.target.value))}
                    className="w-full bg-black border border-slate-700 text-white font-bold p-2 text-sm focus:border-yellow-500 outline-none"
                  />
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <label className="text-[10px] text-slate-400 uppercase block font-bold">Player Roster</label>
                  {editRosterB.map((pName, pIdx) => (
                    <input
                      key={pIdx}
                      type="text"
                      value={pName}
                      onChange={(e) => {
                        const updated = [...editRosterB];
                        updated[pIdx] = e.target.value;
                        setEditRosterB(updated);
                      }}
                      className="w-full bg-black border border-slate-800 text-slate-300 p-1.5 text-xs outline-none focus:border-yellow-500"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs rounded"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleSaveMatch}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase text-xs tracking-wider cyber-cut transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> SAVE MATCH & ADVANCE WINNER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit All Team Names & Rosters Modal (Big Screen Mode) */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-950 border-2 border-pink-500 p-6 cyber-cut max-w-4xl w-full max-h-[85vh] flex flex-col space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-shrink-0">
              <h3 className="text-base font-black text-pink-500 uppercase flex items-center gap-2">
                <Users className="w-5 h-5" /> EDIT ALL TEAM NAMES & ROSTERS ({selectedTournament?.title})
              </h3>
              <button onClick={() => setShowRosterModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
              <p className="text-xs text-slate-400">
                Rename any team or edit player details below. Changes will immediately reflect across all matches in the Big Screen Bracket Tree!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rosterTeamsState.map((rt, rIdx) => (
                  <div key={rIdx} className="p-4 bg-slate-900 border border-slate-800 rounded space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-yellow-400 border-b border-slate-800 pb-1">
                      <span>SLOT #{rIdx + 1}</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Team Name</label>
                      <input
                        type="text"
                        value={rt.teamName}
                        onChange={(e) => {
                          const updated = [...rosterTeamsState];
                          updated[rIdx] = { ...updated[rIdx], teamName: e.target.value };
                          setRosterTeamsState(updated);
                        }}
                        className="w-full bg-black border border-slate-700 text-white font-bold p-2 text-xs focus:border-pink-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Contact Phone (Optional)</label>
                      <input
                        type="text"
                        value={rt.contactPhone}
                        onChange={(e) => {
                          const updated = [...rosterTeamsState];
                          updated[rIdx] = { ...updated[rIdx], contactPhone: e.target.value };
                          setRosterTeamsState(updated);
                        }}
                        placeholder="+91 9876543210"
                        className="w-full bg-black border border-slate-700 text-slate-300 p-1.5 text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1 pt-1 border-t border-slate-800">
                      <label className="text-[10px] text-slate-400 uppercase block font-bold">Player Roster</label>
                      {rt.players.map((pName, pIdx) => (
                        <input
                          key={pIdx}
                          type="text"
                          value={pName}
                          onChange={(e) => {
                            const updated = [...rosterTeamsState];
                            const players = [...updated[rIdx].players];
                            players[pIdx] = e.target.value;
                            updated[rIdx] = { ...updated[rIdx], players };
                            setRosterTeamsState(updated);
                          }}
                          className="w-full bg-black border border-slate-800 text-slate-300 p-1.5 text-xs outline-none focus:border-cyan-500"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs rounded"
              >
                CANCEL
              </button>

              <button
                type="button"
                onClick={handleSaveAllRosters}
                className="px-6 py-2 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase text-xs tracking-wider cyber-cut transition-all flex items-center gap-2 shadow-lg shadow-pink-500/20"
              >
                <Save className="w-4 h-4" /> SAVE ALL TEAM NAMES & SYNC BRACKET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BigScreenBracketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white font-mono text-xs bg-slate-950 min-h-screen">Loading Big Screen Bracket Engine...</div>}>
      <BracketContent />
    </Suspense>
  );
}
