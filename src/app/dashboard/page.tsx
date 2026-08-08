"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { getUserScans, computeDashboardStats, type ScanRecord, type DashboardStats } from "@/lib/scans";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const PIE_COLORS = ["#4c8a38", "#c98a1e", "#c9581e", "#b0231d", "#396c2a", "#7a5c3e"];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<ScanRecord[] | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getUserScans(user.uid).then((s) => {
      setScans(s);
      setStats(computeDashboardStats(s));
      setLoading(false);
    });
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Loader2 className="h-5 w-5 animate-spin text-canopy-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-canopy-300">
          <Link href="/login" className="underline">Sign in</Link> to see your dashboard.
        </p>
      </div>
    );
  }

  if (!stats || stats.totalScans === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-canopy-300">
          No scans yet — this dashboard has nothing to show until you run one.
        </p>
        <Link href="/scan" className="btn-primary mt-4 inline-flex">Scan your first leaf</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <h1 className="font-display text-3xl font-semibold">Your dashboard</h1>
      <p className="text-sm text-canopy-400">
        Every number below is computed directly from your {stats.totalScans} saved scan
        {stats.totalScans === 1 ? "" : "s"} — nothing here is sample data.
      </p>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total scans" value={stats.totalScans.toString()} />
        <StatCard label="Healthy" value={stats.healthyCount.toString()} />
        <StatCard label="Diseased" value={stats.diseasedCount.toString()} />
        <StatCard
          label="Recovery rate"
          value={stats.recoveryRate === null ? "Not enough data yet" : `${(stats.recoveryRate * 100).toFixed(0)}%`}
          small={stats.recoveryRate === null}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-display font-semibold">Scans over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.scansByDay}>
              <XAxis dataKey="date" stroke="#96c485" fontSize={11} />
              <YAxis stroke="#96c485" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#213a1c", border: "none" }} />
              <Bar dataKey="count" fill="#4c8a38" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="mb-4 font-display font-semibold">Condition breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.conditionBreakdown} dataKey="count" nameKey="condition" outerRadius={80}>
                {stats.conditionBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#213a1c", border: "none" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats.mostCommonCondition && (
        <p className="text-sm text-canopy-300">
          Most common condition in your scans: <strong>{stats.mostCommonCondition.condition}</strong> (
          {stats.mostCommonCondition.count} of {stats.totalScans} scans)
        </p>
      )}

      <div className="card">
        <h3 className="mb-4 font-display font-semibold">Recent scans</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-canopy-400">
            <tr>
              <th className="pb-2">Date</th>
              <th className="pb-2">Crop</th>
              <th className="pb-2">Condition</th>
              <th className="pb-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {(scans ?? []).slice(0, 10).map((s) => (
              <tr key={s.id} className="border-t border-canopy-800">
                <td className="py-2">{s.createdAt.toDate().toLocaleDateString()}</td>
                <td className="py-2">{s.crop}</td>
                <td className="py-2">{s.condition}</td>
                <td className="py-2">{(s.confidence * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-widest text-canopy-400">{label}</p>
      <p className={`mt-2 font-display font-semibold ${small ? "text-base text-canopy-300" : "text-3xl"}`}>
        {value}
      </p>
    </div>
  );
}
