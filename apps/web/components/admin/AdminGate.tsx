"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }

    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data: { authenticated?: boolean; enabled?: boolean }) => {
        if (!data.enabled) {
          router.replace("/admin/login?error=disabled");
          return;
        }
        if (!data.authenticated) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/admin/login"));
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  return <>{children}</>;
}
