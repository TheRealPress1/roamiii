import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely get a display name from a user/profile object.
 * Falls back through name -> email username -> fallback string.
 */
export function getDisplayName(
  user: { name?: string | null; email?: string | null } | null | undefined,
  fallback = 'Unknown'
): string {
  if (!user) return fallback;
  if (user.name) return user.name;
  if (user.email) return user.email.split('@')[0];
  return fallback;
}
