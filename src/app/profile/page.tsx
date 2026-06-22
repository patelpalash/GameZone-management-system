"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings } from "@/hooks/useBookings";
import { useStations } from "@/hooks/useStations";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Award,
  Clock,
  Calendar,
  Shield,
  ArrowLeft,
  Loader2,
  Save,
  Gamepad2,
  Tv
} from "lucide-react";
import NextLink from "next/link";

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

export default function ProfilePage() {
  const { user, loading: authLoading, updateUserProfile } = useAuth();
  const router = useRouter();

  const userId = user?.uid || "";
  const { bookings, loading: bookingsLoading } = useBookings(userId);
  const { stations, loading: stationsLoading } = useStations();

  // Firestore profile states
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load Firestore profile data
  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setPhone(data.phone || "");
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  // Sync display name with Auth provider
  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    } else if (user?.email) {
      setDisplayName(user.email.split("@")[0]);
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Playtime and Badge stats
  const totalPlaytimeHours = useMemo(() => {
    const activeOrCompleted = bookings.filter(
      (b) => b.status === "completed" || b.status === "active"
    );
    const totalMinutes = activeOrCompleted.reduce(
      (sum, b) => sum + (b.durationMinutes || 0),
      0
    );
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [bookings]);

  const loyaltyBadge = useMemo(() => {
    return getBadgeLabel(totalPlaytimeHours);
  }, [totalPlaytimeHours]);

  const totalBookingsCount = bookings.length;

  const favoriteNode = useMemo(() => {
    if (bookings.length === 0 || stations.length === 0) return "N/A";
    const counts: Record<string, number> = {};
    bookings.forEach((b) => {
      const station = stations.find((s) => s.id === b.stationId);
      if (station) {
        counts[station.type] = (counts[station.type] || 0) + 1;
      }
    });

    let maxType = "N/A";
    let maxCount = 0;
    Object.entries(counts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxType = type;
      }
    });
    return maxType === "N/A" ? "N/A" : maxType;
  }, [bookings, stations]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      // 1. Update display name in Firebase Auth
      await updateUserProfile(displayName.trim());

      // 2. Write details to Firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          name: displayName.trim(),
          phone: phone.trim(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      const errMsg = err instanceof Error ? err.message : "Uplink failed. Please check connection.";
      setSaveError(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-2xl font-black tracking-widest uppercase animate-pulse">
            LOADING_PROFILE...
          </h1>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* HUD Header */}
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-cyan-500/30 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500 text-black cyber-cut-reverse">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-widest text-white uppercase text-neon-cyan">
              USER_PROFILE
            </h1>
            <p className="text-cyan-500/70 font-bold text-xs md:text-sm tracking-[0.3em] uppercase mt-1">
              Terminal Identity / Configuration
            </p>
          </div>
        </div>
        <NextLink
          href="/dashboard"
          className="px-4 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold tracking-widest uppercase text-sm cyber-cut flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto"
        >
          <ArrowLeft size={14} /> BACK_TO_GRID
        </NextLink>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 max-w-5xl mx-auto items-stretch">
        {/* Left Side: Gamer Card & Stats */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Identity HUD Card */}
          <div className="bg-black border-2 border-cyan-500/40 p-6 cyber-cut relative overflow-hidden flex flex-col items-center text-center">
            {/* Background cyber lines */}
            <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
              <Award className="w-48 h-48 text-cyan-500" />
            </div>

            {/* Avatar */}
            <div className="relative group w-24 h-24 mb-4 rounded-none border-2 border-cyan-500 p-1 bg-cyan-950/20 cyber-cut">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-full h-full object-cover border border-cyan-500/30"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center border border-cyan-500/30">
                  <User className="w-10 h-10 text-cyan-500/60" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-cyan-500 text-black font-mono font-bold text-[8px] tracking-widest border border-cyan-400">
                ACTIVE
              </span>
            </div>

            <h2 className="text-2xl font-black text-white tracking-widest uppercase font-mono mb-1">
              {displayName}
            </h2>
            <p className="text-slate-500 font-mono text-xs mb-4">{user.email}</p>

            <div
              className={`px-3 py-1 text-xs font-black tracking-widest uppercase border cyber-cut-reverse ${getBadgeColor(
                loyaltyBadge
              )}`}
            >
              {loyaltyBadge}_MEMBER
            </div>
          </div>

          {/* Gametime Stats LED panel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border-2 border-slate-800 bg-slate-950/50 cyber-cut-reverse text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
              <p className="text-2xl font-black text-cyan-400 text-neon-cyan mt-1">
                {bookingsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  `${totalPlaytimeHours}h`
                )}
              </p>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Time_Played
              </p>
            </div>

            <div className="p-4 border-2 border-slate-800 bg-slate-950/50 cyber-cut text-center">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-pink-500" />
              <p className="text-2xl font-black text-pink-500 text-neon-pink mt-1">
                {bookingsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  totalBookingsCount
                )}
              </p>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Total_Sessions
              </p>
            </div>

            <div className="p-4 border-2 border-slate-800 bg-slate-950/50 cyber-cut text-center col-span-2 flex items-center justify-center gap-4">
              {favoriteNode === "PC" ? (
                <Tv className="w-6 h-6 text-yellow-400" />
              ) : (
                <Gamepad2 className="w-6 h-6 text-yellow-400" />
              )}
              <div className="text-left">
                <p className="text-xl font-black text-yellow-400 text-neon-yellow tracking-widest uppercase leading-none">
                  {bookingsLoading || stationsLoading ? "CALCULATING..." : favoriteNode}
                </p>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                  Primary_Node_Class
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Edit Profile Panel */}
        <div className="flex-1 border-2 border-pink-500/30 bg-pink-950/5 p-6 cyber-cut-reverse flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-pink-500/30 pb-3 mb-2">
              <h3 className="text-xl font-black tracking-widest uppercase text-pink-500">
                UPLINK_CONFIG
              </h3>
              <p className="text-slate-500 font-mono text-xs mt-1">
                &gt; Modify network aliases and credentials
              </p>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-green-950/40 border border-green-500 text-green-400 font-mono text-xs cyber-cut animate-pulse flex items-center gap-2">
                <Save className="w-4 h-4 shrink-0" />
                <span>&gt; PROFILE_DATABASE_UPDATED_SUCCESSFULLY</span>
              </div>
            )}

            {saveError && (
              <div className="p-3 bg-red-950/40 border border-red-500 text-red-500 font-mono text-xs cyber-cut animate-pulse flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                <span>&gt; ERROR: {saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 font-mono text-xs">
              <div className="space-y-2">
                <label className="text-[10px] text-pink-400 uppercase tracking-widest font-bold">
                  Gamer Tag / Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    maxLength={20}
                    placeholder="Enter Alias"
                    className="w-full bg-slate-900/80 border border-slate-700 text-white pl-10 pr-4 py-3 text-sm focus:border-pink-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-pink-400 uppercase tracking-widest font-bold">
                  Secure Voice Link (Phone)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 99999"
                    className="w-full bg-slate-900/80 border border-slate-700 text-white pl-10 pr-4 py-3 text-sm focus:border-pink-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2 opacity-50">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  Terminal Mail Domain (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-700" />
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 text-slate-600 pl-10 pr-4 py-3 text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-6 py-4 bg-pink-500 text-black font-black uppercase tracking-widest text-sm cyber-cut glow-pink transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    UPLINKING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    COMMIT_CHANGES
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
