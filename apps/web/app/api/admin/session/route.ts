import { NextResponse } from "next/server";
import {
  getAdminToken,
  isAdminEnabled,
  isCookieAuthenticated,
  isRequestAuthenticated,
  verifyAdminToken,
} from "@/lib/admin-auth";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/admin-session";

export async function GET(request: Request) {
  const enabled = isAdminEnabled();
  const authenticated =
    enabled && (isRequestAuthenticated(request) || isCookieAuthenticated());

  return NextResponse.json({ enabled, authenticated });
}

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin login is not configured on this server." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { password?: string };
  const password = body.password?.trim() ?? "";

  if (!verifyAdminToken(password)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, getAdminToken()!, adminCookieOptions());
  return response;
}
