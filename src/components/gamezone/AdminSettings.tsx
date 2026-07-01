"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Settings as SettingsIcon, AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { auth } from "@/lib/firebase";

export default function AdminSettings() {
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanStatus, setCleanStatus] = useState<"idle" | "success" | "error">("idle");
  const [deletedCount, setDeletedCount] = useState(0);

  const handleFactoryReset = async () => {
    if (resetConfirmText !== "FACTORY RESET") return;
    
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    setIsResetting(true);
    setResetStatus("idle");
    
    try {
      const res = await fetch("/api/admin/factory-reset", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (data.success) {
        setResetStatus("success");
        setResetConfirmText("");
      } else {
        setResetStatus("error");
        setErrorMessage(data.error || "Unknown error occurred.");
      }
    } catch {
      setResetStatus("error");
      setErrorMessage("Network error.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleCleanupTrash = async (forceAll: boolean = false) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    setIsCleaning(true);
    setCleanStatus("idle");
    
    try {
      const res = await fetch("/api/admin/cleanup-trash", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ forceAll })
      });
      
      const data = await res.json();
      if (data.success) {
        setCleanStatus("success");
        setDeletedCount(data.deletedCount);
      } else {
        setCleanStatus("error");
        setErrorMessage(data.error || "Unknown error occurred.");
      }
    } catch {
      setCleanStatus("error");
      setErrorMessage("Network error.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-red-500/30">
        <h2 className="text-2xl font-black tracking-widest uppercase text-red-500 text-neon-red flex items-center gap-2">
           <SettingsIcon className="w-6 h-6" /> SYSTEM_SETTINGS
        </h2>
      </div>

      <div className="border border-red-900/50 bg-red-950/10 p-6 cyber-cut relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <AlertTriangle className="w-48 h-48 text-red-500" />
        </div>
        
        <h3 className="text-xl font-black text-red-500 mb-2 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> DANGER_ZONE
        </h3>
        <p className="text-slate-400 font-mono text-sm mb-6 max-w-2xl leading-relaxed">
          The Factory Reset protocol will completely clear all operational data including <strong className="text-red-400">bookings, expenses, inventory sales, and closures</strong>. It will also reset all stations to the &apos;available&apos; status. 
          <br /><br />
          For safety, deleted records are moved to a hidden <code className="text-orange-400">trash</code> collection where they will automatically expire and be permanently deleted after 7 days.
        </p>

        <div className="bg-black/50 border border-red-500/30 p-6 cyber-cut-reverse mb-8">
          <h4 className="text-red-400 font-bold uppercase tracking-widest text-sm mb-4">Execute Factory Reset</h4>
          
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
              <label className="text-[10px] text-red-500/70 uppercase tracking-widest font-bold">
                Type &quot;FACTORY RESET&quot; to confirm
              </label>
              <input 
                type="text" 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="FACTORY RESET"
                className="w-full bg-black border border-red-900 text-red-500 px-4 py-3 font-mono focus:border-red-500 focus:outline-none transition-colors"
              />
            </div>
            <button 
              onClick={handleFactoryReset}
              disabled={resetConfirmText !== "FACTORY RESET" || isResetting}
              className="px-8 py-3 bg-red-600 text-white font-black tracking-widest uppercase cyber-cut transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-500 flex items-center justify-center gap-2 w-full md:w-auto"
            >
              {isResetting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              {isResetting ? "PURGING..." : "INITIATE_RESET"}
            </button>
          </div>

          {resetStatus === "success" && (
            <div className="mt-4 p-3 bg-green-950/40 border border-green-500 text-green-400 font-mono text-xs cyber-cut animate-fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>FACTORY RESET COMPLETE. DATA MOVED TO ARCHIVE (7-DAY RETENTION).</span>
            </div>
          )}
          {resetStatus === "error" && (
            <div className="mt-4 p-3 bg-red-950/40 border border-red-500 text-red-500 font-mono text-xs cyber-cut animate-fade-in flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>ERROR: {errorMessage}</span>
            </div>
          )}
        </div>

        <div className="bg-black/50 border border-orange-500/30 p-6 cyber-cut mb-2">
          <h4 className="text-orange-400 font-bold uppercase tracking-widest text-sm mb-2">Trash Management</h4>
          <p className="text-slate-500 font-mono text-xs mb-4">
            Manually trigger the cleanup of expired trash records, or force delete all trash immediately.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => handleCleanupTrash(false)}
              disabled={isCleaning}
              className="px-6 py-2 border border-orange-500 text-orange-500 hover:bg-orange-500/10 font-bold tracking-widest uppercase text-xs cyber-cut transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              CLEAN_EXPIRED
            </button>
            <button 
              onClick={() => {
                if(confirm("Are you sure? This will instantly and permanently delete ALL data currently in the trash.")) {
                  handleCleanupTrash(true);
                }
              }}
              disabled={isCleaning}
              className="px-6 py-2 border border-red-700 text-red-500 hover:bg-red-900/30 font-bold tracking-widest uppercase text-xs cyber-cut transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              FORCE_EMPTY_ALL
            </button>
          </div>

          {cleanStatus === "success" && (
            <div className="mt-4 p-3 bg-green-950/40 border border-green-500 text-green-400 font-mono text-xs cyber-cut animate-fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>CLEANUP SUCCESS: Permanently deleted {deletedCount} record(s).</span>
            </div>
          )}
          {cleanStatus === "error" && (
            <div className="mt-4 p-3 bg-red-950/40 border border-red-500 text-red-500 font-mono text-xs cyber-cut animate-fade-in flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>ERROR: {errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
