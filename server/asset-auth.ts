import { promises as fs } from "node:fs";

function cookieValue(raw: string): string | null {
  const value = raw.trim().replace(/^\.ROBLOSECURITY\s*=\s*/, "");
  if (!value || value.length > 8192 || /[\s;\x00-\x1f\x7f]/.test(value))
    return null;
  return value;
}

export async function readRobloxSecurity(
  file: string,
  fallback?: string,
): Promise<string | null> {
  try {
    const value = cookieValue(await fs.readFile(file, "utf8"));
    if (value) return value;
  } catch {
    // The credential file is optional.
  }
  return fallback ? cookieValue(fallback) : null;
}
