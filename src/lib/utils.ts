import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Display imported names without punctuation used as visual separators.
// Stored names, taxonomy values and request payloads retain their original values.
export function displayName(value?: string) {
  return (value || "")
    .replace(/\s*[·ㆍ]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
