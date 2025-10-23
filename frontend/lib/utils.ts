import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility function for merging Tailwind CSS classes
// Used extensively with Shadcn UI components
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to readable string
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format fit score to percentage
export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

// Truncate text to specified length
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

