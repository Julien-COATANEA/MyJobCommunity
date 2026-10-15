// Cookies et outils de mesure (écran « Cookies et suivi » du BO) : Google Tag Manager, Google Analytics et scripts
// personnalisés. Les outils soumis au consentement (GTM, GA, et les scripts sauf « sans consentement ») sont toujours
// rangés dans des <template> et ne s'exécutent qu'après « Tout accepter » (voir components/BandeauCookies.astro) ;
// les autres sont écrits tels quels. Le bandeau s'affiche dès qu'un outil attend l'accord, même si l'option
// « Toujours afficher le bandeau » du BO est décochée : sans lui, ces outils ne pourraient jamais être activés.

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
  const head: CodeSuivi[] = [];
  const body: CodeSuivi[] = [];

  const gtm = r.googleTagManagerId?.trim().toUpperCase();
  if (gtm && GTM.test(gtm)) head.push({ code: codeTagManager(gtm), differe: true });
  const ga = r.googleAnalyticsId?.trim().toUpperCase();
  if (ga && GA4.test(ga)) head.push({ code: codeAnalytics(ga), differe: true });

  for (const s of r.scripts ?? []) {
    if (s.actif === false || !s.code?.trim()) continue;
    (s.emplacement === 'body' ? body : head).push({ code: s.code.trim(), differe: s.consentement !== false });
  }
  return { head, body };
}

/** Le bandeau de consentement est utile dès qu'un code attend l'accord du visiteur. */
export const bandeauNecessaire = (codes: { head: CodeSuivi[]; body: CodeSuivi[] }) =>
  [...codes.head, ...codes.body].some((c) => c.differe);

export interface OutilCookie {
  nom: string;
  finalite: string;
  /** Noms des cookies déposés (affichés en code). */
  cookies: string[];
  /** Précision affichée sous les cookies, ou seule explication quand la liste est vide. */
  precision?: string;
  duree: string;
  consentement: string;
  /** Le consentement du visiteur est nécessaire avant le dépôt. */
  requis: boolean;
  /** Information complémentaire, listée sous le tableau. */
  note?: string;
}

/** Outils réellement présents sur le site, pour le bloc « Cookies et traceurs utilisés » (mêmes règles que codesSuivi). */
export function outilsCookies(r: ReglagesSuivi): OutilCookie[] {
  const outils: OutilCookie[] = [
    {
      nom: 'Mémorisation de votre choix',
      finalite: 'Conserver votre choix d’accepter ou de refuser les cookies',
      cookies: ['mjc-cookies'],
      precision: 'Stockage local de votre navigateur (localStorage), pas un cookie',
      duree: '6 mois',
      consentement: 'Non requis (strictement nécessaire)',
      requis: false,
    },
  ];

  const ga = r.googleAnalyticsId?.trim().toUpperCase();
  if (ga && GA4.test(ga)) {
    outils.push({
      nom: 'Google Analytics (Google Ireland Ltd)',
      finalite: 'Mesure d’audience',
      cookies: ['_ga', `_ga_${ga.slice(2)}`],
      duree: 'Jusqu’à 2 ans (réglage Google Analytics ; 13 mois recommandés par la CNIL)',
      consentement: 'Requis',
      requis: true,
      note: 'Google Analytics : les données de mesure peuvent être transférées hors de l’Union européenne (États-Unis), dans le cadre des garanties prévues par Google.',
    });
  }

  const gtm = r.googleTagManagerId?.trim().toUpperCase();
  if (gtm && GTM.test(gtm)) {
    outils.push({
      nom: 'Google Tag Manager',
      finalite: 'Gestionnaire de balises : charge les outils configurés dans son conteneur',
      cookies: [],
      precision: 'Aucun cookie en propre ; les outils qu’il charge peuvent en déposer',
      duree: 'Selon les outils chargés',
      consentement: 'Requis',
      requis: true,
    });
  }

  for (const s of r.scripts ?? []) {
    if (s.actif === false || !s.code?.trim()) continue;
    const requis = s.consentement !== false;
    outils.push({
      nom: s.nom?.trim() || 'Outil du site',
      finalite: 'Outil ajouté par le site (voir la documentation du fournisseur)',
      cookies: [],
      precision: 'Selon le fournisseur',
      duree: 'Selon le fournisseur',
      consentement: requis ? 'Requis' : 'Non requis',
      requis,
    });
  }
  return outils;
}
