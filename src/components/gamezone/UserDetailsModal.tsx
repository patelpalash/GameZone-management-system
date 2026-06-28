"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Booking } from "@/types";
import {
  X,
  User as UserIcon,
  Phone,
  Clock,
  Award,
  Crown,
  Timer,
  Zap,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
  TerminalSquare,
  Mail,
  Calendar,
} from "lucide-react";

interface UserDetailsModalProps {
  user: User;
  onClose: () => void;
}

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

const getNextRank = (hours: number) => {
  if (hours < 5) return { next: "GOLD", req: 5 };
  if (hours < 20) return { next: "PLATINUM", req: 20 };
  if (hours < 50) return { next: "DIAMOND", req: 50 };
  if (hours < 100) return { next: "LEGENDARY", req: 100 };
  return { next: "MAX_RANK", req: hours };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:          { label: "LIVE",      color: "text-green-400",  icon: Zap },
  confirmed:       { label: "CONFIRMED", color: "text-yellow-400", icon: CheckCircle2 },
  completed:       { label: "COMPLETED", color: "text-slate-400",  icon: Timer },
  pending:         { label: "PENDING",   color: "text-orange-400", icon: AlertCircle },
  pending_payment: { label: "UNPAID",    color: "text-red-400",    icon: CreditCard },
  failed:          { label: "FAILED",    color: "text-red-500",    icon: AlertCircle },
};

function formatDateTime(ts: { toDate: () => Date } | null | undefined): { date: string; time: string } | null {
  if (!ts) return null;
  const d = ts.toDate();
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function UserDetailsModal({ user, onClose }: UserDetailsModalProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.id)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data: Booking[] = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() } as Booking));
      
      // Sort on client side by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toDate?.()?.getTime() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user bookings:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id]);

  const badge = getBadgeLabel(user.totalHoursPlayed);
  const badgeClasses = getBadgeColor(badge);
  const isTopPlayer = user.totalHoursPlayed >= 50;
  const rankProgress = getNextRank(user.totalHoursPlayed);
  const progressPercent = rankProgress.req > 0 
    ? Math.min(100, Math.round((user.totalHoursPlayed / rankProgress.req) * 100))
    : 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border-2 border-cyan-500/50 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(6,182,212,0.15)] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isTopPlayer ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'} cyber-cut`}>
              {isTopPlayer ? <Crown className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-widest uppercase text-white">USER_DOSSIER</h2>
              <p className="text-slate-500 font-mono text-xs tracking-wider">ID: {user.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-xs uppercase tracking-widest">Identity</span>
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xl font-black text-white truncate" title={user.name}>{user.name}</div>
                <div className="text-slate-400 font-mono text-xs flex items-center gap-1.5 truncate" title={user.email}>
                  <Mail className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" /> {user.email || "N/A"}
                </div>
                <div className="text-slate-400 font-mono text-xs flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" /> {user.phone || "N/A"}
                </div>
                {user.dob && (
                  <div className="text-slate-400 font-mono text-xs flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" /> DOB: {user.dob}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-xs uppercase tracking-widest">Total Playtime</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-white">{user.totalHoursPlayed}</span>
                <span className="text-slate-500 font-bold mb-1 tracking-widest">HOURS</span>
              </div>
            </div>

            <div className={`bg-slate-900 border p-4 space-y-3 ${isTopPlayer ? 'border-cyan-500/50' : 'border-slate-800'}`}>
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-mono text-xs uppercase tracking-widest">Rank Status</span>
                <Award className={`w-4 h-4 ${isTopPlayer ? 'text-cyan-400' : ''}`} />
              </div>
              <div>
                <span className={`px-2 py-1 text-xs font-bold tracking-widest border rounded-sm flex items-center w-fit gap-1 mb-2 ${badgeClasses}`}>
                  {badge}
                </span>
                {user.totalHoursPlayed < 100 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>Progress to {rankProgress.next}</span>
                      <span>{user.totalHoursPlayed} / {rankProgress.req}</span>
                    </div>
                    <div className="h-1 bg-slate-800 w-full rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white">
              <History className="w-5 h-5 text-cyan-500" />
              <h3 className="font-black tracking-widest uppercase">Activity Log</h3>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-950 border-b border-slate-800 font-mono text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-4">Session</th>
                      <th className="p-4">Station</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-mono animate-pulse">
                          Fetching activity logs...
                        </td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-mono">
                          No activity found for this user.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((b) => {
                        const ts = formatDateTime(b.createdAt);
                        const status = STATUS_CONFIG[b.status] || STATUS_CONFIG.completed;
                        const StatusIcon = status.icon;

                        return (
                          <tr key={b.id} className="hover:bg-slate-800/30 transition-colors font-mono">
                            <td className="p-4">
                              <div className="text-slate-300">{ts?.date}</div>
                              <div className="text-xs text-slate-500">{ts?.time}</div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <TerminalSquare className="w-4 h-4 text-slate-500" />
                                <span className="font-bold text-slate-300">{b.stationId}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-cyan-400 font-bold">{formatDuration(b.durationMinutes)}</span>
                            </td>
                            <td className="p-4">
                              <span className={`flex items-center gap-1.5 text-xs font-bold tracking-widest ${status.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {status.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
