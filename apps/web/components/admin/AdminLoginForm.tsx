"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    errorParam === "disabled"
      ? "Admin login is not set up on this server yet. Ask the developer to configure it."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sign in failed.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="w-full max-w-[400px] border border-stroke bg-surface p-8">
        <div className="mb-8 flex flex-col gap-3">
          <Logo />
          <h1 className="text-xl font-medium tracking-tight text-white">Admin sign in</h1>
          <p className="text-[13px] leading-relaxed text-muted">
            Manage marketplace components, thumbnails, and listings from one place.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-[12px] uppercase tracking-[-0.24px] text-muted">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-stroke bg-black px-3 py-2.5 text-[14px] text-white outline-none focus:border-stroke-hover"
              placeholder="Enter admin password"
              autoFocus
            />
          </label>

          {error ? <p className="text-[13px] text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex h-10 w-full items-center justify-center gap-2 bg-white text-[14px] font-medium text-black transition hover:bg-white/90 disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
