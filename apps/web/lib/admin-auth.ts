import { cookies } from "next/headers";
import { ADMIN_COOKIE, readAdminCookie } from "@/lib/admin-session";

const DEV_DEFAULT_TOKEN = "compify-admin";

/** Server-side admin gate for publish API routes. */
export function getAdminToken(): string | undefined {
  const fromEnv = process.env.COMPIFY_ADMIN_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  // Local dev works out of the box; production must set COMPIFY_ADMIN_TOKEN.
  if (process.env.NODE_ENV === "development") return DEV_DEFAULT_TOKEN;
  return undefined;
}

export function isAdminEnabled(): boolean {
  return Boolean(getAdminToken());
}

export function verifyAdminToken(value: string | null | undefined): boolean {
  const expected = getAdminToken();
  if (!expected || !value) return false;
  return value === expected;
}

export function resolveAdminToken(request: Request): string | null {
  const header = request.headers.get("x-admin-token");
  if (header) return header;
  return readAdminCookie(request.headers.get("cookie"));
}

export function resolveAdminTokenFromCookies(): string | null {
  return cookies().get(ADMIN_COOKIE)?.value ?? null;
}

export function isRequestAuthenticated(request: Request): boolean {
  return verifyAdminToken(resolveAdminToken(request));
}

export function isCookieAuthenticated(): boolean {
  return verifyAdminToken(resolveAdminTokenFromCookies());
}
