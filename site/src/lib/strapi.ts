// Client Strapi utilisé au build (SSG). Les réponses sont mémorisées pour toute la durée du build.

/** URL de Strapi vue depuis le build (réseau Docker interne en local). */
export const STRAPI_URL = (process.env.STRAPI_URL ?? import.meta.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '');
/** URL de Strapi vue par le navigateur (filtres d'offres, inscriptions). */
export const PUBLIC_STRAPI_URL = (process.env.PUBLIC_STRAPI_URL ?? import.meta.env.PUBLIC_STRAPI_URL ?? STRAPI_URL).replace(/\/+$/, '');

type Params = Record<string, string | number | boolean>;

// Cache court : pendant un build, une même requête (paramètres, menus…) n'est faite qu'une fois ; un serveur qui reste
// lancé (développement, aperçu des brouillons) relit Strapi au bout de quelques secondes.
const DUREE_CACHE_MS = 10_000;
const cache = new Map<string, { instant: number; promesse: Promise<any> }>();

async function requete(chemin: string, params: Params = {}): Promise<any> {
  const url = new URL(`/api/${chemin}`, STRAPI_URL);
  for (const [cle, valeur] of Object.entries(params)) url.searchParams.set(cle, String(valeur));
  const cle = url.toString();
  const enCache = cache.get(cle);
  if (!enCache || Date.now() - enCache.instant > DUREE_CACHE_MS) {
    cache.set(cle, {
      instant: Date.now(),
      promesse: fetch(cle).then(async (reponse) => {
        if (reponse.status === 404) return { data: null };
        if (!reponse.ok) throw new Error(`Strapi ${reponse.status} sur ${cle} : ${await reponse.text()}`);
        return reponse.json();
      }),
    });
  }
  return cache.get(cle)!.promesse;
}

/** Single type (paramètres, menus, accueil…) avec population complète. */
export async function lireUnique<T>(type: string): Promise<T | null> {
  const json = await requete(type, { populate: 'deep' });
  return json.data ?? null;
}

/** Tous les documents publiés d'une collection (toutes pages confondues). */
export async function lireTous<T>(type: string, params: Params = {}): Promise<T[]> {
  const resultats: T[] = [];
  for (let page = 1; ; page++) {
    const json = await requete(type, {
      populate: 'deep',
      'pagination[page]': page,
      'pagination[pageSize]': 100,
      ...params,
    });
    resultats.push(...(json.data ?? []));
    const { pageCount = 1 } = json.meta?.pagination ?? {};
    if (page >= pageCount) return resultats;
  }
}

/**
 * Version brouillon (ou publiée) d'un document, pour la page d'aperçu du BO. Jamais mise en cache.
 * Strapi n'accepte « status=draft » qu'avec le secret d'aperçu (middleware « brouillons »).
 */
export async function lireBrouillon<T>(type: string, documentId: string, statut: 'draft' | 'published', unique: boolean): Promise<T | null> {
  const url = new URL(`/api/${type}`, STRAPI_URL);
  url.searchParams.set('populate', 'deep');
  url.searchParams.set('status', statut);
  if (!unique) url.searchParams.set('filters[documentId][$eq]', documentId);
  const reponse = await fetch(url, { headers: { 'X-Apercu': process.env.APERCU_SECRET ?? '' } });
  if (!reponse.ok) return null;
  const { data } = await reponse.json();
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

// ---------- Types partagés ----------

export interface Media {
  url: string;
  alternativeText: string | null;
  width: number | null;
  height: number | null;
  mime?: string;
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
