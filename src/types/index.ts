import { Timestamp } from "firebase/firestore";

export interface Game {
  name: string;
  posterUrl?: string;
}

export interface Station {
  id: string;
  name: string; // e.g., "PC-01"
  type: "PC" | "PS5" | "Xbox";
  specs: string[];
  games: (string | Game)[];
  pricePerHour: number;
  status: "available" | "occupied" | "pending" | "maintenance";
  currentSessionId: string | null;
  orderIndex: number; // For Drag and Drop layout
}

export interface Booking {
  id: string;
  stationId: string;
  userId: string;
  userName?: string;
  durationMinutes: number;
  totalCost: number;
  status: "pending" | "confirmed" | "active" | "completed";
  transactionId: string;
  paymentMethod?: "UPI" | "Cash"; // For Accounting
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  isPrebook?: boolean;
  scheduledStartTime?: Timestamp | null;
  scheduledEndTime?: Timestamp | null;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  totalHoursPlayed: number;
}
