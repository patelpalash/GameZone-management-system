"use client";

import { useEffect, useState } from "react";
import { Calendar, Trophy, Users, X, Zap, AlertCircle, Gamepad2, Loader2, Award } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Tournament, TournamentRegistration } from "@/types";

export default function TournamentsList() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Form State
  const [activeRegId, setActiveRegId] = useState<string | null>(null); // tournament ID being registered for
  const [teamName, setTeamName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [rosterMembers, setRosterMembers] = useState<string[]>([""]); // starts with one input
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Tournament);
      });
      // Sort: active first, then upcoming, then completed. Sort within by date
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
      console.error("Error listening to tournaments:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddMemberInput = () => {
    if (rosterMembers.length < 5) {
      setRosterMembers([...rosterMembers, ""]);
    }
  };

  const handleRemoveMemberInput = (index: number) => {
    if (rosterMembers.length > 1) {
      const updated = [...rosterMembers];
      updated.splice(index, 1);
      setRosterMembers(updated);
    }
  };

  const handleMemberNameChange = (index: number, val: string) => {
    const updated = [...rosterMembers];
    updated[index] = val;
    setRosterMembers(updated);
  };

  const handleOpenRegistration = (tId: string) => {
    setActiveRegId(tId);
    setTeamName("");
    setContactPhone("");
    setRosterMembers([user?.displayName || user?.email || ""]);
    setRegError("");
    setRegSuccess(false);
  };

  const handleRegisterTeam = async (e: React.FormEvent, tournament: Tournament) => {
    e.preventDefault();
    if (!user) return;
    if (!teamName.trim()) {
      setRegError("TEAM_NAME_REQUIRED");
      return;
    }
    if (!contactPhone.trim()) {
      setRegError("CONTACT_PHONE_REQUIRED");
      return;
    }
    
    const validPlayers = rosterMembers.filter(name => name.trim() !== "");
    if (validPlayers.length === 0) {
      setRegError("ROSTER_MUST_CONTAIN_AT_LEAST_ONE_PLAYER");
      return;
    }

    setRegLoading(true);
    setRegError("");

    try {
      // Create registration object
      const registration: TournamentRegistration = {
        teamName: teamName.trim(),
        players: validPlayers,
        registeredBy: user.uid,
        contactPhone: contactPhone.trim(),
        registeredAt: Timestamp.now(),
      };

      const tournamentRef = doc(db, "tournaments", tournament.id);

      await updateDoc(tournamentRef, {
        registeredTeams: arrayUnion(registration)
      });

      setRegSuccess(true);
      setTimeout(() => {
        setActiveRegId(null);
        setRegSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Error registering team:", err);
      setRegError("REGISTRATION_FAILED_TRY_AGAIN");
    } finally {
      setRegLoading(false);
    }
  };

  // Helper to check if a user is already registered in a tournament
  const isUserRegistered = (tournament: Tournament) => {
    if (!user) return false;
    return tournament.registeredTeams?.some(team => team.registeredBy === user.uid);
  };

  const formatTournamentDate = (ts: Timestamp | null | undefined) => {
    if (!ts) return "TBD";
    const date = ts.toDate();
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + " @ " + 
           date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-black border-2 border-cyan-500/20">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">Loading_Tournaments_Grid...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b-2 border-pink-500/20 pb-4">
        <Gamepad2 className="w-6 h-6 text-pink-500 animate-pulse" />
        <h2 className="text-xl font-black tracking-widest text-white uppercase font-mono">
          Live_Tournaments
        </h2>
      </div>

      {tournaments.length === 0 ? (
        <div className="border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center cyber-cut">
          <p className="text-sm font-mono text-slate-500 uppercase">NO_ACTIVE_TOURNAMENTS_PROVISIONED</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((t) => {
            const isRegistered = isUserRegistered(t);
            const isFull = (t.registeredTeams?.length || 0) >= t.maxTeams;
            const regCount = t.registeredTeams?.length || 0;
            const fillPercentage = Math.min(100, (regCount / t.maxTeams) * 100);

            return (
              <div 
                key={t.id} 
                className={`bg-slate-950/60 border-2 p-5 flex flex-col justify-between cyber-cut transition-all ${
                  t.status === "active" 
                    ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
                    : t.status === "completed" 
                    ? "border-slate-800 opacity-60" 
                    : "border-cyan-500/40 hover:border-cyan-500"
                }`}
              >
                <div>
                  {/* Status header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className={`px-2 py-0.5 text-[9px] font-black tracking-widest uppercase border ${
                      t.status === "active" 
                        ? "text-green-400 border-green-500/50 bg-green-500/10 animate-pulse" 
                        : t.status === "completed" 
                        ? "text-slate-400 border-slate-700 bg-slate-800" 
                        : "text-cyan-400 border-cyan-500/50 bg-cyan-400/10"
                    }`}>
                      {t.status === "active" ? "LIVE" : t.status}
                    </span>
                    <span className="text-[10px] text-pink-500 font-bold uppercase tracking-wider font-mono">
                      {t.gameName}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <h3 className="text-lg font-black tracking-widest text-white uppercase mb-2 font-mono">{t.title}</h3>
                  <p className="text-slate-400 font-mono text-xs mb-4 line-clamp-2 leading-relaxed">{t.description}</p>

                  <div className="space-y-2 border-t border-slate-900 pt-3 mb-4 font-mono text-xs">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>{formatTournamentDate(t.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                      <span>Prize Pool: <strong className="text-yellow-400">{t.prizePool}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Users className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                      <span>Roster: <strong className="text-white">{regCount} / {t.maxTeams} Teams</strong></span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full bg-slate-900 h-1.5 mb-5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        t.status === "active" ? "bg-green-500" : "bg-cyan-500"
                      }`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Footer action */}
                <div>
                  {activeRegId === t.id ? (
                    /* Inline registration form */
                    <form onSubmit={(e) => handleRegisterTeam(e, t)} className="border-t border-cyan-500/20 pt-4 mt-2 space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-black">TEAM_REGISTRATION</span>
                        <button 
                          type="button" 
                          onClick={() => setActiveRegId(null)}
                          className="text-slate-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {regError && (
                        <div className="p-2 border border-red-500/40 bg-red-950/20 text-red-500 text-[10px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {regError}
                        </div>
                      )}

                      {regSuccess ? (
                        <div className="p-3 border border-green-500 bg-green-950/20 text-green-400 text-center uppercase tracking-widest font-black">
                          REGISTRATION_SUCCESSFUL
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase tracking-wider">Team Name</label>
                            <input 
                              type="text"
                              value={teamName}
                              onChange={(e) => setTeamName(e.target.value)}
                              placeholder="e.g. CYBER_SHADOWS"
                              className="w-full bg-slate-900 border border-slate-700 text-white p-2 text-xs focus:border-cyan-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase tracking-wider">Contact Phone</label>
                            <input 
                              type="text"
                              value={contactPhone}
                              onChange={(e) => setContactPhone(e.target.value)}
                              placeholder="e.g. +91 9876543210"
                              className="w-full bg-slate-900 border border-slate-700 text-white p-2 text-xs focus:border-cyan-500 focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-400 uppercase tracking-wider flex justify-between">
                              <span>Player Roster ({rosterMembers.filter(m => m.trim()).length} / 5)</span>
                              {rosterMembers.length < 5 && (
                                <button 
                                  type="button" 
                                  onClick={handleAddMemberInput}
                                  className="text-cyan-400 hover:text-cyan-300 font-bold"
                                >
                                  + ADD PLAYER
                                </button>
                              )}
                            </label>
                            {rosterMembers.map((member, index) => (
                              <div key={index} className="flex gap-2">
                                <input 
                                  type="text"
                                  value={member}
                                  onChange={(e) => handleMemberNameChange(index, e.target.value)}
                                  placeholder={`Player #${index + 1} Name`}
                                  className="flex-1 bg-slate-900 border border-slate-700 text-white p-2 text-xs focus:border-cyan-500 focus:outline-none"
                                />
                                {rosterMembers.length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveMemberInput(index)}
                                    className="p-2 bg-slate-800 text-red-400 border border-slate-700"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <button 
                            type="submit"
                            disabled={regLoading}
                            className="w-full py-2 bg-pink-500 text-black font-black tracking-widest uppercase text-xs hover:bg-pink-400 transition-colors flex items-center justify-center gap-1.5"
                          >
                            {regLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            TRANSMIT_REGISTRATION
                          </button>
                        </div>
                      )}
                    </form>
                  ) : (
                    /* Default display/action buttons */
                    <div>
                      {t.status === "completed" ? (
                        <div className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-500 text-center text-xs tracking-widest font-black uppercase flex items-center justify-center gap-1.5">
                          <Award className="w-4 h-4 text-slate-600" />
                          TOURNAMENT_CONCLUDED
                        </div>
                      ) : !user ? (
                        <div className="w-full text-center text-slate-500 font-mono text-[10px] uppercase">
                          LOGIN_TO_REGISTER
                        </div>
                      ) : isRegistered ? (
                        <div className="w-full py-2.5 border border-green-500/30 bg-green-950/10 text-green-400 text-center text-xs tracking-widest font-black uppercase flex items-center justify-center gap-1.5">
                          <Award className="w-4 h-4 text-green-400" />
                          ROSTER_LOCKED (REGISTERED)
                        </div>
                      ) : isFull ? (
                        <div className="w-full py-2.5 bg-slate-900 text-slate-500 text-center text-xs tracking-widest font-black uppercase">
                          BRACKET_FULL
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRegistration(t.id)}
                          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black tracking-widest uppercase text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          REGISTER_TEAM
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
