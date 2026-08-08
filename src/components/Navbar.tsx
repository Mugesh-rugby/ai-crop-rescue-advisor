"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import {
  Sprout,
  LayoutDashboard,
  Scan,
  Compass,
  CloudSun,
  MessageSquare,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "dashboard";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    setDropdownOpen(false);
    await signOut();
    router.replace("/login");
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "scan", label: "Disease Detection", icon: Scan },
    { id: "advisor", label: "Crop Advisor", icon: Compass },
    { id: "weather", label: "Weather & Irrigation", icon: CloudSun },
    { id: "chat", label: "AI Chat", icon: MessageSquare },
  ];

  const initials = user?.displayName
    ? user.displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2edd8] bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link
          href="/?tab=dashboard"
          className="flex items-center gap-2.5 font-display text-base font-extrabold text-[#112211] tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e3f4db] text-[#4c8a38]">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline uppercase tracking-tight">
            AI Crop <span className="text-[#4c8a38]">Rescue</span> Advisor
          </span>
        </Link>

        {/* Tabs — hidden on mobile */}
        <nav className="hidden items-center gap-1 lg:flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/?tab=${tab.id}`}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#eef6eb] text-[#396c2a]"
                    : "text-[#556655] hover:bg-[#f4f9f2] hover:text-[#396c2a]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full border border-[#dceed5] bg-[#f4f9f2] py-1.5 pl-1.5 pr-3 transition hover:bg-[#eef6eb]"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4c8a38] text-xs font-extrabold text-white">
                  {initials}
                </span>
              )}
              <span className="hidden text-xs font-bold text-[#1e331b] sm:block max-w-[80px] truncate">
                {user.displayName}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-[#556655] transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-2xl border border-[#dceed5] bg-white py-2 shadow-xl z-50 animate-fade-in">
                <div className="border-b border-[#eef6eb] px-4 pb-3 pt-2">
                  <p className="text-xs font-extrabold text-[#1e331b] truncate">{user.displayName}</p>
                  <p className="text-[10px] text-[#7a8a7a] truncate">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-[#2d402b] hover:bg-[#f4f9f2] transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-[#4c8a38]" /> My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        {!user && (
          <Link href="/login" className="btn-primary !px-4 !py-2 text-xs">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
