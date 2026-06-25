"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RiArrowRightLine, RiSearchLine } from "@remixicon/react";
import { registry as defaultRegistry } from "@compify/shared";
import type { CategoryItem, ComponentItem } from "./Sidebar";
import { sortComponentsAlphabetically } from "./Sidebar";
import * as CommandMenu from "@/components/ui/command-menu";
import { markViewIntent } from "@/lib/view-intent";

const defaultComponents = sortComponentsAlphabetically(
  defaultRegistry.map((e) => ({
    name: e.name,
    displayName: e.displayName,
  })),
);

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  categories?: CategoryItem[];
  entries?: ComponentItem[];
  query?: string;
  onQuery?: (value: string) => void;
  activeCategory?: string | null;
  onCategory?: (id: string | null) => void;
  /** Override what happens when a component is picked (e.g. admin routes to the
   *  editor instead of the live page). When set, the default view-intent +
   *  navigation to /components/[name] is skipped. */
  onSelectComponent?: (name: string) => void;
}

function DashedIcon() {
  return (
    <span className="relative size-[16px] shrink-0 overflow-hidden">
      <span className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 border-[1.25px] border-dashed border-[#b8b8b8]" />
    </span>
  );
}

export function SearchModal({
  open,
  onClose,
  categories = [],
  entries = defaultComponents,
  query = "",
  onQuery,
  activeCategory = null,
  onCategory,
  onSelectComponent,
}: SearchModalProps) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState("");
  const isControlled = onQuery !== undefined;
  const queryValue = isControlled ? query : localQuery;

  const q = queryValue.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!q) return categories;
    return categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [categories, q]);

  const filteredEntries = useMemo(() => {
    const list = !q
      ? entries
      : entries.filter((e) => {
          const hay = `${e.displayName} ${e.name}`.toLowerCase();
          return hay.includes(q);
        });
    return sortComponentsAlphabetically(list);
  }, [entries, q]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      onClose();
      if (!isControlled) setLocalQuery("");
    }
  }

  function setQueryValue(next: string) {
    if (isControlled) onQuery?.(next);
    else setLocalQuery(next);
  }

  function selectCategory(id: string) {
    if (onCategory) {
      onCategory(activeCategory === id ? null : id);
    } else {
      router.push(`/?category=${id}`);
    }
    onClose();
  }

  function selectComponent(name: string) {
    if (onSelectComponent) {
      onSelectComponent(name);
      onClose();
      return;
    }
    markViewIntent(name);
    router.push(`/components/${name}`);
    onClose();
  }

  return (
    <CommandMenu.Dialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
      <CommandMenu.DialogTitle className="sr-only">Search components</CommandMenu.DialogTitle>

      <label className="flex w-full shrink-0 items-center gap-[8px] border border-solid border-[#212121] bg-[#111] py-[10px] pl-[12px] pr-[18px]">
        <RiSearchLine size={18} className="shrink-0 text-[#b8b8b8]" aria-hidden />
        <CommandMenu.Input
          value={queryValue}
          onValueChange={setQueryValue}
          placeholder="Search Components..."
        />
      </label>

      <CommandMenu.List className="pb-[28px]">
        {filteredCategories.length > 0 ? (
          <CommandMenu.Group heading="Libraries">
            {filteredCategories.map((c) => (
              <CommandMenu.Item
                key={c.id}
                value={`library-${c.id}`}
                onSelect={() => selectCategory(c.id)}
              >
                <CommandMenu.ItemIcon as={RiArrowRightLine} />
                <span className="whitespace-nowrap font-normal">{c.label}</span>
              </CommandMenu.Item>
            ))}
          </CommandMenu.Group>
        ) : null}

        {filteredEntries.length > 0 ? (
          <CommandMenu.Group heading="Other Components">
            {filteredEntries.map((e) => (
              <CommandMenu.Item
                key={e.name}
                value={`component-${e.name}`}
                onSelect={() => selectComponent(e.name)}
              >
                <DashedIcon />
                <span className="whitespace-nowrap font-normal">{e.displayName}</span>
              </CommandMenu.Item>
            ))}
          </CommandMenu.Group>
        ) : null}

        <CommandMenu.Empty>No results found.</CommandMenu.Empty>
      </CommandMenu.List>
    </CommandMenu.Dialog>
  );
}
