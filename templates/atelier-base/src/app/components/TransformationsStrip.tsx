import BeforeAfter from "./BeforeAfter";
import { listTransformations, type Transformation } from "../../lib/transformations";
import { detectLang } from "../../lib/i18nServer";
import { langField, langPick } from "../../lib/langs";

// Built-in fallback so the section always renders, even on a tenant whose
// transformations.json has not been populated yet. The /transformations/*.svg
// art ships in the demo app's public/ and resolves for every tenant.
const DEFAULT_TRANSFORMATIONS: Transformation[] = [
  {
    id: "fade",
    title_en: "Skin fade + classic taper",
    title_el: "Skin fade + classic taper",
    caption_en: "Three weeks between · Elliott",
    caption_el: "Τρεις εβδομάδες ενδιάμεσα · Elliott",
    before: "/transformations/fade-before.svg",
    after: "/transformations/fade-after.svg",
  },
  {
    id: "beard-sculpt",
    title_en: "Beard line-up + scissor blend",
    title_el: "Beard line-up + scissor blend",
    caption_en: "45 minutes · Reuben",
    caption_el: "45 λεπτά · Reuben",
    before: "/transformations/beard-before.svg",
    after: "/transformations/beard-after.svg",
  },
  {
    id: "full-refresh",
    title_en: "The Cranley · cut + beard + hot towel",
    title_el: "The Cranley · κούρεμα + γένια + ζεστή πετσέτα",
    caption_en: "90 minutes · Cal",
    caption_el: "90 λεπτά · Cal",
    before: "/transformations/full-before.svg",
    after: "/transformations/full-after.svg",
  },
];

const COPY = {
  eyebrow: {
    en: "Before · after",
    el: "Πριν · μετά",
    de: "Vorher · nachher",
    fr: "Avant · après",
    it: "Prima · dopo",
    es: "Antes · después",
    nl: "Voor · na",
    pl: "Przed · po",
    pt: "Antes · depois",
    sv: "Före · efter",
    sq: "Para · pas",
  },
  title: {
    en: "Drag to see the difference.",
    el: "Σύρε για να δεις τη διαφορά.",
    de: "Zieh, um den Unterschied zu sehen.",
    fr: "Glissez pour voir la différence.",
    it: "Trascina per vedere la differenza.",
    es: "Arrastra para ver la diferencia.",
    nl: "Sleep om het verschil te zien.",
    pl: "Przeciągnij, aby zobaczyć różnicę.",
    pt: "Arraste para ver a diferença.",
    sv: "Dra för att se skillnaden.",
    sq: "Tërhiqni për të parë ndryshimin.",
  },
  sub: {
    en: "Three chairs, three before-and-after transformations. Drag the gold handle across each image.",
    el: "Τρεις καρέκλες, τρεις μεταμορφώσεις. Σύρε τη χρυσή λαβή πάνω από κάθε φωτογραφία.",
    de: "Drei Stühle, drei Vorher-nachher-Verwandlungen. Zieh den goldenen Griff über jedes Bild.",
    fr: "Trois fauteuils, trois transformations avant-après. Glissez la poignée dorée sur chaque image.",
    it: "Tre poltrone, tre trasformazioni prima e dopo. Trascina la maniglia dorata su ogni immagine.",
    es: "Tres sillones, tres transformaciones de antes y después. Arrastra el tirador dorado por cada imagen.",
    nl: "Drie stoelen, drie voor-en-na transformaties. Sleep de gouden handgreep over elke afbeelding.",
    pl: "Trzy fotele, trzy metamorfozy przed i po. Przeciągnij złoty uchwyt po każdym zdjęciu.",
    pt: "Três cadeiras, três transformações antes e depois. Arraste a pega dourada sobre cada imagem.",
    sv: "Tre stolar, tre före-och-efter-förvandlingar. Dra det guldfärgade reglaget över varje bild.",
    sq: "Tri karrige, tri transformime para dhe pas. Tërhiqni dorezën e artë mbi çdo imazh.",
  },
};

export default async function TransformationsStrip() {
  const loaded = await listTransformations();
  const items = loaded.length > 0 ? loaded : DEFAULT_TRANSFORMATIONS;

  const lang = await detectLang(undefined);

  return (
    <section className="relative px-6 py-24" style={{ background: "var(--background)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="eyebrow">{langPick(COPY.eyebrow, lang)}</p>
          <h2 className="mt-3 h-section">{langPick(COPY.title, lang)}</h2>
          <p className="mx-auto mt-4 max-w-xl body-prose">
            {langPick(COPY.sub, lang)}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 6).map((t) => (
            <article key={t.id} className="group">
              <BeforeAfter
                before={t.before}
                after={t.after}
                alt={langField(t, "title", lang)}
              />
              <div className="mt-5">
                <h3 className="font-serif text-xl" style={{ color: "var(--foreground)" }}>
                  {langField(t, "title", lang)}
                </h3>
                <p className="mt-1 caption" style={{ color: "var(--muted-2)" }}>
                  {langField(t, "caption", lang)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
