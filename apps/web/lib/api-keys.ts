import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const KEY_PREFIX = "cmp_live_";
const PREFIX_DISPLAY_LEN = KEY_PREFIX.length + 6;
const ENC_PREFIX = "enc:v1:";

/** Generates a fresh API key plus the data we persist (prefix + hash). */
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const key = `${KEY_PREFIX}${secret}`;
  return {
    key,
    prefix: key.slice(0, PREFIX_DISPLAY_LEN),
    keyHash: hashApiKey(key),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Derives the AES-256 key from the configured secret. */
function encryptionKey(): Buffer {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET is not set — it is required to encrypt and decrypt stored API keys.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext key for storage with AES-256-GCM. We still want the owner
 * to be able to re-copy their key at any time, so it is reversibly encrypted
 * (not just hashed) — but a database leak no longer exposes the cleartext.
 */
export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENC_PREFIX.slice(0, -1), // "enc:v1"
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

/**
 * Reverses {@link encryptApiKey}. Rows created before encryption stored the raw
 * key, so anything without the `enc:v1:` marker is returned unchanged.
 */
export function decryptApiKey(stored: string | null): string | null {
  if (!stored || !stored.startsWith(ENC_PREFIX)) return stored;
  const [, , ivB64, tagB64, ctB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !ctB64) return null;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
