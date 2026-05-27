/**
 * Template registry — the public-site "skin" layer.
 *
 * Atelier ships one product (the salon booking site) but can render it with
 * more than one front-end design. The admin panel, API routes, data layer and
 * booking engine are SHARED across every template; only the public-facing
 * pages differ.
 *
 * Each non-default template lives in its own folder under
 * `demo/src/templates/<id>/` and holds one component per public route. The
 * `salon` template is the original design and is served by the route files in
 * `demo/src/app/*` directly, so it has no folder here.
 *
 * The active template is stored per site in `data/settings.json` (the
 * `template` field) and read by `loadTemplateId()` in `lib/settings.ts`. The
 * public route files dispatch on it. It is chosen in the setup wizard and the
 * admin Tools panel, and applies to SaaS tenants and self-hosted installs
 * alike.
 */

export type TemplateId = "salon" | "template2" | "template3" | "template4" | "template5" | "template6";

export interface TemplateMeta {
  id: TemplateId;
  /** Label shown in the setup wizard and the admin template picker. */
  name: string;
  /** One-line summary shown under the label. */
  description: string;
  /** "active" = offered in the pickers; "draft" = exists but hidden. */
  status: "active" | "draft";
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  salon: {
    id: "salon",
    name: "Barber",
    description: "The original design: warm, dark, editorial.",
    status: "active",
  },
  template2: {
    id: "template2",
    name: "Nail Studio",
    description: "Light, minimal and premium. Built for nail artists.",
    status: "active",
  },
  template3: {
    id: "template3",
    name: "Day Spa",
    description: "Calm, organic and restful. Built for spas and wellness studios.",
    status: "active",
  },
  template4: {
    id: "template4",
    name: "Aesthetics Clinic",
    description: "Clinical, precise and trusted. Built for med-spas and skin clinics.",
    status: "active",
  },
  template5: {
    id: "template5",
    name: "Yoga Studio",
    description: "Warm, playful and collaged. Built for yoga and movement studios.",
    status: "active",
  },
  template6: {
    id: "template6",
    name: "Hair Salon",
    description: "Magazine-spread editorial, light cream and champagne. Built for upscale hair salons.",
    status: "active",
  },
};

/** The template used when a site has not chosen one. */
export const DEFAULT_TEMPLATE: TemplateId = "salon";

/** Every template offered in the setup wizard / admin pickers. */
export const SELECTABLE_TEMPLATES: TemplateMeta[] = Object.values(TEMPLATES).filter(
  (t) => t.status === "active",
);

/** Narrow an unknown value (e.g. a settings field) to a known TemplateId. */
export function isValidTemplateId(v: unknown): v is TemplateId {
  return typeof v === "string" && v in TEMPLATES;
}
