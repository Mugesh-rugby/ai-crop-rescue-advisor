// src/lib/scans.ts
// All scan records stored in Firestore under "scans" collection.
// Strict per-user data isolation: every query filters by userId == current user's UID.
// Dashboard counts update in real-time via onSnapshot listener.


import {
  addDoc,
  collection,
  getDocs,
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
  crop: string;
  condition: string;
  confidence: number;
  createdAt: Timestamp;
  imageUrl?: string;
}


/** Saves one scan result to Firestore — always tagged with the authenticated user's UID. */
export async function saveScan(
  userId: string,
  result: ClassificationResult
): Promise<string> {
  // Store scans under a user-scoped subcollection to avoid composite-index requirements
  // and to make per-user access rules straightforward: /users/{userId}/scans/{scanId}
  const docRef = await addDoc(collection(db(), "users", userId, "scans"), {
    crop: result.crop,
    condition: result.condition,
    confidence: result.confidence,
    createdAt: Timestamp.now(),
  } as Omit<ScanRecord, "id" | "userId">);
  return docRef.id;
}


/** Uploads the leaf image to Firebase Storage under scans/{userId}/{scanId}.jpg */
export async function uploadScanImage(
  userId: string,
  scanId: string,
  file: Blob
): Promise<string> {
  const path = `scans/${userId}/${scanId}.jpg`;
  const storageRef = ref(storage(), path);
  await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
  return await getDownloadURL(storageRef);
}


export async function getScanImageUrl(userId: string, scanId: string): Promise<string | undefined> {
  try {
    const path = `scans/${userId}/${scanId}.jpg`;
    const storageRef = ref(storage(), path);
    return await getDownloadURL(storageRef);
  } catch {
    return undefined;
  }
}


async function tryGetScanImageUrl(userId: string, scanId?: string): Promise<string | undefined> {
  if (!scanId) return undefined;
  try {
    return await getScanImageUrl(userId, scanId);
  } catch {
    return undefined;
  }
}


/**
 * Subscribe to real-time scan updates for a specific user only.
 * Returns an unsubscribe function to clean up the listener.
 * Data is strictly filtered by userId so no cross-user data leaks.
 */
export async function loadUserScans(userId: string): Promise<ScanRecord[]> {
  const q = query(
    collection(db(), "users", userId, "scans"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  const baseScans = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ScanRecord, "id" | "userId">),
  }));


  const scans = await Promise.all(
    baseScans.map(async (scan) => ({
      ...scan,
      crop: scan.crop || scan.condition,
      imageUrl: await tryGetScanImageUrl(userId, scan.id),
    }))
  );


  return scans.map((s) => ({ ...s, userId }));
}


export function subscribeToUserScans(
  userId: string,
  callback: (scans: ScanRecord[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db(), "users", userId, "scans"),
    orderBy("createdAt", "desc")
  );


  return onSnapshot(
    q,
    async (snap) => {
      const baseScans = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ScanRecord, "id" | "userId">),
      }));


  const scans = baseScans.map((scan) => ({
    ...scan,
    crop: scan.crop || scan.condition,
  }));

  callback(scans.map((s) => ({ ...s, userId })));
    },
    (error) => {
      console.error("Firestore scan listener failed:", error);
      onError?.(error as Error);
      callback([]);
    }
  );
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
  const healthyCount = scans.filter((s) => s.condition.toLowerCase().includes("healthy")).length;
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


  return {
    totalScans,
    healthyCount,
    diseasedCount,
    recoveryRate: null,
    mostCommonCondition,
    conditionBreakdown,
    scansByDay,
  };
}
