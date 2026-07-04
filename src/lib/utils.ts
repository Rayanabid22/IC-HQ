import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PKT = "Asia/Karachi";

/** Today's date as YYYY-MM-DD in Asia/Karachi. */
export function todayPKT(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PKT }).format(new Date());
}

/** Current month as YYYY-MM in Asia/Karachi. */
export function currentMonthPKT(): string {
  return todayPKT().slice(0, 7);
}

export function daysLeftInMonthPKT(): number {
  const today = todayPKT();
  const [y, m, d] = today.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // day 0 of next month
  return lastDay - d;
}

/** date within the next 7 days (PKT), inclusive of today */
export function isThisWeekPKT(date: string): boolean {
  const today = todayPKT();
  const end = addDays(today, 7);
  return date >= today && date <= end;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isOverdue(due: string | null, status?: string): boolean {
  if (!due) return false;
  if (status === "done") return false;
  return due < todayPKT();
}

export function formatUSD(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: y !== Number(todayPKT().slice(0, 4)) ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: PKT,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`;
}

export function greetingPKT(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: PKT, hour: "numeric", hour12: false }).format(new Date())
  );
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function fullDatePKT(): string {
  return new Date().toLocaleDateString("en-US", {
    timeZone: PKT,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
