import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const FIELD_PREFIX = "enc:v1:";
const WRAP_PREFIX = "v1:";

function derivePinKey(pin: string, salt: Buffer): Buffer {
  return scryptSync(pin, salt, 32);
}

export function generateDataKey(): Buffer {
  return randomBytes(32);
}

export function wrapDataKey(pin: string, dataKey: Buffer): string {
  const salt = randomBytes(16);
  const key = derivePinKey(pin, salt);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    WRAP_PREFIX + salt.toString("hex"),
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function unwrapDataKey(pin: string, wrapped: string): Buffer | null {
  if (!wrapped.startsWith(WRAP_PREFIX)) return null;

  const parts = wrapped.slice(WRAP_PREFIX.length).split(":");
  if (parts.length !== 4) return null;

  const [saltHex, ivHex, tagHex, dataHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const key = derivePinKey(pin, salt);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    return null;
  }
}

export function encryptField(
  plaintext: string | null | undefined,
  dataKey: Buffer,
): string | null {
  if (!plaintext) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${FIELD_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(
  value: string | null | undefined,
  dataKey: Buffer,
): string | null {
  if (!value) return null;
  if (!value.startsWith(FIELD_PREFIX)) return value;

  const parts = value.slice(FIELD_PREFIX.length).split(":");
  if (parts.length !== 3) return value;

  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  try {
    const decipher = createDecipheriv("aes-256-gcm", dataKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

export function isEncryptedField(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(FIELD_PREFIX));
}
