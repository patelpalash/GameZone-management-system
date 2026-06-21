"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TerminalSquare, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <Loader2 className="w-12 h-12 animate-spin" />
          <h1 className="text-xl font-mono tracking-widest uppercase animate-pulse">REDIRECTING...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-cyan-500 text-black cyber-cut">
            <TerminalSquare className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black tracking-widest uppercase text-white text-neon-cyan">
            GAME<span className="text-cyan-500">ZONE</span>
          </h1>
          <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">
            &gt; Authentication Required
          </p>
        </div>

        {/* Login Card */}
        <div className="border-2 border-cyan-500/40 bg-slate-950 p-8 cyber-cut-reverse space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-black tracking-widest uppercase text-white">IDENTIFY_YOURSELF</h2>
            <p className="text-slate-500 font-mono text-xs">
              &gt; Sign in to access the command grid<br/>
              &gt; Google authentication enabled
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-black font-black tracking-widest uppercase text-lg cyber-cut glow-cyan transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                CONNECTING...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                SIGN_IN_WITH_GOOGLE
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-700 font-mono tracking-wider">
          &copy; {new Date().getFullYear()} GAMEZONE // SECURE_GATEWAY v1.0
        </p>
      </div>
    </div>
  );
}
