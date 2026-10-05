import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PACK_MAGIC = Buffer.from("DLENC1");

/**
 * Encrypt a vault buffer with the session data key (AES-256-GCM).
 * Layout: magic(6) | iv(12) | tag(16) | ciphertext
 */
export function encryptVaultBuffer(plaintext: Buffer, dataKey: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([PACK_MAGIC, iv, tag, encrypted]);
}

export function decryptVaultBuffer(
  packed: Buffer,
  dataKey: Buffer,
): Buffer | null {
  if (packed.length < 6 + 12 + 16) return null;
  if (!packed.subarray(0, 6).equals(PACK_MAGIC)) return null;

  const iv = packed.subarray(6, 18);
  const tag = packed.subarray(18, 34);
  const encrypted = packed.subarray(34);

  try {
    const decipher = createDecipheriv("aes-256-gcm", dataKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    return null;
  }
}

export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
