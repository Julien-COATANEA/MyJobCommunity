// Géocodage des villes des offres (service national de la Géoplateforme IGN, gratuit et sans clé).
// Les résultats sont mémorisés : chaque ville n'est demandée qu'une fois.
import type { Core } from '@strapi/strapi';

export interface Position { latitude: number; longitude: number }

const URL_GEOCODAGE = 'https://data.geopf.fr/geocodage/search';
const SCORE_MIN = 0.5;
// Erreurs d'affilée (panne, sortie réseau filtrée) au-delà desquelles le géocodeur n'est plus appelé jusqu'à la fin de
// la synchronisation : sinon chaque ville attendrait son délai (8 s), pendant des heures avec des milliers de villes.
const ERREURS_MAX = 10;

const magasin = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'mjc', key: 'geocodage' });

/** « Rhône (69) » → « 69 » : le département sert à départager les homonymes. */
const codeDepartement = (departement: string | null) => departement?.match(/\((\d{2,3}|2[AB])\)/)?.[1] ?? null;

async function interroger(ville: string, departement: string | null): Promise<Position | null> {
  const parametres = new URLSearchParams({ q: ville, type: 'municipality', limit: '5' });
  const reponse = await fetch(`${URL_GEOCODAGE}?${parametres}`, { signal: AbortSignal.timeout(8000) });
  // Limite de débit (429) ou panne : erreur passagère, la ville n'est pas mémorisée comme introuvable.
  if (reponse.status === 429 || reponse.status >= 500) throw new Error(`géocodeur IGN : ${reponse.status}`);
  if (!reponse.ok) return null;
  const { features = [] } = (await reponse.json()) as { features?: any[] };
  const dep = codeDepartement(departement);
  const candidats = features.filter((f) => f.properties?.score >= SCORE_MIN);
  const choisi = (dep && candidats.find((f) => String(f.properties?.postcode ?? '').startsWith(dep))) ?? candidats[0];
  if (!choisi) return null;
  const [longitude, latitude] = choisi.geometry.coordinates;
  return { latitude, longitude };
}

export async function creerGeocodeur(strapi: Core.Strapi) {
  const cache: Record<string, Position | null> = ((await magasin(strapi).get({})) as any) ?? {};
  let modifie = false;
  // Villes en erreur passagère : pas redemandées pendant cette synchronisation (la boucle d'import repasse par chaque offre).
  const enErreur = new Set<string>();
  let erreursDAffilee = 0;
  let horsService = false;

  return {
    async positionner(ville: string | null, departement: string | null): Promise<Position | null> {
      if (!ville) return null;
      const cle = `${ville.toLowerCase()}|${codeDepartement(departement) ?? ''}`;
      if (cle in cache) return cache[cle];
      if (horsService || enErreur.has(cle)) return null;
      try {
        cache[cle] = await interroger(ville, departement);
        erreursDAffilee = 0;
      } catch (e) {
        // Erreur passagère : la ville n'est pas mémorisée, on réessaiera à la prochaine synchronisation.
        enErreur.add(cle);
        strapi.log.warn(`[geocodage] ${ville} : ${(e as Error).message}`);
        if (++erreursDAffilee >= ERREURS_MAX && !horsService) {
          horsService = true;
          strapi.log.error(`[geocodage] ${ERREURS_MAX} erreurs d'affilée : géocodeur IGN abandonné pour cette synchronisation (offres importées sans position)`);
        }
        return null;
      }
      modifie = true;
      return cache[cle];
    },
    /**
     * Géocode d'avance les villes encore inconnues, quelques-unes à la fois (le service IGN limite à 50 appels par
     * seconde) : la boucle d'import n'attend alors plus le réseau offre par offre.
     */
    async preparer(lieux: { lieu: string | null; departement: string | null }[], simultanes = 5) {
      const aFaire = new Map<string, { lieu: string; departement: string | null }>();
      for (const { lieu, departement } of lieux) {
        if (!lieu) continue;
        const cle = `${lieu.toLowerCase()}|${codeDepartement(departement) ?? ''}`;
        if (!(cle in cache) && !aFaire.has(cle)) aFaire.set(cle, { lieu, departement });
      }
      const file = [...aFaire.values()];
      await Promise.all(
        Array.from({ length: Math.min(simultanes, file.length) }, async () => {
          for (let l = file.pop(); l && !horsService; l = file.pop()) {
            // ~40 appels par seconde au plus avec 5 appels simultanés (limite IGN : 50 par seconde).
            await Promise.all([this.positionner(l.lieu, l.departement), new Promise((r) => setTimeout(r, 125))]);
          }
        }),
      );
      return aFaire.size;
    },
    async enregistrer() {
      if (modifie) await magasin(strapi).set({ value: cache });
    },
  };
}
