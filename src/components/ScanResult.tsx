"use client";

import type { ClassificationResult } from "@/lib/model";
import { getDiseaseInfo } from "@/lib/diseaseInfo";
import { AlertTriangle, CheckCircle2, Info, Loader2, Sparkles, Sprout } from "lucide-react";

interface ScanResultProps {
  result: ClassificationResult;
  dynamicDiagnosis?: {
    description: string;
    symptoms: string[];
    causes: string[];
    organicTreatment: string[];
    chemicalTreatment: string[];
    prevention: string[];
    recoveryTimeDays: [number, number];
  } | null;
  diagnosisLoading?: boolean;
}

function severityFromConfidenceAndClass(result: ClassificationResult): {
  label: "Healthy" | "Low" | "Medium" | "High" | "Critical";
  color: string;
} {
  if (result.isHealthy) return { label: "Healthy", color: "bg-green-500" };
  const c = result.confidence;
  if (c > 0.85) return { label: "Critical", color: "bg-red-600" };
  if (c > 0.65) return { label: "High", color: "bg-orange-500" };
  if (c > 0.45) return { label: "Medium", color: "bg-amber-500" };
  return { label: "Low", color: "bg-green-600" };
}

export default function ScanResult({ result, dynamicDiagnosis, diagnosisLoading }: ScanResultProps) {
  const severity = severityFromConfidenceAndClass(result);
  const staticInfo = getDiseaseInfo(result.className);

  // Determine active diagnosis source (Ollama dynamic first, static fallback second)
  const info = dynamicDiagnosis || staticInfo;
  const isDynamic = Boolean(dynamicDiagnosis);

  return (
    <div className="card space-y-6">
      {/* Result Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#eef6eb] pb-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">{result.crop}</p>
          <h2 className="font-display text-2xl font-extrabold text-[#1e331b] mt-0.5">{result.condition}</h2>
        </div>
        {result.isHealthy ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-200">
            <CheckCircle2 className="h-6 w-6" />
          </span>
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-50 text-orange-600 border border-orange-200">
            <AlertTriangle className="h-6 w-6" />
          </span>
        )}
      </div>

      {/* Confidence Level */}
      <div>
        <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">
          <span>Model Confidence</span>
          <span>{(result.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="severity-bar">
          <span className={severity.color} style={{ width: `${result.confidence * 100}%` }} />
        </div>
      </div>

      {/* Severity Indicator */}
      <div className="rounded-xl bg-[#fafcf9] border border-[#dceed5] p-3 flex gap-2.5 items-start">
        <Info className="h-4 w-4 text-[#4c8a38] mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-[#1e331b]">Severity Grade: {severity.label}</p>
          <p className="text-[10px] text-[#556655] leading-normal mt-0.5">
            Estimated from softmax prediction confidence. Visual inspection is recommended to confirm.
          </p>
        </div>
      </div>

      {/* Other Possibilities considered */}
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#7a8a7a]">Other Possibilities</p>
        <ul className="space-y-1.5 text-xs">
          {result.topK.slice(1, 4).map((k) => (
            <li key={k.className} className="flex justify-between font-semibold text-[#556655]">
              <span>{k.className.replace(/_/g, " ").replace("Tomato   ", "").split("   ").join(" — ")}</span>
              <span className="font-mono">{(k.confidence * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="furrow-divider" />

      {/* Diagnosis Details */}
      {diagnosisLoading ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4c8a38] mb-2" />
          <p className="text-xs font-bold text-[#1e331b] flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#4c8a38] animate-pulse" /> Generating Dynamic Diagnosis...
          </p>
          <p className="text-[10px] text-[#556655] mt-1">Calling local Ollama gemma3:1b model for treatment recommendations.</p>
        </div>
      ) : info ? (
        <div className="space-y-5">
          {isDynamic && (
            <div className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[9px] font-extrabold text-[#4c8a38] uppercase border border-green-200">
              <Sparkles className="h-3 w-3" /> Dynamic Ollama Diagnosis
            </div>
          )}

          <p className="text-sm leading-relaxed text-[#2d402b]">{info.description}</p>

          <Section title="Key Symptoms" items={info.symptoms} iconColor="text-orange-500" />
          <Section title="Likely Causes" items={info.causes} iconColor="text-gray-500" />
          <Section title="Organic Treatment Options" items={info.organicTreatment} iconColor="text-[#4c8a38]" />
          <Section title="Chemical Treatment Options" items={info.chemicalTreatment} iconColor="text-red-500" />
          <Section title="Prevention Practices" items={info.prevention} iconColor="text-[#4c8a38]" />

          {info.recoveryTimeDays && (
            <div className="rounded-xl border border-dashed border-[#c8dfbf] bg-[#fafcf9] p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a8a7a]">Est. Recovery Window</p>
              <p className="text-base font-extrabold text-[#396c2a] mt-0.5">
                {info.recoveryTimeDays[0]} – {info.recoveryTimeDays[1]} Days
              </p>
              <p className="text-[9px] text-[#556655] mt-0.5">With structured application of above treatment plans.</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#7a8a7a] font-semibold text-center py-4">
          No treatment information found. Train the model or configure Ollama for dynamic content generation.
        </p>
      )}
    </div>
  );
}

function Section({ title, items, iconColor }: { title: string; items: string[]; iconColor: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold uppercase tracking-wider text-[#1e331b]">{title}</p>
      <ul className="space-y-1 text-sm text-[#556655]">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${iconColor || "bg-[#4c8a38]"}`} />
            <span className="leading-tight">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
