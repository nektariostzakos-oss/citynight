/**
 * Local, rules-based concierge — no external API, no keys.
 * Matches user messages against intent patterns, fills response
 * templates with real site data. Purpose-built for barber shops.
 */

import type { BusinessSettings } from "./settings";
import type { Product } from "./products";
import { dayOfWeekInTz } from "./tz";

type Lang = "en" | "el";

export type ChatCtx = {
  business: BusinessSettings;
  wordmark: string;
  services: Array<{ id: string; name: string; price: number; duration: number; desc: string }>;
  products: Product[];
  staff: Array<{ id: string; name: string; role: string }>;
  faq: Array<{ q_en: string; q_el: string; a_en: string; a_el: string }>;
};

export type ChatReply = {
  intent: string;
  text: string;
  actions?: Array<{ label: string; href: string }>;
};

// Normalize Greek diacritics + case-fold for keyword matching.
// Unicode-aware: keeps Greek letters, strips punctuation only.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  // Tokenize once, then match each needle against tokens.
  // Short English interjections (≤4 chars like "hi", "yo") must match a whole token.
  // Longer needles (usually Greek stems like "τιμ", "ραντεβου") match as token prefixes,
  // so τιμή/τιμές/τιμών all hit "τιμ" and ραντεβού/ραντεβούς all hit "ραντεβου".
  // Multi-word needles (e.g. "walk in") fall back to substring.
  const tokens = haystack.split(/\s+/).filter(Boolean);
  return needles.some((n) => {
    if (n.includes(" ")) return haystack.includes(n);
    if (n.length <= 2) return tokens.includes(n);
    return tokens.some((t) => t.startsWith(n));
  });
}

type Intent = {
  id: string;
  match: (text: string) => boolean;
  respond: (ctx: ChatCtx, lang: Lang, text: string) => ChatReply;
};

const INTENTS: Intent[] = [
  // Greeting
  {
    id: "greeting",
    match: (t) => includesAny(t, ["hi", "hello", "hey", "yo", "γεια", "γειά", "καλησπερα", "καλημερα", "χαιρετω"]) && t.length < 30,
    respond: (ctx, lang) => ({
      intent: "greeting",
      text: lang === "el"
        ? `Γεια σας · είμαι ο concierge του ${ctx.wordmark}. Μπορώ να σας πω για ραντεβού, τιμές, ωράριο, ή προϊόντα. Τι χρειάζεστε;`
        : `Hi — I'm the ${ctx.wordmark} concierge. I can help with bookings, prices, hours, and products. What do you need?`,
      actions: [
        { label: lang === "el" ? "Κράτηση" : "Book now", href: "/book" },
        { label: lang === "el" ? "Υπηρεσίες" : "Services", href: "/services" },
      ],
    }),
  },
  // Thanks
  {
    id: "thanks",
    match: (t) => includesAny(t, ["thank", "thanks", "ευχαριστω", "ευχαριστω πολυ"]) && t.length < 40,
    respond: (_c, lang) => ({
      intent: "thanks",
      text: lang === "el" ? "Στη διάθεσή σας · τα λέμε σύντομα ✂" : "You're welcome — see you in the chair ✂",
    }),
  },
  // Hours — only match direct schedule vocabulary. Generic words like "today", "now",
  // "tomorrow" are too noisy (they hit weather / date / unrelated queries), so they're out.
  {
    id: "hours",
    match: (t) => includesAny(t, ["hour", "hours", "opening", "closing", "schedule",
      "when are you open", "when do you open", "when do you close", "what time",
      "ωραρι", "ανοιχτ", "κλειστ", "ωρες λειτουργι"]),
    respond: (ctx, lang) => ({
      intent: "hours",
      text: formatHours(ctx.business, lang),
      actions: [{ label: lang === "el" ? "Δείτε τους χρόνους κράτησης" : "See booking times", href: "/book" }],
    }),
  },
  // Location / directions
  {
    id: "location",
    match: (t) => includesAny(t, ["where", "address", "direction", "location", "find", "map", "parking", "near",
      "που", "διευθυνση", "ποιος δρομος", "χαρτη", "παρκιν"]),
    respond: (ctx, lang) => {
      const b = ctx.business;
      const addr = [b.streetAddress, b.postalCode, b.city, b.country].filter(Boolean).join(", ");
      const mapQ = encodeURIComponent(addr || b.name);
      return {
        intent: "location",
        text: lang === "el"
          ? `**${b.name}**\n${addr}\n${b.phone ? `Τηλ: ${b.phone}` : ""}`
          : `**${b.name}**\n${addr}\n${b.phone ? `Tel: ${b.phone}` : ""}`,
        actions: [
          { label: lang === "el" ? "Άνοιγμα χάρτη ↗" : "Open in Maps ↗", href: `https://www.google.com/maps/search/?api=1&query=${mapQ}` },
          { label: lang === "el" ? "Επικοινωνία" : "Contact page", href: "/contact" },
        ],
      };
    },
  },
  // Phone / call
  {
    id: "phone",
    match: (t) => includesAny(t, ["phone", "call me", "call you", "phone number", "τηλεφων", "κλησ", "καλεσ", "αριθμ"]),
    respond: (ctx, lang) => {
      const p = ctx.business.phone;
      return {
        intent: "phone",
        text: p
          ? (lang === "el" ? `Καλέστε **${p}**. Απαντάμε συνήθως μεταξύ των ραντεβού.` : `Give us a call at **${p}**. We usually pick up between cuts.`)
          : (lang === "el" ? "Ο αριθμός δεν είναι διαθέσιμος στο site αυτή τη στιγμή." : "Phone isn't listed on the site right now."),
        actions: p ? [{ label: lang === "el" ? "Κλήση τώρα" : "Call now", href: `tel:${p.replace(/\s/g, "")}` }] : undefined,
      };
    },
  },
  // Booking
  {
    id: "book",
    match: (t) => includesAny(t, ["book", "appointment", "reserve", "reservation", "schedule me", "slot", "time",
      "κρατησ", "ραντεβου", "κλεισ", "διαθεσιμ", "ωρα", "slot"]),
    respond: (ctx, lang) => ({
      intent: "book",
      text: lang === "el"
        ? `Κλείστε την καρέκλα σας online — διαλέγετε υπηρεσία, μπαρμπέρη, και ώρα. Παίρνει ένα λεπτό.${ctx.business.phone ? ` Προτιμάτε τηλέφωνο; ${ctx.business.phone}.` : ""}`
        : `Book your chair online — pick a service, a barber, and a time. Takes a minute.${ctx.business.phone ? ` Prefer phone? ${ctx.business.phone}.` : ""}`,
      actions: [{ label: lang === "el" ? "Κράτηση" : "Book a chair →", href: "/book" }],
    }),
  },
  // Walk-ins
  {
    id: "walkin",
    match: (t) => includesAny(t, ["walk-in", "walk in", "walkin", "no appointment", "without booking", "just show up",
      "χωρις ραντεβου", "απο πορτα"]),
    respond: (_c, lang) => ({
      intent: "walkin",
      text: lang === "el"
        ? "Δεχόμαστε walk-in αν υπάρχει χρόνος, αλλά τα Σάββατα και τα απογεύματα γεμίζει — προτιμήστε κράτηση."
        : "We take walk-ins when we can, but Saturdays and evenings fill up. A booking is safer.",
      actions: [{ label: lang === "el" ? "Κράτηση" : "Book now", href: "/book" }],
    }),
  },
  // Services overview
  {
    id: "services",
    match: (t) => includesAny(t, ["service", "offer", "menu", "what do you", "what can you",
      "υπηρεσι", "τι κανετε", "τι προσφ"]),
    respond: (ctx, lang) => ({
      intent: "services",
      text: lang === "el"
        ? "Οι υπηρεσίες μας:\n" + formatServiceList(ctx.services, lang)
        : "Our services:\n" + formatServiceList(ctx.services, lang),
      actions: [
        { label: lang === "el" ? "Όλες οι υπηρεσίες" : "All services", href: "/services" },
        { label: lang === "el" ? "Κράτηση" : "Book", href: "/book" },
      ],
    }),
  },
  // Help me choose / recommend / suggest
  {
    id: "recommend",
    match: (t) => includesAny(t, [
      "suggest", "recommend", "advice", "which cut", "which haircut", "what cut", "what haircut",
      "help me choose", "best cut", "which style", "what style", "suits me", "what should",
      "προτειν", "συμβουλη", "τι κουρεμα", "ποιο κουρεμα", "ταιριαζει", "βοηθεια"
    ]),
    respond: (_ctx, lang) => ({
      intent: "recommend",
      text: lang === "el"
        ? "Για να βρούμε μαζί το σωστό κούρεμα, μερικές κορυφαίες επιλογές:\n\n· **Crew cut** — κλασικό, ταιριάζει παντού, χαμηλή συντήρηση.\n· **Textured crop** — κοντή φράντζα μπροστά, ατημέλητο κυρίλ.\n· **Skin fade + top** — μοντέρνο, κοφτή αντίθεση, θέλει 2-3 βδομάδες φρεσκάρισμα.\n· **Buzz cut** — το πιο εύκολο, ιδανικό αν το μαλλί αραιώνει.\n\nΚλείστε ένα ραντεβού και τα συζητάμε στο μαγαζί — σχήμα προσώπου, τύπος μαλλιού, ύφος δουλειάς."
        : "To find the right cut together, here are four tried-and-true options:\n\n· **Crew cut** — the classic. Works everywhere, low maintenance.\n· **Textured crop** — short forward fringe, messy-polished look. Great if your hairline is receding.\n· **Skin fade with length on top** — modern, sharp contrast, needs a refresh every 2–3 weeks.\n· **Buzz cut (#2 or #3)** — the most effortless; ideal if hair is thinning.\n\nBook a chair and we'll work it out in person — we'll factor in face shape, hair type, and what your work dress code allows.",
      actions: [
        { label: lang === "el" ? "Κλείστε ραντεβού" : "Book a consultation", href: "/book" },
        { label: lang === "el" ? "Όλες οι υπηρεσίες" : "See all services", href: "/services" },
      ],
    }),
  },
  // Haircut-specific
  {
    id: "haircut",
    match: (t) => includesAny(t, ["haircut", "cut", "fade", "taper", "men cut", "kid", "child",
      "κουρεμα", "fade", "taper", "παιδικ"]),
    respond: (ctx, lang, text) => {
      const isKid = includesAny(text, ["kid", "child", "παιδικ"]);
      const svc = ctx.services.find((s) =>
        isKid ? /kid|child|παιδ/i.test(s.name) : /cut|κουρε/i.test(s.name) && !/beard|μουσι/i.test(s.name)
      );
      if (!svc) {
        return matchIntent("services")(ctx, lang, text);
      }
      return {
        intent: "haircut",
        text: lang === "el"
          ? `**${svc.name}** · ${svc.duration} λεπτά · $${svc.price}\n${svc.desc}`
          : `**${svc.name}** · ${svc.duration} min · $${svc.price}\n${svc.desc}`,
        actions: [{ label: lang === "el" ? "Κλείστε αυτή την υπηρεσία" : "Book this service", href: "/book" }],
      };
    },
  },
  // Beard
  {
    id: "beard",
    match: (t) => includesAny(t, ["beard", "shave", "razor", "moustache", "μουσι", "ξυρισ", "μουστακ"]),
    respond: (ctx, lang) => {
      const svc = ctx.services.find((s) => /beard|μουσι/i.test(s.name));
      return {
        intent: "beard",
        text: svc
          ? (lang === "el"
              ? `**${svc.name}** · ${svc.duration} λεπτά · $${svc.price}\n${svc.desc}`
              : `**${svc.name}** · ${svc.duration} min · $${svc.price}\n${svc.desc}`)
          : (lang === "el" ? "Δουλεύουμε μούσι και ξύρισμα με ξυράφι — ρωτήστε μας στο μαγαζί." : "We do beard work and straight-razor shaves — ask us in the shop."),
        actions: [{ label: lang === "el" ? "Κράτηση" : "Book now", href: "/book" }],
      };
    },
  },
  // Gift vouchers
  {
    id: "gift",
    match: (t) => includesAny(t, ["gift", "voucher", "present", "certificate",
      "δωρο", "δωροεπιταγ", "δωρο"]),
    respond: (ctx, lang) => {
      const gifts = ctx.products.filter((p) => /voucher|δωρο/i.test(p.name_en) || /voucher|δωρο/i.test(p.category_en));
      if (gifts.length === 0) {
        return { intent: "gift", text: lang === "el" ? "Δεν έχουμε δωροεπιταγές εμφανείς αυτή τη στιγμή — στείλτε email και το κανονίζουμε." : "Gift vouchers aren't listed right now — email us and we'll sort one." };
      }
      return {
        intent: "gift",
        text: lang === "el"
          ? "Δωροεπιταγές:\n" + gifts.slice(0, 4).map((p) => `· ${p.name_en} — $${p.price}`).join("\n")
          : "Gift vouchers available:\n" + gifts.slice(0, 4).map((p) => `· ${p.name_en} — $${p.price}`).join("\n"),
        actions: [{ label: lang === "el" ? "Όλες οι δωροεπιταγές" : "See all vouchers", href: "/shop" }],
      };
    },
  },
  // Products / shop
  {
    id: "products",
    match: (t) => includesAny(t, ["product", "shop", "buy", "pomade", "oil", "shampoo", "balm", "razor",
      "προιον", "καταστημα", "αγορ", "πομαδα", "λαδι", "σαμπουαν"]),
    respond: (ctx, lang) => {
      const cats = Array.from(new Set(ctx.products.map((p) => p.category_en))).slice(0, 5);
      return {
        intent: "products",
        text: lang === "el"
          ? `${ctx.products.length} προϊόντα στο κατάστημα · ${cats.join(" · ")}. Τιμές από $${Math.min(...ctx.products.map((p) => p.price))}.`
          : `${ctx.products.length} products in the shop · ${cats.join(" · ")}. Prices from $${Math.min(...ctx.products.map((p) => p.price))}.`,
        actions: [{ label: lang === "el" ? "Δείτε το κατάστημα" : "Visit the shop", href: "/shop" }],
      };
    },
  },
  // Team
  {
    id: "team",
    match: (t) => includesAny(t, ["team", "barber", "who", "staff", "andreas", "nikos", "petros",
      "μπαρμπερ", "ομαδα", "ποιος", "κουρευ"]),
    respond: (ctx, lang) => {
      const real = ctx.staff.filter((s) => s.id !== "any");
      return {
        intent: "team",
        text: lang === "el"
          ? `Η ομάδα μας:\n${real.map((s) => `· **${s.name}** — ${s.role}`).join("\n")}`
          : `Our team:\n${real.map((s) => `· **${s.name}** — ${s.role}`).join("\n")}`,
        actions: [{ label: lang === "el" ? "Γνωρίστε την ομάδα" : "Meet the team", href: "/about" }],
      };
    },
  },
  // Price
  {
    id: "price",
    match: (t) => includesAny(t, ["price", "cost", "how much", "expensive", "cheap", "rate",
      "τιμ", "κοστ", "ποσο", "ακριβ", "φθην"]),
    respond: (ctx, lang) => {
      if (ctx.services.length === 0) return { intent: "price", text: lang === "el" ? "Οι τιμές είναι στη σελίδα υπηρεσιών." : "Prices are on the services page." };
      const min = Math.min(...ctx.services.map((s) => s.price));
      const max = Math.max(...ctx.services.map((s) => s.price));
      return {
        intent: "price",
        text: lang === "el"
          ? `Οι τιμές μας κυμαίνονται από $${min} έως $${max}. Λεπτομέρειες:\n${formatServiceList(ctx.services, lang)}`
          : `Our prices range from $${min} to $${max}. Full list:\n${formatServiceList(ctx.services, lang)}`,
        actions: [{ label: lang === "el" ? "Όλες οι υπηρεσίες" : "All services", href: "/services" }],
      };
    },
  },
  // Email
  {
    id: "email",
    match: (t) => includesAny(t, ["email", "write to", "mail", "μειλ", "email"]),
    respond: (ctx, lang) => ({
      intent: "email",
      text: ctx.business.email
        ? (lang === "el" ? `Email μας στο **${ctx.business.email}** — απαντάμε μέσα στη μέρα.` : `Email us at **${ctx.business.email}** — we reply within the day.`)
        : (lang === "el" ? "Δεν υπάρχει email στο site αυτή τη στιγμή · δοκιμάστε τηλέφωνο." : "No email listed right now — try the phone."),
      actions: ctx.business.email ? [{ label: lang === "el" ? "Στείλτε email" : "Send email", href: `mailto:${ctx.business.email}` }] : undefined,
    }),
  },
];

function matchIntent(id: string) {
  return INTENTS.find((i) => i.id === id)!.respond;
}

function formatHours(b: BusinessSettings, lang: Lang): string {
  const ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const LABELS: Record<string, Record<Lang, string>> = {
    mon: { en: "Mon", el: "Δευ" }, tue: { en: "Tue", el: "Τρι" }, wed: { en: "Wed", el: "Τετ" },
    thu: { en: "Thu", el: "Πεμ" }, fri: { en: "Fri", el: "Παρ" }, sat: { en: "Sat", el: "Σαβ" }, sun: { en: "Sun", el: "Κυρ" },
  };
  // Use business timezone so "today" matches shop's wall clock, not the server's UTC.
  const today = ORDER[(dayOfWeekInTz(b.timezone) + 6) % 7]; // convert Sun=0 to Mon=0
  const open = b.hours?.find((h) => h.day === today);
  const fmtRange = (h: { open: string; close: string; open2?: string; close2?: string }) =>
    h.open2 && h.close2
      ? `${h.open}–${h.close}, ${h.open2}–${h.close2}`
      : `${h.open}–${h.close}`;
  const header = open?.closed
    ? (lang === "el" ? "**Σήμερα είμαστε κλειστά.**\n\n" : "**We're closed today.**\n\n")
    : open
      ? (lang === "el" ? `**Σήμερα ανοιχτά ${fmtRange(open)}.**\n\n` : `**Today open ${fmtRange(open)}.**\n\n`)
      : "";
  const lines = (b.hours ?? [])
    .slice()
    .sort((a, b) => ORDER.indexOf(a.day) - ORDER.indexOf(b.day))
    .map((h) => `· ${LABELS[h.day]?.[lang] ?? h.day}: ${h.closed ? (lang === "el" ? "κλειστά" : "closed") : fmtRange(h)}`)
    .join("\n");
  return header + lines;
}

function formatServiceList(services: ChatCtx["services"], lang: Lang): string {
  if (services.length === 0) return lang === "el" ? "Δείτε τη σελίδα υπηρεσιών." : "See the services page.";
  return services.slice(0, 8).map((s) => `· ${s.name} · ${s.duration}${lang === "el" ? " λεπτά" : " min"} · $${s.price}`).join("\n");
}

function findFaqMatch(text: string, faq: ChatCtx["faq"], lang: Lang): ChatReply | null {
  if (faq.length === 0) return null;
  const terms = text.split(" ").filter((w) => w.length > 3);
  if (terms.length === 0) return null;
  let best: { score: number; item: ChatCtx["faq"][number] } | null = null;
  for (const item of faq) {
    const hay = normalize(`${item.q_en} ${item.q_el} ${item.a_en} ${item.a_el}`);
    const score = terms.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
    if (score > 0 && (!best || score > best.score)) best = { score, item };
  }
  if (!best || best.score < 2) return null;
  return {
    intent: "faq",
    text: lang === "el" ? best.item.a_el || best.item.a_en : best.item.a_en,
  };
}

export function respond(text: string, ctx: ChatCtx, lang: Lang = "en"): ChatReply {
  const normed = normalize(text);
  if (!normed) {
    return {
      intent: "empty",
      text: lang === "el" ? "Τι θέλετε να μάθετε;" : "What would you like to know?",
    };
  }

  for (const intent of INTENTS) {
    if (intent.match(normed)) {
      return intent.respond(ctx, lang, normed);
    }
  }

  // FAQ fuzzy search
  const faqHit = findFaqMatch(normed, ctx.faq, lang);
  if (faqHit) return faqHit;

  // Fallback
  const hasHours = !!ctx.business.hours?.length;
  const suggestions = [
    lang === "el" ? "πχ. \"τιμές\"" : "e.g. \"prices\"",
    lang === "el" ? "\"ωράριο\"" : "\"hours\"",
    lang === "el" ? "\"κράτηση\"" : "\"book an appointment\"",
    lang === "el" ? "\"πού είστε\"" : "\"where are you\"",
  ];
  return {
    intent: "fallback",
    text: lang === "el"
      ? `Δεν κατάλαβα ακριβώς. Μπορείτε να με ρωτήσετε για ${suggestions.join(", ")}.${hasHours ? " Ή καλέστε μας — απαντάμε άμεσα." : ""}`
      : `I'm not quite sure. Try asking me about ${suggestions.join(", ")}.${hasHours ? " Or give us a call — we reply fast." : ""}`,
    actions: [
      { label: lang === "el" ? "Επικοινωνία" : "Contact", href: "/contact" },
      { label: lang === "el" ? "Κράτηση" : "Book", href: "/book" },
    ],
  };
}
