"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Clock, Trash2, Plus, AlertCircle, Save } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export interface Closure {
  id: string;
  startTime: Timestamp;
  endTime: Timestamp;
  reason: string;
}

export default function AdminScheduleManager() {
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shop Hours states
  const [shopOpenTime, setShopOpenTime] = useState("09:00");
  const [shopCloseTime, setShopCloseTime] = useState("23:00");
  const [isSavingHours, setIsSavingHours] = useState(false);

  const generateTimeOptions = () => {
    const options = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const value = `${hh}:${mm}`;
        const suffix = h >= 12 ? "PM" : "AM";
        const displayH = h % 12 === 0 ? 12 : h % 12;
        const displayLabel = `${String(displayH).padStart(2, "0")}:${mm} ${suffix}`;
        options.push({ value, label: displayLabel });
      }
    }
    return options;
  };
  const timeOptions = generateTimeOptions();

  const generateOperatingTimeOptions = () => {
    const options = [];
    const [openH, openM] = shopOpenTime.split(":").map(Number);
    const [closeH, closeM] = shopCloseTime.split(":").map(Number);
    
    let currentHour = openH;
    let currentMin = openM;
    
    while (currentHour < closeH || (currentHour === closeH && currentMin <= closeM)) {
      const hh = String(currentHour).padStart(2, "0");
      const mm = String(currentMin).padStart(2, "0");
      const value = `${hh}:${mm}`;
      const suffix = currentHour >= 12 ? "PM" : "AM";
      const displayH = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const displayLabel = `${String(displayH).padStart(2, "0")}:${mm} ${suffix}`;
      options.push({ value, label: displayLabel });
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += 1;
        currentMin = 0;
      }
    }
    return options;
  };
  const operatingTimeOptions = generateOperatingTimeOptions();

  useEffect(() => {
    const q = query(collection(db, "closures"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Closure[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Closure);
      });
      // Sort by start time
      list.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
      setClosures(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching closures:", err);
      setLoading(false);
    });

    const hoursUnsub = onSnapshot(doc(db, "settings", "shop_hours"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.openTime) setShopOpenTime(data.openTime);
        if (data.closeTime) setShopCloseTime(data.closeTime);
      }
    });

    return () => {
      unsubscribe();
      hoursUnsub();
    };
  }, []);

  const handleSaveHours = async () => {
    setIsSavingHours(true);
    try {
      await setDoc(doc(db, "settings", "shop_hours"), {
        openTime: shopOpenTime,
        closeTime: shopCloseTime,
        updatedAt: Timestamp.now()
      }, { merge: true });
      // We could use a toast here, but simple alert for now
      alert("Operating hours successfully updated across all platforms!");
    } catch (err) {
      console.error("Failed to save hours:", err);
      alert("Failed to update operating hours.");
    } finally {
      setIsSavingHours(false);
    }
  };

  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime || !reason) {
      setError("All fields are required.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const startParts = startTime.split(":");
      const endParts = endTime.split(":");

      const startDt = new Date(date.getTime());
      startDt.setHours(Number(startParts[0]), Number(startParts[1]), 0, 0);

      const endDt = new Date(date.getTime());
      endDt.setHours(Number(endParts[0]), Number(endParts[1]), 0, 0);

      if (endDt <= startDt) {
        setError("End time must be after start time.");
        return;
      }

      const newRef = doc(collection(db, "closures"));
      await setDoc(newRef, {
        id: newRef.id,
        startTime: Timestamp.fromDate(startDt),
        endTime: Timestamp.fromDate(endDt),
        reason: reason.trim(),
        createdAt: Timestamp.now()
      });

      // Reset form
      setDate(undefined);
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch (err) {
      console.error("Error adding closure:", err);
      setError("Failed to add schedule block.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this closure?")) return;
    try {
      await deleteDoc(doc(db, "closures", id));
    } catch (err) {
      console.error("Error deleting closure:", err);
      alert("Failed to remove closure.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-cyan-500/30 pb-4">
        <Calendar className="w-8 h-8 text-cyan-400" />
        <div>
          <h2 className="text-2xl font-black tracking-widest uppercase text-white">Master Schedule Manager</h2>
          <p className="text-slate-400 font-mono text-sm tracking-wider">Block times & manage shop closures</p>
        </div>
      </div>

      {/* Global Operating Hours */}
      <div className="border border-cyan-500/20 bg-slate-900/50 p-6 cyber-cut">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-cyan-400 font-black uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-5 h-5" /> Global Operating Hours
            </h3>
            <p className="text-slate-500 text-xs font-mono mt-1">
              Changes apply instantly to both user and admin booking grids.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Open</label>
              <select
                value={shopOpenTime}
                onChange={(e) => setShopOpenTime(e.target.value)}
                className="bg-black border border-slate-700 text-white p-2 text-sm font-mono focus:border-cyan-500 focus:outline-none"
              >
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="text-slate-500 font-bold">—</div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Close</label>
              <select
                value={shopCloseTime}
                onChange={(e) => setShopCloseTime(e.target.value)}
                className="bg-black border border-slate-700 text-white p-2 text-sm font-mono focus:border-cyan-500 focus:outline-none"
              >
                {timeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <button
              onClick={handleSaveHours}
              disabled={isSavingHours}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest cyber-cut transition-all flex items-center gap-2 disabled:opacity-50 ml-2"
            >
              <Save className="w-4 h-4" /> {isSavingHours ? "SAVING..." : "UPDATE"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1 border border-cyan-500/20 bg-slate-900/50 p-6 cyber-cut">
          <h3 className="text-yellow-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" /> New Closure
          </h3>
          
          <form onSubmit={handleAddClosure} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500 text-red-500 text-xs font-mono flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Select Date</label>
              <div className="border border-slate-700 bg-black/50 p-2 flex justify-center">
                <DayPicker
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={{ before: new Date(new Date().setHours(0,0,0,0)) }}
                  modifiersClassNames={{
                    selected: "bg-cyan-500 text-black font-black",
                    today: "text-cyan-400 font-bold"
                  }}
                  className="p-0 m-0 !font-mono text-sm"
                  classNames={{
                    day: "h-8 w-8 p-0 font-normal hover:bg-slate-800 focus:bg-cyan-500/20 text-slate-300",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Start Time</label>
                <select
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-black border border-slate-700 text-white p-2 text-sm font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="" disabled>-- : --</option>
                  {operatingTimeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">End Time</label>
                <select
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-black border border-slate-700 text-white p-2 text-sm font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="" disabled>-- : --</option>
                  {operatingTimeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-cyan-500 font-black tracking-widest uppercase">Reason</label>
              <input
                type="text"
                required
                placeholder="e.g. Maintenance, Private Event"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-black border border-slate-700 text-white p-2 text-sm font-mono focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest cyber-cut transition-all disabled:opacity-50 mt-4"
            >
              {isSubmitting ? "Processing..." : "Block Time Slot"}
            </button>
          </form>
        </div>

        {/* List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-cyan-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Schedule Overview
          </h3>

          {loading ? (
            <div className="p-8 text-center text-cyan-500 animate-pulse font-mono tracking-widest">
              LOADING SCHEDULE...
            </div>
          ) : closures.length === 0 ? (
            <div className="p-8 border border-slate-800 bg-slate-900/30 text-center text-slate-500 font-mono">
              NO CLOSURES SCHEDULED
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const now = new Date();
                const active = closures.filter(c => c.startTime.toDate() <= now && c.endTime.toDate() >= now);
                const upcoming = closures.filter(c => c.startTime.toDate() > now);
                const past = closures.filter(c => c.endTime.toDate() < now).sort((a,b) => b.endTime.toMillis() - a.endTime.toMillis());

                const renderCard = (c: Closure, status: "active" | "upcoming" | "past") => {
                  const sDate = c.startTime.toDate();
                  const eDate = c.endTime.toDate();

                  let borderClass = "";
                  let badgeClass = "";
                  let badgeText = "";
                  
                  if (status === "active") {
                    borderClass = "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-950/20";
                    badgeClass = "bg-red-500 text-black";
                    badgeText = "ACTIVE";
                  } else if (status === "upcoming") {
                    borderClass = "border-cyan-500/50 bg-cyan-950/10";
                    badgeClass = "bg-cyan-500/20 text-cyan-400";
                    badgeText = "UPCOMING";
                  } else {
                    borderClass = "border-slate-800 bg-transparent opacity-60";
                    badgeClass = "bg-slate-800 text-slate-400";
                    badgeText = "PAST";
                  }

                  return (
                    <div key={c.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border ${borderClass} cyber-cut gap-4`}>
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-0.5 text-[10px] font-black tracking-widest ${badgeClass}`}>
                            {badgeText}
                          </span>
                          <h4 className="text-white font-bold tracking-wider text-sm">{c.reason}</h4>
                        </div>
                        <div className="text-slate-400 font-mono text-xs space-y-1">
                          <p>{sDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className={status === "active" ? "text-red-400 font-bold" : "text-cyan-400 font-semibold"}>
                            {sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                            {" — "} 
                            {eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-colors self-start sm:self-auto shrink-0"
                        title="Remove Closure"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                };

                return (
                  <>
                    {active.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-red-500 font-black tracking-widest uppercase text-xs flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          Active Now
                        </h4>
                        <div className="grid gap-3">
                          {active.map(c => renderCard(c, "active"))}
                        </div>
                      </div>
                    )}

                    {upcoming.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-cyan-400 font-black tracking-widest uppercase text-xs">Upcoming Closures</h4>
                        <div className="grid gap-3">
                          {upcoming.map(c => renderCard(c, "upcoming"))}
                        </div>
                      </div>
                    )}

                    {past.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-slate-500 font-black tracking-widest uppercase text-xs">Past Closures</h4>
                        <div className="grid gap-3">
                          {past.map(c => renderCard(c, "past"))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
