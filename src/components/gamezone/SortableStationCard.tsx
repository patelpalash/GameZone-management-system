import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Station, Booking } from "@/types";
import { PowerOff, Wrench, GripVertical, Trash2, Edit, Receipt, Activity } from "lucide-react";
import LiveTimer from "./LiveTimer";

interface Props {
  station: Station;
  onEndSession: (station: Station) => void;
  onToggleMaintenance: (station: Station) => void;
  onDeleteStation?: (station: Station) => void;
  onEditStation?: (station: Station) => void;
  onViewHistory?: (station: Station) => void;
  confirmedBookings?: Booking[];
  activeBooking?: Booking;
  onActivatePrebook?: (booking: Booking) => void;
  onAssignWalkIn?: (station: Station) => void;
}

export default function SortableStationCard({ 
  station, 
  onEndSession, 
  onToggleMaintenance, 
  onDeleteStation, 
  onEditStation, 
  onViewHistory, 
  confirmedBookings, 
  activeBooking,
  onActivatePrebook,
  onAssignWalkIn
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: station.id });
  const router = useRouter();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`p-4 border-2 cyber-cut transition-colors relative group cursor-pointer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] ${
        station.status === 'occupied' ? 'border-pink-500/60 bg-pink-500/5 hover:border-pink-500' : 
        station.status === 'available' ? 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500' :
        station.status === 'pending' ? 'border-yellow-400/30 bg-yellow-400/5 hover:border-yellow-400' : 
        'border-slate-700 bg-slate-900 opacity-60 hover:opacity-100 hover:border-slate-500'
      }`}
      onClick={() => router.push(`/admin/stations/${station.id}`)}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -top-3 -left-3 p-1.5 bg-slate-800 border border-slate-600 text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity cyber-cut z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-black text-lg tracking-widest uppercase text-white flex items-center gap-2">
            {station.name}
          </h3>
          <span className="text-[10px] font-mono text-slate-500 tracking-widest">{station.type}</span>
        </div>
        <span className={`px-2 py-0.5 text-[10px] font-black tracking-widest uppercase border cyber-cut-reverse ${
          station.status === 'available' ? "text-cyan-400 border-cyan-500 bg-cyan-500/10" :
          station.status === 'occupied' ? "text-pink-400 border-pink-500 bg-pink-500/10" :
          station.status === 'pending' ? "text-yellow-400 border-yellow-400 bg-yellow-400/10" :
          "text-slate-500 border-slate-600 bg-slate-800"
        }`}>
          {station.status}
        </span>
      </div>

      {/* Bookings & Reservations Info */}
      {((station.status === 'occupied' && activeBooking) || (confirmedBookings && confirmedBookings.length > 0)) && (
        <div className="my-3 pt-2 border-t border-slate-800/80 space-y-2">
          {/* Active Session Info */}
          {station.status === 'occupied' && activeBooking && (
            <div className="bg-pink-500/10 border border-pink-500/30 p-2 cyber-cut-reverse space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-pink-400 uppercase tracking-widest font-black">ACTIVE_SESSION</span>
                <span className="text-[9px] text-slate-400 font-mono">({activeBooking.durationMinutes} min)</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-bold text-white truncate max-w-[125px]" title={activeBooking.userName}>{activeBooking.userName || "Walk-in Guest"}</span>
                {activeBooking.endTime && (
                  <LiveTimer endTime={activeBooking.endTime.toDate()} />
                )}
              </div>
              {activeBooking.startTime && activeBooking.endTime && (
                <div className="text-[9px] text-slate-400 font-mono flex justify-between">
                  <span>Start: {activeBooking.startTime.toDate().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  <span>End: {activeBooking.endTime.toDate().toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                </div>
              )}
            </div>
          )}

          {/* Confirmed Bookings list */}
          {confirmedBookings && confirmedBookings.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] text-yellow-500 uppercase tracking-widest font-mono font-black">RESERVATIONS_LIST:</p>
              <div className="max-h-[100px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {[...confirmedBookings].sort((a,b) => (a.scheduledStartTime?.toMillis() || 0) - (b.scheduledStartTime?.toMillis() || 0)).map(b => {
                  const bDate = b.scheduledStartTime?.toDate();
                  const eDate = b.scheduledEndTime?.toDate();
                  if (!bDate) return null;
                  const isToday = bDate.toDateString() === new Date().toDateString();
                  const timeStr = `${bDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })} - ${eDate ? eDate.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}`;
                  const dateStr = isToday ? "Today" : bDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  
                  return (
                    <div key={b.id} className="flex justify-between items-center bg-slate-950/85 p-1.5 border border-slate-800/80 text-[10px] font-mono hover:border-yellow-500/30 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-yellow-400 font-semibold">{dateStr} | {timeStr}</span>
                        <span className="text-slate-500 text-[9px] uppercase tracking-wider">{b.userName || "Player"} ({b.durationMinutes} min)</span>
                      </div>
                      {station.status === "available" && onActivatePrebook && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onActivatePrebook(b); }}
                          className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors shrink-0 ml-2"
                        >
                          START
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 mt-4">
        {/* Primary Actions Row */}
        <div className="flex gap-2">
          <button 
            className="flex-1 py-2 text-xs font-black tracking-widest uppercase bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            disabled={station.status !== 'occupied'}
            onClick={(e) => { 
              e.stopPropagation(); 
              if (window.confirm(`Are you sure you want to forcefully END the active session on ${station.name}?`)) {
                onEndSession(station); 
              }
            }}
          >
            <PowerOff className="w-3 h-3" /> END
          </button>
          <button 
            className="flex-1 py-2 text-xs font-bold tracking-widest uppercase border border-slate-600 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            disabled={station.status === 'occupied'}
            onClick={(e) => { e.stopPropagation(); onToggleMaintenance(station); }}
          >
            <Wrench className="w-3 h-3" /> 
            {station.status === 'maintenance' ? 'FIXED' : 'MAINT'}
          </button>
          {onAssignWalkIn && (
            <button 
              className="flex-1 py-2 text-xs font-bold tracking-widest uppercase bg-yellow-950/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
              disabled={station.status !== 'available'}
              onClick={(e) => { e.stopPropagation(); onAssignWalkIn(station); }}
            >
              ASSIGN
            </button>
          )}
        </div>

        {/* Secondary Icon Actions Row */}
        <div className="flex gap-2 justify-end">
          {/* Booking History Button */}
          {onViewHistory && (
            <button 
              className="flex-1 py-2 text-xs font-bold bg-yellow-950/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50 disabled:grayscale transition-colors flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); onViewHistory(station); }}
              title="VIEW BOOKING HISTORY"
            >
              <Receipt className="w-3.5 h-3.5" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/admin/stations/${station.id}`); }}
            className="flex-1 py-2 text-xs font-bold bg-indigo-950/20 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20 disabled:opacity-50 disabled:grayscale transition-colors flex items-center justify-center"
            title="VIEW TIMELINE"
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
          {onEditStation && (
            <button 
              className="flex-1 py-2 text-xs font-bold bg-cyan-950/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:grayscale transition-colors flex items-center justify-center"
              onClick={(e) => { e.stopPropagation(); onEditStation(station); }}
              title="EDIT NODE"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {onDeleteStation && (
            <button 
              className="flex-1 py-2 text-xs font-bold bg-red-950/20 border border-red-500/50 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              disabled={station.status === 'occupied'}
              onClick={(e) => { e.stopPropagation(); onDeleteStation(station); }}
              title="DELETE NODE"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
