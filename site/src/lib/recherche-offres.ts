// Logique de recherche d'offres exécutée dans le navigateur (page /offres) : fonctions pures, testées.

export interface Filtres {
  q: string;
  lieu: string;
  /** Rayon en km autour de la ville ; vide = la ville seulement (recherche par nom). */
  rayon: string;
  contrat: string;
  secteur: string;
  entreprise: string;
  tri: 'recent' | 'ancien' | 'proche';
}

export const FILTRES_VIDES: Filtres = { q: '', lieu: '', rayon: '', contrat: '', secteur: '', entreprise: '', tri: 'recent' };
const CLES = Object.keys(FILTRES_VIDES) as (keyof Filtres)[];

export function lireFiltres(recherche: string): Filtres {
  const p = new URLSearchParams(recherche);
  const f = { ...FILTRES_VIDES };
  for (const cle of CLES) {
    const v = p.get(cle)?.trim();
    if (v) (f as any)[cle] = v;
  }
  if (!['recent', 'ancien', 'proche'].includes(f.tri)) f.tri = 'recent';
  return f;
}

/** Paramètres d'URL (seulement les filtres renseignés), pour partager ou revenir à une recherche. */
export function ecrireFiltres(f: Filtres): string {
  const p = new URLSearchParams();
  for (const cle of CLES) if (f[cle] && f[cle] !== FILTRES_VIDES[cle]) p.set(cle, f[cle]);
  return p.toString();
}

export const rechercheAutour = (f: Filtres) => !!(f.lieu && f.rayon);

export interface Position { latitude: number; longitude: number }
export interface Boite { latMin: number; latMax: number; lonMin: number; lonMax: number }

/** Rectangle contenant le cercle de rayon `km` (pré-filtre côté serveur, affiné ensuite par la distance). */
export function boiteEnglobante({ latitude, longitude }: Position, km: number): Boite {
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.cos((latitude * Math.PI) / 180));
  return { latMin: latitude - dLat, latMax: latitude + dLat, lonMin: longitude - dLon, lonMax: longitude + dLon };
}

/** Distance à vol d'oiseau (formule de haversine), en km. */
export function distanceKm(a: Position, b: Position): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const CHAMPS_CARTE = ['titre', 'slug', 'typeContrat', 'lieu', 'nomEntreprise', 'salaire', 'dateActivation', 'logoUrl', 'latitude', 'longitude'];

interface OptionsRequete {
  page: number;
  parPage: number;
  /** Filtre géographique (recherche autour d'une ville). */
  boite?: Boite | null;
  /** Ignorer le filtre de contrat (pour compter les offres par contrat). */
  sansContrat?: boolean;
}

/** Requête REST Strapi (/api/offres) correspondant aux filtres. */
export function requeteStrapi(f: Filtres, { page, parPage, boite, sansContrat = false }: OptionsRequete): URLSearchParams {
  const p = new URLSearchParams({
    sort: f.tri === 'ancien' ? 'dateActivation:asc' : 'dateActivation:desc',
    'pagination[page]': String(page),
    'pagination[pageSize]': String(parPage),
  });
  CHAMPS_CARTE.forEach((champ, i) => p.set(`fields[${i}]`, champ));
  let n = 0;
  const et = (champ: string, op: string, valeur: string | number) => p.set(`filters[$and][${n++}][${champ}][${op}]`, String(valeur));

  if (f.contrat && !sansContrat) et('typeContrat', '$eq', f.contrat);
  if (f.secteur) et('secteur', '$eq', f.secteur);
  if (f.entreprise) et('nomEntreprise', '$eqi', f.entreprise);
  if (boite) {
    et('latitude', '$gte', boite.latMin.toFixed(4));
    et('latitude', '$lte', boite.latMax.toFixed(4));
    et('longitude', '$gte', boite.lonMin.toFixed(4));
    et('longitude', '$lte', boite.lonMax.toFixed(4));
  } else if (f.lieu) {
    et('lieu', '$containsi', f.lieu);
  }
  if (f.q) {
    ['titre', 'nomEntreprise', 'secteur'].forEach((champ, i) => p.set(`filters[$and][${n}][$or][${i}][${champ}][$containsi]`, f.q));
    n++;
  }
  return p;
}

/** Libellés des filtres actifs (pastilles retirables). */
export function filtresActifs(f: Filtres): { cle: keyof Filtres; libelle: string }[] {
  const actifs: { cle: keyof Filtres; libelle: string }[] = [];
  if (f.q) actifs.push({ cle: 'q', libelle: `« ${f.q} »` });
  if (f.lieu) actifs.push({ cle: 'lieu', libelle: f.rayon ? `${f.lieu} (${f.rayon} km)` : f.lieu });
  if (f.contrat) actifs.push({ cle: 'contrat', libelle: f.contrat });
  if (f.secteur) actifs.push({ cle: 'secteur', libelle: f.secteur });
  if (f.entreprise) actifs.push({ cle: 'entreprise', libelle: f.entreprise });
  return actifs;
}
