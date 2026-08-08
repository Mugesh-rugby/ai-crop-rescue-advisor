"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { subscribeToUserScans, computeDashboardStats, type ScanRecord } from "@/lib/scans";
import { Loader2, User, Mail, Camera, TrendingUp, Sprout, ShieldCheck, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [scansLoading, setScansLoading] = useState(true);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Subscribe to this user's scans in real-time
  useEffect(() => {
    if (!user) return;
    setScansLoading(true);
    const unsub = subscribeToUserScans(user.uid, (data) => {
      setScans(data);
      setScansLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38]" />
      </div>
    );
  }

  if (!user) return null;

  const stats = computeDashboardStats(scans);
  const initials = user.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const joinDate = scans.length > 0
    ? new Date(Math.min(...scans.map((s) => s.createdAt.toMillis()))).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "No scans yet";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="space-y-6">
        {/* Profile Card */}
        <div className="card flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="h-24 w-24 rounded-full border-4 border-[#dceed5] object-cover shadow-md"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4c8a38] to-[#2e6b33] text-3xl font-extrabold text-white shadow-md">
              {initials}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-extrabold text-[#112211]">{user.displayName}</h1>
            <div className="mt-1.5 flex flex-col sm:flex-row items-center sm:items-start gap-2 text-sm text-[#556655]">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#4c8a38]" /> {user.email}
              </span>
              <span className="hidden sm:block text-[#c8dfbf]">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4c8a38]" /> Verified Account
              </span>
            </div>
            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
              <button
                onClick={() => router.push("/?tab=dashboard")}
                className="btn-primary !px-5 !py-2 text-sm"
              >
                Go to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Scans", value: stats.totalScans, icon: <Camera className="h-5 w-5 text-[#4c8a38]" /> },
            { label: "Healthy Plants", value: stats.healthyCount, icon: <Sprout className="h-5 w-5 text-green-500" /> },
            { label: "Diseases Found", value: stats.diseasedCount, icon: <User className="h-5 w-5 text-orange-500" /> },
            {
              label: "Recovery Rate",
              value: stats.recoveryRate !== null ? `${(stats.recoveryRate * 100).toFixed(0)}%` : "—",
              icon: <TrendingUp className="h-5 w-5 text-[#4c8a38]" />
            },
          ].map((s) => (
            <div key={s.label} className="card flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f9f2] border border-[#dceed5]">
                {s.icon}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a]">{s.label}</p>
                <p className="mt-0.5 text-2xl font-extrabold text-[#112211] font-display">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent scan history for this user only */}
        <div className="card">
          <h2 className="font-display font-bold text-base text-[#1e331b] mb-4">Your Scan History</h2>
          {scansLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#4c8a38]" />
            </div>
          ) : scans.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#7a8a7a] font-medium">
              No scans found for your account. Go to Disease Detection to scan your first leaf.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[#e2edd8] text-[#7a8a7a] text-xs font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Image</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Crop</th>
                    <th className="pb-3 px-4">Condition</th>
                    <th className="pb-3 px-4 text-right">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef6eb]">
                  {scans.slice(0, 10).map((s) => (
                    <tr key={s.id} className="text-[#2d402b] hover:bg-[#fafcf9]">
                      <td className="py-3 pr-4">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.crop} className="h-10 w-10 rounded-lg border border-[#dceed5] object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-[#eef6eb] flex items-center justify-center text-base">🍃</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold">{s.createdAt.toDate().toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-bold text-[#396c2a]">{s.crop}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          s.isHealthy
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-orange-50 text-orange-700 border border-orange-200"
                        }`}>
                          {s.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-right">
                        {(s.confidence * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
