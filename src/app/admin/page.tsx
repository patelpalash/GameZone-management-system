"use client";

import { useState } from "react";
import VerificationQueue from "@/components/gamezone/VerificationQueue";
import StationControl from "@/components/gamezone/StationControl";
import AccountingDashboard from "@/components/gamezone/AccountingDashboard";
import AdminTournamentsManager from "@/components/gamezone/AdminTournamentsManager";
import AdminGuard from "@/components/gamezone/AdminGuard";
import AdminPaymentHistory from "@/components/gamezone/AdminPaymentHistory";
import AdminUsersManager from "@/components/gamezone/AdminUsersManager";
import AdminScheduleManager from "@/components/gamezone/AdminScheduleManager";
import AdminSettings from "@/components/gamezone/AdminSettings";
import InventoryManager from "@/components/gamezone/finance/InventoryManager";
import { ShieldAlert, ArrowLeft, Terminal, DollarSign, Gamepad2, History, Users, Calendar, Settings, Store } from "lucide-react";
import NextLink from "next/link";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"operations" | "inventory" | "schedule" | "finance" | "tournaments" | "payments" | "users" | "settings">("operations");

  return (
    <AdminGuard>
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-pink-500/30 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-500 text-black cyber-cut">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase text-white text-neon-pink">
                CMD<span className="text-pink-500">_</span>CENTER
              </h1>
              <p className="text-pink-500/70 text-sm font-bold tracking-[0.2em] uppercase">System Administration</p>
            </div>
          </div>
          <NextLink href="/dashboard" className="px-4 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold tracking-widest uppercase text-sm cyber-cut-reverse flex items-center gap-2 transition-all">
            <ArrowLeft size={14} /> DASHBOARD
          </NextLink>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 border-b border-slate-800 pb-2">
          <button 
            onClick={() => setActiveTab("operations")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'operations' ? 'bg-cyan-500 text-black glow-cyan' : 'text-slate-400 border border-slate-800 hover:text-cyan-500'}`}
          >
            <Terminal className="w-4 h-4" /> LIVE_OPERATIONS
          </button>
          <button 
            onClick={() => setActiveTab("inventory")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-cyan-500 text-black glow-cyan' : 'text-slate-400 border border-slate-800 hover:text-cyan-500'}`}
          >
            <Store className="w-4 h-4" /> INVENTORY
          </button>
          <button 
            onClick={() => setActiveTab("schedule")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-purple-500 text-black shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'text-slate-400 border border-slate-800 hover:text-purple-500'}`}
          >
            <Calendar className="w-4 h-4" /> MASTER_SCHEDULE
          </button>
          <button 
            onClick={() => setActiveTab("tournaments")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'tournaments' ? 'bg-pink-500 text-black glow-pink' : 'text-slate-400 border border-slate-800 hover:text-pink-500'}`}
          >
            <Gamepad2 className="w-4 h-4" /> TOURNAMENTS_MANAGER
          </button>
          <button 
            onClick={() => setActiveTab("finance")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'finance' ? 'bg-emerald-500 text-black glow-emerald' : 'text-slate-400 border border-slate-800 hover:text-emerald-500'}`}
          >
            <DollarSign className="w-4 h-4" /> FINANCE_LEDGER
          </button>
          <button 
            onClick={() => setActiveTab("payments")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'bg-yellow-500 text-black glow-yellow' : 'text-slate-400 border border-slate-800 hover:text-yellow-500'}`}
          >
            <History className="w-4 h-4" /> PAYMENT_HISTORY
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-slate-400 border border-slate-800 hover:text-blue-500'}`}
          >
            <Users className="w-4 h-4" /> USERS_DATABASE
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`px-6 py-3 font-black tracking-widest uppercase text-sm cyber-cut transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-slate-400 border border-slate-800 hover:text-red-500'}`}
          >
            <Settings className="w-4 h-4" /> SYSTEM_SETTINGS
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "operations" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" style={{ minHeight: 'calc(100vh - 240px)' }}>
            <div className="xl:col-span-1">
              <VerificationQueue />
            </div>
            <div className="xl:col-span-2">
              <StationControl />
            </div>
          </div>
        )}

        {activeTab === "inventory" && (
          <div className="min-h-[calc(100vh-240px)]">
            <InventoryManager />
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="min-h-[calc(100vh-240px)]">
            <AdminScheduleManager />
          </div>
        )}

        {activeTab === "tournaments" && (
          <div className="min-h-[calc(100vh-240px)]">
            <AdminTournamentsManager />
          </div>
        )}

        {activeTab === "finance" && (
          <div className="min-h-[calc(100vh-240px)]">
            <AccountingDashboard />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="min-h-[calc(100vh-240px)]">
            <AdminPaymentHistory />
          </div>
        )}

        {activeTab === "users" && (
          <div className="min-h-[calc(100vh-240px)]">
            <AdminUsersManager />
          </div>
        )}

        {activeTab === "settings" && (
          <div className="min-h-[calc(100vh-240px)] flex justify-center">
            <AdminSettings />
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
