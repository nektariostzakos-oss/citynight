/**
 * Minimal dependency-free class merger for the demo template.
 *
 * Accepts any mix of strings, arrays, or falsy values and joins the truthy
 * ones with a space. Does not deduplicate conflicting Tailwind utilities — if
 * you need that, add `clsx` + `tailwind-merge` to the demo's dependencies and
 * swap this implementation out.
 *
 * Usage: cn("base", condition && "extra", undefined)  →  "base extra"
 */
export function cn(...inputs: (string | undefined | null | false | 0 | readonly (string | undefined | null | false | 0)[])[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ");
}
