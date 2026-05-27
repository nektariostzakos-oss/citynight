import { NextRequest } from "next/server";
import { loadBusiness, loadBranding } from "../../../lib/settings";
import { listProducts } from "../../../lib/products";
import { getActiveServices } from "../../../lib/customServices";
import { getActiveStaff } from "../../../lib/customStaff";
import { loadContent } from "../../../lib/content";
import { respond, type ChatCtx } from "../../../lib/chatEngine";
import { listKb, searchKb, getKbAnswer, topKbCandidates, type KbEntry } from "../../../lib/barberKnowledge";
import { allowAction, clientIp } from "../../../lib/rateLimit";

type ChatMsg = { role: "user" | "assistant"; content: string };

export async function GET() {
  // Always on — the concierge is local, free, no key required
  return Response.json({ enabled: true });
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`chat:${ip}:min`, 20, 60_000)) {
    return Response.json({ reply: "Too many messages. Give me a second.", intent: "rate_limit" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({})) as { messages?: ChatMsg[]; lang?: string };
  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const last = incoming.at(-1);
  if (!last || last.role !== "user" || typeof last.content !== "string" || !last.content.trim()) {
    return Response.json({ reply: "What would you like to know?", intent: "empty" });
  }

  const [business, branding, products, services, staff, content] = await Promise.all([
    loadBusiness(),
    loadBranding(),
    listProducts().catch(() => []),
    getActiveServices().catch(() => []),
    getActiveStaff().catch(() => []),
    loadContent().catch(() => ({})) as Promise<Record<string, unknown>>,
  ]);

  const faqBlock = (content as { faq?: { items?: Array<{ q_en?: string; q_el?: string; a_en?: string; a_el?: string }> } }).faq;
  const faq = (faqBlock?.items ?? [])
    .filter((i) => i.q_en || i.q_el)
    .map((i) => ({
      q_en: i.q_en || "",
      q_el: i.q_el || "",
      a_en: i.a_en || "",
      a_el: i.a_el || "",
    }));

  const ctx: ChatCtx = {
    business,
    wordmark: branding.wordmark || business.name || "our team",
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      desc: s.desc,
    })),
    products,
    staff: staff.filter((s) => s.id !== "any"),
    faq,
  };

  const lang = body.lang === "el" ? "el" : "en";
  const query = last.content.slice(0, 1200);
  const reply = respond(query, ctx, lang);

  // If rules engine hit the generic fallback, try the knowledge base
  if (reply.intent === "fallback") {
    const kb = await listKb();
    const hit = searchKb(query, kb, lang);
    if (hit) {
      return Response.json({
        intent: `kb:${hit.category}`,
        text: getKbAnswer(hit, lang),
      });
    }
    // KB miss — generate a context-aware, always-helpful synthesis
    const candidates = topKbCandidates(query, kb, 3);
    return Response.json(synthesizeFallback(query, ctx, candidates, lang));
  }

  return Response.json(reply);
}

/**
 * "Always respond usefully" synthesizer. Never says "I don't know" — instead:
 *  - If there are weak KB candidates: present them as related topics
 *  - Otherwise: classify the query's apparent topic from barber vocabulary
 *    and return a context-specific acknowledgement with actions
 */
function synthesizeFallback(
  query: string,
  ctx: ChatCtx,
  candidates: KbEntry[],
  lang: "en" | "el"
) {
  const q = query.trim();
  const lower = q.toLowerCase();

  // Topic detection — what the user's query *seems* to be about
  const topicTable: Record<string, RegExp> = {
    hair: /\b(hair|haircut|cut|fade|taper|style|mohawk|μαλ|κουρεμ|φαλακρ|bold|bald)/i,
    beard: /\b(beard|moustache|shave|mustach|μουσ|ξυρ|μουστακ)/i,
    products: /\b(product|pomade|clay|wax|oil|balm|shampoo|conditioner|cream|προϊον|πομαδ|σαμπουαν|λαδι)/i,
    booking: /\b(book|appointment|reserve|reservation|time|slot|available|κρατησ|ραντεβου|διαθεσι)/i,
    price: /\b(price|cost|much|expensive|cheap|τιμ|ποσο|κοστ)/i,
    location: /\b(where|address|direction|map|parking|που|διευθυνσ|χαρτ|παρκ)/i,
    scalp: /\b(scalp|dandruff|thinning|flake|itch|dry|oily|τριχωτ|πιτυριδ|φαγουρ)/i,
  };
  let topic: string | null = null;
  for (const [t, re] of Object.entries(topicTable)) {
    if (re.test(lower)) { topic = t; break; }
  }

  const L = (en: string, el: string) => (lang === "el" ? el : en);

  // Build a confident, specific response
  const lead = (() => {
    if (topic === "hair") return L(`On haircuts — here's what I can help with.`, `Για τα μαλλιά — να τι μπορώ να σου πω.`);
    if (topic === "beard") return L(`On beards — here's what I know.`, `Για το μούσι — να τι μπορώ να βοηθήσω.`);
    if (topic === "products") return L(`On grooming products — I can steer you.`, `Για προϊόντα — μπορώ να σε κατευθύνω.`);
    if (topic === "booking") return L(`For booking, I've got you.`, `Για κρατήσεις, εντάξει.`);
    if (topic === "price") return L(`On pricing — our range is public.`, `Για τιμές — τις έχουμε ανοιχτές.`);
    if (topic === "location") return L(`On finding us — easy.`, `Για το πού είμαστε — εύκολο.`);
    if (topic === "scalp") return L(`On scalp and hair health — let me help.`, `Για τριχωτό και υγεία — σε βοηθώ.`);
    return L(`Not quite sure what you meant — let me offer what I can.`, `Δεν είμαι σίγουρος τι εννοείς — ας δω τι μπορώ.`);
  })();

  let body = "";
  if (candidates.length > 0) {
    const topQ = lang === "el" ? candidates[0].question_el : candidates[0].question_en;
    const topA = getKbAnswer(candidates[0], lang);
    body = `\n\n**${topQ}**\n${topA}`;
    if (candidates.length > 1) {
      body += L(
        `\n\n_I can also tell you about: ${candidates.slice(1, 3).map((c) => c.question_en).join(" · ")}_`,
        `\n\n_Μπορώ επίσης για: ${candidates.slice(1, 3).map((c) => c.question_el).join(" · ")}_`
      );
    }
  } else {
    // No KB candidates at all — fall back to suggesting topic areas
    body = L(
      `\n\nAsk me about: haircut styles, beard care, products, prices, hours, booking, or where we are. I'll be more helpful with a specific question.`,
      `\n\nΡώτησέ με για: κουρέματα, μούσι, προϊόντα, τιμές, ωράριο, κράτηση, ή πού είμαστε. Σε πιο συγκεκριμένη ερώτηση είμαι πιο χρήσιμος.`
    );
  }

  // Topic-specific action chips
  const actions = (() => {
    if (topic === "booking" || topic === "price") {
      return [{ label: L("Book now", "Κράτηση"), href: "/book" }, { label: L("All services", "Όλες οι υπηρεσίες"), href: "/services" }];
    }
    if (topic === "location") {
      const addr = [ctx.business.streetAddress, ctx.business.city].filter(Boolean).join(", ");
      return addr
        ? [{ label: L("Open in Maps ↗", "Χάρτης ↗"), href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` }, { label: L("Contact", "Επικοινωνία"), href: "/contact" }]
        : [{ label: L("Contact", "Επικοινωνία"), href: "/contact" }];
    }
    if (topic === "products") {
      return [{ label: L("Visit the shop", "Κατάστημα"), href: "/shop" }];
    }
    return [{ label: L("Services", "Υπηρεσίες"), href: "/services" }, { label: L("Book", "Κράτηση"), href: "/book" }];
  })();

  return {
    intent: `synth:${topic ?? "general"}`,
    text: lead + body,
    actions,
  };
}
