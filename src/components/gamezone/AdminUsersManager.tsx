"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types";
import UserDetailsModal from "@/components/gamezone/UserDetailsModal";
import { 
  Users, 
  Search, 
  Filter, 
  Loader2, 
  Clock, 
  Phone, 
  Award,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Crown
} from "lucide-react";

const getBadgeLabel = (hours: number): "LEGENDARY" | "DIAMOND" | "PLATINUM" | "GOLD" | "SILVER" => {
  if (hours >= 100) return "LEGENDARY";
  if (hours >= 50) return "DIAMOND";
  if (hours >= 20) return "PLATINUM";
  if (hours >= 5) return "GOLD";
  return "SILVER";
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

type SortField = "name" | "totalHoursPlayed" | "totalSpent" | "joinedAt";
type SortOrder = "asc" | "desc";

export default function AdminUsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalHoursPlayed");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<"all" | "registered" | "walkin">("all");

  // KPIs
  const totalUsers = users.length;
  const globalPlaytime = users.reduce((acc, curr) => acc + (curr.totalHoursPlayed || 0), 0);
  const elitePlayers = users.filter(u => u.totalHoursPlayed >= 50).length;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAtMs = data.createdAt ? (typeof data.createdAt.toMillis === 'function' ? data.createdAt.toMillis() : new Date(data.createdAt as unknown as string).getTime()) : 0;
          fetchedUsers.push({
            id: doc.id,
            name: data.name || "Unknown User",
            email: data.email || "",
            phone: data.phone || "",
            totalHoursPlayed: Number((data.totalHoursPlayed || 0).toFixed(2)),
            totalSpent: data.totalSpent || 0,
            isOffline: data.isOffline || false,
            joinedAt: createdAtMs,
          });
        });
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "name" ? "asc" : "desc"); // Default sensible orders
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = users;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (u) => 
          u.name.toLowerCase().includes(lowerQuery) || 
          (u.email && u.email.toLowerCase().includes(lowerQuery)) ||
          u.phone.includes(searchQuery)
      );
    }

    if (userTypeFilter === "registered") {
      result = result.filter(u => !u.isOffline);
    } else if (userTypeFilter === "walkin") {
      result = result.filter(u => u.isOffline);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "totalHoursPlayed") {
        comparison = a.totalHoursPlayed - b.totalHoursPlayed;
      } else if (sortField === "totalSpent") {
        comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
      } else if (sortField === "joinedAt") {
        comparison = (a.joinedAt || 0) - (b.joinedAt || 0);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [users, searchQuery, sortField, sortOrder, userTypeFilter]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="w-4 h-4 opacity-0 group-hover:opacity-30 flex-shrink-0"><ChevronDown className="w-4 h-4" /></span>;
    return sortOrder === "asc" ? <ChevronUp className="w-4 h-4 text-cyan-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
        <p className="text-cyan-500 font-mono tracking-widest animate-pulse">LOADING_USER_DATABASE...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-slate-900 border-l-4 border-cyan-500 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase text-white">USER_DATABASE</h2>
            <p className="text-slate-400 font-mono text-xs">Total Records: {users.length}</p>
          </div>
        </div>

        <div className="flex-1 md:max-w-md w-full relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white pl-10 pr-4 py-2 font-mono text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
          />
        </div>
        
        <div className="flex w-full md:w-auto bg-slate-950 border border-slate-800 rounded-md overflow-x-auto whitespace-nowrap">
          <button 
            onClick={() => setUserTypeFilter("all")}
            className={`px-3 py-2 text-xs font-mono font-bold transition-colors ${userTypeFilter === 'all' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >ALL</button>
          <button 
            onClick={() => setUserTypeFilter("registered")}
            className={`px-3 py-2 text-xs font-mono font-bold transition-colors ${userTypeFilter === 'registered' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >REGISTERED</button>
          <button 
            onClick={() => setUserTypeFilter("walkin")}
            className={`px-3 py-2 text-xs font-mono font-bold transition-colors ${userTypeFilter === 'walkin' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >WALK-IN</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 border-l-4 border-l-cyan-500 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-24 h-24 -mt-4 -mr-4 text-cyan-500" />
          </div>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-1">Total Users</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{totalUsers}</span>
            <span className="text-cyan-500 font-bold mb-1 tracking-widest">USERS</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 border-l-4 border-l-yellow-500 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-24 h-24 -mt-4 -mr-4 text-yellow-500" />
          </div>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-1">Global Playtime</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{globalPlaytime}</span>
            <span className="text-yellow-500 font-bold mb-1 tracking-widest">HOURS</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 border-l-4 border-l-pink-500 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-5 group-hover:opacity-10 transition-opacity">
            <Award className="w-24 h-24 -mt-4 -mr-4 text-pink-500" />
          </div>
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest mb-1">Elite Players</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-black text-white">{elitePlayers}</span>
            <span className="text-pink-500 font-bold mb-1 tracking-widest">VIPS</span>
          </div>
        </div>
      </div>

      {/* League Guide Legend */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 border border-slate-800 p-3 rounded-md text-xs font-mono">
        <span className="text-slate-400 font-bold mr-2"><Award className="w-4 h-4 inline-block mr-1"/> RANKS GUIDE:</span>
        <span className="px-2 py-1 text-slate-500 border border-slate-700 bg-slate-800 rounded">SILVER (0-5h)</span>
        <span className="px-2 py-1 text-amber-500 border border-amber-500/50 bg-amber-500/10 rounded">GOLD (5-20h)</span>
        <span className="px-2 py-1 text-slate-300 border border-slate-400/50 bg-slate-400/10 rounded">PLATINUM (20-50h)</span>
        <span className="px-2 py-1 text-cyan-400 border border-cyan-400/50 bg-cyan-400/10 rounded">DIAMOND (50-100h)</span>
        <span className="px-2 py-1 text-yellow-400 border border-yellow-400/50 bg-yellow-400/10 rounded">LEGENDARY (100h+)</span>
      </div>

      {/* Data Grid */}
      <div className="bg-slate-950 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-900 border-b border-slate-800 font-mono text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4 w-16 text-center">#</th>
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 flex-shrink-0" /> USER_NAME <SortIcon field="name" />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" /> CONTACT
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort("joinedAt")}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" /> JOIN DATE <SortIcon field="joinedAt" />
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort("totalHoursPlayed")}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" /> PLAYTIME <SortIcon field="totalHoursPlayed" />
                  </div>
                </th>
                <th 
                  className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors group select-none"
                  onClick={() => handleSort("totalSpent")}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">₹</span> SPENDING <SortIcon field="totalSpent" />
                  </div>
                </th>
                <th className="p-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 flex-shrink-0" /> RANK
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredAndSortedUsers.length > 0 ? (
                filteredAndSortedUsers.map((u, idx) => {
                  const badge = getBadgeLabel(u.totalHoursPlayed);
                  const badgeClasses = getBadgeColor(badge);
                  const isTopPlayer = u.totalHoursPlayed >= 50; // Highlighting Diamond/Legendary players
                  const isNewPlayer = u.joinedAt ? (Date.now() - u.joinedAt) <= (30 * 24 * 60 * 60 * 1000) : false;

                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-slate-900/50 transition-colors font-mono cursor-pointer"
                    >
                      <td className="p-4 text-center text-slate-500 border-r border-slate-800/50">
                        {(idx + 1).toString().padStart(3, '0')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0 ${isTopPlayer ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400'}`}>
                            {isTopPlayer ? <Crown className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{u.name}</span>
                              {u.isOffline && <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] uppercase tracking-widest font-black rounded border border-slate-700">Walk-In</span>}
                              {isNewPlayer && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 text-[9px] uppercase tracking-widest font-black rounded animate-pulse">NEW</span>}
                            </div>
                            <span className="text-xs text-slate-600 truncate max-w-[150px]" title={u.id}>ID: {u.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300 text-sm font-bold truncate max-w-[200px]" title={u.email}>{u.email || <span className="text-slate-600 italic font-normal">No email</span>}</span>
                          <span className="text-slate-500 text-xs">{u.phone || <span className="text-slate-600 italic">No phone</span>}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-slate-400 text-sm">
                          {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="italic text-slate-600">N/A</span>}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black ${u.totalHoursPlayed > 0 ? 'text-white' : 'text-slate-600'}`}>
                            {u.totalHoursPlayed} <span className="text-xs font-normal text-slate-500">HRS</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{u.totalSpent || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold tracking-widest border rounded-sm flex items-center w-fit gap-1 ${badgeClasses}`}>
                          <Award className="w-3 h-3 flex-shrink-0" /> {badge}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-8 h-8 mb-2 opacity-50" />
                      <p>NO_RECORDS_FOUND</p>
                      <p className="text-xs">Adjust search parameters and try again.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
        />
      )}
    </div>
  );
}
