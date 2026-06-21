"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, writeBatch, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Station, Game, Booking } from "@/types";
import { MonitorPlay, LayoutGrid, Gamepad2, Plus, X, AlertCircle, Cpu } from "lucide-react";
import DraggableStationGrid from "./DraggableStationGrid";
import GameSearchBar from "./GameSearchBar";
import BookingHistoryModal from "./BookingHistoryModal";
import OfflineBookingModal from "./OfflineBookingModal";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

// Draggable template component for PC, PS5, Xbox nodes
function DraggableTemplateCard({ id, type, label, icon: Icon }: { id: string; type: "PC" | "PS5" | "Xbox"; label: string; icon: React.ElementType }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: {
      isTemplate: true,
      type: type
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 px-4 py-2 border border-dashed text-xs font-black uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-slate-900 transition-all duration-200 z-50 select-none cyber-cut
        ${type === "PC" ? "border-cyan-500/50 text-cyan-400 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(0,240,255,0.2)]" : ""}
        ${type === "PS5" ? "border-pink-500/50 text-pink-400 hover:border-pink-400 hover:shadow-[0_0_10px_rgba(255,0,127,0.2)]" : ""}
        ${type === "Xbox" ? "border-yellow-500/50 text-yellow-400 hover:border-yellow-400 hover:shadow-[0_0_10px_rgba(252,238,10,0.2)]" : ""}
        ${isDragging ? "opacity-40 scale-95 shadow-[0_0_20px_rgba(0,0,0,0.8)]" : ""}
      `}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export default function StationControl() {
  const [stations, setStations] = useState<Station[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);

  // History modal state
  const [historyStation, setHistoryStation] = useState<Station | null>(null);

  // Modal State for drag-provisioning
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"PC" | "PS5" | "Xbox">("PC");
  const [modalTargetIndex, setModalTargetIndex] = useState(0);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [offlineStation, setOfflineStation] = useState<Station | null>(null);

  // Form State inside Modal
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number>(100);
  const [newSpecs, setNewSpecs] = useState<string[]>([]);
  const [newGames, setNewGames] = useState<Game[]>([]);
  const [specInput, setSpecInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "stations"), (snapshot) => {
      const data: Station[] = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Station);
      });
      setStations(data);
    }, (error) => {
      console.error("Error listening to stations:", error);
    });

    return () => unsubscribe();
  }, []);

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

  // Client-side auto-expiry of active sessions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      activeBookings.forEach(async (booking) => {
        if (booking.endTime) {
          const endTimeDate = booking.endTime.toDate();
          if (endTimeDate <= now) {
            console.log(`Auto-expiring session ${booking.id} for station ${booking.stationId}`);
            try {
              // Re-check booking status to prevent race condition with other clients
              const bookingRef = doc(db, "bookings", booking.id);
              const { getDoc } = await import("firebase/firestore");
              const freshSnap = await getDoc(bookingRef);
              if (!freshSnap.exists() || freshSnap.data()?.status !== "active") return;

              const batch = writeBatch(db);
              const stationRef = doc(db, "stations", booking.stationId);

              batch.update(stationRef, {
                status: "available",
                currentSessionId: null,
              });

              batch.update(bookingRef, {
                status: "completed",
              });

              await batch.commit();
            } catch (err) {
              console.error("Error auto-ending session:", err);
            }
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeBookings]);

  // Client-side auto-activation of confirmed pre-booked sessions
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      confirmedBookings.forEach(async (booking) => {
        if (booking.scheduledStartTime && booking.scheduledEndTime) {
          const startTimeDate = booking.scheduledStartTime.toDate();
          if (startTimeDate <= now) {
            console.log(`Auto-activating pre-booked session ${booking.id} for station ${booking.stationId}`);
            try {
              // Re-check booking status to prevent race condition
              const bookingRef = doc(db, "bookings", booking.id);
              const { getDoc } = await import("firebase/firestore");
              const freshSnap = await getDoc(bookingRef);
              if (!freshSnap.exists() || freshSnap.data()?.status !== "confirmed") return;

              // Check if station is available
              const stationRef = doc(db, "stations", booking.stationId);
              const stationSnap = await getDoc(stationRef);
              if (!stationSnap.exists() || stationSnap.data()?.status === "occupied") {
                // If it's currently occupied, we wait for it to be freed
                return; 
              }

              const batch = writeBatch(db);

              batch.update(stationRef, {
                status: "occupied",
                currentSessionId: booking.id,
              });

              batch.update(bookingRef, {
                status: "active",
                startTime: booking.scheduledStartTime,
                endTime: booking.scheduledEndTime,
              });

              await batch.commit();
            } catch (err) {
              console.error("Error auto-activating session:", err);
            }
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [confirmedBookings]);

  const handleActivatePrebook = async (booking: Booking) => {
    try {
      const batch = writeBatch(db);
      
      const bookingRef = doc(db, "bookings", booking.id);
      const stationRef = doc(db, "stations", booking.stationId);

      const now = new Date();
      const endTime = new Date(now.getTime() + booking.durationMinutes * 60000);

      batch.update(bookingRef, {
        status: "active",
        startTime: Timestamp.fromDate(now),
        endTime: Timestamp.fromDate(endTime),
      });

      batch.update(stationRef, {
        status: "occupied",
        currentSessionId: booking.id,
      });

      await batch.commit();
    } catch (error) {
      console.error("Error activating prebooking:", error);
    }
  };

  const handleEndSession = async (station: Station) => {
    if (!station.currentSessionId) return;

    try {
      const batch = writeBatch(db);
      
      const stationRef = doc(db, "stations", station.id);
      const bookingRef = doc(db, "bookings", station.currentSessionId);

      batch.update(stationRef, {
        status: "available",
        currentSessionId: null,
      });

      batch.update(bookingRef, {
        status: "completed",
      });

      await batch.commit();
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const handleToggleMaintenance = async (station: Station) => {
    try {
      const stationRef = doc(db, "stations", station.id);
      const newStatus = station.status === "maintenance" ? "available" : "maintenance";
      await updateDoc(stationRef, { status: newStatus });
    } catch (error) {
      console.error("Error toggling maintenance:", error);
    }
  };

  const handleDeleteStation = async (station: Station) => {
    if (window.confirm(`Decommission and remove ${station.name} from the grid database?`)) {
      try {
        await deleteDoc(doc(db, "stations", station.id));
      } catch (error) {
        console.error("Error deleting station:", error);
      }
    }
  };

  const handleEditStation = (station: Station) => {
    setEditingStation(station);
    setModalType(station.type);
    setModalTargetIndex(station.orderIndex || 0);
    setNewName(station.name);
    setNewPrice(station.pricePerHour);
    setNewSpecs(station.specs || []);
    
    // Normalize games array (legacy string format vs new Game object format)
    const normalizedGames = (station.games || []).map(g => {
      if (typeof g === "string") {
        return { name: g };
      }
      return g;
    });
    setNewGames(normalizedGames);
    setError("");
    setIsModalOpen(true);
  };

  // DnD Hook configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    
    // CASE 1: Dragged a Template to Create a Node
    if (activeData?.isTemplate) {
      const type = activeData.type as "PC" | "PS5" | "Xbox";
      let targetIndex = 0;
      
      const filteredStations = stations
        .filter(s => type === "PC" ? s.type === "PC" : (s.type === "PS5" || s.type === "Xbox"))
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      if (over.id === "grid-pcs" || over.id === "grid-consoles") {
        targetIndex = filteredStations.length;
      } else {
        const overStation = stations.find(s => s.id === over.id);
        if (overStation) {
          const indexInList = filteredStations.findIndex(s => s.id === overStation.id);
          targetIndex = indexInList !== -1 ? indexInList : filteredStations.length;
        }
      }

      // Pre-fill fields for type
      setModalType(type);
      setModalTargetIndex(targetIndex);
      setNewName(`${type}-${filteredStations.length + 1}`);
      setNewPrice(type === "PC" ? 100 : type === "PS5" ? 150 : 120);
      setNewSpecs(type === "PC" ? ["RTX 4090", "i9-14900K", "32GB DDR5"] : ["4K HDR", "DualSense Controller", "OLED Display"]);
      setNewGames([]);
      setError("");
      setIsModalOpen(true);
      return;
    }

    // CASE 2: Rearranging Existing Stations
    if (active.id !== over.id) {
      const activeStation = stations.find(s => s.id === active.id);
      if (!activeStation) return;

      const isPC = activeStation.type === "PC";
      const sameTypeStations = stations
        .filter(s => isPC ? s.type === "PC" : (s.type === "PS5" || s.type === "Xbox"))
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const oldIndex = sameTypeStations.findIndex((s) => s.id === active.id);
      const newIndex = sameTypeStations.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedStations = arrayMove(sameTypeStations, oldIndex, newIndex);
        
        // Optimistic UI updates
        const updatedStations = stations.map(s => {
          const matchingNewIndex = newOrderedStations.findIndex(nos => nos.id === s.id);
          if (matchingNewIndex !== -1) {
            return { ...s, orderIndex: matchingNewIndex };
          }
          return s;
        });
        setStations(updatedStations);

        try {
          const batch = writeBatch(db);
          newOrderedStations.forEach((station, idx) => {
            const ref = doc(db, "stations", station.id);
            batch.update(ref, { orderIndex: idx });
          });
          await batch.commit();
        } catch (error) {
          console.error("Error updating station layout index:", error);
        }
      }
    }
  };

  const handleAddSpec = () => {
    if (specInput.trim() && !newSpecs.includes(specInput.trim())) {
      setNewSpecs([...newSpecs, specInput.trim()]);
      setSpecInput("");
    }
  };

  const handleRemoveSpec = (specToRemove: string) => {
    setNewSpecs(newSpecs.filter(s => s !== specToRemove));
  };

  const handleProvisionNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("NAME_REQUIRED");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingStation) {
        // Update existing station document without reordering other nodes
        const stationRef = doc(db, "stations", editingStation.id);
        await updateDoc(stationRef, {
          name: newName.trim(),
          pricePerHour: Number(newPrice),
          specs: newSpecs,
          games: newGames,
        });
        setIsModalOpen(false);
        setEditingStation(null);
      } else {
        // Shift indexes and add a brand new node
        const batch = writeBatch(db);
        const typeFiltered = stations
          .filter(s => modalType === "PC" ? s.type === "PC" : (s.type === "PS5" || s.type === "Xbox"))
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
          
        typeFiltered.forEach((s, idx) => {
          if (idx >= modalTargetIndex) {
            const ref = doc(db, "stations", s.id);
            batch.update(ref, { orderIndex: idx + 1 });
          }
        });

        const stationId = newName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const stationRef = doc(db, "stations", stationId);
        
        batch.set(stationRef, {
          id: stationId,
          name: newName.trim(),
          type: modalType,
          pricePerHour: Number(newPrice),
          specs: newSpecs,
          games: newGames,
          status: "available",
          currentSessionId: null,
          orderIndex: modalTargetIndex
        });

        await batch.commit();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setError("FAILED_TO_PROVISION");
    } finally {
      setLoading(false);
    }
  };

  const pcs = stations.filter(s => s.type === "PC").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const consoles = stations.filter(s => s.type === "PS5" || s.type === "Xbox").sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-black border-2 border-yellow-400/40 cyber-cut-reverse h-full flex flex-col">
        {/* Header HUD */}
        <div className="border-b border-yellow-400/30 p-4 flex items-center justify-between bg-yellow-400/5">
          <div className="flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-black tracking-widest uppercase text-yellow-400">Station_Control</h2>
          </div>
          <p className="text-xs text-yellow-400/50 font-mono tracking-widest hidden md:block">DRAG TEMPLATES TO ADD / DRAG CARDS TO SORT</p>
        </div>

        {/* Drag-to-Add Node Palette */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-yellow-500 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="text-xs font-black tracking-widest uppercase font-mono">Drag_New_Node:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <DraggableTemplateCard id="template-pc" type="PC" label="New PC" icon={Cpu} />
            <DraggableTemplateCard id="template-ps5" type="PS5" label="New PS5" icon={Gamepad2} />
            <DraggableTemplateCard id="template-xbox" type="Xbox" label="New Xbox" icon={Gamepad2} />
          </div>
        </div>

        {/* Grids Container */}
        <div className="flex-1 overflow-y-auto">
          {/* Sector: The Grid (PCs) */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-4 text-cyan-500">
              <LayoutGrid className="w-5 h-5" />
              <h3 className="font-black tracking-widest uppercase text-xl text-neon-cyan">THE_GRID (PCs)</h3>
            </div>
            <DraggableStationGrid 
              stations={pcs} 
              containerId="grid-pcs"
              onEndSession={handleEndSession}
              onToggleMaintenance={handleToggleMaintenance}
              onDeleteStation={handleDeleteStation}
              onEditStation={handleEditStation}
              onViewHistory={(s) => setHistoryStation(s)}
              confirmedBookings={confirmedBookings}
              activeBookings={activeBookings}
              onActivatePrebook={handleActivatePrebook}
              onAssignWalkIn={setOfflineStation}
            />
          </div>

          {/* Sector: The Lounge (Consoles) */}
          <div className="p-4 bg-slate-900/30">
            <div className="flex items-center gap-2 mb-4 text-pink-500">
              <Gamepad2 className="w-5 h-5" />
              <h3 className="font-black tracking-widest uppercase text-xl text-neon-pink">THE_LOUNGE (Consoles)</h3>
            </div>
            <DraggableStationGrid 
              stations={consoles} 
              containerId="grid-consoles"
              onEndSession={handleEndSession}
              onToggleMaintenance={handleToggleMaintenance}
              onDeleteStation={handleDeleteStation}
              onEditStation={handleEditStation}
              onViewHistory={(s) => setHistoryStation(s)}
              confirmedBookings={confirmedBookings}
              activeBookings={activeBookings}
              onActivatePrebook={handleActivatePrebook}
              onAssignWalkIn={setOfflineStation}
            />
          </div>
        </div>
      </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-slate-950 border-2 border-pink-500/50 p-6 cyber-cut-reverse shadow-[0_0_30px_rgba(255,0,127,0.25)] overflow-y-auto max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-pink-500/30 pb-4 mb-6">
              <h3 className="text-xl font-black uppercase text-pink-500 tracking-widest">
                {editingStation ? `Edit Station Node [${editingStation.name}]` : `Provisioning Node [Position: ${modalTargetIndex}]`}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStation(null);
                }}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500 text-red-500 text-sm font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleProvisionNode} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Node Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Node ID / Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 font-mono text-sm focus:border-pink-500 focus:outline-none"
                  />
                </div>

                {/* Hardware Type (Display Only / Non-editable as type is inferred from drag) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Type</label>
                  <input
                    type="text"
                    value={modalType}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 text-slate-500 p-2.5 font-mono text-sm cursor-not-allowed uppercase"
                  />
                </div>

                {/* Rate */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Rate (₹/hr)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    min="0"
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 font-mono text-sm focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hardware Specs */}
              <div className="space-y-2 p-3 border border-slate-800 bg-slate-900/30">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Specs</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={specInput}
                    onChange={(e) => setSpecInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSpec())}
                    placeholder="e.g. RTX 4090"
                    className="flex-1 bg-slate-900 border border-slate-700 text-white p-2 font-mono text-sm focus:border-cyan-500 focus:outline-none"
                  />
                  <button type="button" onClick={handleAddSpec} className="px-4 bg-slate-800 text-cyan-500 hover:bg-slate-700 border border-slate-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newSpecs.map(spec => (
                    <span key={spec} className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/50 text-cyan-400 text-xs font-mono flex items-center gap-1">
                      {spec}
                      <button type="button" onClick={() => handleRemoveSpec(spec)} className="hover:text-white"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Games Autocomplete Search */}
              <div className="space-y-2 p-3 border border-slate-800 bg-slate-900/30">
                <label className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" /> Installed Software (Games)
                </label>
                <GameSearchBar 
                  onAddGame={(game) => setNewGames([...newGames, game])} 
                  excludeGames={newGames} 
                />

                {/* Posters Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-3">
                  {newGames.map(game => (
                    <div 
                      key={game.name} 
                      className="relative group border border-pink-500/30 bg-pink-950/10 p-1.5 flex flex-col items-center text-center cyber-cut-reverse overflow-hidden hover:border-pink-500 transition-colors"
                    >
                      {game.posterUrl ? (
                        <img 
                          src={game.posterUrl} 
                          alt={game.name} 
                          className="w-12 h-18 object-cover border border-slate-800 mb-1.5 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-12 h-18 bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500 mb-1.5">N/A</div>
                      )}
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-2 leading-tight">
                        {game.name}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setNewGames(newGames.filter(g => g.name !== game.name))} 
                        className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white hover:bg-red-600 transition-colors rounded-sm opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-pink-500 text-black font-black uppercase tracking-widest cyber-cut glow-pink transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (editingStation ? "UPDATING..." : "INITIALIZING...") : (editingStation ? "UPDATE_NODE" : "INITIALIZE_NODE")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStation(null);
                  }}
                  className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white uppercase font-bold tracking-widest hover:bg-slate-900 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking History Modal */}
      {historyStation && (
        <BookingHistoryModal
          station={historyStation}
          onClose={() => setHistoryStation(null)}
        />
      )}

      {/* Offline Booking Modal */}
      <OfflineBookingModal
        station={offlineStation}
        isOpen={!!offlineStation}
        onClose={() => setOfflineStation(null)}
        stationBookings={confirmedBookings.filter(b => b.stationId === offlineStation?.id)}
      />
    </DndContext>
  );
}
