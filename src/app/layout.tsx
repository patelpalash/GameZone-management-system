import type { Metadata } from "next";
import { Rajdhani } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/contexts/AuthContext";

const rajdhani = Rajdhani({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans" 
});

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
    <html lang="en" className={cn("dark font-sans", rajdhani.variable)}>
      <body className="antialiased min-h-screen scanlines">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
