import type { PropDoc, RegistryEntry } from "@compify/shared";
import type { ReactNode } from "react";

const GROUP_ORDER = ["LAYOUT", "ANIMATION", "COLORS"] as const;

function groupProps(entry: RegistryEntry) {
  const groupByKey = new Map(
    entry.tweakSchema.map((control) => [
      control.key,
      control.group?.toUpperCase() ?? null,
    ]),
  );

  const groups = new Map<string, PropDoc[]>();
  for (const prop of entry.props) {
    const fromSchema = groupByKey.get(prop.name);
    const key =
      fromSchema ??
      (prop.name.includes("color") || prop.type.includes("#")
        ? "COLORS"
        : prop.name.match(/speed|float|rotation|animation|duration/i)
          ? "ANIMATION"
          : "LAYOUT");
    const list = groups.get(key) ?? [];
    list.push(prop);
    groups.set(key, list);
  }

  return [...groups.entries()].sort((a, b) => {
    const order = (name: string) => {
      const index = GROUP_ORDER.indexOf(name as (typeof GROUP_ORDER)[number]);
      return index === -1 ? GROUP_ORDER.length : index;
    };
    return order(a[0]) - order(b[0]);
  });
}

function descriptionParagraphs(description: string) {
  const parts = description
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [description];
}

function typeLabel(type: string): string {
  const normalized = type.toLowerCase();

  if (normalized === "boolean") return "boolean";
  if (normalized === "number" || normalized.includes("number")) return "number";
  if (normalized === "color") return "color";
  if (normalized === "string") return "string";
  if (normalized === "char") return "char";
  if (normalized.includes("|")) return "enum";

  return type;
}

function formatDefaultDisplay(value: string): string {
  const trimmed = value.trim();

  if (trimmed === "true" || trimmed === "false") return trimmed;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function PropTableCell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-start overflow-hidden pl-[16px] pr-[8px]">
      {children}
    </div>
  );
}

/** Figma 154:917 — bordered props table with header row and alternating body rows. */
function PropTable({ props }: { props: PropDoc[] }) {
  return (
    <div className="flex w-full min-w-0 flex-col overflow-hidden border border-[#2e3132]">
      <div className="flex w-full items-start overflow-hidden border-b border-[#393f42] bg-[#1a1a1a] py-[10px]">
        {["PROP", "TYPE", "DEFAULT", "DESCRIPTION"].map((col) => (
          <PropTableCell key={col}>
            <span className="text-sm text-[#b8b8b8]">{col}</span>
          </PropTableCell>
        ))}
      </div>

      {props.map((prop, index) => {
        const rowBg = index % 2 === 0 ? "bg-[#1c1c1c]" : "bg-[#222]";

        return (
          <div
            key={prop.name}
            className={`flex w-full items-start overflow-hidden border-b border-[#2e2e2e] py-[12px] ${rowBg}`}
          >
            <PropTableCell>
              <span className="break-words text-sm font-medium text-white">
                {prop.name}
              </span>
            </PropTableCell>
            <PropTableCell>
              <span className="inline-flex max-w-full shrink-0 whitespace-nowrap rounded-[4px] bg-[#282a2d] px-[8px] py-[2px] text-sm tracking-[-0.42px] text-[#b5bbc3]">
                {typeLabel(prop.type)}
              </span>
            </PropTableCell>
            <PropTableCell>
              <span
                className="block break-all font-space text-sm leading-normal text-[#aaa]"
                title={prop.default}
              >
                {formatDefaultDisplay(prop.default)}
              </span>
            </PropTableCell>
            <PropTableCell>
              <span className="block break-words text-sm leading-normal text-[#aaa]">
                {prop.description}
              </span>
            </PropTableCell>
          </div>
        );
      })}
    </div>
  );
}

/** Figma 154:888 — documentation block below the preview. */
export function ComponentDocumentation({ entry }: { entry: RegistryEntry }) {
  const features =
    entry.keyFeatures ??
    entry.props
      .map((prop) => prop.description)
      .filter(Boolean)
      .slice(0, 5);
  const propGroups = groupProps(entry);
  const paragraphs =
    entry.descriptionParagraphs ?? descriptionParagraphs(entry.description);

  return (
    <div className="flex w-full flex-col gap-[40px] overflow-hidden bg-bg pb-[60px] pt-[48px]">
      <div className="flex w-full flex-col gap-[16px]">
        <h2 className="text-title font-medium leading-[26px] tracking-[-0.66px] text-white">
          {entry.displayName}
        </h2>
        <div className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>

      {features.length ? (
        <div className="flex w-full flex-col gap-[20px]">
          <div className="flex w-full flex-col gap-[10px]">
            <p className="text-sm text-[#b8b8b8]">KEY FEATURES</p>
            <div className="h-px w-full bg-[#333]" />
          </div>
          <ul className="flex w-full flex-col gap-[12px]">
            {features.map((feature) => (
              <li
                key={feature}
                className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]"
              >
                — {feature}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Figma 154:910 — API Reference + grouped props tables */}
      <div className="flex w-full flex-col gap-[28px]">
        <div className="flex w-full flex-col gap-[20px]">
          <h3 className="text-title font-medium leading-[26px] tracking-[-0.66px] text-white">
            API Reference
          </h3>
          <p className="text-base leading-[24px] tracking-[-0.48px] text-[#b8b8b8]">
            All props map directly to the controls panel sliders and color pickers.
          </p>
        </div>

        {propGroups.map(([group, props]) => (
          <div key={group} className="flex w-full flex-col gap-[16px] overflow-hidden">
            <div className="flex w-full flex-col gap-[10px]">
              <p className="text-sm text-[#b8b8b8]">{group}</p>
              <div className="h-px w-full bg-[#333]" />
            </div>
            <PropTable props={props} />
          </div>
        ))}
      </div>
    </div>
  );
}
