"use client";

import { useEffect, useState } from "react";
import { getCopyQuota, onQuotaChanged, formatResetIn, type CopyQuota } from "@/lib/quota";
import { cn } from "@/lib/cn";

/**
 * Segmented meter of the user's remaining daily copy/MCP allowance, shown in the
 * Profile modal. Filled segments = copies still available today; they deplete as
 * the user copies (website) or fetches via MCP. When the limit is spent, a live
 * countdown shows how long until it restores. Admins see "Unlimited".
 */
export function CopyQuotaMeter() {
  const [quota, setQuota] = useState<CopyQuota | null>(null);
  // Ticks so the countdown stays current while the modal is open.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = () => {
      void getCopyQuota().then((q) => {
        if (active) setQuota(q);
      });
    };
    load();
    const off = onQuotaChanged(load);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      active = false;
      off();
      window.clearInterval(tick);
    };
  }, []);

  if (!quota) return null;

  const header = (
    <span className="text-[14px] leading-[20px] tracking-[-0.42px] text-white">Daily copies</span>
  );

  if (quota.unlimited) {
    return (
      <div className="flex w-full flex-col gap-[8px]">
        <div className="flex items-center justify-between">
          {header}
          <span className="text-[12px] leading-[16px] tracking-[-0.36px] text-[#878787]">
            Unlimited · admin
          </span>
        </div>
        <div className="flex w-full gap-[3px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="h-[8px] flex-1 rounded-[2px] bg-accent" />
          ))}
        </div>
      </div>
    );
  }

  const limit = quota.limit ?? 0;
  const used = Math.min(Math.max(quota.used, 0), limit);
  const remaining = quota.remaining ?? Math.max(limit - used, 0);
  const resetIn = formatResetIn(quota.reset_at, now);
  const spent = remaining === 0;

  return (
    <div className="flex w-full flex-col gap-[8px]">
      <div className="flex items-center justify-between">
        {header}
        <span className="text-[12px] leading-[16px] tracking-[-0.36px] text-[#878787]">
          {remaining} of {limit} left
        </span>
      </div>
      <div className="flex w-full gap-[3px]">
        {Array.from({ length: limit }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-[8px] flex-1 rounded-[2px] transition-colors",
              i < remaining ? "bg-accent" : "bg-[#2b2b2b]",
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          "text-[12px] leading-[16px] tracking-[-0.36px]",
          spent ? "text-[#ff8a3d]" : "text-[#878787]",
        )}
      >
        {spent
          ? resetIn
            ? `Limit reached — restores in ${resetIn}.`
            : "Limit reached — restores tomorrow."
          : resetIn
            ? `${used} used today · restores in ${resetIn}.`
            : `${used} used today · resets daily.`}
      </p>
    </div>
  );
}
