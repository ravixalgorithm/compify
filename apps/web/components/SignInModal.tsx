"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toastSuccess } from "@/components/ui/sonner";
import * as Modal from "@/components/ui/modal";
import { fadeSlideVariants, microTransition } from "@/lib/motion";
import { createClient } from "@/utils/supabase/client";

type Step = "sign-in" | "check-inbox";

function isGmailAddress(email: string) {
  return /@(gmail|googlemail)\.com$/i.test(email);
}

// Throttle magic-link sends per email to protect the daily email quota (Resend
// caps at 100/day). Persisted in localStorage so a reload can't reset it.
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const COOLDOWN_KEY_PREFIX = "compify-magiclink-cooldown:";

function cooldownStorageKey(email: string) {
  return `${COOLDOWN_KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function readCooldownUntil(email: string): number {
  try {
    const raw = window.localStorage.getItem(cooldownStorageKey(email));
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function startCooldown(email: string): number {
  const until = Date.now() + RESEND_COOLDOWN_MS;
  try {
    window.localStorage.setItem(cooldownStorageKey(email), String(until));
  } catch {
    /* ignore */
  }
  return until;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CheckInboxStep({
  email,
  sending,
  error,
  cooldownUntil,
  onBack,
  onResend,
}: {
  email: string;
  sending: boolean;
  error: string | null;
  cooldownUntil: number;
  onBack: () => void;
  onResend: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)),
  );

  useEffect(() => {
    function tick() {
      setRemaining(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const onCooldown = remaining > 0;

  return (
    <div className="flex w-full flex-col gap-[18px]">
      <button
        type="button"
        onClick={onBack}
        className="ui-micro flex min-h-[32px] items-center justify-center gap-[2px] self-start rounded-[19px] py-[6px] text-sm tracking-[-0.42px] text-muted hover:text-white"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/icons/chevron-left.svg" alt="" className="size-4 shrink-0" />
        Go Back
      </button>

      <div className="flex w-full flex-col gap-[14px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/icons/check-inbox.png"
          alt=""
          className="h-[69px] w-[83px] shrink-0"
        />

        <div className="flex w-full flex-col gap-2">
          <h3 className="text-xl font-medium tracking-[-0.6px] text-white">
            Check your inbox
          </h3>
          <p className="text-base leading-5 tracking-[-0.48px] text-muted">
            An activation link has been sent to your email address:{" "}
            <span className="font-medium text-white">{email}</span>
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        {isGmailAddress(email) ? (
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-micro flex w-full items-center justify-center bg-[#2b2b2b] py-[10px] pl-[10px] pr-4 font-mono text-sm font-medium tracking-[-0.42px] text-white hover:bg-[#333]"
          >
            Open Gmail
          </a>
        ) : (
          <button
            type="button"
            onClick={() => window.open(`mailto:${email}`, "_blank")}
            className="ui-micro flex w-full items-center justify-center bg-[#2b2b2b] py-[10px] pl-[10px] pr-4 font-mono text-sm font-medium tracking-[-0.42px] text-white hover:bg-[#333]"
          >
            Open email app
          </button>
        )}

        <p className="text-sm tracking-[-0.42px] text-muted">
          Didn&apos;t get the email?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={sending || onCooldown}
            className="font-medium text-white hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending
              ? "Sending…"
              : onCooldown
                ? `Resend in ${formatCountdown(remaining)}`
                : "Resend"}
          </button>
        </p>

        {error ? <p className="text-xsm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

export function SignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("sign-in");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep("sign-in");
      setEmail("");
      setError(null);
      setSending(false);
      setCooldownUntil(0);
    }
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  async function signInWithGoogle() {
    setSending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
      // On success the browser is redirected to Google, so nothing else runs here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google.");
      setSending(false);
    }
  }

  async function sendMagicLink(targetEmail: string): Promise<boolean> {
    setSending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (otpError) throw otpError;

      setEmail(targetEmail);
      setCooldownUntil(startCooldown(targetEmail));
      setStep("check-inbox");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send verification email.");
      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (sending) return;
    // Guard against sending while still within the cooldown window.
    if (readCooldownUntil(email) > Date.now()) return;
    const sent = await sendMagicLink(email);
    if (sent) toastSuccess("Verification email resent");
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const target = email.trim();
    if (!target) {
      setError("Enter your email address.");
      return;
    }
    const until = readCooldownUntil(target);
    if (until > Date.now()) {
      // A link was sent to this address within the cooldown window — show the
      // inbox screen with the remaining timer instead of sending another email.
      setEmail(target);
      setCooldownUntil(until);
      setStep("check-inbox");
      return;
    }
    await sendMagicLink(target);
  }

  return (
    <Modal.Root open={open} onOpenChange={handleOpenChange}>
      <Modal.Content
        showClose={false}
        className="flex w-[413px] flex-col gap-[28px] overflow-hidden bg-[#1b1b1b] p-[28px] font-mono shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === "sign-in" ? (
            <motion.div
              key="sign-in"
              variants={fadeSlideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={microTransition}
              className="flex w-full flex-col gap-[28px]"
            >
              <div className="flex w-full flex-col gap-[4px]">
                <Modal.Title
                  id="sign-in-title"
                  className="text-[26px] font-semibold leading-[1.25] tracking-[-0.78px] text-white"
                >
                  Let&apos;s get started.
                </Modal.Title>
                <Modal.Description className="text-[14px] font-normal leading-[1.5] tracking-[-0.42px] text-[#b8b8b8]">
                  Sign in or create new account
                </Modal.Description>
              </div>

              <form className="flex w-full flex-col gap-[14px]" onSubmit={handleContinue}>
                <div className="flex w-full flex-col gap-[18px]">
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void signInWithGoogle()}
                    className="ui-press ui-micro flex w-full items-center justify-center gap-[8px] overflow-hidden bg-white py-[10px] pl-[10px] pr-[16px] disabled:opacity-60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/icons/google.svg" alt="" className="size-[16px] shrink-0" />
                    <span className="whitespace-nowrap text-[14px] font-normal tracking-[-0.42px] text-black">
                      Continue with Google
                    </span>
                  </button>

                  <div className="flex h-[16px] w-full items-center">
                    <div className="h-px min-w-px flex-1 border-t border-[#4e4e4e]" />
                    <span className="shrink-0 px-[8px] pb-[0.5px] text-[12px] font-normal tracking-[-0.36px] text-[#b8b8b8]">
                      OR
                    </span>
                    <div className="h-px min-w-px flex-1 border-t border-[#4e4e4e]" />
                  </div>

                  <label className="flex w-full flex-col gap-[4px]">
                    <span className="flex items-center gap-px text-[14px] font-medium leading-[20px]">
                      <span className="tracking-[-0.42px] text-white">Email</span>
                      <span className="font-sans tracking-[-0.084px] text-[#f33]">*</span>
                    </span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="steve@apple.com"
                      className="w-full bg-[#2b2b2b] py-[10px] pl-[12px] pr-[10px] text-[14px] font-normal leading-[20px] tracking-[-0.42px] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)] outline-none placeholder:text-[#a3a3a3]"
                    />
                  </label>
                </div>

                {error ? <p className="text-[13px] text-red-400">{error}</p> : null}

                <button
                  type="submit"
                  disabled={sending}
                  className="ui-micro flex w-full items-center justify-center overflow-hidden bg-[#2b2b2b] py-[10px] pl-[10px] pr-[16px] text-[14px] font-medium leading-[20px] tracking-[-0.42px] text-white hover:bg-[#333] disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Continue"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="check-inbox"
              variants={fadeSlideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={microTransition}
            >
              <CheckInboxStep
                email={email}
                sending={sending}
                error={error}
                cooldownUntil={cooldownUntil}
                onBack={() => {
                  setStep("sign-in");
                  setError(null);
                }}
                onResend={handleResend}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Modal.Content>
    </Modal.Root>
  );
}
