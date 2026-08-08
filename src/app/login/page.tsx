"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { Sprout, Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInEmail, signUpEmail, signInGoogle, resetPassword } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    if (!loading && user) {
      router.replace("/?tab=dashboard");
    }
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password, name);
      }
      router.replace("/?tab=dashboard");
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong.";
      // Make Firebase errors human-readable
      if (msg.includes("user-not-found") || msg.includes("wrong-password") || msg.includes("invalid-credential")) {
        setError("Invalid email or password. Please check and try again.");
      } else if (msg.includes("email-already-in-use")) {
        setError("This email is already registered. Please sign in instead.");
      } else if (msg.includes("weak-password")) {
        setError("Password must be at least 6 characters.");
      } else if (msg.includes("popup-closed-by-user")) {
        setError("Google sign-in was cancelled.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInGoogle();
      router.replace("/?tab=dashboard");
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (!msg.includes("popup-closed-by-user")) {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address above first."); return; }
    try {
      await resetPassword(email);
      setNotice("Password reset email sent! Check your inbox.");
      setError(null);
    } catch {
      setError("Could not send reset email. Please check your email address.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f9f2]">
        <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f4f9f2]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-[#1e4620] to-[#2e6b33] p-12 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <Sprout className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight uppercase">
            AI Crop Rescue Advisor
          </span>
        </div>

        <div className="space-y-6">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Smart Farming Starts with the Right Diagnosis
          </h2>
          <p className="text-lg text-white/70 leading-relaxed">
            Upload a leaf photo, detect plant diseases instantly with AI, and get actionable treatment guidance — all in real time.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { stat: "91%", label: "Detection Accuracy" },
              { stat: "10+", label: "Disease Classes" },
              { stat: "Real-time", label: "Scan Results" },
              { stat: "Local AI", label: "Ollama Powered" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/10 p-4">
                <p className="text-2xl font-extrabold">{item.stat}</p>
                <p className="text-sm text-white/60 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/40">
          Your data is stored securely in Firebase and is completely private to your account.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef6eb]">
              <Sprout className="h-5 w-5 text-[#4c8a38]" />
            </span>
            <span className="font-display text-base font-bold text-[#1e331b] uppercase tracking-tight">
              AI Crop Rescue Advisor
            </span>
          </div>

          <div>
            <h1 className="font-display text-3xl font-extrabold text-[#112211]">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-[#556655]">
              {mode === "signin"
                ? "Sign in to access your personal farm dashboard."
                : "Join to start detecting crop diseases and tracking your farm health."}
            </p>
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#dceed5] bg-white px-4 py-3 text-sm font-semibold text-[#1e331b] shadow-sm transition hover:bg-[#f4f9f2] hover:border-[#c8dfbf] disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e2edd8]" />
            </div>
            <div className="relative flex justify-center text-xs font-semibold">
              <span className="bg-[#f4f9f2] px-3 text-[#7a8a7a] uppercase tracking-wider">or with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#556655]">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8a7a]" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-[#dceed5] bg-white py-3 pl-10 pr-4 text-sm font-medium text-[#1e331b] outline-none placeholder:text-[#aabba4] focus:border-[#4c8a38] focus:ring-2 focus:ring-[#4c8a38]/10 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#556655]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8a7a]" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#dceed5] bg-white py-3 pl-10 pr-4 text-sm font-medium text-[#1e331b] outline-none placeholder:text-[#aabba4] focus:border-[#4c8a38] focus:ring-2 focus:ring-[#4c8a38]/10 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#556655]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8a7a]" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-[#dceed5] bg-white py-3 pl-10 pr-12 text-sm font-medium text-[#1e331b] outline-none placeholder:text-[#aabba4] focus:border-[#4c8a38] focus:ring-2 focus:ring-[#4c8a38]/10 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a8a7a] hover:text-[#4c8a38]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {notice && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {notice}
              </div>
            )}

            {mode === "signin" && (
              <div className="flex justify-end">
                <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-[#4c8a38] hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4c8a38] py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396c2a] disabled:opacity-50"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
              ) : (
                <>{mode === "signin" ? "Sign In to Dashboard" : "Create Account"} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#556655]">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
              className="font-bold text-[#4c8a38] hover:underline"
            >
              {mode === "signin" ? "Create one free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
