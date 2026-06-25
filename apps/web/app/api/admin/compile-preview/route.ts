import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/server/require-admin";
import { compileComponent } from "@/lib/server/compile-component";

// Compiles draft source on demand so the admin form can preview an uploaded
// component live BEFORE publishing — without writing anything to Storage/DB.
// The client turns the returned code into a blob URL and renders it via
// DynamicComponent. Admin-only; Node runtime (esbuild).
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  let body: { source?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const source = body.source ?? "";
  if (!source.trim()) {
    return NextResponse.json({ error: "Source is required." }, { status: 400 });
  }

  try {
    const compiled = await compileComponent({ source, slug: body.slug || "preview" });
    if (!compiled.ok) {
      return NextResponse.json({ ok: false, error: compiled.error }, { status: 200 });
    }
    return NextResponse.json({ ok: true, code: compiled.code, warnings: compiled.warnings });
  } catch (err) {
    // Surface the real reason (e.g. esbuild binary/init) instead of a blank 500.
    const message = err instanceof Error ? err.message : "Compile failed.";
    console.error("[compile-preview]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
