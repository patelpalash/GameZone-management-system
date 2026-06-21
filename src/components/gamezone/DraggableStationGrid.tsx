"use client";

import { Station, Booking } from "@/types";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import SortableStationCard from "./SortableStationCard";
import { useDroppable } from "@dnd-kit/core";

interface Props {
  stations: Station[];
  containerId: string;
  onEndSession: (station: Station) => void;
  onToggleMaintenance: (station: Station) => void;
  onDeleteStation?: (station: Station) => void;
  onEditStation?: (station: Station) => void;
  onViewHistory?: (station: Station) => void;
  confirmedBookings?: Booking[];
  activeBookings?: Booking[];
  onActivatePrebook?: (booking: Booking) => void;
  onAssignWalkIn?: (station: Station) => void;
}

export default function DraggableStationGrid({ 
  stations, 
  containerId, 
  onEndSession, 
  onToggleMaintenance, 
  onDeleteStation, 
  onEditStation, 
  onViewHistory, 
  confirmedBookings, 
  activeBookings,
  onActivatePrebook,
  onAssignWalkIn
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
  });

  if (stations.length === 0) {
    return (
      <div 
        ref={setNodeRef} 
        className={`text-center text-slate-600 py-12 font-mono text-sm border-2 border-dashed rounded transition-colors ${
          isOver ? "border-yellow-400 bg-yellow-400/5 text-yellow-400" : "border-slate-800 bg-slate-950/20"
        }`}
      >
        &gt; NO_NODES_DETECTED<br/>
        &gt; DRAG_AND_DROP_TEMPLATE_HERE_TO_PROVISION
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 border-2 border-transparent transition-colors ${
        isOver ? "border-dashed border-yellow-400/30 bg-yellow-400/5" : ""
      }`}
    >
      <SortableContext 
        items={stations.map(i => i.id)}
        strategy={rectSortingStrategy}
      >
        {stations.map((station) => {
          const stationPrebooks = (confirmedBookings || []).filter(b => b.stationId === station.id);
          const stationActive = (activeBookings || []).find(b => b.stationId === station.id && b.status === "active");
          return (
            <SortableStationCard 
              key={station.id} 
              station={station} 
              onEndSession={onEndSession}
              onToggleMaintenance={onToggleMaintenance}
              onDeleteStation={onDeleteStation}
              onEditStation={onEditStation}
              onViewHistory={onViewHistory}
              confirmedBookings={stationPrebooks}
              activeBooking={stationActive}
              onActivatePrebook={onActivatePrebook}
              onAssignWalkIn={onAssignWalkIn}
            />
          );
        })}
      </SortableContext>
    </div>
  );
}
