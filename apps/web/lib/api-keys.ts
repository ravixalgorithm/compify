import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "cmp_live_";
const PREFIX_DISPLAY_LEN = KEY_PREFIX.length + 6;

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
