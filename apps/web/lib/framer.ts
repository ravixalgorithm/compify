import type { RegistryEntry } from "@compify/shared";

const FRAMER_MODULE_RE = /^https:\/\/framer\.com\/m\//i;

/** Returns the hosted Framer module URL when the component is published on Framer. */
export function framerModuleUrl(entry: RegistryEntry): string | undefined {
  const url = entry.framerModuleUrl?.trim();
  return url || undefined;
}

export function hasFramerModule(entry: RegistryEntry): boolean {
  return Boolean(framerModuleUrl(entry));
}

export function isValidFramerModuleUrl(url: string): boolean {
  return FRAMER_MODULE_RE.test(url.trim());
}
