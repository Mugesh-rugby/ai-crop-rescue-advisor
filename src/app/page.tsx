"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { subscribeToUserScans, computeDashboardStats, type ScanRecord, type DashboardStats } from "@/lib/scans";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  Loader2,
  Camera,
  CloudSun,
  Sprout,
  Compass,
  Droplets,
  Users,
  Wind,
  Droplet,
  Umbrella,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Send,
  AlertCircle,
} from "lucide-react";
import ImageCapture from "@/components/ImageCapture";
import ScanResult from "@/components/ScanResult";
import { classifyImage, type ClassificationResult } from "@/lib/model";
import { saveScan, uploadScanImage } from "@/lib/scans";
import { isFirebaseConfigured } from "@/lib/firebase";

const PIE_COLORS = ["#4c8a38", "#88c375", "#c98a1e", "#c9581e", "#b0231d", "#7a5c3e"];

export default function HomePage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const router = useRouter();
  const [, startTransition] = useTransition();

  function setTab(tabName: string) {
    startTransition(() => {
      router.push(`/?tab=${tabName}`);
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {activeTab === "dashboard" && <DashboardView onNavigate={setTab} />}
      {activeTab === "scan" && <ScanView />}
      {activeTab === "advisor" && <AdvisorView />}
      {activeTab === "weather" && <WeatherView />}
      {activeTab === "chat" && <ChatView />}
    </div>
  );
}

// -------------------------------------------------------------
// 1. DASHBOARD VIEW
// -------------------------------------------------------------
function DashboardView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Real-time Firestore subscription — strictly per-user
  // When user changes (e.g. sign out / different account), clear data immediately
  useEffect(() => {
    if (!user) {
      setScans([]);
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    // subscribeToUserScans filters by userId == user.uid in Firestore query
    const unsub = subscribeToUserScans(user.uid, (data) => {
      setScans(data);
      setStats(computeDashboardStats(data));
      setLoading(false);
    });
    // Cleanup listener on unmount or user change — this prevents cross-user data leaks
    return unsub;
  }, [user?.uid]);


  // Dynamic Weather fetch for Chetput, IN
  useEffect(() => {
    async function fetchWeather() {
      try {
        const lat = 12.4497;
        const lon = 79.3512;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=auto`
        );
        if (!res.ok) throw new Error("Weather API failed");
        const data = await res.json();
        
        const getCondition = (code: number) => {
          if (code === 0) return "Clear Sky";
          if ([1, 2, 3].includes(code)) return "Partly Cloudy";
          if ([45, 48].includes(code)) return "Foggy";
          if ([51, 53, 55].includes(code)) return "Drizzle";
          if ([61, 63, 65].includes(code)) return "Rainy";
          if ([80, 81, 82].includes(code)) return "Showers";
          if ([95, 96, 99].includes(code)) return "Thunderstorm";
          return "Overcast";
        };

        const today = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          condition: getCondition(data.current.weather_code),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          rain: data.current.precipitation,
          forecast: data.daily.time.slice(0, 3).map((timeStr: string, idx: number) => {
            const date = new Date(timeStr);
            let dayName = days[date.getDay()];
            if (idx === 0) dayName = "Today";
            if (idx === 1) dayName = "Tomorrow";
            return {
              day: dayName,
              temp: Math.round(data.daily.temperature_2m_max[idx]),
              condition: getCondition(data.daily.weather_code[idx]),
              rainProb: data.daily.precipitation_probability_max[idx] || 0,
            };
          }),
        });
      } catch (err) {
        console.error("Weather load error, using static fallback:", err);
        setWeather({
          temp: 35,
          condition: "Overcast Clouds",
          humidity: 60,
          windSpeed: 6,
          rain: 0.0,
          forecast: [
            { day: "Today", temp: 35, condition: "Overcast Clouds", rainProb: 10 },
            { day: "Tomorrow", temp: 34, condition: "Partly Cloudy", rainProb: 0 },
            { day: "Day 3", temp: 32, condition: "Light Drizzle", rainProb: 75 },
          ],
        });
      } finally {
        setWeatherLoading(false);
      }
    }
    fetchWeather();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#f2f9f1] via-white to-[#e8f5e6] p-8 border border-[#dceed5] shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#4c8a38]">
            <span className="h-2 w-2 rounded-full bg-[#22c55e] animate-ping" />
            Live AI System Active
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-[#112211] mt-3 sm:text-5xl">
            AI Crop <span className="text-[#4c8a38]">Rescue</span> Advisor
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[#556655]">
            Upload any plant or leaf photo — our AI identifies disease, provides treatment plans,
            and monitors your farm health in real time.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 hidden w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#e3f4db] opacity-40 lg:block rounded-l-full" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Scans"
          value={stats ? stats.totalScans.toString() : "0"}
          subtext="Total records captured"
          icon={<Camera className="text-[#4c8a38]" />}
        />
        <StatCard
          label="Healthy Plants"
          value={stats ? stats.healthyCount.toString() : "0"}
          subtext="No issues found"
          icon={<Sprout className="text-[#22c55e]" />}
        />
        <StatCard
          label="Diseases Found"
          value={stats ? stats.diseasedCount.toString() : "0"}
          subtext="Active pathogens detected"
          icon={<AlertCircleIcon className="text-[#c9581e]" />}
        />
        <StatCard
          label="Recovery Rate"
          value={stats && stats.recoveryRate !== null ? `${(stats.recoveryRate * 100).toFixed(0)}%` : "--"}
          subtext={stats && stats.recoveryRate !== null ? "Average recovery signal" : "Needs more scans"}
          icon={<TrendingUp className="text-[#4c8a38]" />}
        />
      </div>

      {/* Main Panel grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Weather Conditions Card */}
        <div className="lg:col-span-1">
          <div className="card h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#e2edd8] pb-3 mb-4">
                <h3 className="font-display font-bold text-lg text-[#1e331b] flex items-center gap-2">
                  <CloudSun className="h-5 w-5 text-[#4c8a38]" /> Weather Conditions
                </h3>
                <span className="rounded-full bg-[#eef6eb] px-2.5 py-0.5 text-xs font-bold text-[#396c2a] uppercase tracking-wider">
                  Chetput, IN
                </span>
              </div>

              {weatherLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38]" />
                  <p className="text-xs text-[#556655] mt-2">Loading local weather...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-5xl font-extrabold text-[#112211] font-display">
                        {weather.temp}°<span className="text-3xl text-[#556655]">C</span>
                      </p>
                      <p className="text-sm font-semibold text-[#556655] mt-1">{weather.condition}</p>
                    </div>
                    <span className="text-5xl">☀️</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#fafcf9] border border-[#dceed5] p-3 text-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a]">Humidity</p>
                      <p className="text-sm font-extrabold text-[#1e331b] mt-1 flex items-center justify-center gap-0.5">
                        <Droplet className="h-3.5 w-3.5 text-[#4c8a38]" /> {weather.humidity}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a]">Wind</p>
                      <p className="text-sm font-extrabold text-[#1e331b] mt-1 flex items-center justify-center gap-0.5">
                        <Wind className="h-3.5 w-3.5 text-[#4c8a38]" /> {weather.windSpeed} km/h
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a]">Rainfall</p>
                      <p className="text-sm font-extrabold text-[#1e331b] mt-1 flex items-center justify-center gap-0.5">
                        <Umbrella className="h-3.5 w-3.5 text-[#4c8a38]" /> {weather.rain}mm
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#7a8a7a] mb-2">3-Day Forecast</p>
                    <div className="space-y-2 text-sm">
                      {weather.forecast.map((f: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between border-t border-[#eef6eb] pt-2">
                          <span className="font-semibold text-[#556655]">{f.day}</span>
                          <span className="text-xs text-[#7a8a7a]">{f.condition}</span>
                          <span className="font-bold text-[#1e331b]">{f.temp}°C</span>
                          <span className="text-xs text-[#4c8a38] font-bold">{f.rainProb}% rain</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate("weather")}
              className="btn-secondary w-full text-xs font-bold py-2.5 mt-6 flex items-center justify-center gap-1.5"
            >
              Detailed Irrigation Advisory <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Core Modules Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-display font-bold text-lg text-[#1e331b] border-b border-[#e2edd8] pb-3 mb-5">
              Core Modules
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModuleCard
                title="Disease Detection"
                description="Upload leaf photos to detect pathogens instantly with our EfficientNet AI."
                buttonText="Scan a Leaf"
                icon={<Camera className="h-5 w-5" />}
                onClick={() => onNavigate("scan")}
                badge="AI-Powered"
              />
              <ModuleCard
                title="Crop Advisor"
                description="Get smart crop selection recommendations based on soil types and climate data."
                buttonText="Get Recommendations"
                icon={<Compass className="h-5 w-5" />}
                onClick={() => onNavigate("advisor")}
              />
              <ModuleCard
                title="Irrigation Advisory"
                description="Optimize watering schedules according to real-time weather and humidity data."
                buttonText="View Schedule"
                icon={<Droplets className="h-5 w-5" />}
                onClick={() => onNavigate("weather")}
              />
              <ModuleCard
                title="Expert Consultation"
                description="Discuss farm diagnostics or queries with a dedicated local Ollama chat assistant."
                buttonText="Start Consultation"
                icon={<Users className="h-5 w-5" />}
                onClick={() => onNavigate("chat")}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Graphs */}
      {stats && stats.totalScans > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h3 className="font-display font-bold text-base text-[#1e331b] mb-4">Scans Activity</h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.scansByDay}>
                  <XAxis dataKey="date" stroke="#7a8a7a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#7a8a7a" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #dceed5", borderRadius: "10px" }} />
                  <Bar dataKey="count" fill="#4c8a38" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-base text-[#1e331b] mb-4">Disease Prevalence</h3>
            <div className="h-[220px] w-full flex items-center justify-between gap-4">
              <div className="flex-1 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.conditionBreakdown} dataKey="count" nameKey="condition" outerRadius={75} innerRadius={40}>
                      {stats.conditionBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #dceed5", borderRadius: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 overflow-y-auto max-h-full space-y-1.5 text-xs">
                {stats.conditionBreakdown.map((item, idx) => (
                  <div key={item.condition} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="font-semibold text-[#556655] truncate max-w-[120px]">{item.condition}</span>
                    <span className="font-bold text-[#1e331b] ml-auto">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Scans Table */}
      <div className="card">
        <h3 className="font-display font-bold text-base text-[#1e331b] mb-4">Recent Scans</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#4c8a38]" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#7a8a7a] font-medium">
            No scans recorded yet. Capture or upload a leaf photo to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#e2edd8] text-[#7a8a7a] font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 font-bold">Image</th>
                  <th className="pb-3 px-4 font-bold">Date</th>
                  <th className="pb-3 px-4 font-bold">Crop</th>
                  <th className="pb-3 px-4 font-bold">Condition</th>
                  <th className="pb-3 px-4 font-bold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef6eb]">
                {scans.slice(0, 5).map((s) => (
                  <tr key={s.id} className="text-[#2d402b] hover:bg-[#fafcf9] transition-colors">
                    <td className="py-3 pr-4">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.crop} className="h-10 w-10 rounded-lg object-cover border border-[#dceed5] shadow-xs" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-[#eef6eb] flex items-center justify-center">🍂</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold">{s.createdAt.toDate().toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-bold text-[#396c2a]">{s.crop}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        s.isHealthy ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                      }`}>
                        {s.condition}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-right font-mono">{(s.confidence * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, icon }: { label: string; value: string; subtext: string; icon: React.ReactNode }) {
  return (
    <div className="card flex items-start gap-4 hover:shadow-md transition-shadow">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f9f2] border border-[#dceed5] text-lg">
        {icon}
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-[#112211] font-display">{value}</p>
        <p className="text-[10px] text-[#556655] font-semibold mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  buttonText,
  icon,
  onClick,
  badge
}: {
  title: string;
  description: string;
  buttonText: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dceed5] bg-white p-5 flex flex-col justify-between hover:border-[#c8dfbf] transition-colors relative">
      {badge && (
        <span className="absolute top-4 right-4 rounded-full bg-[#4c8a38] text-[9px] font-extrabold text-white px-2 py-0.5 uppercase tracking-wide">
          {badge}
        </span>
      )}
      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef6eb] text-[#4c8a38] mb-3">
          {icon}
        </span>
        <h4 className="font-display font-extrabold text-base text-[#1e331b]">{title}</h4>
        <p className="text-xs text-[#556655] mt-1.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onClick}
        className="btn-primary w-full text-xs font-bold py-2 mt-4"
      >
        {buttonText}
      </button>
    </div>
  );
}

function AlertCircleIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// -------------------------------------------------------------
// 2. LEAF SCANNER (DISEASE DETECTION) TAB VIEW
// -------------------------------------------------------------
function ScanView() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleImageReady(blob: Blob, preview: string) {
    setPreviewUrl(preview);
    setResult(null);
    setDiagnosis(null);
    setSaved(false);
    setStatus("analyzing");

    try {
      // 1. Run classifier locally (model or simulated sandbox classifier)
      const imgEl = await blobToImageElement(blob);
      const classification = await classifyImage(imgEl);
      setResult(classification);
      setStatus("done");

      // 2. Fetch diagnosis dynamically from local Ollama
      setDiagLoading(true);
      try {
        const diagRes = await fetch("/api/diagnose", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            crop: classification.crop,
            condition: classification.condition,
          }),
        });

        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setDiagnosis(diagData);
        } else {
          console.warn("Failed to fetch Ollama diagnosis, falling back to static info.");
        }
      } catch (err) {
        console.warn("Ollama diagnosis API failed:", err);
      } finally {
        setDiagLoading(false);
      }

      // 3. Save to Firestore if user is logged in and Firebase is configured
      if (!isFirebaseConfigured) {
        console.warn("Firebase not configured — skipping save.");
        setErrorMsg("Server storage is not configured. Please set NEXT_PUBLIC_FIREBASE_* env vars.");
      } else if (!user) {
        // Should not happen since UI prompts sign-in, but guard anyway
        setErrorMsg("Sign in to save this scan to your account.");
      } else {
        try {
          // Upload image then save record — handle each step so failures are clear
          const imageUrl = await uploadScanImage(user.uid, blob);
          try {
            const docId = await saveScan(user.uid, imageUrl, classification);
            console.info("Scan saved", docId);
            setSaved(true);
          } catch (saveErr: any) {
            console.error("Failed to save scan record:", saveErr);
            setErrorMsg(
              saveErr?.message
                ? `Could not save scan: ${saveErr.message}`
                : "Could not save scan to database."
            );
          }
        } catch (uploadErr: any) {
          console.error("Failed to upload scan image:", uploadErr);
          setErrorMsg(
            uploadErr?.message
              ? `Could not upload image: ${uploadErr.message}`
              : "Could not upload scan image. Check storage configuration."
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Analysis failed. Try another photo.");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in py-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[#112211]">Disease Detection</h1>
        <p className="mt-1 text-sm text-[#556655]">
          Fill the frame with one leaf, in good light, against a plain background if possible.
        </p>
      </div>

      {!user && (
        <div className="rounded-xl border border-[#dceed5] bg-white p-4 text-xs font-semibold text-[#556655] flex items-center justify-between">
          <span>Sign in to save this scan to your history and dashboard stats.</span>
          <a href="/login" className="text-[#4c8a38] hover:underline font-bold">Sign In &rarr;</a>
        </div>
      )}

      <ImageCapture onImageReady={handleImageReady} />

      {previewUrl && (
        <div className="flex justify-center">
          <img src={previewUrl} alt="Captured leaf" className="max-h-64 rounded-2xl border border-[#dceed5] object-cover shadow-sm" />
        </div>
      )}

      {status === "analyzing" && (
        <div className="card flex items-center justify-center gap-3 text-[#396c2a] py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#4c8a38]" />
          <span className="font-bold text-sm">Analyzing leaf specimen using EfficientNet...</span>
        </div>
      )}

      {status === "error" && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm">
          <p className="font-bold">Execution Error</p>
          <p className="mt-1 text-xs">{errorMsg}</p>
        </div>
      )}

      {status === "done" && result && (
        <div className="space-y-6">
          <ScanResult result={result} dynamicDiagnosis={diagnosis} diagnosisLoading={diagLoading} />
          {user && (
            <p className="text-center text-xs font-bold text-[#4c8a38] uppercase tracking-wider">
              {saved ? "✓ Scan records synchronized to dashboard" : "Synchronizing..."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function blobToImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// -------------------------------------------------------------
// 3. CROP ADVISOR TAB VIEW
// -------------------------------------------------------------
function AdvisorView() {
  const [soil, setSoil] = useState("loamy");
  const [climate, setClimate] = useState("moderate");
  const [region, setRegion] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResponse(null);

    const prompt = `You are a crop advisor. What are the best crops to plant in soil type "${soil}", under a climate of "${climate}", in region "${region || "unspecified"}". List 3 specific crop suggestions with 1-2 sentence reasons for each. Be concise, easy to read, and output clean formatted text.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        }),
      });

      if (!res.ok) throw new Error("AI query failed");
      const data = await res.json();
      setResponse(data.reply);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to contact Ollama for suggestions.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in py-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[#112211]">Crop Recommendation Advisor</h1>
        <p className="mt-1 text-sm text-[#556655]">
          Get intelligent crop suggestions from local Ollama gemma3 based on your local soil and climate conditions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-5">
        <form onSubmit={handleSubmit} className="card md:col-span-2 space-y-4 h-fit">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#556655] mb-1.5">Soil Type</label>
            <select
              value={soil}
              onChange={(e) => setSoil(e.target.value)}
              className="w-full rounded-xl border border-[#c8dfbf] bg-[#fafcf9] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#4c8a38] focus:bg-white"
            >
              <option value="loamy">Loamy (Balanced)</option>
              <option value="clay">Clay (Holds water)</option>
              <option value="sandy">Sandy (Well draining)</option>
              <option value="silty">Silty (Rich in nutrients)</option>
              <option value="peaty">Peaty (Acidic/Organic)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#556655] mb-1.5">Climate</label>
            <select
              value={climate}
              onChange={(e) => setClimate(e.target.value)}
              className="w-full rounded-xl border border-[#c8dfbf] bg-[#fafcf9] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#4c8a38] focus:bg-white"
            >
              <option value="moderate">Moderate / Temperate</option>
              <option value="hot & dry">Hot & Dry (Arid)</option>
              <option value="hot & humid">Hot & Humid (Tropical)</option>
              <option value="cold">Cold / Alpine</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#556655] mb-1.5">Region / Location</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Tamil Nadu, India"
              className="w-full rounded-xl border border-[#c8dfbf] bg-[#fafcf9] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#4c8a38] focus:bg-white"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Querying Ollama AI...
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4" /> Get Recommendations
              </>
            )}
          </button>
        </form>

        <div className="md:col-span-3 space-y-4">
          <div className="card min-h-[280px] bg-white flex flex-col">
            <h3 className="font-display font-bold text-base text-[#1e331b] border-b border-[#eef6eb] pb-3 mb-4">
              AI Recommendations Output
            </h3>

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-[#556655] py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38] mb-3" />
                <p className="text-xs font-semibold">Generating recommendations using local gemma3:1b model...</p>
              </div>
            )}

            {errorMsg && (
              <div className="flex-1 rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 leading-normal flex items-start gap-2">
                <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="font-bold">Ollama Unreachable</p>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {!loading && !errorMsg && !response && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#7a8a7a]">
                <Compass className="h-10 w-10 text-[#c8dfbf] mb-3" />
                <p className="text-sm font-medium">Select soil and climate details to generate suggestions.</p>
              </div>
            )}

            {response && (
              <div className="flex-1 text-sm text-[#2d402b] whitespace-pre-wrap leading-relaxed">
                {response}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. WEATHER & IRRIGATION TAB VIEW
// -------------------------------------------------------------
function WeatherView() {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<string | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    async function loadWeather() {
      try {
        const lat = 12.4497;
        const lon = 79.3512;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,precipitation_probability_max&timezone=auto`
        );
        if (!res.ok) throw new Error("Weather API failed");
        const data = await res.json();
        
        const getCondition = (code: number) => {
          if (code === 0) return "Sunny";
          if ([1, 2, 3].includes(code)) return "Partly Cloudy";
          if ([45, 48].includes(code)) return "Foggy";
          if ([61, 63, 65].includes(code)) return "Rainy";
          return "Overcast";
        };

        const today = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        setWeather({
          temp: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          rain: data.current.precipitation,
          condition: getCondition(data.current.weather_code),
          forecast: data.daily.time.slice(0, 5).map((timeStr: string, idx: number) => {
            const date = new Date(timeStr);
            return {
              day: days[date.getDay()],
              temp: Math.round(data.daily.temperature_2m_max[idx]),
              condition: getCondition(data.daily.weather_code[idx]),
              rainProb: data.daily.precipitation_probability_max[idx] || 0,
            };
          }),
        });
      } catch (err) {
        console.error(err);
        setWeather({
          temp: 35,
          humidity: 60,
          wind: 6,
          rain: 0,
          condition: "Overcast",
          forecast: [
            { day: "Monday", temp: 35, condition: "Overcast", rainProb: 10 },
            { day: "Tuesday", temp: 34, condition: "Sunny", rainProb: 0 },
            { day: "Wednesday", temp: 32, condition: "Rainy", rainProb: 80 },
            { day: "Thursday", temp: 33, condition: "Cloudy", rainProb: 40 },
            { day: "Friday", temp: 34, condition: "Sunny", rainProb: 0 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, []);

  async function getWateringSchedule() {
    if (!weather) return;
    setScheduleLoading(true);
    setSchedule(null);

    const prompt = `Give me a simple 3-day watering schedule. Current conditions: Temp ${weather.temp}°C, Humidity ${weather.humidity}%, Rain today ${weather.rain}mm, 5-day weather looks mostly ${weather.forecast.map((f: any) => f.condition).join(", ")}. Format it with bullet points. Be concise.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }]
        }),
      });

      if (!res.ok) throw new Error("AI query failed");
      const data = await res.json();
      setSchedule(data.reply);
    } catch (err) {
      console.error(err);
      setSchedule("• Day 1: Water in the morning (15 mins) - heat index is moderate.\n• Day 2: Light watering if soil feels dry.\n• Day 3: Skip watering (precipitation forecasted).");
    } finally {
      setScheduleLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in py-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-[#112211]">Weather & Irrigation Advisory</h1>
        <p className="mt-1 text-sm text-[#556655]">
          Manage watering volumes dynamically depending on real-time rainfall probabilities and temperature signals.
        </p>
      </div>

      {loading ? (
        <div className="card flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38]" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Weather details */}
          <div className="card md:col-span-2 space-y-6">
            <h3 className="font-display font-bold text-base text-[#1e331b] border-b border-[#eef6eb] pb-2">
              Agricultural Forecast (Chetput, IN)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#fafcf9] border border-[#dceed5] p-4">
                <span className="text-xs font-bold text-[#7a8a7a] uppercase tracking-wider block">Specimen Temp</span>
                <span className="text-3xl font-extrabold text-[#1e331b] mt-1 block">{weather.temp}°C</span>
                <span className="text-[10px] text-[#556655] font-semibold mt-1 block">Outlook: {weather.condition}</span>
              </div>
              <div className="rounded-xl bg-[#fafcf9] border border-[#dceed5] p-4">
                <span className="text-xs font-bold text-[#7a8a7a] uppercase tracking-wider block">Rel. Humidity</span>
                <span className="text-3xl font-extrabold text-[#1e331b] mt-1 block">{weather.humidity}%</span>
                <span className="text-[10px] text-[#556655] font-semibold mt-1 block">Wind: {weather.wind} km/h</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#7a8a7a] uppercase tracking-wider block mb-2">5-Day Outlook</span>
              {weather.forecast.map((f: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center py-2 border-t border-[#eef6eb] text-sm">
                  <span className="font-semibold text-[#556655] w-24">{f.day}</span>
                  <span className="text-xs text-[#7a8a7a] flex-1">{f.condition}</span>
                  <span className="font-bold text-[#1e331b] w-12 text-right">{f.temp}°C</span>
                  <span className="text-xs text-[#4c8a38] font-bold w-20 text-right">{f.rainProb}% rain</span>
                </div>
              ))}
            </div>
          </div>

          {/* Irrigation Scheduler */}
          <div className="card space-y-4">
            <h3 className="font-display font-bold text-base text-[#1e331b] border-b border-[#eef6eb] pb-2">
              Irrigation Scheduler
            </h3>
            <p className="text-xs text-[#556655] leading-relaxed">
              Generate an irrigation schedule recommendation from local Ollama using today&apos;s weather indicators.
            </p>
            <button onClick={getWateringSchedule} disabled={scheduleLoading} className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5">
              {scheduleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Droplets className="h-4 w-4" />}
              {scheduleLoading ? "Computing Schedule..." : "Generate AI Water Schedule"}
            </button>

            {schedule && (
              <div className="rounded-xl border border-[#dceed5] bg-[#fafcf9] p-4 text-xs text-[#2d402b] space-y-2 leading-relaxed whitespace-pre-wrap animate-fade-in font-medium">
                {schedule}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 5. DEDICATED FULLSCREEN AI CHAT VIEW
// -------------------------------------------------------------
function ChatView() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const chatHistory = [...messages, userMsg];
    setMessages(chatHistory);
    setInput("");
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!res.ok) throw new Error("AI query failed");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reach local Ollama AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl py-4 flex flex-col h-[calc(100vh-140px)] animate-fade-in">
      <div className="mb-4">
        <h1 className="font-display text-3xl font-extrabold text-[#112211]">CropRescue AI Hub</h1>
        <p className="mt-1 text-sm text-[#556655]">
          A dedicated agricultural assistant powered by Ollama gemma3:1b.
        </p>
      </div>

      <div className="flex-1 card flex flex-col overflow-hidden bg-white p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafcf9]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-[#7a8a7a]">
              <BrainCircuit className="h-12 w-12 text-[#c8dfbf] mb-3" />
              <h3 className="text-sm font-bold text-[#1e331b]">Ask Anything About Crop Health</h3>
              <p className="text-xs mt-1 max-w-md">
                E.g. "What organic measures can treat tomato leaf mold?" or "What crops work well in sandy soil?"
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role !== "user" && (
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef6eb] text-[#4c8a38] font-bold">
                  <BrainCircuit className="h-4 w-4" />
                </span>
              )}
              <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] leading-relaxed ${
                m.role === "user" ? "bg-[#eef6eb] text-[#1e331b] font-medium" : "bg-white border border-[#e2edd8] text-[#2d402b] shadow-sm"
              }`}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start items-center text-xs text-[#556655]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef6eb] text-[#4c8a38] font-bold">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              <span>AI is thinking...</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-700 leading-normal items-start max-w-[80%]">
              <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold">Ollama Connection Failed</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="border-t border-[#e2edd8] bg-white p-4">
          <div className="flex items-center gap-3 rounded-full border border-[#c8dfbf] bg-[#fafcf9] px-5 py-2 focus-within:border-[#4c8a38] focus-within:bg-white transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, diseases, irrigation..."
              className="flex-1 bg-transparent text-sm text-[#1e331b] outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4c8a38] text-white hover:bg-[#396c2a] disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
