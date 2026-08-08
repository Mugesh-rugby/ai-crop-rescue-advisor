// src/lib/scans.ts
// All scan records stored in Firestore under "scans" collection.
// Strict per-user data isolation: every query filters by userId == current user's UID.
// Dashboard counts update in real-time via onSnapshot listener.

import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { ClassificationResult } from "./model";

export interface ScanRecord {
  id?: string;
  userId: string;
  imageUrl: string;
  className: string;
  crop: string;
  condition: string;
  isHealthy: boolean;
  confidence: number;
  topK: { className: string; confidence: number }[];
  createdAt: Timestamp;
}

/** Uploads the leaf image to Firebase Storage under scans/{userId}/... */
export async function uploadScanImage(userId: string, file: Blob): Promise<string> {
  const path = `scans/${userId}/${Date.now()}.jpg`;
  const storageRef = ref(storage(), path);
  try {
    await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
    return await getDownloadURL(storageRef);
  } catch (err: any) {
    // Provide a clearer error so UI can guide the developer to fix bucket CORS/config
    const message = err?.message || String(err) || "Unknown storage error";
    throw new Error(
      `Storage upload failed: ${message}. If this occurs in the browser, configure your Firebase Storage CORS to allow requests from your origin (e.g., http://localhost:3000). See https://firebase.google.com/docs/storage/web/download-files#cors for guidance.`
    );
  }
}

/** Saves one scan result to Firestore — always tagged with the authenticated user's UID. */
export async function saveScan(
  userId: string,
  imageUrl: string,
  result: ClassificationResult
): Promise<string> {
  // Store scans under a user-scoped subcollection to avoid composite-index requirements
  // and to make per-user access rules straightforward: /users/{userId}/scans/{scanId}
  const docRef = await addDoc(collection(db(), "users", userId, "scans"), {
    // keep only essential fields to reduce storage and bandwidth
    imageUrl,
    className: result.className,
    crop: result.crop,
    condition: result.condition,
    isHealthy: result.isHealthy,
    confidence: result.confidence,
    createdAt: Timestamp.now(),
  } as Omit<ScanRecord, "id" | "userId">);
  return docRef.id;
}

/**
 * Subscribe to real-time scan updates for a specific user only.
 * Returns an unsubscribe function to clean up the listener.
 * Data is strictly filtered by userId so no cross-user data leaks.
 */
export function subscribeToUserScans(
  userId: string,
  callback: (scans: ScanRecord[]) => void
): Unsubscribe {
  // Query the user's scans subcollection — no where() needed which avoids composite index errors.
  const q = query(
    collection(db(), "users", userId, "scans"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const scans = snap.docs.map((d) => ({
      id: d.id,
      // data shape matches the reduced payload we save above
      ...(d.data() as Omit<ScanRecord, "id" | "userId">),
    }));
    callback(scans.map((s) => ({ ...s, userId })));
  });
}

export interface DashboardStats {
  totalScans: number;
  healthyCount: number;
  diseasedCount: number;
  recoveryRate: number | null;
  mostCommonCondition: { condition: string; count: number } | null;
  conditionBreakdown: { condition: string; count: number }[];
  scansByDay: { date: string; count: number }[];
}

export function computeDashboardStats(scans: ScanRecord[]): DashboardStats {
  const totalScans = scans.length;
  const healthyCount = scans.filter((s) => s.isHealthy).length;
  const diseasedCount = totalScans - healthyCount;

  const conditionCounts = new Map<string, number>();
  for (const s of scans) {
    conditionCounts.set(s.condition, (conditionCounts.get(s.condition) ?? 0) + 1);
  }
  const conditionBreakdown = Array.from(conditionCounts.entries())
    .map(([condition, count]) => ({ condition, count }))
    .sort((a, b) => b.count - a.count);

  const mostCommonCondition = conditionBreakdown[0] ?? null;

  const dayCounts = new Map<string, number>();
  for (const s of scans) {
    const date = s.createdAt.toDate().toISOString().slice(0, 10);
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
  }
  const scansByDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const recoveryRate = totalScans >= 2 ? computeRecoveryRate(scans) : null;

  return {
    totalScans,
    healthyCount,
    diseasedCount,
    recoveryRate,
    mostCommonCondition,
    conditionBreakdown,
    scansByDay,
  };
}

function computeRecoveryRate(scans: ScanRecord[]): number | null {
  const byCrop = new Map<string, ScanRecord[]>();
  for (const s of scans) {
    const arr = byCrop.get(s.crop) ?? [];
    arr.push(s);
    byCrop.set(s.crop, arr);
  }

  let tracked = 0;
  let recovered = 0;
  for (const cropScans of byCrop.values()) {
    const sorted = [...cropScans].sort(
      (a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()
    );
    const firstDiseasedIdx = sorted.findIndex((s) => !s.isHealthy);
    if (firstDiseasedIdx === -1) continue;
    tracked++;
    const laterHealthy = sorted.slice(firstDiseasedIdx + 1).some((s) => s.isHealthy);
    if (laterHealthy) recovered++;
  }

  if (tracked === 0) return null;
  return recovered / tracked;
}
