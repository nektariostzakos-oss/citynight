"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useSection } from "../../lib/editorClient";
import { useBusiness } from "../../lib/businessClient";
import { withBasePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";

type Block = {
  label_en: string;
  label_el: string;
  value_en: string;
  value_el: string;
};

export default function ContactInfo() {
  const { t, lang } = useLang();
  const { business } = useBusiness();
  const c = useSection("contact", {
    image: "",
    blocks: [] as Block[],
  });
  const blocks: Block[] = (c.blocks as Block[]) ?? [];
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);

  const phone = business.phone?.replace(/\s+/g, "") || "";
  const whatsapp = business.social?.whatsapp?.replace(/[^+\d]/g, "") || "";
  const mapsHref = (() => {
    if (business.latitude && business.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`;
    }
    const q = [business.streetAddress, business.city].filter(Boolean).join(", ");
    return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : "";
  })();

  return (
    <section className="relative px-6 pb-32">
      <EditPencil section="contact" />
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-10">
          {blocks.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[var(--gold)]">
                {pick(b.label_en, b.label_el)}
              </p>
              <p className="whitespace-pre-line font-serif text-2xl text-white">
                {pick(b.value_en, b.value_el)}
              </p>
            </motion.div>
          ))}

          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold uppercase tracking-widest"
              style={{ background: "var(--gold)", color: "var(--background)" }}
            >
              {t("cta.book")}
            </Link>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/^\+/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium"
                style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M.057 24l1.687-6.163A11.867 11.867 0 010 11.9C0 5.335 5.367 0 11.933 0a11.821 11.821 0 018.413 3.488 11.824 11.824 0 013.487 8.414c-.003 6.565-5.37 11.9-11.932 11.9a11.9 11.9 0 01-5.693-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634L2.5 21.5l5.154-1.307z"/>
                </svg>
                WhatsApp
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium"
                style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.05-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.05l-2.21 2.18z"/>
                </svg>
                {langPick({ en: "Call", el: "Κλήση", de: "Anrufen", fr: "Appeler", it: "Chiama", es: "Llamar", nl: "Bellen", pl: "Zadzwoń", pt: "Ligar", sv: "Ring", sq: "Telefono" }, lang)}
              </a>
            )}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium"
                style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                </svg>
                {langPick({ en: "Directions", el: "Οδηγίες", de: "Wegbeschreibung", fr: "Itinéraire", it: "Indicazioni", es: "Cómo llegar", nl: "Route", pl: "Dojazd", pt: "Como chegar", sv: "Vägbeskrivning", sq: "Udhëzime" }, lang)}
              </a>
            )}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10"
        >
          {c.image ? (
            <Image
              src={withBasePath(c.image)}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "var(--surface)" }} />
          )}
        </motion.div>
      </div>
    </section>
  );
}
