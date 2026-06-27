"use client";

import { useEffect, useMemo, useState } from "react";
import { RiCheckLine, RiCloseLine } from "@remixicon/react";
import * as Modal from "@/components/ui/modal";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/components/AuthProvider";

/** Figma 256:1654 — Share Feedback modal. */
export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setSubmitting(false);
      setSent(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        message: trimmed,
      });
      if (insertError) throw insertError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <Modal.Content
        showClose={false}
        zIndexClass="z-[120]"
        className="flex w-[480px] flex-col gap-[28px] overflow-hidden bg-[#1b1b1b] p-[26px] font-mono"
      >
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col gap-[8px]">
            <Modal.Title className="text-[20px] font-normal leading-normal tracking-[-0.6px] text-white">
              Share Feedback
            </Modal.Title>
            <Modal.Description className="w-[392px] max-w-full text-[14px] font-normal leading-normal tracking-[-0.42px] text-[#b8b8b8]">
              Share your thoughts, ideas, or report an issue.
            </Modal.Description>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-press ui-micro flex shrink-0 items-center justify-center rounded-[6px] p-[2px] text-[#b8b8b8] hover:text-white"
          >
            <RiCloseLine size={20} />
          </button>
        </div>

        {sent ? (
          <>
            <div className="flex w-full flex-col items-center justify-center gap-[10px] py-[28px]">
              <span className="flex size-[40px] items-center justify-center rounded-full bg-[#2b2b2b] text-[#4ade80]">
                <RiCheckLine size={22} />
              </span>
              <div className="flex flex-col items-center gap-[4px] text-center">
                <p className="text-[14px] tracking-[-0.42px] text-white">Thanks for your feedback!</p>
                <p className="max-w-[320px] text-[13px] leading-[18px] tracking-[-0.39px] text-[#b8b8b8]">
                  We review every submission and use it to keep improving the platform.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-press ui-micro flex w-full items-center justify-center bg-white px-[12px] py-[9px] text-[14px] font-medium tracking-[-0.42px] text-black hover:bg-white/90"
            >
              Done
            </button>
          </>
        ) : (
          <>
            <div className="flex w-full flex-col gap-[8px]">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your feedback..."
                autoFocus
                className="h-[121px] w-full resize-none bg-[#2b2b2b] py-[8px] pl-[12px] pr-[10px] text-[14px] leading-[20px] tracking-[-0.42px] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)] outline-none placeholder:text-[#b8b8b8]"
              />
              {error ? <p className="text-[13px] text-[#ff6b6b]">{error}</p> : null}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="ui-press ui-micro flex w-full items-center justify-center bg-white px-[12px] py-[9px] text-[14px] font-medium tracking-[-0.42px] text-black hover:bg-white/90 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Continue"}
            </button>
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}
