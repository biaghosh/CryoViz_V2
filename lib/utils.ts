import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function getInitials(name: string): string {
  if (!name) return "CV"; // Fallback for empty names
  // Extract first character of first name and first character of last name
  const initials = `${name[0]}`;
  return initials.toUpperCase();
}