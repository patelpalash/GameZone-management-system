"use client";

import { useAuth, ADMIN_EMAILS } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff } from "lucide-react";
import NextLink from "next/link";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-pink-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-2xl font-black tracking-widest uppercase animate-pulse">VERIFYING_CLEARANCE...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email || "");

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="text-center space-y-6 max-w-md">
          <ShieldOff className="w-16 h-16 text-pink-500 mx-auto" />
          <h1 className="text-3xl font-black tracking-widest uppercase text-pink-500 text-neon-pink">ACCESS_DENIED</h1>
          <p className="text-slate-500 font-mono text-sm">
            &gt; Your credentials do not have ADMIN clearance.<br/>
            &gt; Contact sys-admin for elevated access.
          </p>
          <NextLink 
            href="/dashboard"
            className="inline-block px-6 py-3 border border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold tracking-widest uppercase cyber-cut transition-all"
          >
            RETURN_TO_DASHBOARD
          </NextLink>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
