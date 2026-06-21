"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Trophy, Gamepad2, Loader2, ShieldAlert, Check, Phone } from "lucide-react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GAME_CATALOG } from "@/lib/gameCatalog";
import { Tournament } from "@/types";

export default function AdminTournamentsManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [maxTeams, setMaxTeams] = useState<number>(8);
  const [prizePool, setPrizePool] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // UI State
  const [expandedTId, setExpandedTId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Tournament);
      });
      // Sort by status and date
      list.sort((a, b) => {
        const order = { active: 0, upcoming: 1, completed: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return (a.date?.seconds || 0) - (b.date?.seconds || 0);
      });
      setTournaments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tournaments:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !gameName.trim() || !dateInput || !timeInput || !prizePool.trim()) {
      setFormError("ALL_FIELDS_REQUIRED");
      return;
    }

    setFormLoading(true);
    setFormError("");
    setFormSuccess(false);

    try {
      const combinedDateTime = new Date(`${dateInput}T${timeInput}`);
      if (isNaN(combinedDateTime.getTime())) {
        setFormError("INVALID_DATE_TIME_FORMAT");
        setFormLoading(false);
        return;
      }

      const newTournament = {
        title: title.trim(),
        gameName: gameName.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(combinedDateTime),
        maxTeams: Number(maxTeams),
        registeredTeams: [],
        status: "upcoming",
        prizePool: prizePool.trim()
      };

      await addDoc(collection(db, "tournaments"), newTournament);

      setFormSuccess(true);
      setTitle("");
      setGameName("");
      setDescription("");
      setDateInput("");
      setTimeInput("");
      setMaxTeams(8);
      setPrizePool("");
      
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err) {
      console.error("Error creating tournament:", err);
      setFormError("FAILED_TO_PROVISION_TOURNAMENT");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (tournamentId: string, newStatus: "upcoming" | "active" | "completed") => {
    try {
      await updateDoc(doc(db, "tournaments", tournamentId), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating tournament status:", err);
      alert("Failed to update status");
    }
  };

  const handleDeleteTournament = async (tournamentId: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete and decommission tournament "${name}"?`)) {
      try {
        await deleteDoc(doc(db, "tournaments", tournamentId));
      } catch (err) {
        console.error("Error deleting tournament:", err);
        alert("Failed to delete tournament");
      }
    }
  };

  const formatTournamentDate = (ts: Timestamp | null | undefined) => {
    if (!ts) return "TBD";
    const date = ts.toDate();
    const timeString = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + " @ " + timeString;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Creation form */}
      <div className="lg:col-span-1 bg-slate-950 border-2 border-pink-500/30 p-6 cyber-cut-reverse">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-pink-500/20 pb-4">
          <Gamepad2 className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-black tracking-widest text-pink-500 uppercase font-mono">PROVISION_TOURNAMENT</h2>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 bg-green-950/50 border border-green-500 text-green-400 text-xs font-mono flex items-center gap-2">
            <Check className="w-4 h-4" />
            TOURNAMENT_PROVISIONED_SUCCESSFULLY
          </div>
        )}

        <form onSubmit={handleCreateTournament} className="space-y-4 font-mono text-xs text-slate-300">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tournament Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. VALORANT SHOWDOWN"
              className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Game Name</label>
            <input 
              type="text" 
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              list="game-suggestions"
              placeholder="e.g. Valorant"
              className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
            <datalist id="game-suggestions">
              {GAME_CATALOG.map(g => (
                <option key={g.name} value={g.name} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Roster size, format, schedule, hardware requirements..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
              <input 
                type="date" 
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Time</label>
              <input 
                type="time" 
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Teams</label>
              <input 
                type="number" 
                value={maxTeams}
                onChange={(e) => setMaxTeams(Number(e.target.value))}
                min={2}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prize Pool</label>
              <input 
                type="text" 
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="e.g. ₹10,000 + pass"
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={formLoading}
            className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black tracking-widest uppercase text-sm cyber-cut transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            TRANSMIT_PROVISION
          </button>
        </form>
      </div>

      {/* Listing / Control */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center gap-3 border-b-2 border-slate-800 pb-4">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-black tracking-widest text-white uppercase font-mono">ACTIVE_BRACKETS</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 border border-slate-800 bg-slate-950/20">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
            <p className="font-mono text-xs text-slate-500">Loading Brackets Catalog...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center cyber-cut text-slate-500 font-mono text-xs">
            NO_ACTIVE_TOURNAMENT_PROVISIONS_REGISTERED
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((t) => {
              const regCount = t.registeredTeams?.length || 0;
              const isExpanded = expandedTId === t.id;

              return (
                <div 
                  key={t.id} 
                  className={`bg-slate-950/40 border p-5 cyber-cut flex flex-col justify-between transition-all ${
                    t.status === "active" 
                      ? "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.05)]" 
                      : t.status === "completed" 
                      ? "border-slate-800 opacity-60" 
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3 mb-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-pink-500 font-mono font-bold uppercase tracking-widest">{t.gameName}</span>
                      <h3 className="text-base font-black uppercase text-white tracking-widest font-mono">{t.title}</h3>
                    </div>

                    {/* Status Toggles */}
                    <div className="flex items-center gap-2 font-mono text-[9px] font-bold">
                      <button 
                        onClick={() => handleUpdateStatus(t.id, "upcoming")}
                        className={`px-2 py-1 border transition-colors ${t.status === "upcoming" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500" : "text-slate-500 border-slate-800 hover:text-slate-300"}`}
                      >
                        UPCOMING
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(t.id, "active")}
                        className={`px-2 py-1 border transition-colors ${t.status === "active" ? "bg-green-500/10 text-green-400 border-green-500" : "text-slate-500 border-slate-800 hover:text-slate-300"}`}
                      >
                        LIVE
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(t.id, "completed")}
                        className={`px-2 py-1 border transition-colors ${t.status === "completed" ? "bg-slate-800 text-slate-300 border-slate-700" : "text-slate-500 border-slate-800 hover:text-slate-300"}`}
                      >
                        CONCLUDED
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs text-slate-400 mb-4">
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest">Date & Time</span>
                      <span className="text-white font-bold">{formatTournamentDate(t.date)}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest">Prize Pool</span>
                      <span className="text-yellow-400 font-bold">{t.prizePool}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest">Cap Limit</span>
                      <span className="text-white font-bold">{t.maxTeams} Teams</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-500 uppercase tracking-widest">Registrations</span>
                      <span className="text-pink-400 font-bold">{regCount} Registered</span>
                    </div>
                  </div>

                  {/* Registered Teams Accordian */}
                  {regCount > 0 && (
                    <div className="border-t border-slate-900 pt-3">
                      <button 
                        onClick={() => setExpandedTId(isExpanded ? null : t.id)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold tracking-widest uppercase font-mono flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        {isExpanded ? "COLLAPSE_REGISTRATIONS_ROSTER" : "INSPECT_REGISTRATIONS_ROSTER"}
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-900/50">
                          {t.registeredTeams.map((team, idx) => (
                            <div key={idx} className="p-3 bg-slate-900/30 border border-slate-800 font-mono text-xs space-y-2">
                              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                                <span className="font-black text-white uppercase tracking-wider">{team.teamName}</span>
                                <span className="text-[9px] text-slate-500">#{idx + 1}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Phone className="w-3 h-3 text-pink-500" />
                                <span>{team.contactPhone}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Roster Players</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {team.players.map((p, pIdx) => (
                                    <span key={pIdx} className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded-sm">
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Decommission control */}
                  <div className="flex justify-end mt-4 pt-3 border-t border-slate-950">
                    <button 
                      onClick={() => handleDeleteTournament(t.id, t.title)}
                      className="px-3 py-1.5 bg-red-950/20 text-red-500 border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      DECOMMISSION
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
