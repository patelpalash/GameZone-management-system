"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth, ADMIN_EMAILS } from "@/contexts/AuthContext";
import { useStations } from "@/hooks/useStations";
import { useBookings } from "@/hooks/useBookings";
import StationCard from "@/components/gamezone/StationCard";
import dynamic from "next/dynamic";
import { Station, Booking } from "@/types";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Shield, 
  Loader2, 
  ArrowLeft, 
  ShieldAlert, 
  LogOut, 
  User,
  Zap,
  CheckCircle2,
  Timer,
  AlertCircle,
  CreditCard,
  History
} from "lucide-react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Lazy-load heavy sidebar/modal components — they are not needed on initial paint
const BookingModal = dynamic(() => import("@/components/gamezone/BookingModal"), { ssr: false });
const Leaderboard = dynamic(() => import("@/components/gamezone/Leaderboard"), { ssr: false });
const TournamentsList = dynamic(() => import("@/components/gamezone/TournamentsList"), { ssr: false });

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:          { label: "LIVE SESSION",   color: "text-green-400",  bg: "bg-green-950/40 border-green-500",   icon: Zap },
  confirmed:       { label: "CONFIRMED",      color: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-500", icon: CheckCircle2 },
  completed:       { label: "COMPLETED",      color: "text-slate-400",  bg: "bg-slate-900/40 border-slate-600",   icon: Timer },
  pending:         { label: "PENDING VERIFY", color: "text-orange-400", bg: "bg-orange-950/40 border-orange-500", icon: AlertCircle },
  pending_payment: { label: "AWAITING PAY",  color: "text-red-400",    bg: "bg-red-950/40 border-red-500",       icon: CreditCard },
  failed:          { label: "FAILED",         color: "text-red-500",    bg: "bg-red-950/40 border-red-600",       icon: AlertCircle },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  UPI:         { label: "UPI",        color: "text-cyan-400" },
  PhonePe_UPI: { label: "PHONEPE UPI", color: "text-purple-400" },
  UPI_MOCK:    { label: "SIMULATED",  color: "text-yellow-400" },
  Cash:        { label: "CASH",       color: "text-green-400" },
};

const formatDateTime = (ts: Timestamp | null | undefined) => {
  if (!ts) return "—";
  const d = ts.toDate();
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
};

function DashboardContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const orderId = searchParams.get("orderId");
  const paymentReason = searchParams.get("reason");

  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");

  const userId = user?.uid || "";
  const { stations, loading: stationsLoading } = useStations();
  const { bookings, loading: bookingsLoading } = useBookings(userId);
  
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "==", "confirmed"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Booking);
      });
      setConfirmedBookings(data);
    }, (error) => {
      console.error("Error listening to confirmed bookings:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "==", "active"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Booking[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Booking);
      });
      setActiveBookings(data);
    }, (error) => {
      console.error("Error listening to active bookings:", error);
    });

    return () => unsubscribe();
  }, []);

  // Auto-dismiss payment status alerts after 10 seconds
  useEffect(() => {
    if (paymentStatus) {
      const timer = setTimeout(() => {
        router.replace("/dashboard");
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  if (!authLoading && !user) {
    return null;
  }

  const handleBookNow = (station: Station) => {
    // Set station first, then open modal to avoid null flash
    setSelectedStation(station);
    setTimeout(() => setIsModalOpen(true), 0);
  };

  const getEndTimeForStation = (stationId: string) => {
    const activeBooking = activeBookings.find(b => b.stationId === stationId && b.status === "active");
    if (activeBooking && activeBooking.endTime) {
      return activeBooking.endTime.toDate();
    }
    return null;
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-2xl font-black tracking-widest uppercase animate-pulse">AUTHENTICATING...</h1>
        </div>
      </div>
    );
  }

  const pcs = stations.filter(s => s.type === "PC").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const consoles = stations.filter(s => s.type === "PS5" || s.type === "Xbox").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  // Skeleton placeholder for station cards while Firestore loads
  const SkeletonCard = () => (
    <div className="border-2 border-slate-800 bg-card/60 p-5 min-h-[250px] animate-pulse cyber-cut">
      <div className="flex justify-between pb-3 mb-4 border-b border-white/10">
        <div className="h-7 w-32 bg-slate-800 rounded" />
        <div className="h-5 w-20 bg-slate-800 rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-3 w-24 bg-slate-800 rounded" />
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="w-14 h-20 bg-slate-800 rounded" />)}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
        <div className="h-8 w-16 bg-slate-800 rounded" />
        <div className="h-8 w-24 bg-slate-800 rounded" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Top Navigation Bar / HUD Header */}
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-cyan-500/30 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500 text-black cyber-cut-reverse">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-widest text-white uppercase text-neon-cyan">
              SYS<span className="text-cyan-500">_</span>ACCESS
            </h1>
            <p className="text-cyan-500/70 font-bold text-xs md:text-sm tracking-[0.3em] uppercase mt-1">
              Select Interface / Authorize Access
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap items-center w-full md:w-auto">
          {/* User Info */}
          <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 border border-slate-700 bg-slate-900/50">
            <User size={14} className="text-cyan-400" />
            <span className="text-slate-400 font-mono text-xs truncate max-w-[100px] sm:max-w-[120px]">{user?.displayName || user?.email}</span>
          </div>
          <NextLink href="/profile" className="px-3 sm:px-4 py-1.5 sm:py-2 border border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 font-bold tracking-widest uppercase text-[10px] sm:text-sm cyber-cut flex items-center gap-1 sm:gap-2 transition-all">
            <User size={14} /> PROFILE
          </NextLink>
          <NextLink href="/" className="px-3 sm:px-4 py-1.5 sm:py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold tracking-widest uppercase text-[10px] sm:text-sm cyber-cut flex items-center gap-1 sm:gap-2 transition-all">
            <ArrowLeft size={14} /> MAIN_NET
          </NextLink>
          {isAdmin && (
            <NextLink href="/admin" className="px-3 sm:px-4 py-1.5 sm:py-2 border border-pink-500 text-pink-500 hover:bg-pink-500/10 font-bold tracking-widest uppercase text-[10px] sm:text-sm cyber-cut-reverse flex items-center gap-1 sm:gap-2 transition-all">
              <ShieldAlert size={14} /> ADMIN
            </NextLink>
          )}
          <button onClick={handleLogout} className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white font-bold tracking-widest uppercase text-[10px] sm:text-sm flex items-center gap-1 sm:gap-2 transition-all">
            <LogOut size={14} /> EXIT
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">
        {/* Station Grid */}
        <div className="flex-1 space-y-12">
          
          {/* Payment Success Alert */}
          {paymentStatus === "success" && (
            <div className="p-4 bg-green-950/40 border-2 border-green-500 text-green-400 font-mono text-sm cyber-cut shadow-[0_0_15px_rgba(34,197,94,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold uppercase tracking-widest text-white">&gt; SECURE_TRANSACTION_APPROVED</p>
                <p className="text-xs text-green-500/80 mt-1">Order ID: {orderId} &bull; Station has been allocated and auto-activated successfully.</p>
              </div>
              <button 
                onClick={() => router.replace("/dashboard")} 
                className="px-4 py-1.5 bg-green-500 text-black text-xs font-black uppercase tracking-widest hover:bg-green-400 transition-colors self-start sm:self-center cyber-cut-reverse"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Payment Failure Alert */}
          {paymentStatus === "failed" && (
            <div className="p-4 bg-red-950/40 border-2 border-red-500 text-red-400 font-mono text-sm cyber-cut shadow-[0_0_15px_rgba(239,68,68,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold uppercase tracking-widest text-white">&gt; TRANSACTION_TERMINATED</p>
                <p className="text-xs text-red-400/80 mt-1">Reason: {paymentReason || "Payment verification failed or was cancelled."}</p>
              </div>
              <button 
                onClick={() => router.replace("/dashboard")} 
                className="px-4 py-1.5 bg-red-500 text-black text-xs font-black uppercase tracking-widest hover:bg-red-400 transition-colors self-start sm:self-center cyber-cut-reverse"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* PC Section */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-cyan-500/30">
              <h2 className="text-2xl font-black tracking-widest uppercase text-cyan-500 text-neon-cyan flex items-center gap-2">
                 THE_GRID (PCs)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stationsLoading
                ? [1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)
                : pcs.map((station) => (
                  <StationCard 
                    key={station.id} 
                    station={station} 
                    endTime={getEndTimeForStation(station.id)}
                    onBookNow={handleBookNow} 
                    confirmedBookings={confirmedBookings.filter(b => b.stationId === station.id)}
                  />
                ))
              }
            </div>
          </section>

          {/* Console Section */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-pink-500/30">
              <h2 className="text-2xl font-black tracking-widest uppercase text-pink-500 text-neon-pink flex items-center gap-2">
                 THE_LOUNGE (Consoles)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stationsLoading
                ? [1,2].map(i => <SkeletonCard key={i} />)
                : consoles.map((station) => (
                  <StationCard 
                    key={station.id} 
                    station={station} 
                    endTime={getEndTimeForStation(station.id)}
                    onBookNow={handleBookNow} 
                    confirmedBookings={confirmedBookings.filter(b => b.stationId === station.id)}
                  />
                ))
              }
            </div>
          </section>

          {/* Esports Tournaments */}
          <section>
            <TournamentsList />
          </section>

          {/* My Transactions & Session Log */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-yellow-500/30">
              <h2 className="text-2xl font-black tracking-widest uppercase text-yellow-400 text-neon-yellow flex items-center gap-2">
                 <History className="w-6 h-6" /> MY_TRANSACTIONS :: SESSION_LOG
              </h2>
            </div>

            {bookingsLoading ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-800 bg-slate-950/20 cyber-cut text-slate-500 font-mono">
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin text-cyan-500" />
                <h2 className="text-base font-bold tracking-widest uppercase mb-1 animate-pulse">LOADING_TRANSACTIONS...</h2>
                <p className="text-xs">Retrieving session records from the database...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center border-2 border-dashed border-slate-800 bg-slate-950/20 cyber-cut text-slate-500 font-mono">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-500" />
                <h2 className="text-base font-bold tracking-widest uppercase mb-1">NO_TRANSACTIONS_FOUND</h2>
                <p className="text-xs">You have no booking or transaction records registered on this account.</p>
              </div>
            ) : (
              <div className="w-full border-2 border-slate-800 bg-slate-950/40 cyber-cut overflow-hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="p-4">Station</th>
                        <th className="p-4">Time / Slot</th>
                        <th className="p-4 text-center">Duration</th>
                        <th className="p-4 text-right">Cost</th>
                        <th className="p-4">Method</th>
                        <th className="p-4">Txn ID</th>
                        <th className="p-4 text-right">Status</th>
                        <th className="p-4 text-center">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {bookings.map((booking) => {
                        const station = stations.find((s) => s.id === booking.stationId);
                        const statusCfg = STATUS_CONFIG[booking.status] || {
                          label: booking.status.toUpperCase(),
                          color: "text-white",
                          bg: "bg-slate-800 border-slate-600",
                          icon: AlertCircle,
                        };
                        const StatusIcon = statusCfg.icon;
                        const paymentCfg = booking.paymentMethod ? PAYMENT_CONFIG[booking.paymentMethod] : null;

                        const startDt = formatDateTime(booking.startTime || booking.scheduledStartTime);
                        const endDt = formatDateTime(booking.endTime || booking.scheduledEndTime);

                        return (
                          <tr key={booking.id} className="hover:bg-slate-900/25 transition-colors group">
                            {/* Station */}
                            <td className="p-4 font-bold text-white flex items-center gap-2">
                              {station?.type === "PC" ? (
                                <span className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff]" />
                              ) : (
                                <span className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_#ff003c]" />
                              )}
                              <span className="group-hover:text-cyan-400 transition-colors">
                                {station?.name || "Unknown Station"}
                              </span>
                              <span className="text-[10px] text-slate-600 block sm:inline font-normal ml-1">
                                ({station?.type || "N/A"})
                              </span>
                            </td>

                            {/* Time / Slot */}
                            <td className="p-4 whitespace-nowrap text-slate-300">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-white font-semibold">{startDt}</span>
                                <span className="text-[10px] text-slate-500">to {endDt}</span>
                              </div>
                            </td>

                            {/* Duration */}
                            <td className="p-4 text-center whitespace-nowrap text-slate-300">
                              {booking.durationMinutes}m
                            </td>

                            {/* Cost */}
                            <td className="p-4 text-right whitespace-nowrap font-bold text-yellow-400">
                              ₹{booking.totalCost}
                            </td>

                            {/* Method */}
                            <td className="p-4 whitespace-nowrap">
                              {paymentCfg ? (
                                <span className={`font-black ${paymentCfg.color}`}>
                                  {paymentCfg.label}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">N/A</span>
                              )}
                            </td>

                            {/* Txn ID */}
                            <td className="p-4 font-mono text-[10px] text-slate-500 select-all whitespace-nowrap max-w-[120px] truncate">
                              {booking.transactionId || "—"}
                            </td>

                            {/* Status */}
                            <td className="p-4 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black tracking-widest border uppercase ${statusCfg.bg} ${statusCfg.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusCfg.label}
                              </span>
                            </td>

                            {/* Receipt */}
                            <td className="p-4 text-center whitespace-nowrap">
                              {booking.status === "completed" || booking.status === "active" || booking.status === "confirmed" ? (
                                <button
                                  type="button"
                                  onClick={async () => { const { downloadReceipt } = await import("@/lib/receiptGenerator"); downloadReceipt(booking, station); }}
                                  className="px-3 py-1 bg-cyan-500/10 border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black font-black tracking-widest text-[9px] uppercase transition-colors cyber-cut"
                                  title="Print Receipt"
                                >
                                  PRINT
                                </button>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {stations.length === 0 && (
            <div className="p-16 text-center border-2 border-dashed border-cyan-500/20 bg-cyan-950/5 cyber-cut text-cyan-500/40">
              <h2 className="text-xl font-black tracking-widest uppercase mb-2">NO_NODES_DETECTED</h2>
              <p className="font-mono text-sm">Go to /admin and provision hardware nodes.</p>
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard */}
        <div className="xl:w-80 shrink-0">
          <Leaderboard />
        </div>
      </div>

      <BookingModal 
        station={selectedStation} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}

export default function UserDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-2xl font-black tracking-widest uppercase animate-pulse">ESTABLISHING_LINK...</h1>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
