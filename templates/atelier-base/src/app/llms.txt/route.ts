import { loadBusiness } from "../../lib/settings";
import { loadContent } from "../../lib/content";
import { SERVICES } from "../../lib/services";
import { listProducts } from "../../lib/products";
import { listPages } from "../../lib/pages";
import { SITE_URL } from "../../lib/atelierSiteUrl";

const DAY_NAME: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type FaqItem = { q_en?: string; a_en?: string };
type ServiceItem = {
  name_en?: string;
  price?: number | string;
  duration?: number | string;
  desc_en?: string;
};
type ContentShape = {
  faq?: { items?: FaqItem[] };
  services?: { items?: ServiceItem[] };
};

export async function GET() {
  const [b, content, products, posts] = await Promise.all([
    loadBusiness(),
    loadContent() as Promise<ContentShape>,
    listProducts().catch(() => []),
    listPages("post").catch(() => []),
  ]);
  const publishedPosts = posts.filter((p) => p.published);

  const lines: string[] = [];
  lines.push(`# ${b.name}`);
  lines.push("");
  lines.push(
    `> ${b.name} is a barber shop in ${b.city}, ${b.country}. Services include men's haircuts, fades, beard sculpting, hot-towel shaves, and full grooming. Online booking is available.`
  );
  lines.push("");

  lines.push("## Business");
  lines.push(`- Name: ${b.name}`);
  if (b.streetAddress)
    lines.push(`- Address: ${b.streetAddress}, ${b.city} ${b.postalCode}, ${b.country}`);
  if (b.phone) lines.push(`- Phone: ${b.phone}`);
  if (b.email) lines.push(`- Email: ${b.email}`);
  if (b.priceRange) lines.push(`- Price range: ${b.priceRange}`);
  if (b.latitude != null && b.longitude != null)
    lines.push(`- Coordinates: ${b.latitude}, ${b.longitude}`);
  if (b.timezone) lines.push(`- Timezone: ${b.timezone}`);
  lines.push(`- Website: ${SITE_URL}`);
  lines.push("");

  lines.push("## Opening hours");
  for (const h of b.hours) {
    const name = DAY_NAME[h.day] ?? h.day;
    const range = h.closed
      ? "Closed"
      : h.open2 && h.close2
        ? `${h.open}–${h.close}, ${h.open2}–${h.close2}`
        : `${h.open}–${h.close}`;
    lines.push(`- ${name}: ${range}`);
  }
  lines.push("");

  const socials = Object.entries(b.social).filter(([, v]) => v);
  if (socials.length) {
    lines.push("## Social");
    for (const [k, v] of socials) lines.push(`- ${k}: ${v}`);
    lines.push("");
  }

  const svc =
    content.services?.items && content.services.items.length > 0
      ? content.services.items.map((s) => ({
          name: s.name_en ?? "",
          price: String(s.price ?? ""),
          duration: String(s.duration ?? ""),
          desc: s.desc_en ?? "",
        }))
      : SERVICES.map((s) => ({
          name: s.name,
          price: String(s.price),
          duration: String(s.duration),
          desc: s.desc,
        }));

  lines.push("## Services & pricing");
  for (const s of svc) {
    const bits = [s.name, `$${s.price}`, s.duration ? `${s.duration} min` : ""]
      .filter(Boolean)
      .join(" — ");
    lines.push(`- ${bits}${s.desc ? `. ${s.desc}` : ""}`);
  }
  lines.push("");

  if (products.length) {
    lines.push("## Shop (top items)");
    for (const p of products.slice(0, 20)) {
      lines.push(
        `- ${p.name_en || p.name_el} — $${p.price} — ${SITE_URL}/shop/${p.slug}`
      );
    }
    lines.push("");
  }

  const faqs = (content.faq?.items ?? []).filter((f) => f.q_en && f.a_en);
  if (faqs.length) {
    lines.push("## FAQ");
    for (const f of faqs) {
      lines.push(`### ${f.q_en}`);
      lines.push(f.a_en ?? "");
      lines.push("");
    }
  }

  if (publishedPosts.length) {
    lines.push("## Recent articles");
    for (const p of publishedPosts.slice(0, 15)) {
      lines.push(
        `- ${p.title_en || p.title_el} — ${SITE_URL}/blog/${p.slug}${p.excerpt_en ? `. ${p.excerpt_en}` : ""}`
      );
    }
    lines.push("");
  }

  lines.push("## Key pages");
  lines.push(`- Home: ${SITE_URL}/`);
  lines.push(`- Services: ${SITE_URL}/services`);
  lines.push(`- Shop: ${SITE_URL}/shop`);
  lines.push(`- Gallery: ${SITE_URL}/gallery`);
  lines.push(`- Team: ${SITE_URL}/about`);
  lines.push(`- Blog: ${SITE_URL}/blog`);
  lines.push(`- Contact: ${SITE_URL}/contact`);
  lines.push(`- Book online: ${SITE_URL}/book`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
