// Cookies et outils de mesure (écran « Cookies et suivi » du BO) : Google Tag Manager, Google Analytics et scripts
// personnalisés. Avec le bandeau actif, les scripts soumis au consentement sont rangés dans des <template> et ne
// s'exécutent qu'après « Tout accepter » (voir components/BandeauCookies.astro) ; les autres sont écrits tels quels.

export interface ScriptPersonnalise {
  nom: string;
  code: string;
  emplacement: 'head' | 'body';
  actif?: boolean | null;
  consentement?: boolean | null;
}

export interface ReglagesSuivi {
  bandeauCookies?: boolean | null;
  googleTagManagerId?: string | null;
  googleAnalyticsId?: string | null;
  scripts?: ScriptPersonnalise[] | null;
}

export interface CodeSuivi {
  code: string;
  /** Attend l'accord du visiteur. */
  differe: boolean;
}

export const TEXTE_BANDEAU =
  'Nous utilisons des cookies pour mesurer la fréquentation du site et améliorer nos services. Vous pouvez les accepter ou les refuser : votre choix est conservé 6 mois.';

// Revérifiés ici : l'identifiant est écrit dans du JavaScript.
const GTM = /^GTM-[A-Z0-9]{4,12}$/;
const GA4 = /^G-[A-Z0-9]{4,15}$/;

export const codeTagManager = (id: string) =>
  `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
  `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
  `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');</script>`;

export const codeAnalytics = (id: string) =>
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>` +
  `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');</script>`;

/** Codes à placer dans le <head> et en fin de <body>, dans l'ordre. */
export function codesSuivi(r: ReglagesSuivi): { head: CodeSuivi[]; body: CodeSuivi[] } {
  const bandeau = !!r.bandeauCookies;
  const head: CodeSuivi[] = [];
  const body: CodeSuivi[] = [];

  const gtm = r.googleTagManagerId?.trim().toUpperCase();
  if (gtm && GTM.test(gtm)) head.push({ code: codeTagManager(gtm), differe: bandeau });
  const ga = r.googleAnalyticsId?.trim().toUpperCase();
  if (ga && GA4.test(ga)) head.push({ code: codeAnalytics(ga), differe: bandeau });

  for (const s of r.scripts ?? []) {
    if (s.actif === false || !s.code?.trim()) continue;
    (s.emplacement === 'body' ? body : head).push({ code: s.code.trim(), differe: bandeau && s.consentement !== false });
  }
  return { head, body };
}
