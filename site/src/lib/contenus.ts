// Accès typés aux contenus Strapi.
import { compter, lirePage, lireTous, lireUnique, memoiser, TAILLE_PAGE, type Media, type Seo } from './strapi';
import { calculerFacettes, comparerOffres, compterParEntreprise, creerSimilaires, type OffreLegere } from './offres';
import type { Bloc } from './blocks';
import type { ScriptPersonnalise } from './suivi';

export type { OffreLegere };

export interface Lien { libelle: string; url: string; nouvelOnglet?: boolean | null }
export interface SousLien extends Lien { description?: string | null }
export interface EntreeMenu { id: number; libelle: string; url?: string | null; sousLiens: SousLien[] }

export interface Parametres {
  nomSite: string;
  baseline: string | null;
  logo: Media | null;
  logoTexte: string | null;
  favicon: Media | null;
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurTexte: string;
  couleurFond: string;
  policeTitres: string;
  policeTexte: string;
  arrondis: 'carres' | 'legers' | 'prononces';
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  // Pages légales (jetons {editeur}, {siret}… — voir lib/jetons-legaux.ts)
  editeurNom: string | null;
  editeurSiret: string | null;
  directeurPublication: string | null;
  hebergeurNom: string | null;
  hebergeurAdresse: string | null;
  hebergeurTelephone: string | null;
  contactDonneesEmail: string | null;
  prestataireNom: string | null;
  reseauxSociaux: { reseau: string; url: string }[];
  gestmaxUrlFront: string | null;
  lienEspaceCandidat: string | null;
  lienEspaceRecruteur: string | null;
  lienCandidatureSpontanee: string | null;
  seoParDefaut: Seo | null;
  bandeauCookies: boolean | null;
  texteBandeauCookies: string | null;
  lienPolitiqueCookies: string | null;
  googleTagManagerId: string | null;
  googleAnalyticsId: string | null;
  scripts: ScriptPersonnalise[] | null;
}

export interface Navigation {
  menuPrincipal: EntreeMenu[];
  liensPiedDePage: Lien[];
  liensLegaux: Lien[];
}

/** Composant d'une zone dynamique (bloc de page). */
export interface Section { __component: string; id: number; [cle: string]: any }

export interface Accueil {
  heroTitre: string;
  heroTexte: string | null;
  heroImage: Media | null;
  heroRecherche: boolean;
  sections: Section[];
  seo: Seo | null;
}

export interface PageOffres {
  titre: string | null;
  chapo: string | null;
  carte: boolean | null;
  affichage: 'colonnes' | 'lignes' | null;
  colonnes: number | null;
  offresParPage: number | null;
  afficherLogo: boolean | null;
  afficherSalaire: boolean | null;
  afficherDate: boolean | null;
  imageBandeauOffre: Media | null;
  sections: Section[];
  seo: Seo | null;
}

export interface Page {
  documentId: string;
  titre: string;
  slug: string;
  chapo: string | null;
  imageBandeau: Media | null;
  sections: Section[];
  seo: Seo | null;
  updatedAt: string;
}

export interface Article {
  documentId: string;
  titre: string;
  slug: string;
  datePublication: string;
  categorie: { nom: string; slug: string } | null;
  auteur?: string | null;
  extrait: string;
  image: Media | null;
  contenu: Bloc[];
  miseEnAvant: boolean;
  seo: Seo | null;
  updatedAt: string;
}

export interface Evenement {
  documentId: string;
  titre: string;
  slug: string;
  typeEvenement: string;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
  adresse: string | null;
  enLigne: boolean;
  extrait: string;
  image: Media | null;
  contenu: Bloc[] | null;
  programme?: { horaire: string; titre: string; description?: string | null }[] | null;
  inscriptionActive: boolean;
  placesMax: number | null;
  dateLimiteInscription: string | null;
  inscriptionExterneUrl: string | null;
  listeAttente: boolean;
  seo: Seo | null;
  updatedAt: string;
}

export interface Offre {
  documentId: string;
  sourceId: string;
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  departement: string | null;
  secteur: string | null;
  nomEntreprise: string | null;
  entreprise: { nom: string; slug: string; siteWeb?: string | null } | null;
  salaire: string | null;
  descriptionHtml: string | null;
  profilHtml: string | null;
  dateActivation: string | null;
  dateFinPublication: string | null;
  urlDetailGestmax: string | null;
  urlCandidature: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  aLaUne: boolean;
  updatedAt: string;
}

export interface Temoignage { citation: string; nom: string; role: string | null; photo: Media | null }

export interface Entreprise {
  documentId: string;
  nom: string;
  slug: string;
  secteur: { nom: string; slug: string } | null;
  ville: string;
  adresse: string | null;
  effectif: string | null;
  extrait: string;
  description: Bloc[] | null;
  logo: Media | null;
  image: Media | null;
  siteWeb: string | null;
  nomEntiteGestmax: string | null;
  miseEnAvant: boolean;
  /** Nombre d'offres en ligne rattachées à l'entreprise, et les plus récentes (de quoi remplir sa fiche). */
  nbOffres: number;
  offres: OffreLegere[];
  seo: Seo | null;
  updatedAt: string;
}

export const lireParametres = async () => {
  const p = await lireUnique<Parametres>('parametres');
  if (!p) throw new Error('Les « Paramètres du site » ne sont pas renseignés dans Strapi.');
  return p;
};
export const lireNavigation = async () =>
  (await lireUnique<Navigation>('navigation')) ?? { menuPrincipal: [], liensPiedDePage: [], liensLegaux: [] };
export const lireAccueil = () => lireUnique<Accueil>('accueil');
/** Réglages de la page /offres (« Ma page d'offres » du BO) ; null tant qu'elle n'a pas été enregistrée. */
export const lirePageOffres = () => lireUnique<PageOffres>('page-offres');
export const lirePages = () => lireTous<Page>('pages', { sort: 'titre:asc' });
export const lireArticles = () => lireTous<Article>('articles', { sort: 'datePublication:desc' });
export const lireEvenements = () => lireTous<Evenement>('evenements', { sort: 'dateDebut:asc' });
// ---------- Entreprises ----------

/** Fiches visibles sur la page d'une entreprise : les plus récentes seulement, un lien mène aux autres. */
export const OFFRES_PAR_ENTREPRISE = 6;

// Les entreprises ne sont pas peuplées avec leurs offres (une entreprise peut en avoir des milliers) : leurs plus
// récentes et leur nombre viennent de la liste légère des offres, lue une seule fois (pas un appel par entreprise).
// Les offres masquées sont écartées par l'API.
const POPULATE_ENTREPRISE: Record<string, string> = {
  'populate[secteur]': 'true',
  'populate[logo]': 'true',
  'populate[image]': 'true',
  'populate[seo][populate][metaImage]': 'true',
};

export const lireEntreprises = memoiser(async (): Promise<Entreprise[]> => {
  const [entreprises, offres] = await Promise.all([lireTous<Entreprise>('entreprises', { sort: 'nom:asc', ...POPULATE_ENTREPRISE }), lireOffres()]);
  // Liste déjà triée (à la une, plus récentes) : les premières de chaque entreprise sont celles à afficher.
  const parEntreprise = new Map<string, OffreLegere[]>();
  for (const o of offres) {
    const slug = o.entreprise?.slug;
    if (!slug) continue;
    const liste = parEntreprise.get(slug);
    if (liste) liste.push(o);
    else parEntreprise.set(slug, [o]);
  }
  for (const e of entreprises) {
    const siennes = parEntreprise.get(e.slug) ?? [];
    e.offres = siennes.slice(0, OFFRES_PAR_ENTREPRISE);
    e.nbOffres = siennes.length;
  }
  return entreprises;
}, 60_000);

// ---------- Offres ----------

const TRI_OFFRES = 'aLaUne:desc,dateActivation:desc,id:desc';
// Les offres masquées par la collectivité ne sont pas servies par l'API.
const CHAMPS_OFFRE_LEGERE = ['titre', 'slug', 'typeContrat', 'lieu', 'secteur', 'nomEntreprise', 'salaire', 'dateActivation', 'logoUrl', 'latitude', 'longitude', 'aLaUne'];
/** Entreprise d'une offre : slug et nom suffisent (lien vers la fiche, nom affiché). */
const POPULATE_ENTREPRISE_OFFRE = { 'populate[entreprise][fields][0]': 'slug', 'populate[entreprise][fields][1]': 'nom' } as const;
// Fiche complète : le site web de l'entreprise sert au `sameAs` des données structurées JobPosting.
const POPULATE_ENTREPRISE_FICHE_OFFRE = { ...POPULATE_ENTREPRISE_OFFRE, 'populate[entreprise][fields][2]': 'siteWeb' } as const;
const PARAMS_OFFRES_LEGERES: Record<string, string> = {
  ...Object.fromEntries(CHAMPS_OFFRE_LEGERE.map((c, i) => [`fields[${i}]`, c])),
  ...POPULATE_ENTREPRISE_OFFRE,
};

function versOffreLegere(o: any, rang: number): OffreLegere {
  return {
    id: o.id,
    titre: o.titre,
    slug: o.slug,
    typeContrat: o.typeContrat ?? null,
    lieu: o.lieu ?? null,
    secteur: o.secteur ?? null,
    nomEntreprise: o.nomEntreprise ?? null,
    salaire: o.salaire ?? null,
    dateActivation: o.dateActivation ?? null,
    logoUrl: o.logoUrl ?? null,
    // L'API renvoie les décimaux en texte.
    latitude: o.latitude == null ? null : Number(o.latitude),
    longitude: o.longitude == null ? null : Number(o.longitude),
    aLaUne: !!o.aLaUne,
    entreprise: o.entreprise ? { nom: o.entreprise.nom, slug: o.entreprise.slug } : null,
    rang,
  };
}

/**
 * Toutes les offres, en version légère (sans descriptions) : listes, compteurs, similaires, plan de site.
 * Lue par id (tri indexé, pas de tri coûteux côté base : 900 pages de 100), triée ici « à la une » puis récentes.
 * Une seule copie en mémoire pour tout le build ; la fiche complète d'une offre se lit à part (lireOffreComplete).
 */
export const lireOffres = memoiser(async (): Promise<OffreLegere[]> => {
  const brutes = await lireTous<any>('offres', { ...PARAMS_OFFRES_LEGERES, sort: 'id:asc' }, { enCache: false });
  return brutes.map(versOffreLegere).sort(comparerOffres);
}, 5 * 60_000);

/** Contrats, secteurs, employeurs et comptes de l'ensemble des offres (calculés une fois). */
export const lireFacettesOffres = memoiser(async () => calculerFacettes(await lireOffres()), 5 * 60_000);

/** Nombre d'offres par nom d'entreprise (calculé une fois). */
export const lireComptesParEntreprise = memoiser(async () => compterParEntreprise(await lireOffres()), 5 * 60_000);

/** Fonction « offres similaires » de la liste complète (index construits une fois). */
export const lireSimilaires = memoiser(async () => creerSimilaires(await lireOffres()), 5 * 60_000);

/** Nombre d'offres en ligne, sans lire la liste. */
export const lireNombreOffres = memoiser(() => compter('offres'));

/** Les offres les plus récentes (accueil), éventuellement d'un seul type de contrat : une requête, pas la liste entière. */
export async function lireDernieresOffres(nombre: number, typeContrat?: string | null): Promise<OffreLegere[]> {
  const json = await lirePage('offres', {
    ...PARAMS_OFFRES_LEGERES,
    sort: TRI_OFFRES,
    'pagination[pageSize]': Math.min(Math.max(nombre, 1), TAILLE_PAGE),
    'pagination[withCount]': false,
    ...(typeContrat ? { 'filters[typeContrat][$eq]': typeContrat } : {}),
  });
  return (json.data ?? []).map((o: any, i: number) => versOffreLegere(o, i));
}

/** Les plus récentes offres d'une entreprise et leur nombre (aperçu des brouillons). */
export async function lireOffresEntreprise(slug: string, nombre = OFFRES_PAR_ENTREPRISE) {
  const json = await lirePage('offres', { ...PARAMS_OFFRES_LEGERES, sort: TRI_OFFRES, 'filters[entreprise][slug][$eq]': slug, 'pagination[pageSize]': nombre });
  const offres: OffreLegere[] = (json.data ?? []).map((o: any, i: number) => versOffreLegere(o, i));
  return { offres, total: (json.meta?.pagination?.total ?? offres.length) as number };
}

// Fiches complètes (descriptions HTML) : jamais toutes en mémoire. Elles sont lues par pages de 100 (même ordre que
// la liste légère, donc `rang` indique la page) et seules les quelques dernières pages sont gardées : Astro génère les
// pages dans l'ordre de getStaticPaths, chaque page d'API ne sert donc qu'une fois.
const PAGES_GARDEES = 6;
const pagesCompletes = new Map<number, Promise<Offre[]>>();

function lirePageComplete(numero: number): Promise<Offre[]> {
  let promesse = pagesCompletes.get(numero);
  if (promesse) {
    pagesCompletes.delete(numero); // renouvelle sa place dans l'ordre d'ancienneté
  } else {
    promesse = lirePage('offres', { sort: 'id:asc', 'pagination[page]': numero, 'pagination[pageSize]': TAILLE_PAGE, ...POPULATE_ENTREPRISE_FICHE_OFFRE }, false)
      .then((json) => (json.data ?? []) as Offre[]);
    promesse.catch(() => pagesCompletes.delete(numero));
  }
  pagesCompletes.set(numero, promesse);
  while (pagesCompletes.size > PAGES_GARDEES) pagesCompletes.delete(pagesCompletes.keys().next().value!);
  return promesse;
}

/** Fiche complète d'une offre : page d'API indiquée par `rang`, ou, si les données ont bougé entre-temps, lecture par slug. */
export async function lireOffreComplete(slug: string, rang: number): Promise<Offre | null> {
  const numero = Math.floor(rang / TAILLE_PAGE) + 1;
  const enCours = lirePageComplete(numero);
  void lirePageComplete(numero + 1); // lecture en avance de la page suivante, pendant le rendu de celle-ci
  const page = await enCours;
  const trouvee = page.find((o) => o.slug === slug);
  if (trouvee) return trouvee;
  const json = await lirePage('offres', { 'filters[slug][$eq]': slug, 'pagination[pageSize]': 1, ...POPULATE_ENTREPRISE_FICHE_OFFRE }, false);
  if (!json.data?.[0]) console.warn(`[offres] « ${slug} » introuvable dans Strapi (supprimée pendant le build ?) : page générée avec les données de la liste`);
  return json.data?.[0] ?? null;
}

/** Événements à venir (ou en cours) à la date du build. */
export async function lireEvenementsAVenir(): Promise<Evenement[]> {
  const maintenant = Date.now();
  return (await lireEvenements()).filter((e) => new Date(e.dateFin ?? e.dateDebut).getTime() >= maintenant);
}

/** Chiffres réels du site, pour l'accroche de l'accueil et les jetons {offres}, {entreprises}, {evenements}. */
export async function lireCompteurs() {
  const [offres, entreprises, evenements] = await Promise.all([lireNombreOffres(), lireEntreprises(), lireEvenementsAVenir()]);
  return {
    offres,
    entreprises: entreprises.length,
    // Entreprises de l'annuaire qui ont au moins une offre en ligne (même calcul que la page /entreprises).
    recrutent: entreprises.filter((e) => e.nbOffres > 0).length,
    evenements: evenements.length,
  };
}

/** Remplace {offres}, {entreprises}, {recrutent} (entreprises ayant des offres) et {evenements} par les valeurs réelles. */
export function remplacerCompteurs(texte: string, compteurs: Record<string, number>): string {
  return texte.replace(/\{(offres|entreprises|recrutent|evenements)\}/g, (_m, cle) => new Intl.NumberFormat('fr-FR').format(compteurs[cle] ?? 0));
}
