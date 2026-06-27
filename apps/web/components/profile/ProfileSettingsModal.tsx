"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toastSuccess } from "@/components/ui/sonner";
import {
  RiAccountCircleLine,
  RiCloseLine,
  RiLogoutBoxRLine,
  RiPlugLine,
} from "@remixicon/react";
import * as Modal from "@/components/ui/modal";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "@/components/AuthProvider";
import { cn } from "@/lib/cn";
import { ApiKeysPanel } from "./ApiKeysPanel";
import { CopyQuotaMeter } from "./CopyQuotaMeter";

type SettingsTab = "account" | "api-keys";

function displayNameFromEmail(email: string | null) {
  const local = email?.split("@")[0] || "User";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ui-micro flex w-full items-center gap-[8px] px-[12px] py-[9px] text-left",
        active ? "bg-[#242424] text-white" : "bg-transparent text-[#b8b8b8] hover:text-white",
      )}
    >
      <span className="flex shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate text-[14px] tracking-[-0.42px]">{label}</span>
    </button>
  );
}

export function ProfileSettingsModal({
  open,
  onClose,
  initialTab = "account",
}: {
  open: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const { user, signOut } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [name, setName] = useState("");
  const [original, setOriginal] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setError(null);
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const meta = data.user.user_metadata ?? {};
      const fullName = (meta.full_name as string) ?? (meta.name as string) ?? "";
      setName(fullName);
      setOriginal(fullName);
      setAvatarPreview(
        (meta.custom_avatar_url as string) ??
          (meta.avatar_url as string) ??
          (meta.picture as string) ??
          null,
      );
      setPendingAvatarFile(null);
    });
    return () => {
      active = false;
    };
  }, [open, initialTab, supabase]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be under 8MB.");
      return;
    }
    setError(null);
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (pendingAvatarFile) {
        const ext = pendingAvatarFile.name.split(".").pop() || "png";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, pendingAvatarFile, { upsert: true });
        if (uploadError) {
          throw new Error(
            `Avatar upload failed (${uploadError.message}). Is the "avatars" storage bucket created?`,
          );
        }
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          name: name.trim(),
          // Store under a custom key so OAuth sign-in (Google) — which refreshes
          // user_metadata from the provider on every login — can't overwrite it.
          ...(avatarUrl ? { custom_avatar_url: avatarUrl } : {}),
        },
      });
      if (updateError) throw updateError;

      setOriginal(name.trim());
      setPendingAvatarFile(null);
      router.refresh();
      toastSuccess("Profile saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      onClose();
    } finally {
      setSigningOut(false);
    }
  }

  const rowName = (name.trim() || user?.name || displayNameFromEmail(user?.email ?? null)).split(
    " ",
  )[0];
  const initial = rowName[0]?.toUpperCase() ?? "U";
  const dirty = name.trim() !== original || pendingAvatarFile !== null;

  return (
    <Modal.Root open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <Modal.Content
        showClose={false}
        className="flex h-[460px] max-h-[calc(100vh-2rem)] w-[709px] max-w-[calc(100vw-2rem)] flex-col gap-[10px] overflow-hidden bg-[#0f0f0f] px-[12px] py-[10px] font-mono shadow-[0px_4px_2px_rgba(0,0,0,0.25)] sm:h-[383px] sm:flex-row"
      >
        {/* Left — settings nav */}
        <aside className="flex w-full shrink-0 flex-col gap-[14px] pt-[14px] sm:w-[216px]">
          <p className="pl-[14px] text-[12px] uppercase tracking-[-0.24px] text-white">Settings</p>
          <nav className="flex w-full flex-col gap-[2px]">
            <NavItem
              active={tab === "account"}
              icon={<RiAccountCircleLine size={18} />}
              label="Account Settings"
              onClick={() => setTab("account")}
            />
            <NavItem
              active={tab === "api-keys"}
              icon={<RiPlugLine size={18} />}
              label="API Integration"
              onClick={() => setTab("api-keys")}
            />
          </nav>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="ui-micro mt-auto flex w-full items-center gap-[8px] px-[12px] py-[9px] text-left text-[#ff6b6b] hover:text-[#ff4d4d] disabled:opacity-60"
          >
            <RiLogoutBoxRLine size={18} className="shrink-0" />
            <span className="truncate text-sm tracking-[-0.42px]">
              {signingOut ? "Signing out…" : "Log out"}
            </span>
          </button>
        </aside>

        {/* Right — content pane */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col justify-between overflow-hidden bg-[#1b1b1b] px-[12px] pb-[12px] pt-[6px] sm:h-full">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ui-press ui-micro absolute right-[12px] top-[6px] z-10 flex items-center justify-center bg-[#252525] p-[2px] text-[#b8b8b8] hover:text-white"
          >
            <RiCloseLine size={20} />
          </button>

          {tab === "account" ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-[24px] overflow-y-auto">
                <p className="pr-[28px] text-[16px] leading-[26px] tracking-[-0.48px] text-white">
                  Account
                </p>

                <div className="flex w-full flex-col gap-[14px]">
                  {/* avatar + identity */}
                  <div className="flex w-full items-center gap-[10px]">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="size-[48px] shrink-0 overflow-hidden rounded-full shadow-[0px_0px_0px_1px_#27272a]"
                      aria-label="Change profile photo"
                    >
                      {avatarPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center bg-[#2b2b2b] text-[16px] font-semibold text-white">
                          {initial}
                        </span>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex min-w-0 flex-col gap-[2px]">
                      <p className="truncate text-[14px] leading-[20px] tracking-[-0.42px] text-[#f4f4f5]">
                        {rowName}
                      </p>
                      <p className="truncate text-[12px] leading-[16px] tracking-[-0.36px] text-[#878787]">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  {/* name field */}
                  <div className="flex w-full flex-col gap-[4px]">
                    <span className="flex items-center gap-px text-[14px] leading-[20px]">
                      <span className="tracking-[-0.42px] text-white">Name</span>
                      <span className="font-sans tracking-[-0.084px] text-[#f33]">*</span>
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full bg-[#2b2b2b] py-[8px] pl-[12px] pr-[10px] text-[14px] leading-[20px] tracking-[-0.42px] text-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)] outline-none placeholder:text-[#a3a3a3]"
                    />
                  </div>

                  {error ? <p className="text-[13px] text-[#ff6b6b]">{error}</p> : null}
                </div>

                <CopyQuotaMeter />
              </div>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !dirty}
                className="ui-press ui-micro flex w-full items-center justify-center bg-white py-[10px] pl-[10px] pr-[16px] text-[14px] font-medium tracking-[-0.42px] text-black hover:bg-white/90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-[2px]">
              <ApiKeysPanel onClose={onClose} />
            </div>
          )}
        </div>
      </Modal.Content>
    </Modal.Root>
  );
}
