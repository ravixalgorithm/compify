import { CATEGORIES, categoryLabel, type RegistryEntry } from "@compify/shared";

export type CategoryOption = { id: string; label: string };

/**
 * Category suggestions for the admin form: the built-in categories plus any
 * custom categories already used by existing components, de-duped and sorted by
 * label. Admins can still type an entirely new category in the field.
 */
export function categoryOptions(
  entries: Pick<RegistryEntry, "category">[],
): CategoryOption[] {
  const ids = new Set<string>(CATEGORIES.map((c) => c.id));
  for (const e of entries) if (e.category) ids.add(e.category);
  return [...ids]
    .map((id) => ({ id, label: categoryLabel(id) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
