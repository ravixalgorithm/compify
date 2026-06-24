import Link from "next/link";

const LAYERS = [
  { src: "/brand/solaris/v0.svg", inset: "inset-[39.3%]" },
  { src: "/brand/solaris/v1.svg", inset: "inset-[16.76%_16.76%_52.5%_52.5%]" },
  { src: "/brand/solaris/v2.svg", inset: "inset-[16.76%_52.5%_52.5%_16.76%]" },
  { src: "/brand/solaris/v3.svg", inset: "inset-[52.5%_16.76%_16.76%_52.5%]" },
  { src: "/brand/solaris/v4.svg", inset: "inset-[52.5%_52.5%_16.76%_16.76%]" },
] as const;

/** Figma Solaris mark (133:1280) — #fa7319 disc + 5 layered gradient vectors. */
function SolarisMark() {
  return (
    <span
      className="relative size-[30px] shrink-0 overflow-hidden rounded-full bg-accent"
      aria-hidden
    >
      {LAYERS.map(({ src, inset }) => (
        <span key={src} className={`absolute ${inset}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="block size-full max-w-none" />
        </span>
      ))}
    </span>
  );
}

/** Figma header card 133:1277 — Solaris mark + Compify UI wordmark. */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-[12px] overflow-hidden py-[8px] pl-[12px]"
      style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
    >
      <SolarisMark />
      <span className="whitespace-nowrap text-[20px] font-medium leading-5 tracking-[-0.6px] text-white">
        Compify UI
      </span>
    </Link>
  );
}
