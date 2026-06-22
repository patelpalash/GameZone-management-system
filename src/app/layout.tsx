import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/gamezone/Toast";

export const metadata: Metadata = {
  title: "Gamezone Command Center",
  description: "Cyberpunk control system for Gamezone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Suppress benign Firebase/WebChannel AbortErrors BEFORE Next.js error overlay loads */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            function isAbort(e){
              if(!e)return false;
              if(e.name==="AbortError")return true;
              var s=String(e);
              if(s.indexOf("signal is aborted without reason")!==-1)return true;
              if(s.indexOf("Failed to fetch")!==-1)return true;
              if(s.indexOf("Load failed")!==-1)return true;
              if(e.message&&e.message.indexOf("signal is aborted without reason")!==-1)return true;
              if(e.message&&e.message.indexOf("Failed to fetch")!==-1)return true;
              if(e.message&&e.message.indexOf("Load failed")!==-1)return true;
              if(e.stack&&e.stack.indexOf("webchannel_blob")!==-1)return true;
              return false;
            }
            window.addEventListener("error",function(ev){
              if(isAbort(ev.error)||( ev.message&&ev.message.indexOf("signal is aborted without reason")!==-1)){
                ev.stopImmediatePropagation();ev.preventDefault();return false;
              }
            },true);
            window.addEventListener("unhandledrejection",function(ev){
              if(isAbort(ev.reason)){ev.stopImmediatePropagation();ev.preventDefault();return false;}
            },true);
          })();
        `}} />
        {/* Load Rajdhani via browser-side link — avoids Next.js build-time Google Fonts fetch timeout */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased min-h-screen"
        style={{ fontFamily: "'Rajdhani', 'Segoe UI', system-ui, sans-serif" }}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
