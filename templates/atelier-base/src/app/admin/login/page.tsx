import LoginForm from "../../components/LoginForm";
import { loadSettings, loadBusiness } from "../../../lib/settings";
import { isDemoMode, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "../../../lib/demoMode";
import { detectLang } from "../../../lib/i18nServer";

export async function generateMetadata() {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: `Sign in · ${name}`,
    robots: { index: false, follow: false, noarchive: true },
  };
}

export const dynamic = "force-dynamic";

const copy = {
  eyebrow_demo: {
    en: "Demo · Admin", el: "Demo · Admin", de: "Demo · Admin", fr: "Demo · Admin",
    it: "Demo · Admin", es: "Demo · Admin", nl: "Demo · Admin", pl: "Demo · Admin",
    pt: "Demo · Admin", sv: "Demo · Admin", sq: "Demo · Admin",
  },
  eyebrow: {
    en: "Admin", el: "Admin", de: "Admin", fr: "Admin",
    it: "Admin", es: "Admin", nl: "Admin", pl: "Admin",
    pt: "Admin", sv: "Admin", sq: "Admin",
  },
  heading: {
    en: "Sign in", el: "Σύνδεση", de: "Anmelden", fr: "Connexion",
    it: "Accedi", es: "Iniciar sesión", nl: "Inloggen", pl: "Zaloguj się",
    pt: "Iniciar sessão", sv: "Logga in", sq: "Hyr",
  },
  sub_demo: {
    en: "This is a live demo. Click below to sign in instantly, or paste the credentials yourself.",
    el: "Αυτό είναι ζωντανό demo. Κάντε κλικ παρακάτω για άμεση σύνδεση ή εισάγετε τα στοιχεία χειροκίνητα.",
    de: "Das ist eine Live-Demo. Klick unten für die sofortige Anmeldung oder gib die Zugangsdaten selbst ein.",
    fr: "Ceci est une démo en direct. Cliquez ci-dessous pour vous connecter aussitôt, ou saisissez les identifiants vous-même.",
    it: "Questa è una demo dal vivo. Clicca qui sotto per accedere subito, oppure inserisci tu le credenziali.",
    es: "Esto es una demo en vivo. Haz clic abajo para entrar al instante, o pega las credenciales tú mismo.",
    nl: "Dit is een live demo. Klik hieronder om meteen in te loggen, of vul de gegevens zelf in.",
    pl: "To jest demo na żywo. Kliknij poniżej, aby zalogować się od razu, lub wpisz dane samodzielnie.",
    pt: "Isto é uma demo ao vivo. Clica abaixo para entrar de imediato, ou introduz tu as credenciais.",
    sv: "Det här är en live-demo. Klicka nedan för att logga in direkt, eller fyll i uppgifterna själv.",
    sq: "Kjo është një demo e drejtpërdrejtë. Kliko më poshtë për të hyrë menjëherë, ose vendos vetë kredencialet.",
  },
  sub: {
    en: "Enter the staff password to manage today’s bookings.",
    el: "Εισάγετε τον κωδικό προσωπικού για να διαχειριστείτε τα ραντεβού.",
    de: "Gib das Mitarbeiterpasswort ein, um die heutigen Buchungen zu verwalten.",
    fr: "Saisissez le mot de passe du personnel pour gérer les rendez-vous du jour.",
    it: "Inserisci la password dello staff per gestire le prenotazioni di oggi.",
    es: "Introduce la contraseña del personal para gestionar las reservas de hoy.",
    nl: "Vul het personeelswachtwoord in om de boekingen van vandaag te beheren.",
    pl: "Wpisz hasło personelu, aby zarządzać dzisiejszymi rezerwacjami.",
    pt: "Introduz a palavra-passe do staff para gerir as marcações de hoje.",
    sv: "Ange personalens lösenord för att hantera dagens bokningar.",
    sq: "Vendos fjalëkalimin e stafit për të menaxhuar rezervimet e sotme.",
  },
  demo_label: {
    en: "Demo credentials", el: "Στοιχεία demo", de: "Demo-Zugangsdaten", fr: "Identifiants démo",
    it: "Credenziali demo", es: "Credenciales de la demo", nl: "Demogegevens", pl: "Dane demo",
    pt: "Credenciais da demo", sv: "Demo-uppgifter", sq: "Kredencialet e demos",
  },
  demo_email: {
    en: "email", el: "email", de: "E-Mail", fr: "e-mail",
    it: "email", es: "email", nl: "e-mail", pl: "e-mail",
    pt: "email", sv: "e-post", sq: "email",
  },
  demo_password: {
    en: "password", el: "κωδικός", de: "Passwort", fr: "mot de passe",
    it: "password", es: "contraseña", nl: "wachtwoord", pl: "hasło",
    pt: "palavra-passe", sv: "lösenord", sq: "fjalëkalimi",
  },
  forgot: {
    en: "Forgot password?", el: "Ξεχάσατε τον κωδικό;", de: "Passwort vergessen?", fr: "Mot de passe oublié ?",
    it: "Password dimenticata?", es: "¿Olvidaste la contraseña?", nl: "Wachtwoord vergeten?", pl: "Nie pamiętasz hasła?",
    pt: "Esqueceu-se da palavra-passe?", sv: "Glömt lösenordet?", sq: "Harruat fjalëkalimin?",
  },
} satisfies Record<string, Record<string, string>>;

export default async function LoginPage() {
  const [isDemo, settings, lang] = await Promise.all([
    Promise.resolve(isDemoMode()),
    loadSettings(),
    detectLang(undefined),
  ]);
  // A showcase tenant (e.g. the template2 demo) gets the same one-click demo
  // login as the built-in __demo__ showcase: its admin is the demo account.
  const demo = isDemo || settings.demoShowcase === true;
  const showSeed = !demo && !settings.onboarded;
  const l = lang === "el" ? "el" : "en";
  const t = (k: keyof typeof copy) => copy[k][l];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0806] px-6">
      <a
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-widest text-white/70 backdrop-blur hover:border-[#c9a961] hover:text-[#c9a961]"
      >
        ← {l === "el" ? "Ιστότοπος" : "Back to website"}
      </a>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-[#c9a961]">
          {demo ? t("eyebrow_demo") : t("eyebrow")}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-white">
          {t("heading")}
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {demo ? t("sub_demo") : t("sub")}
        </p>

        {demo && (
          <div className="mt-6 rounded-xl border border-[#c9a961]/40 bg-[#c9a961]/[0.07] p-4">
            <p className="text-xs uppercase tracking-widest text-[#c9a961]">
              {t("demo_label")}
            </p>
            <div className="mt-2 space-y-1 font-mono text-xs text-white/80">
              <div>{t("demo_email")}: <span className="text-[#c9a961]">{DEMO_ADMIN_EMAIL}</span></div>
              <div>{t("demo_password")}: <span className="text-[#c9a961]">{DEMO_ADMIN_PASSWORD}</span></div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <LoginForm
            demoMode={demo}
            demoEmail={demo ? DEMO_ADMIN_EMAIL : undefined}
            demoPassword={demo ? DEMO_ADMIN_PASSWORD : undefined}
          />
        </div>

        {!demo && (
          <p className="mt-4 text-right">
            <a
              href="/admin/reset"
              className="text-xs text-white/60 hover:text-[#c9a961]"
            >
              {t("forgot")}
            </a>
          </p>
        )}

        {showSeed && (
          <p className="mt-6 text-xs text-white/55">
            {l === "el"
              ? <>Προεπιλεγμένος admin: <code className="text-[#c9a961]">admin@yoursalon.local</code> / <code className="text-[#c9a961]">change-me</code>. Αλλάξτε τον από την καρτέλα Ρυθμίσεις μετά την πρώτη σύνδεση.</>
              : <>Default admin: <code className="text-[#c9a961]">admin@yoursalon.local</code> / <code className="text-[#c9a961]">change-me</code>. Change it from the Settings tab after first login.</>
            }
          </p>
        )}
      </div>
    </main>
  );
}
