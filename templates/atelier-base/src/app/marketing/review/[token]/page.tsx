"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

/**
 * Public customer rating page.
 *
 * Reached from the link in the post-visit review-request email. The URL
 * carries a signed, time-limited token that identifies the booking without
 * requiring a login. No admin session is needed — the route validates only
 * the HMAC token via the API.
 *
 * Flow:
 *   1. Customer picks 1–5 stars.
 *   2. Rating >= 4 -> thank-you screen + "Leave a Google review" CTA.
 *   3. Rating <= 3 -> private feedback textarea -> POST to the API route.
 *
 * L10n: all visible strings are drawn from the COPY record below, keyed by
 * the 11 supported languages. The language is detected from the browser
 * Accept-Language header via navigator.language (client component) and falls
 * back to English.
 *
 * Root-clean: no hardcoded slug. The page sits at
 *   /marketing/review/<token>          (standalone / customer ZIP)
 *   /<slug>/marketing/review/<token>   (SaaS tenant, server.js strips slug)
 * Both render the same source; the token encodes the booking context.
 */

import type { Lang } from "../../../../lib/langs";
import { withBasePath } from "../../../../lib/basePath";

// ---- L10n copy ---------------------------------------------------------------

type L10nStr = Record<Lang, string>;

const COPY: {
  title: L10nStr;
  subtitle: L10nStr;
  q: L10nStr;
  stars: L10nStr[];
  next: L10nStr;
  thankHigh: L10nStr;
  thankHighSub: L10nStr;
  googleBtn: L10nStr;
  thankLow: L10nStr;
  thankLowSub: L10nStr;
  feedbackLabel: L10nStr;
  feedbackPlaceholder: L10nStr;
  submit: L10nStr;
  submitting: L10nStr;
  submitted: L10nStr;
  submittedSub: L10nStr;
  errorInvalid: L10nStr;
  errorGeneric: L10nStr;
  loading: L10nStr;
} = {
  title: {
    en: "How did we do?",
    el: "Πώς σου φάνηκε;",
    de: "Wie war es bei uns?",
    fr: "Comment ça s'est passé ?",
    it: "Com'è andata?",
    es: "¿Qué tal fue?",
    nl: "Hoe was het?",
    pl: "Jak nam poszło?",
    pt: "Como correu?",
    sv: "Hur var det hos oss?",
    sq: "Si ju duket?",
  },
  subtitle: {
    en: "Your feedback helps us grow.",
    el: "Η άποψή σου μας βοηθά να βελτιωθούμε.",
    de: "Ihr Feedback hilft uns zu wachsen.",
    fr: "Votre avis nous aide à progresser.",
    it: "Il tuo feedback ci aiuta a migliorare.",
    es: "Tu opinión nos ayuda a crecer.",
    nl: "Jouw feedback helpt ons te groeien.",
    pl: "Twoja opinia pomaga nam się rozwijać.",
    pt: "O seu feedback ajuda-nos a crescer.",
    sv: "Din feedback hjälper oss att växa.",
    sq: "Mendimi juaj na ndihmon të rritemi.",
  },
  q: {
    en: "Rate your visit",
    el: "Αξιολόγησε την επίσκεψή σου",
    de: "Bewerten Sie Ihren Besuch",
    fr: "Évaluez votre visite",
    it: "Valuta la tua visita",
    es: "Valora tu visita",
    nl: "Beoordeel je bezoek",
    pl: "Oceń swoją wizytę",
    pt: "Avalie a sua visita",
    sv: "Betygsätt ditt besök",
    sq: "Vlerësoni vizitën tuaj",
  },
  stars: [
    {
      en: "Very poor",
      el: "Πολύ κακό",
      de: "Sehr schlecht",
      fr: "Très mauvais",
      it: "Molto scarso",
      es: "Muy malo",
      nl: "Heel slecht",
      pl: "Bardzo słabo",
      pt: "Muito mau",
      sv: "Mycket dåligt",
      sq: "Shumë keq",
    },
    {
      en: "Poor",
      el: "Κακό",
      de: "Schlecht",
      fr: "Mauvais",
      it: "Scarso",
      es: "Malo",
      nl: "Slecht",
      pl: "Słabo",
      pt: "Mau",
      sv: "Dåligt",
      sq: "Keq",
    },
    {
      en: "OK",
      el: "Μέτριο",
      de: "Okay",
      fr: "Correct",
      it: "Così così",
      es: "Regular",
      nl: "Matig",
      pl: "Przeciętnie",
      pt: "Razoável",
      sv: "Okej",
      sq: "Mesatare",
    },
    {
      en: "Good",
      el: "Καλό",
      de: "Gut",
      fr: "Bien",
      it: "Buono",
      es: "Bueno",
      nl: "Goed",
      pl: "Dobrze",
      pt: "Bom",
      sv: "Bra",
      sq: "Mirë",
    },
    {
      en: "Excellent",
      el: "Εξαιρετικό",
      de: "Ausgezeichnet",
      fr: "Excellent",
      it: "Eccellente",
      es: "Excelente",
      nl: "Uitstekend",
      pl: "Doskonale",
      pt: "Excelente",
      sv: "Utmärkt",
      sq: "Shkëlqyeshëm",
    },
  ],
  next: {
    en: "Continue",
    el: "Συνέχεια",
    de: "Weiter",
    fr: "Continuer",
    it: "Continua",
    es: "Continuar",
    nl: "Doorgaan",
    pl: "Dalej",
    pt: "Continuar",
    sv: "Fortsätt",
    sq: "Vazhdo",
  },
  thankHigh: {
    en: "Thank you!",
    el: "Ευχαριστούμε!",
    de: "Danke schön!",
    fr: "Merci beaucoup !",
    it: "Grazie mille!",
    es: "¡Muchas gracias!",
    nl: "Bedankt!",
    pl: "Dziękujemy!",
    pt: "Obrigado!",
    sv: "Tack så mycket!",
    sq: "Faleminderit!",
  },
  thankHighSub: {
    en: "Glad you had a great experience. If you have a moment, a quick Google review means the world to us.",
    el: "Χαιρόμαστε που σου άρεσε. Αν έχεις ένα λεπτό, μια σύντομη κριτική στο Google μας βοηθά πολύ.",
    de: "Schön, dass Ihr Besuch gut war. Wenn Sie einen Moment Zeit haben, freuen wir uns über eine Google-Bewertung.",
    fr: "Ravi que l'expérience ait été au rendez-vous. Un avis Google rapide nous aiderait beaucoup si vous avez une minute.",
    it: "Felici che tu abbia vissuto una bella esperienza. Se hai un momento, una recensione su Google per noi vale tantissimo.",
    es: "Nos alegra que hayas tenido una gran experiencia. Si tienes un momento, una reseña en Google nos ayuda mucho.",
    nl: "Fijn dat je het naar je zin had. Als je even tijd hebt, een korte Google-review betekent veel voor ons.",
    pl: "Cieszymy się, że miałeś super doświadczenie. Jeśli masz chwilę, krótka recenzja na Google bardzo nam pomoże.",
    pt: "Fico feliz que tenha tido uma ótima experiência. Se tiver um momento, uma avaliação no Google significa muito para nós.",
    sv: "Roligt att du hade en bra upplevelse. Om du har en stund, en snabb Google-recension betyder mycket för oss.",
    sq: "Gëzohemi që patët një përvojë të shkëlqyer. Nëse keni një minutë, një vlerësim i shpejtë në Google do të thotë shumë për ne.",
  },
  googleBtn: {
    en: "Leave a Google review",
    el: "Γράψε κριτική στο Google",
    de: "Google-Bewertung schreiben",
    fr: "Laisser un avis Google",
    it: "Lascia una recensione su Google",
    es: "Dejar una reseña en Google",
    nl: "Schrijf een Google-review",
    pl: "Zostaw opinię na Google",
    pt: "Deixar avaliação no Google",
    sv: "Skriv en Google-recension",
    sq: "Lini një vlerësim në Google",
  },
  thankLow: {
    en: "Thank you for the honest feedback.",
    el: "Σε ευχαριστούμε για την ειλικρινή σου αποτίμηση.",
    de: "Danke für Ihr offenes Feedback.",
    fr: "Merci pour votre retour sincère.",
    it: "Grazie per il tuo feedback onesto.",
    es: "Gracias por tu opinión sincera.",
    nl: "Bedankt voor je eerlijke feedback.",
    pl: "Dziękujemy za szczerą opinię.",
    pt: "Obrigado pelo feedback honesto.",
    sv: "Tack för den ärliga återkopplingen.",
    sq: "Faleminderit për komentet tuaja të sinqerta.",
  },
  thankLowSub: {
    en: "Please tell us a bit more so we can do better.",
    el: "Πες μας λίγα παραπάνω ώστε να βελτιωθούμε.",
    de: "Bitte sagen Sie uns etwas mehr, damit wir besser werden können.",
    fr: "Dites-nous en un peu plus pour que nous puissions nous améliorer.",
    it: "Dicci qualcosa in più per aiutarci a migliorare.",
    es: "Cuéntanos un poco más para que podamos mejorar.",
    nl: "Vertel ons iets meer zodat we kunnen verbeteren.",
    pl: "Powiedz nam trochę więcej, żebyśmy mogli się poprawić.",
    pt: "Conte-nos um pouco mais para que possamos melhorar.",
    sv: "Berätta lite mer så att vi kan bli bättre.",
    sq: "Ju lutem na tregoni pak më shumë që të mund të përmirësohemi.",
  },
  feedbackLabel: {
    en: "What could we have done better?",
    el: "Τι θα μπορούσαμε να κάναμε καλύτερα;",
    de: "Was hätten wir besser machen können?",
    fr: "Qu'aurions-nous pu mieux faire ?",
    it: "Cosa avremmo potuto fare meglio?",
    es: "¿Qué podríamos haber hecho mejor?",
    nl: "Wat hadden we beter kunnen doen?",
    pl: "Co mogliśmy zrobić lepiej?",
    pt: "O que poderíamos ter feito melhor?",
    sv: "Vad hade vi kunnat göra bättre?",
    sq: "Çfarë mund të kishim bërë më mirë?",
  },
  feedbackPlaceholder: {
    en: "Your thoughts (optional)...",
    el: "Τα σχόλιά σου (προαιρετικά)...",
    de: "Ihre Gedanken (optional) ...",
    fr: "Vos remarques (facultatif)...",
    it: "I tuoi commenti (opzionale)...",
    es: "Tus comentarios (opcional)...",
    nl: "Jouw gedachten (optioneel)...",
    pl: "Twoje przemyślenia (opcjonalnie)...",
    pt: "Os seus pensamentos (opcional)...",
    sv: "Dina tankar (valfritt)...",
    sq: "Mendimet tuaja (opsionale)...",
  },
  submit: {
    en: "Send feedback",
    el: "Αποστολή σχολίων",
    de: "Feedback senden",
    fr: "Envoyer le retour",
    it: "Invia commento",
    es: "Enviar comentario",
    nl: "Feedback sturen",
    pl: "Wyślij opinię",
    pt: "Enviar comentário",
    sv: "Skicka feedback",
    sq: "Dërgo koment",
  },
  submitting: {
    en: "Sending...",
    el: "Αποστολή...",
    de: "Wird gesendet...",
    fr: "Envoi en cours...",
    it: "Invio in corso...",
    es: "Enviando...",
    nl: "Bezig met verzenden...",
    pl: "Wysyłanie...",
    pt: "A enviar...",
    sv: "Skickar...",
    sq: "Po dërgoj...",
  },
  submitted: {
    en: "Thank you!",
    el: "Ευχαριστούμε!",
    de: "Danke!",
    fr: "Merci !",
    it: "Grazie!",
    es: "¡Gracias!",
    nl: "Bedankt!",
    pl: "Dziękujemy!",
    pt: "Obrigado!",
    sv: "Tack!",
    sq: "Faleminderit!",
  },
  submittedSub: {
    en: "Your feedback has been received. We'll review it and use it to improve.",
    el: "Τα σχόλιά σου παραλήφθηκαν. Θα τα λάβουμε υπόψη για να βελτιωθούμε.",
    de: "Ihr Feedback wurde empfangen. Wir werden es prüfen und nutzen, um uns zu verbessern.",
    fr: "Votre retour a bien été reçu. Nous allons l'examiner pour nous améliorer.",
    it: "Il tuo commento è stato ricevuto. Lo esamineremo per migliorare.",
    es: "Tu comentario ha sido recibido. Lo revisaremos para mejorar.",
    nl: "Jouw feedback is ontvangen. We zullen het bekijken en gebruiken om te verbeteren.",
    pl: "Twoja opinia została odebrana. Przejrzymy ją i wykorzystamy do poprawy.",
    pt: "O seu comentário foi recebido. Vamos analisá-lo para melhorar.",
    sv: "Din feedback har tagits emot. Vi kommer att granska den och använda den för att förbättra oss.",
    sq: "Komenti juaj është marrë. Do ta rishikojmë dhe do ta përdorim për t'u përmirësuar.",
  },
  errorInvalid: {
    en: "This link has expired or is invalid. Please request a new review link.",
    el: "Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Παρακαλούμε ζήτησε νέο σύνδεσμο αξιολόγησης.",
    de: "Dieser Link ist abgelaufen oder ungültig. Bitte fordern Sie einen neuen Bewertungslink an.",
    fr: "Ce lien a expiré ou est invalide. Veuillez demander un nouveau lien d'avis.",
    it: "Questo link è scaduto o non è valido. Richiedi un nuovo link di recensione.",
    es: "Este enlace ha caducado o no es válido. Solicita un nuevo enlace de reseña.",
    nl: "Deze link is verlopen of ongeldig. Vraag een nieuwe beoordelingslink aan.",
    pl: "Ten link wygasł lub jest nieprawidłowy. Poproś o nowy link do recenzji.",
    pt: "Este link expirou ou é inválido. Solicite um novo link de avaliação.",
    sv: "Den här länken har gått ut eller är ogiltig. Begär en ny recensionslänk.",
    sq: "Ky link ka skaduar ose është i pavlefshëm. Ju lutem kërkoni një link të ri vlerësimi.",
  },
  errorGeneric: {
    en: "Something went wrong. Please try again.",
    el: "Κάτι πήγε στραβά. Παρακαλούμε δοκίμασε ξανά.",
    de: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    fr: "Une erreur s'est produite. Veuillez réessayer.",
    it: "Qualcosa è andato storto. Riprova.",
    es: "Algo ha salido mal. Por favor, inténtalo de nuevo.",
    nl: "Er is iets misgegaan. Probeer het opnieuw.",
    pl: "Coś poszło nie tak. Spróbuj ponownie.",
    pt: "Algo correu mal. Por favor, tente novamente.",
    sv: "Något gick fel. Försök igen.",
    sq: "Diçka shkoi keq. Ju lutem provoni përsëri.",
  },
  loading: {
    en: "Loading...",
    el: "Φόρτωση...",
    de: "Laden...",
    fr: "Chargement...",
    it: "Caricamento...",
    es: "Cargando...",
    nl: "Laden...",
    pl: "Ładowanie...",
    pt: "A carregar...",
    sv: "Laddar...",
    sq: "Po ngarkohet...",
  },
};

// ---- Language detection (client) --------------------------------------------

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const code = navigator.language?.slice(0, 2).toLowerCase() as Lang;
  const supported: Lang[] = [
    "en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq",
  ];
  return supported.includes(code) ? code : "en";
}

function t(rec: L10nStr, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

// ---- Star picker component --------------------------------------------------

function StarPicker({
  value,
  onChange,
  lang,
}: {
  value: number;
  onChange: (v: number) => void;
  lang: Lang;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={t(COPY.q, lang)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = (hover || value) >= star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={t(COPY.stars[star - 1], lang)}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="text-4xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: active ? "#c9a961" : "rgba(245,239,230,0.25)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 2px",
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

// ---- Page states ------------------------------------------------------------

type Stage =
  | "loading"        // verifying token server-side
  | "invalid"        // bad / expired token
  | "picking"        // star picker
  | "high-thanks"    // >= 4, link to Google
  | "low-form"       // <= 3, private feedback form
  | "low-submitted"; // feedback recorded

// ---- Main page component ----------------------------------------------------

export default function ReviewRatingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState<Stage>("loading");
  const [rating, setRating] = useState(0);
  const [googleUrl, setGoogleUrl] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Detect browser language and verify the token on mount.
  useEffect(() => {
    setLang(detectLang());

    async function verify() {
      try {
        const res = await fetch(
          withBasePath(`/api/marketing/review/${encodeURIComponent(token)}`),
          { method: "GET" },
        );
        if (!res.ok) {
          setStage("invalid");
          return;
        }
        const data: { googleReviewUrl?: string } = await res.json();
        setGoogleUrl(data.googleReviewUrl ?? "");
        setStage("picking");
      } catch {
        setStage("invalid");
      }
    }
    if (token) verify();
    else setStage("invalid");
  }, [token]);

  // Advance from star picker to next stage.
  function handleNext() {
    if (rating === 0) return;
    if (rating >= 4) setStage("high-thanks");
    else setStage("low-form");
  }

  // Submit private low-rating feedback.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        withBasePath(`/api/marketing/review/${encodeURIComponent(token)}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment }),
        },
      );
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setError(body.error || t(COPY.errorGeneric, lang));
        setSubmitting(false);
        return;
      }
      setStage("low-submitted");
    } catch {
      setError(t(COPY.errorGeneric, lang));
      setSubmitting(false);
    }
  }

  // ---- Render ---------------------------------------------------------------

  const card = (children: React.ReactNode) => (
    <main
      className="flex min-h-[70vh] items-center justify-center px-6 py-16"
      style={{ background: "var(--background, #0a0806)", color: "var(--foreground, #f5efe6)" }}
    >
      <div
        className="mx-auto w-full max-w-md rounded-2xl border p-8 text-center"
        style={{
          background: "var(--surface, rgba(255,255,255,0.03))",
          borderColor: "var(--border-strong, rgba(255,255,255,0.18))",
        }}
      >
        {children}
      </div>
    </main>
  );

  if (stage === "loading") {
    return card(
      <p className="text-sm" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
        {t(COPY.loading, lang)}
      </p>,
    );
  }

  if (stage === "invalid") {
    return card(
      <>
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-3"
          style={{ color: "#c9a961" }}
        >
          Review
        </p>
        <p className="text-sm" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.errorInvalid, lang)}
        </p>
      </>,
    );
  }

  if (stage === "picking") {
    return card(
      <>
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-1"
          style={{ color: "#c9a961" }}
        >
          {t(COPY.q, lang)}
        </p>
        <h1 className="font-serif text-2xl mb-2" style={{ color: "var(--foreground, #f5efe6)" }}>
          {t(COPY.title, lang)}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.subtitle, lang)}
        </p>

        <div className="flex justify-center mb-4">
          <StarPicker value={rating} onChange={setRating} lang={lang} />
        </div>

        {rating > 0 && (
          <p className="text-xs mb-6" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
            {t(COPY.stars[rating - 1], lang)}
          </p>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={rating === 0}
          className="mt-2 rounded-full px-8 py-2.5 text-sm uppercase tracking-widest transition-colors disabled:opacity-40"
          style={{
            background: "#c9a961",
            color: "#0a0806",
            border: "none",
            cursor: rating === 0 ? "not-allowed" : "pointer",
          }}
        >
          {t(COPY.next, lang)}
        </button>
      </>,
    );
  }

  if (stage === "high-thanks") {
    return card(
      <>
        <div className="text-5xl mb-4">★</div>
        <h1 className="font-serif text-2xl mb-3" style={{ color: "var(--foreground, #f5efe6)" }}>
          {t(COPY.thankHigh, lang)}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.thankHighSub, lang)}
        </p>
        {googleUrl && (
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full px-8 py-2.5 text-sm uppercase tracking-widest transition-colors"
            style={{ background: "#c9a961", color: "#0a0806" }}
          >
            {t(COPY.googleBtn, lang)}
          </a>
        )}
      </>,
    );
  }

  if (stage === "low-form") {
    return card(
      <>
        <h1 className="font-serif text-2xl mb-2" style={{ color: "var(--foreground, #f5efe6)" }}>
          {t(COPY.thankLow, lang)}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.thankLowSub, lang)}
        </p>
        <form onSubmit={handleSubmit} className="text-left">
          <label
            className="block text-xs uppercase tracking-widest mb-2"
            style={{ color: "#c9a961" }}
          >
            {t(COPY.feedbackLabel, lang)}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t(COPY.feedbackPlaceholder, lang)}
            rows={4}
            className="w-full rounded-lg border px-4 py-3 text-sm resize-none outline-none focus:ring-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.15)",
              color: "var(--foreground, #f5efe6)",
            }}
          />
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full rounded-full py-2.5 text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
            style={{ background: "#c9a961", color: "#0a0806", border: "none", cursor: "pointer" }}
          >
            {submitting ? t(COPY.submitting, lang) : t(COPY.submit, lang)}
          </button>
        </form>
      </>,
    );
  }

  // stage === "low-submitted"
  return card(
    <>
      <h1 className="font-serif text-2xl mb-3" style={{ color: "var(--foreground, #f5efe6)" }}>
        {t(COPY.submitted, lang)}
      </h1>
      <p className="text-sm" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
        {t(COPY.submittedSub, lang)}
      </p>
    </>,
  );
}
