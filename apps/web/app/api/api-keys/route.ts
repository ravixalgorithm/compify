import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { generateApiKey } from "@/lib/api-keys";

// Columns returned to the owner. Includes the plaintext `key` so it can be
// copied at any time; the hash is never returned.
const PUBLIC_COLUMNS = "id, name, prefix, key, last_used_at, revoked_at, created_at";

async function getUserAndClient() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("api_keys")
    .select(PUBLIC_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getUserAndClient();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (name.length > 60) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }

  // One active key per user — revoke any current ones first.
  const { data: active } = await supabase
    .from("api_keys")
    .select("id")
    .is("revoked_at", null);

  if (active && active.length > 0) {
    await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .is("revoked_at", null);
  }

  const { key, prefix, keyHash } = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user.id, name, prefix, key, key_hash: keyHash })
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // `key` is returned exactly once and never stored in plaintext.
  return NextResponse.json({
    data: { ...data, key, replacedKeyId: active?.[0]?.id ?? null },
  });
}
