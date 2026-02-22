import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate unique booking code (6 characters by default)
 * Uses lowercase letters and numbers (excluding l, o, 0, 1 to avoid confusion)
 * Example: a67gh3, k4m9p2
 */
export function generateBookingCode(length = 6): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789' // Exclude l,o,0,1
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
