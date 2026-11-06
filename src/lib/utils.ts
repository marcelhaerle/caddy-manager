import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(date: Date | number | null | undefined): string {
  if (!date) return "never";
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
