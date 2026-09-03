import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64, SCRYPT_PARAMS).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;

  const actualHash = scryptSync(pin, salt, 64, SCRYPT_PARAMS).toString("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(actualHash, "hex"),
    );
  } catch {
    return false;
  }
}

export function validatePinFormat(pin: string): string | null {
  if (pin.length < 4) {
    return "PIN must be at least 4 characters.";
  }
  if (pin.length > 64) {
    return "PIN must be at most 64 characters.";
  }
  return null;
}
