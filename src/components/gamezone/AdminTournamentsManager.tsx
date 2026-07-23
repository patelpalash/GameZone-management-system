"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Trash2, Trophy, Gamepad2, Loader2, ShieldAlert, Check, Phone, 
  Sparkles, Calculator, DollarSign, Info, Flame, Layers, Users, ChevronDown, ChevronUp, Tv, ExternalLink
} from "lucide-react";
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { GAME_CATALOG } from "@/lib/gameCatalog";
import { Tournament, TournamentRegistration } from "@/types";

// Quick Preset Configurations
const PRESETS = [
  {
    id: "valorant_5v5",
    name: "Valorant / CS2 5v5",
    icon: "🎯",
    gameName: "Valorant",
    mode: "5v5" as const,
    formatType: "single_elimination" as const,
    maxTeams: 8,
    entryFee: 1500,
    stationType: "PC" as const,
    stationRate: 70,
    stationsCount: 10,
    matchDurationMins: 60,
    estimatedHours: 6,
    prizeFirst: 5000,
    prizeSecond: 2000,
    prizeThird: 0,
    description: "5v5 Knockout Tournament. 8 Teams (40 players). Matches BO1, Final BO3. Standard PC Rate ₹70/hr."
  },
  {
    id: "eafc_1v1",
    name: "EA FC 24 / FIFA 1v1",
    icon: "⚽",
    gameName: "FIFA 23",
    mode: "1v1" as const,
    formatType: "single_elimination" as const,
    maxTeams: 16,
    entryFee: 200,
    stationType: "PS5" as const,
    stationRate: 100,
    stationsCount: 2,
    matchDurationMins: 15,
    estimatedHours: 2.5,
    prizeFirst: 1500,
    prizeSecond: 700,
    prizeThird: 0,
    description: "16 Players 1v1 PS5 Knockout. 6-min halves. PS5 Rate ₹100/hr."
  },
  {
    id: "tekken_1v1",
    name: "Tekken 8 / Fighting 1v1",
    icon: "⚔️",
    gameName: "Tekken 8",
    mode: "1v1" as const,
    formatType: "double_elimination" as const,
    maxTeams: 32,
    entryFee: 150,
    stationType: "PS5" as const,
    stationRate: 100,
    stationsCount: 2,
    matchDurationMins: 10,
    estimatedHours: 3.5,
    prizeFirst: 2200,
    prizeSecond: 1000,
    prizeThird: 400,
    description: "32 Players Double Elimination Bracket (Winners & Losers bracket). Fast-paced BO3 sets."
  },
  {
    id: "bgmi_points",
    name: "BGMI / Free Fire Points",
    icon: "📱",
    gameName: "BGMI",
    mode: "custom" as const,
    formatType: "points_table" as const,
    maxTeams: 16,
    entryFee: 500,
    stationType: "PC" as const,
    stationRate: 70,
    stationsCount: 0,
    matchDurationMins: 30,
    estimatedHours: 3,
    prizeFirst: 4000,
    prizeSecond: 2000,
    prizeThird: 1000,
    description: "16 Squads (64 Players) Custom Room Points Table (4 Matches). Placement + Kill Points."
  }
];

export default function AdminTournamentsManager() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState<"designer" | "active_list">("designer");

  // Tournament Designer State
  const [title, setTitle] = useState("VALORANT LAN SHOWDOWN");
  const [gameName, setGameName] = useState("Valorant");
  const [mode, setMode] = useState<"1v1" | "2v2" | "5v5" | "custom">("5v5");
  const [formatType, setFormatType] = useState<"single_elimination" | "double_elimination" | "points_table">("single_elimination");
  const [description, setDescription] = useState("5v5 Knockout Tournament. 8 Teams (40 players). Matches BO1, Final BO3. Standard PC Rate ₹70/hr.");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("14:00");
  const [maxTeams, setMaxTeams] = useState<number>(8);
  const [entryFee, setEntryFee] = useState<number>(1500);

  // Station & Rate Settings
  const [stationType, setStationType] = useState<"PC" | "PS5" | "Xbox">("PC");
  const [stationRate, setStationRate] = useState<number>(70);
  const [stationsCount, setStationsCount] = useState<number>(10);
  const [matchDurationMins, setMatchDurationMins] = useState<number>(60);
  const [estimatedHours, setEstimatedHours] = useState<number>(6);

  // Prize Distribution State
  const [prizeFirst, setPrizeFirst] = useState<number>(5000);
  const [prizeSecond, setPrizeSecond] = useState<number>(2000);
  const [prizeThird, setPrizeThird] = useState<number>(0);

  // Custom Team & Roster Management State
  const [showRosterEditor, setShowRosterEditor] = useState(false);
  const [customTeams, setCustomTeams] = useState<{ teamName: string; contactPhone: string; players: string[] }[]>([]);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // UI State for Active List
  const [expandedTId, setExpandedTId] = useState<string | null>(null);

  // Set default date to upcoming Saturday
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    setDateInput(d.toISOString().split("T")[0]);
  }, []);

  // Sync Custom Teams list size when maxTeams or mode changes
  useEffect(() => {
    const playersPerTeam = mode === "5v5" ? 5 : mode === "2v2" ? 2 : 1;
    setCustomTeams(prev => {
      const result = [];
      for (let i = 0; i < maxTeams; i++) {
        const existing = prev[i];
        const defaultName = mode === "1v1" ? `Player ${i + 1}` : `Team ${i + 1}`;
        const defaultPlayers = Array.from({ length: playersPerTeam }, (_, pIdx) => 
          existing?.players?.[pIdx] || (mode === "1v1" ? `Player ${i + 1}` : `Member ${pIdx + 1}`)
        );
        result.push({
          teamName: existing?.teamName || defaultName,
          contactPhone: existing?.contactPhone || "",
          players: defaultPlayers
        });
      }
      return result;
    });
  }, [maxTeams, mode]);

  // Fetch Existing Tournaments from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tournaments"), (snapshot) => {
      const list: Tournament[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Tournament);
      });
      list.sort((a, b) => {
        const order = { active: 0, upcoming: 1, completed: 2 };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return (a.date?.seconds || 0) - (b.date?.seconds || 0);
      });
      setTournaments(list);
    }, (err) => {
      console.error("Error fetching tournaments:", err);
    });

    return () => unsubscribe();
  }, []);

  // Preset Applicator
  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(pr => pr.id === presetId);
    if (!p) return;
    setTitle(`${p.gameName.toUpperCase()} CHAMPIONSHIP`);
    setGameName(p.gameName);
    setMode(p.mode);
    setFormatType(p.formatType);
    setMaxTeams(p.maxTeams);
    setEntryFee(p.entryFee);
    setStationType(p.stationType);
    setStationRate(p.stationRate);
    setStationsCount(p.stationsCount);
    setMatchDurationMins(p.matchDurationMins);
    setEstimatedHours(p.estimatedHours);
    setPrizeFirst(p.prizeFirst);
    setPrizeSecond(p.prizeSecond);
    setPrizeThird(p.prizeThird);
    setDescription(p.description);
  };

  // Real-time Profit Calculations (NO SNACK BOOST IN FINAL PROFIT)
  const calculations = useMemo(() => {
    const playersPerUnit = mode === "5v5" ? 5 : mode === "2v2" ? 2 : 1;
    const totalPlayers = maxTeams * playersPerUnit;
    const grossCollection = maxTeams * entryFee;
    const totalPrizePool = (Number(prizeFirst) || 0) + (Number(prizeSecond) || 0) + (Number(prizeThird) || 0);
    const totalStationHours = stationsCount * estimatedHours;
    const stationOpportunityCost = totalStationHours * stationRate;
    
    // Pure Financial Math
    const netCashProfit = grossCollection - totalPrizePool;
    const netOpportunityProfit = netCashProfit - stationOpportunityCost;
    
    // FINAL PROFIT: Strictly gaming entry fee net profit (NOT INCLUDING SNACKS)
    const totalFinalProfit = netOpportunityProfit;

    // Optional Snack Revenue Estimation (Display Only - Excluded from final profit)
    const estSnackRevenue = Math.round(totalPlayers * estimatedHours * 25);
    const estSnackProfit = Math.round(estSnackRevenue * 0.5);

    // Minimum Break-even Entry Fee per Team
    const breakEvenEntryFee = maxTeams > 0 ? Math.ceil((totalPrizePool + stationOpportunityCost) / maxTeams) : 0;
    const recommendedEntryFee = maxTeams > 0 ? Math.ceil((totalPrizePool + stationOpportunityCost * 1.25) / maxTeams) : 0;

    let profitStatus: "PROFITABLE" | "BREAKEVEN" | "LOSS" = "PROFITABLE";
    if (netOpportunityProfit < 0) {
      profitStatus = netCashProfit >= stationOpportunityCost * 0.7 ? "BREAKEVEN" : "LOSS";
    }

    return {
      totalPlayers,
      grossCollection,
      totalPrizePool,
      totalStationHours,
      stationOpportunityCost,
      netCashProfit,
      netOpportunityProfit,
      totalFinalProfit,
      estSnackRevenue,
      estSnackProfit,
      breakEvenEntryFee,
      recommendedEntryFee,
      profitStatus
    };
  }, [maxTeams, entryFee, prizeFirst, prizeSecond, prizeThird, stationsCount, estimatedHours, stationRate, mode]);

  // Round 1 Matchups Generator
  const round1Matchups = useMemo(() => {
    const matchups = [];
    for (let i = 0; i < maxTeams; i += 2) {
      const teamA = customTeams[i]?.teamName || `Team ${i + 1}`;
      const teamB = customTeams[i + 1]?.teamName || `Team ${i + 2}`;
      matchups.push({
        matchNumber: Math.floor(i / 2) + 1,
        teamA,
        teamB
      });
    }
    return matchups;
  }, [maxTeams, customTeams]);

  // Update a team's name or contact
  const handleTeamChange = (index: number, field: "teamName" | "contactPhone", value: string) => {
    setCustomTeams(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Update a player's name in a team roster
  const handlePlayerNameChange = (teamIndex: number, playerIndex: number, value: string) => {
    setCustomTeams(prev => {
      const updated = [...prev];
      if (updated[teamIndex]) {
        const players = [...(updated[teamIndex].players || [])];
        players[playerIndex] = value;
        updated[teamIndex] = { ...updated[teamIndex], players };
      }
      return updated;
    });
  };

  // Create Tournament in Firestore
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !gameName.trim() || !dateInput || !timeInput) {
      setFormError("ALL_REQUIRED_FIELDS_MUST_BE_FILLED");
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

      const formattedPrizeString = `₹${calculations.totalPrizePool.toLocaleString()} (1st: ₹${prizeFirst.toLocaleString()}, 2nd: ₹${prizeSecond.toLocaleString()}${prizeThird > 0 ? `, 3rd: ₹${prizeThird.toLocaleString()}` : ""})`;

      // Prepare custom registered teams
      const registeredTeamsData: TournamentRegistration[] = customTeams.map(ct => ({
        teamName: ct.teamName || "Team",
        players: ct.players || [],
        contactPhone: ct.contactPhone || "",
        registeredBy: "admin",
        registeredAt: Timestamp.now()
      }));

      const newTournament: Omit<Tournament, "id"> = {
        title: title.trim(),
        gameName: gameName.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(combinedDateTime),
        maxTeams: Number(maxTeams),
        registeredTeams: registeredTeamsData,
        status: "upcoming",
        prizePool: formattedPrizeString,
        entryFee: Number(entryFee),
        formatType,
        mode,
        stationType,
        stationRate: Number(stationRate),
        prizeFirst: Number(prizeFirst),
        prizeSecond: Number(prizeSecond),
        prizeThird: Number(prizeThird)
      };

      await addDoc(collection(db, "tournaments"), newTournament);

      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setActiveTab("active_list");
      }, 1500);
    } catch (err) {
      console.error("Error creating tournament:", err);
      setFormError("FAILED_TO_PROVISION_TOURNAMENT");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateStatus = async (tournamentId: string, newStatus: "upcoming" | "active" | "completed") => {
    try {
      await updateDoc(doc(db, "tournaments", tournamentId), { status: newStatus });
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
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 border border-slate-800 p-4 cyber-cut">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/10 border border-pink-500/30 text-pink-500 rounded">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-widest text-pink-500 uppercase font-mono flex items-center gap-2">
              TOURNAMENT_MANAGER <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            </h2>
            <p className="text-xs font-mono text-slate-400">GUI Designer, Matchup Bracket Engine & Profit Simulator</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 border border-slate-800 rounded">
          <button
            onClick={() => setActiveTab("designer")}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all rounded ${
              activeTab === "designer"
                ? "bg-pink-500 text-black shadow-lg shadow-pink-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calculator className="w-3.5 h-3.5 inline mr-1.5" /> DESIGNER & SIMULATOR
          </button>
          <button
            onClick={() => setActiveTab("active_list")}
            className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase transition-all rounded flex items-center gap-1.5 ${
              activeTab === "active_list"
                ? "bg-pink-500 text-black shadow-lg shadow-pink-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> ACTIVE ({tournaments.length})
          </button>
        </div>
      </div>

      {activeTab === "designer" ? (
        <div className="space-y-6">
          {/* Quick Preset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" /> QUICK PRESET TEMPLATES
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-left transition-all group cyber-cut relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{p.icon}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-cyan-400 rounded">
                      {p.mode}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-pink-400 font-mono transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    Fee: ₹{p.entryFee} • {p.maxTeams} Teams • {p.stationType} @ ₹{p.stationRate}/hr
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTournament} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Controls Column (GUI Inputs & Roster Management) */}
            <div className="lg:col-span-7 space-y-5 bg-slate-950 border border-slate-800 p-6 cyber-cut-reverse">
              <h3 className="text-sm font-black tracking-widest text-pink-500 uppercase font-mono pb-2 border-b border-slate-800 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" /> TOURNAMENT CONFIGURATION
              </h3>

              {formError && (
                <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-green-950/50 border border-green-500 text-green-400 text-xs font-mono flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  TOURNAMENT PROVISIONED & PUBLISHED SUCCESSFULLY!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tournament Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. VALORANT LAN SHOWDOWN"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Game Title</label>
                  <input
                    type="text"
                    required
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    list="game-catalog-list"
                    placeholder="e.g. Valorant"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  />
                  <datalist id="game-catalog-list">
                    {GAME_CATALOG.map((g) => (
                      <option key={g.name} value={g.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Mode & Format Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Format Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "1v1" | "2v2" | "5v5" | "custom")}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  >
                    <option value="1v1">1v1 Solo</option>
                    <option value="2v2">2v2 Duo</option>
                    <option value="5v5">5v5 Squad</option>
                    <option value="custom">Custom Squad</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bracket Format</label>
                  <select
                    value={formatType}
                    onChange={(e) => setFormatType(e.target.value as "single_elimination" | "double_elimination" | "points_table")}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  >
                    <option value="single_elimination">Single Knockout</option>
                    <option value="double_elimination">Double Knockout</option>
                    <option value="points_table">Points Table Standings</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slots / Capacity</label>
                  <select
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-cyan-400 font-bold p-2.5 focus:border-pink-500 outline-none"
                  >
                    <option value={4}>4 Teams / Players</option>
                    <option value={8}>8 Teams / Players</option>
                    <option value={16}>16 Teams / Players</option>
                    <option value={32}>32 Teams / Players</option>
                    <option value={64}>64 Teams / Players</option>
                  </select>
                </div>
              </div>

              {/* Financial Inputs (Entry Fee & Station Pricing) */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 space-y-4 font-mono text-xs">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" /> ENTRY FEE & STATION HOURLY PRICING
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Entry Fee per {mode === "1v1" ? "Player" : "Team"} (₹)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="50"
                      value={entryFee}
                      onChange={(e) => setEntryFee(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-yellow-400 font-bold p-2 text-sm focus:border-yellow-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Station Type</label>
                    <select
                      value={stationType}
                      onChange={(e) => setStationType(e.target.value as "PC" | "PS5" | "Xbox")}
                      className="w-full bg-black border border-slate-700 text-white p-2 text-sm focus:border-cyan-500 outline-none"
                    >
                      <option value="PC">PC Gaming (₹70/hr)</option>
                      <option value="PS5">PlayStation 5 (₹100/hr)</option>
                      <option value="Xbox">Xbox Series X (₹100/hr)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Hourly Rate (₹/hr)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stationRate}
                      onChange={(e) => setStationRate(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-cyan-400 font-bold p-2 text-sm focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Stations Reserved</label>
                    <input
                      type="number"
                      min="0"
                      value={stationsCount}
                      onChange={(e) => setStationsCount(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-pink-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Match Duration (mins)</label>
                    <input
                      type="number"
                      min="5"
                      value={matchDurationMins}
                      onChange={(e) => setMatchDurationMins(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-pink-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Est. Total Duration (hrs)</label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-white p-2 text-xs focus:border-pink-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Prize Pool Distribution */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 space-y-3 font-mono text-xs">
                <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> PRIZE POOL BREAKDOWN (TOTAL: ₹{calculations.totalPrizePool.toLocaleString()})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-yellow-500 uppercase block mb-1">🏆 1st Prize (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={prizeFirst}
                      onChange={(e) => setPrizeFirst(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-yellow-400 font-bold p-2 text-xs focus:border-yellow-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">🥈 2nd Prize (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={prizeSecond}
                      onChange={(e) => setPrizeSecond(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-slate-300 font-bold p-2 text-xs focus:border-slate-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-amber-600 uppercase block mb-1">🥉 3rd Prize (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={prizeThird}
                      onChange={(e) => setPrizeThird(Number(e.target.value))}
                      className="w-full bg-black border border-slate-700 text-amber-500 font-bold p-2 text-xs focus:border-amber-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Roster & Team Name Customizer (Accordion) */}
              <div className="border border-slate-800 bg-slate-900/60 rounded font-mono text-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRosterEditor(!showRosterEditor)}
                  className="w-full p-3.5 bg-slate-900 hover:bg-slate-800 flex items-center justify-between font-bold text-pink-400 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-500" /> 
                    EDIT TEAM NAMES & PLAYER ROSTERS ({maxTeams} SLOTS)
                  </span>
                  {showRosterEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRosterEditor && (
                  <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar border-t border-slate-800">
                    <p className="text-[10px] text-slate-400">
                      Customize team names and individual player details. Changes will automatically update the live bracket preview!
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customTeams.map((team, tIdx) => (
                        <div key={tIdx} className="p-3 bg-black border border-slate-800 rounded space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold text-yellow-500">
                            <span>SLOT #{tIdx + 1}</span>
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-500 uppercase block">Team / Player Name</label>
                            <input
                              type="text"
                              value={team.teamName}
                              onChange={(e) => handleTeamChange(tIdx, "teamName", e.target.value)}
                              placeholder={`Team ${tIdx + 1}`}
                              className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 text-xs outline-none focus:border-pink-500"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-slate-500 uppercase block">Captain Phone (Optional)</label>
                            <input
                              type="text"
                              value={team.contactPhone}
                              onChange={(e) => handleTeamChange(tIdx, "contactPhone", e.target.value)}
                              placeholder="+91 9876543210"
                              className="w-full bg-slate-900 border border-slate-700 text-slate-300 p-1 text-[11px] outline-none"
                            />
                          </div>

                          {mode !== "1v1" && (
                            <div className="space-y-1 pt-1 border-t border-slate-800">
                              <label className="text-[9px] text-slate-400 uppercase block font-bold">Player Roster</label>
                              {team.players.map((player, pIdx) => (
                                <input
                                  key={pIdx}
                                  type="text"
                                  value={player}
                                  onChange={(e) => handlePlayerNameChange(tIdx, pIdx, e.target.value)}
                                  placeholder={`Player ${pIdx + 1}`}
                                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 p-1 text-[10px] outline-none focus:border-cyan-500"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tournament Date</label>
                  <input
                    type="date"
                    required
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Time</label>
                  <input
                    type="time"
                    required
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Public Notes & Rules</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 focus:border-pink-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-3 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase text-sm tracking-widest cyber-cut transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20"
              >
                {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                PROVISION & PUBLISH TOURNAMENT
              </button>
            </div>

            {/* Right Financial HUD & Advanced Matchup Bracket Preview */}
            <div className="lg:col-span-5 space-y-5">
              {/* Financial Simulator HUD */}
              <div className="bg-slate-950 border-2 border-cyan-500/40 p-5 cyber-cut space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black tracking-widest text-cyan-400 uppercase flex items-center gap-2">
                    <Calculator className="w-4 h-4" /> PROFIT SIMULATOR HUD
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
                      calculations.profitStatus === "PROFITABLE"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 glow-emerald"
                        : calculations.profitStatus === "BREAKEVEN"
                        ? "bg-yellow-950/80 border-yellow-500 text-yellow-400"
                        : "bg-red-950/80 border-red-500 text-red-400 glow-red"
                    }`}
                  >
                    {calculations.profitStatus}
                  </span>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Gross Collection</span>
                    <span className="text-lg font-black text-yellow-400">₹{calculations.grossCollection.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block">{maxTeams} slots × ₹{entryFee}</span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Prize Pool Payout</span>
                    <span className="text-lg font-black text-pink-500">₹{calculations.totalPrizePool.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block">Prizes 1st, 2nd, 3rd</span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Station Time Value</span>
                    <span className="text-lg font-black text-cyan-400">₹{calculations.stationOpportunityCost.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block">{calculations.totalStationHours} station-hrs @ ₹{stationRate}/hr</span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">Net Cash Maintained</span>
                    <span className={`text-lg font-black ${calculations.netCashProfit >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                      ₹{calculations.netCashProfit.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-500 block">Collection - Prizes</span>
                  </div>
                </div>

                {/* Net Opportunity (FINAL PROFIT - NO SNACK BOOST) */}
                <div className="p-4 bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-white">Net Gaming Profit vs Station Rate:</span>
                    <span className={`text-base ${calculations.netOpportunityProfit >= 0 ? "text-emerald-400 glow-emerald" : "text-red-500 glow-red"}`}>
                      {calculations.netOpportunityProfit >= 0 ? "+" : ""}₹{calculations.netOpportunityProfit.toLocaleString()}
                    </span>
                  </div>

                  {/* Optional Snack Estimate Badge (DISPLAY ONLY - EXCLUDED FROM PROFIT) */}
                  <div className="flex justify-between items-center border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-400">
                      🥤 Optional Bonus Est. Snack Sales:
                    </span>
                    <span className="font-bold text-yellow-400/90">+₹{calculations.estSnackRevenue.toLocaleString()} (₹{calculations.estSnackProfit} profit)</span>
                  </div>
                  <p className="text-[9px] text-slate-500 italic">*Snack bonus is an optional estimate and NOT included in the final profit.</p>
                </div>

                {/* Smart Advisory */}
                <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Info className="w-3.5 h-3.5 text-cyan-400" /> SMART ADVISORY
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Break-even entry fee for this setup is <strong className="text-yellow-400">₹{calculations.breakEvenEntryFee}</strong>/unit. 
                    Recommended entry fee for 25% profit margin is <strong className="text-emerald-400">₹{calculations.recommendedEntryFee}</strong>/unit.
                  </p>
                </div>
              </div>

              {/* Advanced Dynamic Matchup Bracket Engine */}
              <div className="bg-slate-950 border border-slate-800 p-5 cyber-cut font-mono space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black tracking-widest text-pink-500 uppercase">
                    ADVANCED BRACKET MATCHUPS ({maxTeams} TEAMS)
                  </h4>
                  <a
                    href="/admin/tournaments/bracket"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-pink-500/20 hover:bg-pink-500 text-pink-400 hover:text-black border border-pink-500 font-bold uppercase text-[10px] tracking-wider rounded transition-all flex items-center gap-1 self-start sm:self-auto"
                    title="Open interactive Big Screen bracket on TV mode"
                  >
                    <Tv className="w-3.5 h-3.5" /> OPEN BIG SCREEN MODE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {formatType === "points_table" ? (
                  <div className="border border-slate-800 text-[10px]">
                    <div className="grid grid-cols-4 bg-slate-900 p-2 font-bold text-slate-400 border-b border-slate-800">
                      <span>RANK</span>
                      <span className="col-span-2 font-bold">TEAM NAME</span>
                      <span className="text-right">PTS</span>
                    </div>
                    {customTeams.map((ct, i) => (
                      <div key={i} className="grid grid-cols-4 p-2 border-b border-slate-800/50 text-slate-300">
                        <span className="text-yellow-500 font-bold">#{i + 1}</span>
                        <span className="col-span-2 font-bold text-white">{ct.teamName}</span>
                        <span className="text-right font-bold text-cyan-400">0</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 text-[10px]">
                    {/* Round 1 Matchups */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-slate-400 font-bold text-[9px] tracking-wider border-b border-slate-800 pb-1">
                        <span>ROUND 1 MATCHUPS ({round1Matchups.length} MATCHES)</span>
                        <span className="text-cyan-400">RESERVED: {stationsCount > 0 ? `${stationsCount}x ${stationType}` : "None"}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {round1Matchups.map((m) => (
                          <div key={m.matchNumber} className="p-2 bg-slate-900 border border-slate-800 rounded space-y-1">
                            <div className="flex justify-between text-[9px] text-pink-500 font-bold border-b border-slate-800 pb-0.5">
                              <span>MATCH #{m.matchNumber}</span>
                              <span className="text-slate-500">BO1</span>
                            </div>
                            <div className="flex items-center justify-between text-white font-bold">
                              <span className="text-cyan-400">{m.teamA}</span>
                              <span className="text-slate-500 text-[9px] px-1">VS</span>
                              <span className="text-yellow-400">{m.teamB}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quarter / Semi / Finals Flow Preview */}
                    <div className="p-3 bg-black border border-slate-800 rounded space-y-2">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-1">
                        TOURNAMENT PROGRESSION TREE
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[9px] text-center">
                        <div className="p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          <span className="block font-bold text-slate-500">QUARTER FINALS</span>
                          <span>{round1Matchups.length} Matches</span>
                        </div>

                        <div className="p-1.5 bg-slate-900 border border-cyan-500/40 rounded text-cyan-300">
                          <span className="block font-bold text-cyan-400">SEMI FINALS</span>
                          <span>Top 4 Teams</span>
                        </div>

                        <div className="p-1.5 bg-yellow-950/40 border border-yellow-500/60 rounded text-yellow-400 font-bold glow-yellow">
                          <span className="block font-bold text-yellow-500">GRAND FINAL</span>
                          <span>CHAMPION</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Active & Upcoming Tournaments List */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {tournaments.map((t) => {
              const isExpanded = expandedTId === t.id;
              const registeredCount = t.registeredTeams?.length || 0;

              return (
                <div key={t.id} className="bg-slate-950 border border-slate-800 hover:border-pink-500/40 transition-all cyber-cut p-5 space-y-4 font-mono">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">{t.title}</span>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                            t.status === "active"
                              ? "bg-green-950/80 border-green-500 text-green-400"
                              : t.status === "upcoming"
                              ? "bg-yellow-950/80 border-yellow-500 text-yellow-400"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs text-cyan-400 flex items-center gap-3">
                        <span>🎮 {t.gameName}</span>
                        <span>📅 {formatTournamentDate(t.date)}</span>
                        <span>🏆 {t.prizePool}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value as "upcoming" | "active" | "completed")}
                        className="bg-slate-900 border border-slate-700 text-xs text-white p-1.5 rounded outline-none"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>

                      <button
                        onClick={() => setExpandedTId(isExpanded ? null : t.id)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs rounded"
                      >
                        {isExpanded ? "Hide Rosters" : `Teams (${registeredCount}/${t.maxTeams})`}
                      </button>

                      <button
                        onClick={() => handleDeleteTournament(t.id, t.title)}
                        className="p-1.5 bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white rounded transition-colors"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Roster Details */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-yellow-400 uppercase flex items-center justify-between">
                        <span>REGISTERED ROSTERS ({registeredCount} / {t.maxTeams})</span>
                        {t.entryFee && <span>Entry Fee: ₹{t.entryFee}</span>}
                      </h4>

                      {registeredCount === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">NO_TEAMS_REGISTERED_YET</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {t.registeredTeams.map((reg, idx) => (
                            <div key={idx} className="p-3 bg-black border border-slate-800 rounded space-y-1">
                              <div className="flex items-center justify-between font-bold text-pink-400">
                                <span>#{idx + 1} {reg.teamName}</span>
                                {reg.contactPhone && (
                                  <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                                    <Phone className="w-3 h-3 text-emerald-400" /> {reg.contactPhone}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300">
                                Roster: {reg.players?.join(", ") || "No player names listed"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {tournaments.length === 0 && (
              <div className="p-12 border border-slate-800 border-dashed text-center text-slate-500 font-mono">
                NO_ACTIVE_OR_UPCOMING_TOURNAMENTS
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
