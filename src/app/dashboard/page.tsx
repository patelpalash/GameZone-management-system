"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStations } from "@/hooks/useStations";
import { useBookings } from "@/hooks/useBookings";
import StationCard from "@/components/gamezone/StationCard";
import BookingModal from "@/components/gamezone/BookingModal";
import Leaderboard from "@/components/gamezone/Leaderboard";
import { Station, Booking } from "@/types";
import { collection, doc, writeBatch, Timestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Loader2, ArrowLeft, ShieldAlert, LogOut, User } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

export default function UserDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const userId = user?.uid || "";
  const { stations, loading: stationsLoading } = useStations();
  const { bookings, loading: bookingsLoading } = useBookings(userId);
  
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);

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

  // Redirect to login if not authenticated
  if (!authLoading && !user) {
    router.push("/login");
    return null;
  }

  const handleBookNow = (station: Station) => {
    setSelectedStation(station);
    setIsModalOpen(true);
  };

  const handleSubmitPayment = async (
    stationId: string, 
    durationMinutes: number, 
    totalCost: number, 
    transactionId: string,
    isPrebook: boolean,
    scheduledStartTime: Date | null,
    scheduledEndTime: Date | null
  ) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      const newBookingRef = doc(collection(db, "bookings"));
      const stationRef = doc(db, "stations", stationId);

      batch.set(newBookingRef, {
        stationId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        durationMinutes,
        totalCost,
        status: "pending",
        transactionId,
        startTime: null,
        endTime: null,
        isPrebook,
        scheduledStartTime: scheduledStartTime ? Timestamp.fromDate(scheduledStartTime) : null,
        scheduledEndTime: scheduledEndTime ? Timestamp.fromDate(scheduledEndTime) : null,
      });

      if (!isPrebook) {
        batch.update(stationRef, {
          status: "pending",
          currentSessionId: newBookingRef.id,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Error submitting payment:", error);
      throw error;
    }
  };

  const getEndTimeForStation = (stationId: string) => {
    const activeBooking = bookings.find(b => b.stationId === stationId && b.status === "active");
    if (activeBooking && activeBooking.endTime) {
      return activeBooking.endTime.toDate();
    }
    return null;
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (authLoading || stationsLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-2xl font-black tracking-widest uppercase animate-pulse">ESTABLISHING_LINK...</h1>
        </div>
      </div>
    );
  }

  const pcs = stations.filter(s => s.type === "PC").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const consoles = stations.filter(s => s.type === "PS5" || s.type === "Xbox").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

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
        <div className="flex gap-3 flex-wrap items-center">
          {/* User Info */}
          <div className="flex items-center gap-2 px-3 py-2 border border-slate-700 bg-slate-900/50 text-sm">
            <User size={14} className="text-cyan-400" />
            <span className="text-slate-400 font-mono text-xs truncate max-w-[120px]">{user?.displayName || user?.email}</span>
          </div>
          <NextLink href="/" className="px-4 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold tracking-widest uppercase text-sm cyber-cut flex items-center gap-2 transition-all">
            <ArrowLeft size={14} /> MAIN_NET
          </NextLink>
          <NextLink href="/admin" className="px-4 py-2 border border-pink-500 text-pink-500 hover:bg-pink-500/10 font-bold tracking-widest uppercase text-sm cyber-cut-reverse flex items-center gap-2 transition-all">
            <ShieldAlert size={14} /> ADMIN
          </NextLink>
          <button onClick={handleLogout} className="px-4 py-2 border border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white font-bold tracking-widest uppercase text-sm flex items-center gap-2 transition-all">
            <LogOut size={14} /> EXIT
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto">
        {/* Station Grid */}
        <div className="flex-1 space-y-12">
          
          {/* PC Section */}
          <section>
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-cyan-500/30">
              <h2 className="text-2xl font-black tracking-widest uppercase text-cyan-500 text-neon-cyan flex items-center gap-2">
                 THE_GRID (PCs)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pcs.map((station) => (
                <StationCard 
                  key={station.id} 
                  station={station} 
                  endTime={getEndTimeForStation(station.id)}
                  onBookNow={handleBookNow} 
                  confirmedBookings={confirmedBookings.filter(b => b.stationId === station.id)}
                />
              ))}
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
              {consoles.map((station) => (
                <StationCard 
                  key={station.id} 
                  station={station} 
                  endTime={getEndTimeForStation(station.id)}
                  onBookNow={handleBookNow} 
                  confirmedBookings={confirmedBookings.filter(b => b.stationId === station.id)}
                />
              ))}
            </div>
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
        onSubmitPayment={handleSubmitPayment}
      />
    </div>
  );
}
