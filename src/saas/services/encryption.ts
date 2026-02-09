import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * AES-256-GCM encryption for sensitive credentials (OAuth tokens, channel secrets).
 *
 * Format: base64(iv + ciphertext + authTag)
 * - iv: 12 bytes
 * - authTag: 16 bytes
 *
 * When no encryption key is configured, values pass through unencrypted
 * with a "plain:" prefix so we can distinguish them on decryption.
 */

let _warnedNoKey = false;

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.OPENCLAW_ENCRYPTION_KEY;
  if (!keyHex) {
    if (!_warnedNoKey) {
      _warnedNoKey = true;
      if (process.env.NODE_ENV === "production") {
        console.error(
          "\n[SECURITY] WARNING: OPENCLAW_ENCRYPTION_KEY is not set. " +
            "OAuth tokens and channel secrets will be stored unencrypted.\n" +
            "Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n",
        );
      } else {
        console.warn(
          "[saas-encryption] No OPENCLAW_ENCRYPTION_KEY set. Credentials stored unencrypted (dev mode).",
        );
      }
    }
    return null;
  }
  const buf = Buffer.from(keyHex, "hex");
  if (buf.length !== 32) {
    throw new Error(
      "OPENCLAW_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        `Got ${keyHex.length} hex chars (${buf.length} bytes).`,
    );
  }
  return buf;
}

/**
 * Encrypt a plaintext string. Returns a prefixed encoded string.
 * If no encryption key is set, returns "plain:<value>" (for dev/migration).
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  if (!key) {
    // No key configured — store as-is with prefix so decrypt knows it's unencrypted
    return `plain:${plaintext}`;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // iv (12) + ciphertext + tag (16)
  const combined = Buffer.concat([iv, encrypted, tag]);
  return `enc:${combined.toString("base64")}`;
}

/**
 * Decrypt an encrypted string. Handles both "enc:" and "plain:" prefixes,
 * as well as legacy unencrypted values (no prefix).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Unencrypted plaintext (dev mode or pre-encryption data)
  if (ciphertext.startsWith("plain:")) {
    return ciphertext.slice(6);
  }

  // Legacy: no prefix means it was stored before encryption was added
  if (!ciphertext.startsWith("enc:")) {
    return ciphertext;
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      "Cannot decrypt: OPENCLAW_ENCRYPTION_KEY is not set but data is encrypted. " +
        "Set the encryption key to the same value used during encryption.",
    );
  }

  const combined = Buffer.from(ciphertext.slice(4), "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Encrypt all sensitive fields in a channel config object.
 * Sensitive keys: anything containing "token", "secret", "password", "key" (case-insensitive).
 */
export function encryptChannelConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && isSensitiveKey(key)) {
      result[key] = encrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Decrypt all sensitive fields in a channel config object.
 */
export function decryptChannelConfig(config: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && isSensitiveKey(key)) {
      result[key] = decrypt(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("key")
  );
}

/**
 * Generate a random 256-bit encryption key (for initial setup).
 * Returns a 64-character hex string.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
