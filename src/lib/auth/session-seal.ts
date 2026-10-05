import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const SEAL_PREFIX = "sk1:";

/** Seal the vault data key with the session token so DB theft alone is not enough. */
export function sealSessionDataKey(token: string, dataKey: Buffer): string {
  const key = scryptSync(token, "dm-session-seal-v1", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    SEAL_PREFIX + iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function unsealSessionDataKey(
  token: string,
  sealed: string,
): Buffer | null {
  // Legacy: plain base64 from older builds
  if (!sealed.startsWith(SEAL_PREFIX) && !sealed.includes(":")) {
    try {
      return Buffer.from(sealed, "base64");
    } catch {
      return null;
    }
  }

  if (!sealed.startsWith(SEAL_PREFIX)) return null;
  const parts = sealed.slice(SEAL_PREFIX.length).split(":");
  if (parts.length !== 3) return null;

  const [ivHex, tagHex, dataHex] = parts;
  const key = scryptSync(token, "dm-session-seal-v1", 32);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    return null;
  }
}
