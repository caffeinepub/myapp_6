/**
 * Generate a random session token using crypto.randomUUID()
 */
export function generateSessionToken(): string {
  return crypto.randomUUID();
}

/**
 * SHA-256 hash using browser SubtleCrypto, returns hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Format serial number as padded string e.g. #00123
 */
export function formatSerial(serial: bigint): string {
  return `#${serial.toString().padStart(5, "0")}`;
}

/**
 * Parse serial from string input, strips # prefix
 */
export function parseSerial(input: string): bigint | null {
  const cleaned = input.replace(/^#/, "").trim();
  if (!/^\d+$/.test(cleaned)) return null;
  try {
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

/**
 * Format timestamp (nanoseconds bigint) to readable time
 */
export function formatTimestamp(nanos: bigint): string {
  const ms = Number(nanos) / 1_000_000;
  const date = new Date(ms);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Calculate days remaining on a ban
 */
export function banDaysRemaining(banExpiryNanos: bigint): number {
  const expiryMs = Number(banExpiryNanos) / 1_000_000;
  const diff = expiryMs - Date.now();
  return Math.ceil(diff / 86_400_000);
}
