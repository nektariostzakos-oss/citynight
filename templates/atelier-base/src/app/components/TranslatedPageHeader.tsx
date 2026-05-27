"use client";

import PageHeader from "./PageHeader";
import EditPencil from "./EditPencil";
import { useLang } from "../../lib/i18n";
import { useSection } from "../../lib/editorClient";

export default function TranslatedPageHeader({
  section,
  eyebrowKey,
  titleKey,
  subKey,
}: {
  section: string;
  eyebrowKey: string;
  titleKey: string;
  subKey: string;
}) {
  const { t, lang } = useLang();
  const c = useSection(section, {
    eyebrow_en: t(eyebrowKey),
    eyebrow_el: t(eyebrowKey),
    title_en: t(titleKey),
    title_el: t(titleKey),
    sub_en: t(subKey),
    sub_el: t(subKey),
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);
  return (
    <div className="relative">
      <EditPencil section={section} />
      <PageHeader
        eyebrow={pick(c.eyebrow_en, c.eyebrow_el)}
        title={pick(c.title_en, c.title_el)}
        subtitle={pick(c.sub_en, c.sub_el)}
      />
    </div>
  );
}
