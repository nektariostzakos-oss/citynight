/**
 * Public "Install our app" share page.
 *
 * Off by default. The owner flips `installPageEnabled` in the mobile-app
 * admin once they want to share one URL with customers. When enabled this
 * page renders Android-aware install instructions and a button that fetches
 * the latest signed APK from `/install/apk`.
 *
 * Customer-facing, so every visible string is localized in all 11 languages.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { withBasePath } from "../../lib/basePath";
import { loadBusiness, loadMobileApp } from "../../lib/settings";
import { getLatestReady } from "../../lib/apkBuilds";
import {
  langPick,
  SUPPORTED_LANGS,
  type Lang,
} from "../../lib/langs";
import InstallButton from "./InstallButton";

type Copy = Record<Lang, string>;

const T: Record<string, Copy> = {
  title: {
    en: "Get the app",
    el: "Κατέβασε την εφαρμογή",
    de: "Hol dir die App",
    fr: "Obtenez l'application",
    it: "Scarica l'app",
    es: "Consigue la app",
    nl: "Download de app",
    pl: "Pobierz aplikację",
    pt: "Obter a app",
    sv: "Hämta appen",
    sq: "Merr aplikacionin",
  },
  intro: {
    en: "Install our Android app on your phone for one-tap booking, faster checkout and instant notifications.",
    el: "Εγκατέστησε την εφαρμογή μας για Android στο τηλέφωνό σου για κρατήσεις με ένα tap, γρηγορότερο checkout και άμεσες ειδοποιήσεις.",
    de: "Installiere unsere Android-App auf deinem Handy für Buchungen mit einem Tipp, schnelleren Checkout und sofortige Benachrichtigungen.",
    fr: "Installez notre application Android sur votre téléphone pour réserver en un tap, un checkout plus rapide et des notifications instantanées.",
    it: "Installa la nostra app Android sul telefono per prenotare con un tap, checkout più veloce e notifiche istantanee.",
    es: "Instala nuestra app de Android en tu teléfono para reservar con un toque, un pago más rápido y notificaciones al instante.",
    nl: "Installeer onze Android-app op je telefoon voor boeken met één tik, snellere afrekening en directe meldingen.",
    pl: "Zainstaluj naszą aplikację na Androida, aby rezerwować jednym dotknięciem, szybciej finalizować zakupy i otrzymywać natychmiastowe powiadomienia.",
    pt: "Instala a nossa app Android no telemóvel para marcações num toque, checkout mais rápido e notificações instantâneas.",
    sv: "Installera vår Android-app i mobilen för bokning med en tryckning, snabbare kassa och direkta notiser.",
    sq: "Instalo aplikacionin tonë për Android në telefon për rezervim me një prekje, arkëtim më të shpejtë dhe njoftime të menjëhershme.",
  },
  download: {
    en: "Download for Android",
    el: "Κατέβασέ την για Android",
    de: "Für Android herunterladen",
    fr: "Télécharger pour Android",
    it: "Scarica per Android",
    es: "Descargar para Android",
    nl: "Downloaden voor Android",
    pl: "Pobierz na Androida",
    pt: "Transferir para Android",
    sv: "Ladda ner för Android",
    sq: "Shkarko për Android",
  },
  notAndroid: {
    en: "This installer is for Android phones. Open this page on your Android device, or save the link to send to a friend.",
    el: "Αυτή η εγκατάσταση είναι για κινητά Android. Άνοιξε τη σελίδα από συσκευή Android, ή αποθήκευσε τον σύνδεσμο για να τον στείλεις.",
    de: "Dieser Installer ist für Android-Handys. Öffne diese Seite auf deinem Android-Gerät oder speichere den Link, um ihn weiterzuleiten.",
    fr: "Ce programme d'installation est pour les téléphones Android. Ouvrez cette page sur votre appareil Android, ou enregistrez le lien pour l'envoyer.",
    it: "Questo installer è per telefoni Android. Apri questa pagina dal tuo dispositivo Android, oppure salva il link e mandalo.",
    es: "Este instalador es para teléfonos Android. Abre esta página desde tu dispositivo Android o guarda el enlace para enviarlo.",
    nl: "Dit installatiebestand is voor Android-telefoons. Open deze pagina op je Android-toestel, of bewaar de link om door te sturen.",
    pl: "Ten instalator jest dla telefonów z Androidem. Otwórz tę stronę na urządzeniu z Androidem lub zapisz link, aby go wysłać.",
    pt: "Este instalador é para telemóveis Android. Abre esta página no teu dispositivo Android, ou guarda o link para enviar.",
    sv: "Det här installationsprogrammet är för Android-telefoner. Öppna sidan på din Android-enhet, eller spara länken för att skicka vidare.",
    sq: "Ky instalues është për telefonat Android. Hape këtë faqe nga pajisja jote Android, ose ruaje lidhjen për ta dërguar.",
  },
  step1: {
    en: "Tap the download button above.",
    el: "Πάτησε το κουμπί λήψης παραπάνω.",
    de: "Tippe oben auf den Download-Button.",
    fr: "Appuyez sur le bouton de téléchargement ci-dessus.",
    it: "Tocca il pulsante di download qui sopra.",
    es: "Toca el botón de descarga de arriba.",
    nl: "Tik op de downloadknop hierboven.",
    pl: "Naciśnij przycisk pobierania powyżej.",
    pt: "Toca no botão de transferência acima.",
    sv: "Tryck på nedladdningsknappen ovan.",
    sq: "Prek butonin e shkarkimit më sipër.",
  },
  step2: {
    en: "When prompted, allow installs from this source.",
    el: "Όταν ζητηθεί, επίτρεψε εγκατάσταση από αυτήν την πηγή.",
    de: "Wenn du gefragt wirst, erlaube Installationen aus dieser Quelle.",
    fr: "Si on vous le demande, autorisez les installations depuis cette source.",
    it: "Quando richiesto, consenti l'installazione da questa fonte.",
    es: "Cuando te lo pida, permite la instalación desde esta fuente.",
    nl: "Als ernaar wordt gevraagd, sta installaties vanuit deze bron toe.",
    pl: "Gdy pojawi się pytanie, zezwól na instalację z tego źródła.",
    pt: "Quando aparecer o pedido, permite instalações desta origem.",
    sv: "När du tillfrågas, tillåt installationer från den här källan.",
    sq: "Kur të të kërkohet, lejo instalimet nga ky burim.",
  },
  step3: {
    en: "Open the downloaded file and tap Install.",
    el: "Άνοιξε το αρχείο που κατέβηκε και πάτησε Εγκατάσταση.",
    de: "Öffne die heruntergeladene Datei und tippe auf Installieren.",
    fr: "Ouvrez le fichier téléchargé et appuyez sur Installer.",
    it: "Apri il file scaricato e tocca Installa.",
    es: "Abre el archivo descargado y toca Instalar.",
    nl: "Open het gedownloade bestand en tik op Installeren.",
    pl: "Otwórz pobrany plik i naciśnij Zainstaluj.",
    pt: "Abre o ficheiro transferido e toca em Instalar.",
    sv: "Öppna den nedladdade filen och tryck på Installera.",
    sq: "Hape skedarin e shkarkuar dhe prek Instalo.",
  },
  steps: {
    en: "How to install",
    el: "Πώς να την εγκαταστήσεις",
    de: "So installierst du",
    fr: "Comment installer",
    it: "Come installare",
    es: "Cómo instalar",
    nl: "Zo installeer je",
    pl: "Jak zainstalować",
    pt: "Como instalar",
    sv: "Så installerar du",
    sq: "Si ta instaloni",
  },
};

function pickLang(raw: string | string[] | undefined): Lang {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return SUPPORTED_LANGS.includes(v as Lang) ? (v as Lang) : "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const business = await loadBusiness();
  const name = business.name || "Atelier";
  return {
    title: `Get the ${name} app`,
    description: `Install the ${name} app on your Android phone.`,
    robots: { index: true, follow: true },
  };
}

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const mobileApp = await loadMobileApp();
  if (!mobileApp.installPageEnabled) notFound();

  const ready = await getLatestReady();
  if (!ready) notFound();

  const business = await loadBusiness();
  const { lang: rawLang } = await searchParams;
  const lang = pickLang(rawLang);
  const t = (k: keyof typeof T) => langPick(T[k] as unknown as Record<string, string>, lang);

  return (
    <main className="min-h-screen bg-[#0a0806] px-6 py-16 text-white">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">
          {business.name || "Atelier"}
        </p>
        <h1 className="mt-2 font-serif text-3xl">{t("title")}</h1>
        <p className="mt-3 text-sm text-white/70">{t("intro")}</p>

        <InstallButton
          href={withBasePath("/install/apk")}
          downloadLabel={t("download")}
          notAndroidLabel={t("notAndroid")}
        />

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a961]">
            {t("steps")}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/80">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
