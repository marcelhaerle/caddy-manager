import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(
  date: Date | number | string | null | undefined
): string {
  if (!date) return "never";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "invalid date";
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
