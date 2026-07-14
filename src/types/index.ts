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
  userPhone?: string;
  durationMinutes: number;
  totalCost: number;
  status: "pending" | "pending_payment" | "confirmed" | "active" | "completed" | "failed" | "refunded";
  transactionId: string;
  paymentMethod?: "UPI" | "UPI_MOCK" | "Cash" | "PhonePe_UPI" | "Split" | "Online"; // For Accounting
  splitCash?: number;
  splitOnline?: number;
  startTime: Timestamp | null;
  endTime: Timestamp | null;
  isPrebook?: boolean;
  scheduledStartTime?: Timestamp | null;
  scheduledEndTime?: Timestamp | null;
  createdAt?: Timestamp | null;
  extraControllers?: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  dob?: string;
  totalHoursPlayed: number;
  totalSpent?: number;
  isOffline?: boolean;
  joinedAt?: number;
}

export interface TournamentRegistration {
  teamName: string;
  players: string[]; // List of player names
  registeredBy: string; // User ID of captain
  contactPhone: string;
  registeredAt: Timestamp;
}

export interface Tournament {
  id: string;
  title: string;
  gameName: string;
  description: string;
  date: Timestamp;
  maxTeams: number;
  registeredTeams: TournamentRegistration[];
  status: "upcoming" | "active" | "completed";
  prizePool: string;
}

