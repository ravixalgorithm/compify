"use client";

import { useCallback, useState } from "react";
import { useOptionalAuth } from "@/components/AuthProvider";

/**
 * Copy-to-clipboard with a transient "copied" flag for button feedback.
 *
 * Copying is gated behind auth: signed-out users get the sign-in modal instead
 * of the copied text (every copy surface in the app is a component or MCP
 * payload, both of which require an account). `copy` resolves to `true` when the
 * text was actually copied, `false` when the action was gated.
 */
export function useClipboard(timeout = 1800) {
  const [copied, setCopied] = useState(false);
  const auth = useOptionalAuth();

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Gate when we have an auth context and there's no signed-in user.
      if (auth && !auth.user) {
        auth.openSignIn();
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for non-secure contexts.
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), timeout);
      return true;
    },
    [timeout, auth],
  );

  return { copied, copy };
}
