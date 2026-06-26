// Manage admin access for the Compify panel.
//
// Admin = a Supabase user whose app_metadata.is_admin is true (app_metadata is
// server-only, so users can't grant themselves access). There is no password.
//
//   List users:        pnpm tsx scripts/set-admin.ts --list
//   Grant admin:        pnpm tsx scripts/set-admin.ts you@example.com
//   Revoke admin:       pnpm tsx scripts/set-admin.ts you@example.com --revoke
//
// Run from the repo root. Uses SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const text = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const args = process.argv.slice(2);
  const list = args.includes("--list");
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"))?.toLowerCase();

  // listUsers is paginated; pull a few pages to be safe for small projects.
  const users: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) { console.error(error.message); process.exit(1); }
    users.push(...data.users);
    if (data.users.length < 200) break;
  }

  if (list || !email) {
    console.log(`\n${users.length} user(s):\n`);
    for (const u of users) {
      const meta = u.app_metadata ?? {};
      const isAdmin = meta.is_admin === true || meta.role === "admin";
      console.log(`${isAdmin ? "★ ADMIN" : "       "}  ${(u.email ?? "(no email)").padEnd(34)}  ${u.id}`);
    }
    if (!email) {
      console.log("\nTo grant: pnpm tsx scripts/set-admin.ts <email>");
      return;
    }
  }

  const target = users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (!target) {
    console.error(`\nNo user with email ${email}. They must sign in once (Google/email) first so the account exists.`);
    process.exit(1);
  }

  const { error } = await db.auth.admin.updateUserById(target.id, {
    app_metadata: { ...(target.app_metadata ?? {}), is_admin: !revoke },
  });
  if (error) { console.error(error.message); process.exit(1); }
  console.log(`\n${revoke ? "Revoked" : "Granted"} admin for ${email}. They may need to sign out/in for the change to take effect.`);
}

main();
