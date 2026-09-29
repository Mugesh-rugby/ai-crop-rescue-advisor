import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import ChatbotWidget from "@/components/ChatbotWidget";
import { Suspense } from "react";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "AI Crop Rescue Advisor",
  description: "Scan a leaf, get an AI-powered diagnosis and treatment plan in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <AuthProvider>
          {/* Suspense required for components that call useSearchParams */}
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <main className="min-h-screen">
            <Suspense fallback={null}>{children}</Suspense>
          </main>
          <ChatbotWidget />
        </AuthProvider>
      </body>
    </html>
  );
}
