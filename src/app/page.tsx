"use client";

import { useState } from "react";
import NextLink from "next/link";
import { TerminalSquare, Crosshair, MapPin, Phone, Mail, Globe, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen text-slate-100 selection:bg-cyan-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[60] bg-black/90 backdrop-blur-md border-b-2 border-cyan-500/30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <TerminalSquare className="text-cyan-500 w-8 h-8" />
            <span className="text-2xl font-black tracking-widest uppercase">
              GAME<span className="text-cyan-500">ZONE</span>
            </span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 text-sm font-bold tracking-[0.2em] uppercase text-cyan-500/70">
            <a href="#about" className="hover:text-cyan-400 transition-colors">About_Us</a>
            <a href="#hardware" className="hover:text-cyan-400 transition-colors">Hardware</a>
            <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
          </div>
          
          <div className="flex items-center gap-3">
            {!loading && user ? (
              <NextLink 
                href="/dashboard"
                className="bg-cyan-500 text-black px-4 md:px-6 py-2 font-black tracking-widest uppercase cyber-cut glow-cyan transition-all active:scale-95 text-sm"
              >
                SYS_DASHBOARD
              </NextLink>
            ) : (
              <NextLink 
                href="/login"
                className="bg-yellow-400 text-black px-4 md:px-6 py-2 font-black tracking-widest uppercase cyber-cut glow-yellow transition-all active:scale-95 text-sm"
              >
                SYS_LOGIN
              </NextLink>
            )}
            
            {/* Mobile Hamburger */}
            <button 
              className="md:hidden text-cyan-500 p-1" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black/95 border-t border-cyan-500/20 px-6 py-4 space-y-4">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-bold tracking-[0.2em] uppercase text-cyan-500/70 hover:text-cyan-400 transition-colors">About_Us</a>
            <a href="#hardware" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-bold tracking-[0.2em] uppercase text-cyan-500/70 hover:text-cyan-400 transition-colors">Hardware</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-bold tracking-[0.2em] uppercase text-cyan-500/70 hover:text-cyan-400 transition-colors">Contact</a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex items-center justify-center min-h-[90vh]">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 via-transparent to-pink-900/10 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-0"></div>

        <div className="container mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-block border border-cyan-500 text-cyan-400 px-4 py-1 mb-8 text-xs font-bold tracking-[0.3em] uppercase bg-cyan-500/10 cyber-cut-reverse animate-pulse">
            &gt; Initialize Sequence_
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-6 text-white text-neon-cyan">
            Welcome to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400">
              The Next Level
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 font-mono tracking-wider">
            High-performance rigs. Ultra-low latency. The ultimate cybernetic arena for serious players. Plug in and dominate.
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            {!loading && user ? (
              <NextLink 
                href="/dashboard"
                className="px-8 py-4 bg-cyan-500 text-black font-black tracking-[0.2em] text-xl uppercase cyber-cut glow-cyan hover:bg-cyan-400 transition-all flex items-center justify-center gap-3"
              >
                <Crosshair size={24} /> GO_TO_DASHBOARD
              </NextLink>
            ) : (
              <NextLink 
                href="/login"
                className="px-8 py-4 bg-cyan-500 text-black font-black tracking-[0.2em] text-xl uppercase cyber-cut glow-cyan hover:bg-cyan-400 transition-all flex items-center justify-center gap-3"
              >
                <Crosshair size={24} /> BOOK_STATION
              </NextLink>
            )}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 md:py-28 bg-slate-950 border-y-2 border-cyan-500/20 relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-4xl font-black tracking-widest text-white uppercase border-l-4 border-yellow-400 pl-4 text-neon-yellow">
                About_Us
              </h2>
              <p className="text-slate-400 font-mono text-base md:text-lg leading-relaxed">
                Born from the neon-lit streets, GAMEZONE is not just a cafe—it&apos;s a sanctuary for the digital warriors. We built this facility because we were tired of lagging connections and subpar hardware. 
              </p>
              <p className="text-slate-400 font-mono text-base md:text-lg leading-relaxed">
                Whether you are training for esports tournaments or just escaping reality for a few hours, we provide the ultimate cyber-grid environment. No distractions. Just pure performance.
              </p>
            </div>
            <div className="flex-1 w-full grid grid-cols-2 gap-4">
              <div className="bg-black border-2 border-cyan-500/40 p-6 cyber-cut-reverse hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-400 text-neon-cyan mb-2">50+</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Premium Nodes</p>
              </div>
              <div className="bg-black border-2 border-pink-500/40 p-6 cyber-cut hover:border-pink-400 hover:shadow-[0_0_20px_rgba(255,0,60,0.2)] transition-all">
                <h3 className="text-3xl md:text-4xl font-black text-pink-400 text-neon-pink mb-2">1GB/s</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Fiber Uplink</p>
              </div>
              <div className="bg-black border-2 border-yellow-400/40 p-6 cyber-cut hover:border-yellow-300 hover:shadow-[0_0_20px_rgba(252,238,10,0.2)] transition-all">
                <h3 className="text-3xl md:text-4xl font-black text-yellow-400 text-neon-yellow mb-2">24/7</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Uptime</p>
              </div>
              <div className="bg-black border-2 border-cyan-500/40 p-6 cyber-cut-reverse hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all">
                <h3 className="text-3xl md:text-4xl font-black text-cyan-400 text-neon-cyan mb-2">240Hz</h3>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Refresh Rate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Section */}
      <section id="hardware" className="py-20 md:py-28 bg-black relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-widest text-white uppercase inline-block border-b-2 border-cyan-500 pb-2 text-neon-cyan">
              Hardware_Specs
            </h2>
            <p className="text-slate-500 font-mono text-sm mt-4 tracking-wider">&gt; Only the finest silicon runs in our grid</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* PC Tier */}
            <div className="border-2 border-cyan-500/40 bg-cyan-500/5 p-8 cyber-cut hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(0,240,255,0.2)] transition-all group">
              <div className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 group-hover:text-neon-cyan">&gt; TIER_ALPHA</div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-widest">PC RIGS</h3>
              <ul className="space-y-3 text-slate-400 font-mono text-sm">
                <li className="flex items-center gap-2"><span className="text-cyan-500">&gt;</span> NVIDIA RTX 4090 / 3080</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">&gt;</span> Intel i9-14900K / i7-12700K</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">&gt;</span> 32GB DDR5 RAM</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">&gt;</span> 240Hz IPS Displays</li>
                <li className="flex items-center gap-2"><span className="text-cyan-500">&gt;</span> Mechanical Keyboards</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-cyan-500/20">
                <span className="text-2xl font-black text-yellow-400 text-neon-yellow">₹60-100</span>
                <span className="text-xs text-slate-500 tracking-widest uppercase ml-1">/HR</span>
              </div>
            </div>
            
            {/* PS5 Tier */}
            <div className="border-2 border-pink-500/40 bg-pink-500/5 p-8 cyber-cut-reverse hover:border-pink-400 hover:shadow-[0_0_25px_rgba(255,0,60,0.2)] transition-all group">
              <div className="text-pink-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 group-hover:text-neon-pink">&gt; TIER_BRAVO</div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-widest">PS5 PODS</h3>
              <ul className="space-y-3 text-slate-400 font-mono text-sm">
                <li className="flex items-center gap-2"><span className="text-pink-500">&gt;</span> PlayStation 5 Console</li>
                <li className="flex items-center gap-2"><span className="text-pink-500">&gt;</span> 4K HDR Output</li>
                <li className="flex items-center gap-2"><span className="text-pink-500">&gt;</span> DualSense Controllers</li>
                <li className="flex items-center gap-2"><span className="text-pink-500">&gt;</span> 55&quot; OLED Displays</li>
                <li className="flex items-center gap-2"><span className="text-pink-500">&gt;</span> Premium Headsets</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-pink-500/20">
                <span className="text-2xl font-black text-yellow-400 text-neon-yellow">₹150</span>
                <span className="text-xs text-slate-500 tracking-widest uppercase ml-1">/HR</span>
              </div>
            </div>
            
            {/* Xbox Tier */}
            <div className="border-2 border-yellow-400/40 bg-yellow-400/5 p-8 cyber-cut hover:border-yellow-300 hover:shadow-[0_0_25px_rgba(252,238,10,0.2)] transition-all group">
              <div className="text-yellow-400 text-xs font-bold tracking-[0.3em] uppercase mb-4 group-hover:text-neon-yellow">&gt; TIER_CHARLIE</div>
              <h3 className="text-2xl font-black text-white mb-6 tracking-widest">XBOX ZONE</h3>
              <ul className="space-y-3 text-slate-400 font-mono text-sm">
                <li className="flex items-center gap-2"><span className="text-yellow-400">&gt;</span> Xbox Series X</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">&gt;</span> Game Pass Ultimate</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">&gt;</span> 4K 120fps Output</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">&gt;</span> Elite Controllers</li>
                <li className="flex items-center gap-2"><span className="text-yellow-400">&gt;</span> Dolby Atmos Audio</li>
              </ul>
              <div className="mt-6 pt-4 border-t border-yellow-400/20">
                <span className="text-2xl font-black text-yellow-400 text-neon-yellow">₹120</span>
                <span className="text-xs text-slate-500 tracking-widest uppercase ml-1">/HR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 md:py-28 bg-slate-950 border-t-2 border-pink-500/20 relative">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-black tracking-widest text-white uppercase inline-block border-b-2 border-pink-500 pb-2 text-neon-pink">
                Establish_Comms
              </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border-2 border-cyan-500/30 bg-black p-8 cyber-cut-reverse space-y-8 hover:border-cyan-400/50 transition-all">
              <div className="flex items-start gap-4">
                <MapPin className="text-cyan-400 w-6 h-6 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">Coordinates</h4>
                  <p className="text-slate-400 font-mono text-sm">Level 4, Neon Plaza<br/>Cyber District, Sector 7</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Phone className="text-yellow-400 w-6 h-6 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">Voice_Link</h4>
                  <p className="text-slate-400 font-mono text-sm">+91 98765 43210</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="text-pink-500 w-6 h-6 mt-1 shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white mb-1">Data_Drop</h4>
                  <p className="text-slate-400 font-mono text-sm">connect@gamezone.net</p>
                </div>
              </div>
            </div>

            <div className="border-2 border-slate-800 bg-black p-8 cyber-cut flex flex-col justify-center space-y-6 hover:border-pink-500/30 transition-all">
              <h3 className="text-xl font-black tracking-widest uppercase text-center text-white">Follow the Grid</h3>
              <div className="flex justify-center gap-6">
                <a href="#" className="p-4 bg-slate-950 border-2 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] text-slate-500 transition-all">
                  <Globe size={24} />
                </a>
                <a href="#" className="p-4 bg-slate-950 border-2 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] text-slate-500 transition-all">
                  <TerminalSquare size={24} />
                </a>
              </div>
              <p className="text-center text-xs text-slate-500 font-mono mt-4">
                @GamezoneOfficial<br/>
                Tag us for a chance to win 5 hours of free playtime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-cyan-500/20 bg-black py-8 text-center">
        <p className="text-xs font-mono text-slate-600 tracking-widest">
          &copy; {new Date().getFullYear()} GAMEZONE. ALL RIGHTS RESERVED. // POWERED BY CYBERPUNK_ENGINE v2.0
        </p>
      </footer>

    </div>
  );
}
