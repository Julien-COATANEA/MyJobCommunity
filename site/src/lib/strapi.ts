// Client Strapi utilisé au build (SSG). Les réponses sont mémorisées pour toute la durée du build (voir DUREE_CACHE_MS).

/** URL de Strapi vue depuis le build (réseau Docker interne en local). */
export const STRAPI_URL = (process.env.STRAPI_URL ?? import.meta.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '');
/** URL de Strapi vue par le navigateur (filtres d'offres, inscriptions). */
export const PUBLIC_STRAPI_URL = (process.env.PUBLIC_STRAPI_URL ?? import.meta.env.PUBLIC_STRAPI_URL ?? STRAPI_URL).replace(/\/+$/, '');

type Params = Record<string, string | number | boolean>;

// Pendant un build (PROD), les réponses sont gardées pour toute la durée du processus : une même liste (90 000 offres,
// soit près de 900 requêtes) n'est lue qu'une fois, quel que soit le nombre de pages qui la demandent.
// Un serveur qui reste lancé (développement, aperçu des brouillons) relit Strapi au bout de quelques secondes.
// Cache permanent seulement pendant un build statique (variable posée par le builder) : le serveur d'aperçu des
// brouillons, lui aussi construit en production, doit relire Strapi.
const BUILD_STATIQUE = typeof process !== 'undefined' && process.env?.MJC_BUILD_STATIQUE === '1';
export const DUREE_CACHE_MS = BUILD_STATIQUE ? Infinity : 10_000;
const cache = new Map<string, { instant: number; promesse: Promise<any> }>();

const DELAI_REQUETE_MS = 60_000;
// Sept essais, 0,5 s puis 1 s, 2 s, 4 s, 8 s, 16 s : de quoi laisser à Strapi le temps de redémarrer (rechargement à chaud).
const ESSAIS = 7;
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET JSON avec nouvelles tentatives sur les erreurs passagères (réseau, 5xx, 429) : Strapi est parfois très sollicité. */
async function lireJson(url: string): Promise<any> {
  for (let essai = 1; ; essai++) {
    try {
      const reponse = await fetch(url, { signal: AbortSignal.timeout(DELAI_REQUETE_MS) });
      if (reponse.status === 404) return { data: null };
      if (!reponse.ok) {
        const erreur: any = new Error(`Strapi ${reponse.status} sur ${url} : ${(await reponse.text()).slice(0, 300)}`);
        erreur.passagere = reponse.status >= 500 || reponse.status === 429;
        throw erreur;
      }
      return await reponse.json();
    } catch (e: any) {
      const passagere = e.passagere ?? true; // erreur réseau ou délai dépassé
      if (!passagere || essai >= ESSAIS) throw e;
      await attendre(500 * 2 ** (essai - 1));
    }
  }
}

function urlApi(chemin: string, params: Params): string {
  const url = new URL(`/api/${chemin}`, STRAPI_URL);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, String(valeur));
  return url.toString();
}

async function requete(chemin: string, params: Params = {}, enCache = true): Promise<any> {
  const cle = urlApi(chemin, params);
  if (!enCache) return lireJson(cle);
  const existante = cache.get(cle);
  if (!existante || Date.now() - existante.instant > DUREE_CACHE_MS) {
    const promesse = lireJson(cle);
    cache.set(cle, { instant: Date.now(), promesse });
    // Un échec ne doit pas rester en mémoire : la requête suivante réessaie.
    promesse.catch(() => cache.get(cle)?.promesse === promesse && cache.delete(cle));
  }
  return cache.get(cle)!.promesse;
}

/**
 * Mémorise le résultat d'un calcul lourd (liste d'offres, comptages) comme les requêtes : pour tout le build en
 * production, `dureeDev` ms sinon. Évite de refaire le même travail à chaque page.
 */
export function memoiser<T>(fn: () => Promise<T>, dureeDev = DUREE_CACHE_MS): () => Promise<T> {
  let valeur: { instant: number; promesse: Promise<T> } | null = null;
  const duree = BUILD_STATIQUE ? Infinity : dureeDev;
  return () => {
    if (!valeur || Date.now() - valeur.instant > duree) {
      const promesse = fn();
      const entree = { instant: Date.now(), promesse };
      valeur = entree;
      promesse.catch(() => valeur === entree && (valeur = null));
    }
    return valeur.promesse;
  };
}

/** Single type (paramètres, menus, accueil…) avec population complète. */
export async function lireUnique<T>(type: string): Promise<T | null> {
  const json = await requete(type, { populate: 'deep' });
  return json.data ?? null;
}

/** Une page de résultats telle que Strapi la renvoie (`data` et `meta.pagination`). */
export const lirePage = (type: string, params: Params = {}, enCache = true) => requete(type, params, enCache);

/** Taille de page maximale de Strapi (`maxLimit` de config/api.ts). */
export const TAILLE_PAGE = 100;
/** Pages lues en même temps pour les grosses collections. */
const PAGES_EN_PARALLELE = 8;

interface OptionsTous {
  /** Garder les pages en cache (défaut). À désactiver pour une liste lourde déjà mémorisée ailleurs. */
  enCache?: boolean;
}

/**
 * Tous les documents d'une collection (toutes pages confondues). La première page donne le nombre de pages, les
 * suivantes sont lues par groupes en parallèle (90 000 offres : environ 900 pages). Ordre de Strapi conservé.
 * `populate=deep` par défaut, sauf si `params` contient ses propres clés `populate…` (projection légère).
 */
export async function lireTous<T>(type: string, params: Params = {}, { enCache = true }: OptionsTous = {}): Promise<T[]> {
  const base: Params = { 'pagination[pageSize]': TAILLE_PAGE, ...params };
  if (!Object.keys(base).some((cle) => cle.startsWith('populate'))) base.populate = 'deep';
  const lire = (page: number) => requete(type, { ...base, 'pagination[page]': page }, enCache);

  const premiere = await lire(1);
  const { pageCount = 1 } = premiere.meta?.pagination ?? {};
  const pages: any[][] = [premiere.data ?? []];
  for (let debut = 2; debut <= pageCount; debut += PAGES_EN_PARALLELE) {
    const numeros = Array.from({ length: Math.min(PAGES_EN_PARALLELE, pageCount - debut + 1) }, (_, i) => debut + i);
    for (const json of await Promise.all(numeros.map(lire))) pages.push(json.data ?? []);
  }
  return pages.flat();
}

/** Nombre de documents d'une collection (avec les mêmes filtres), sans les lire. */
export async function compter(type: string, filtres: Params = {}): Promise<number> {
  const json = await requete(type, { 'pagination[pageSize]': 1, 'pagination[withCount]': true, 'fields[0]': 'documentId', ...filtres });
  return json.meta?.pagination?.total ?? 0;
}

/**
 * Version brouillon (ou publiée) d'un document, pour la page d'aperçu du BO. Jamais mise en cache.
 * Strapi n'accepte « status=draft » qu'avec le secret d'aperçu (middleware « brouillons »).
 */
export async function lireBrouillon<T>(
  type: string,
  documentId: string,
  statut: 'draft' | 'published',
  unique: boolean,
  /** Édition visuelle : Strapi marque chaque texte de façon invisible pour qu'un clic dans l'aperçu ouvre le bon champ. */
  sourcesVisuelles = false,
): Promise<T | null> {
  const url = new URL(`/api/${type}`, STRAPI_URL);
  url.searchParams.set('populate', 'deep');
  url.searchParams.set('status', statut);
  if (!unique) url.searchParams.set('filters[documentId][$eq]', documentId);
  const entetes: Record<string, string> = { 'X-Apercu': process.env.APERCU_SECRET ?? '' };
  if (sourcesVisuelles) entetes['strapi-encode-source-maps'] = 'true';
  const reponse = await fetch(url, { headers: entetes });
  if (!reponse.ok) return null;
  const { data } = await reponse.json();
  const doc = (Array.isArray(data) ? data[0] : data) ?? null;
  return sourcesVisuelles ? (nettoyerDates(doc) as T | null) : doc;
}

/** Caractères invisibles que Strapi ajoute aux chaînes pour l'édition visuelle (encodage « stega »). */
const STEGA = /[​-‍﻿]/g;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

/** Retire ce marquage des dates : `new Date()` ne sait pas les lire, et une date formatée ne peut pas le garder. */
function nettoyerDates(valeur: unknown): unknown {
  if (typeof valeur === 'string') {
    const propre = valeur.replace(STEGA, '');
    return DATE_ISO.test(propre) ? propre : valeur;
  }
  if (Array.isArray(valeur)) return valeur.map(nettoyerDates);
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([cle, v]) => [cle, nettoyerDates(v)]));
  }
  return valeur;
}

// ---------- Types partagés ----------

export interface Media {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
  mime?: string;
  /** Légende saisie dans la médiathèque (galerie). */
  caption?: string | null;
}

export interface Seo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaImage?: Media | null;
  noIndex?: boolean | null;
}

/** URL absolue d'un média, pour le build (interne) ou le navigateur (public). */
export function urlMedia(media: Media | null | undefined, publique = false): string | null {
  if (!media?.url) return null;
  if (/^https?:\/\//.test(media.url)) return media.url;
  return `${publique ? PUBLIC_STRAPI_URL : STRAPI_URL}${media.url}`;
}
