import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    authenticated: Boolean(user),
    email: user?.email ?? null,
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          avatarUrl:
            user.user_metadata?.custom_avatar_url ??
            user.user_metadata?.avatar_url ??
            null,
        }
      : null,
  });
}
