import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Station, Booking } from "@/types";
import { PowerOff, Wrench, GripVertical, Trash2, Edit } from "lucide-react";

interface Props {
  station: Station;
  onEndSession: (station: Station) => void;
  onToggleMaintenance: (station: Station) => void;
  onDeleteStation?: (station: Station) => void;
  onEditStation?: (station: Station) => void;
  confirmedBookings?: Booking[];
  onActivatePrebook?: (booking: Booking) => void;
}

export default function SortableStationCard({ station, onEndSession, onToggleMaintenance, onDeleteStation, onEditStation, confirmedBookings, onActivatePrebook }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: station.id });

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
      className={`p-4 border-2 cyber-cut transition-colors relative group ${
        station.status === 'occupied' ? 'border-pink-500/60 bg-pink-500/5 shadow-[0_0_15px_rgba(255,0,60,0.15)]' : 
        station.status === 'available' ? 'border-cyan-500/30 bg-cyan-500/5' :
        station.status === 'pending' ? 'border-yellow-400/30 bg-yellow-400/5' : 
        'border-slate-700 bg-slate-900 opacity-60'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute -top-3 -left-3 p-1.5 bg-slate-800 border border-slate-600 text-slate-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity cyber-cut z-10"
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

      {/* Upcoming Prebookings Display */}
      {confirmedBookings && confirmedBookings.length > 0 && (
        <div className="my-3 pt-2 border-t border-slate-800 space-y-1">
          <p className="text-[9px] text-yellow-500 uppercase tracking-widest font-mono">RESERVATIONS_LIST:</p>
          <div className="space-y-1">
            {confirmedBookings.sort((a,b) => (a.scheduledStartTime?.toMillis() || 0) - (b.scheduledStartTime?.toMillis() || 0)).slice(0, 2).map(b => {
              const bDate = b.scheduledStartTime?.toDate();
              if (!bDate) return null;
              const isToday = bDate.toDateString() === new Date().toDateString();
              const timeStr = bDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = isToday ? "Today" : bDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
              
              return (
                <div key={b.id} className="flex justify-between items-center bg-slate-950/80 p-1 border border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-400">{dateStr} @ {timeStr} ({b.userName || "Player"})</span>
                  {station.status === "available" && onActivatePrebook && (
                    <button
                      onClick={() => onActivatePrebook(b)}
                      className="px-2 py-0.5 bg-yellow-400 text-black text-[9px] font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors animate-pulse shrink-0 ml-2"
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

      <div className="flex gap-2 mt-4">
        <button 
          className="flex-1 py-2 text-xs font-black tracking-widest uppercase bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          disabled={station.status !== 'occupied'}
          onClick={() => onEndSession(station)}
        >
          <PowerOff className="w-3 h-3" /> END
        </button>
        <button 
          className="flex-1 py-2 text-xs font-bold tracking-widest uppercase border border-slate-600 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
          disabled={station.status === 'occupied'}
          onClick={() => onToggleMaintenance(station)}
        >
          <Wrench className="w-3 h-3" /> 
          {station.status === 'maintenance' ? 'FIXED' : 'MAINT'}
        </button>
        {onEditStation && (
          <button 
            className="px-3 py-2 text-xs font-bold bg-cyan-950/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center justify-center"
            onClick={() => onEditStation(station)}
            title="EDIT NODE"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
        )}
        {onDeleteStation && (
          <button 
            className="px-3 py-2 text-xs font-bold bg-red-950/20 border border-red-500/50 text-red-500 hover:bg-red-500/20 disabled:opacity-30 transition-colors flex items-center justify-center"
            disabled={station.status === 'occupied'}
            onClick={() => onDeleteStation(station)}
            title="DELETE NODE"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
