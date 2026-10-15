// Calculs sur la liste des offres, faits une seule fois par build : 90 000 offres imposent des traitements en O(n),
// jamais un parcours de toute la liste par page. Fonctions pures, testées.

/** Champs qui suffisent aux cartes, listes, compteurs et plans de site (sans descriptions HTML). */
export interface OffreLegere {
  id: number;
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  secteur: string | null;
  nomEntreprise: string | null;
  salaire: string | null;
  dateActivation: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  aLaUne: boolean;
  entreprise: { nom: string; slug: string } | null;
  /** Position dans la lecture de Strapi (tri par id) : retrouve la page d'API qui contient l'offre complète. */
  rang: number;
}

/** « À la une » d'abord, puis les plus récentes ; l'id départage les offres de même date (ordre stable). */
export function comparerOffres(a: OffreLegere, b: OffreLegere): number {
  if (a.aLaUne !== b.aLaUne) return a.aLaUne ? -1 : 1;
  const da = a.dateActivation ?? '';
  const db = b.dateActivation ?? '';
  if (da !== db) return da < db ? 1 : -1;
  return b.id - a.id;
}

export interface Facettes {
  total: number;
  contrats: string[];
  secteurs: string[];
  /** Nombre d'offres par type de contrat. */
  parContrat: Map<string, number>;
  employeurs: number;
}

const trierFr = (valeurs: Iterable<string>) => [...valeurs].sort((a, b) => a.localeCompare(b, 'fr'));

/** Contrats, secteurs, employeurs et comptes par contrat, en un seul passage. */
export function calculerFacettes(offres: OffreLegere[]): Facettes {
  const parContrat = new Map<string, number>();
  const secteurs = new Set<string>();
  const employeurs = new Set<string>();
  for (const o of offres) {
    if (o.typeContrat) parContrat.set(o.typeContrat, (parContrat.get(o.typeContrat) ?? 0) + 1);
    if (o.secteur) secteurs.add(o.secteur);
    if (o.nomEntreprise) employeurs.add(o.nomEntreprise);
  }
  return { total: offres.length, contrats: trierFr(parContrat.keys()), secteurs: trierFr(secteurs), parContrat, employeurs: employeurs.size };
}

/** Nombre d'offres par nom d'entreprise (« Voir ses N offres »). */
export function compterParEntreprise(offres: OffreLegere[]): Map<string, number> {
  const comptes = new Map<string, number>();
  for (const o of offres) if (o.nomEntreprise) comptes.set(o.nomEntreprise, (comptes.get(o.nomEntreprise) ?? 0) + 1);
  return comptes;
}

/**
 * Offres similaires : même secteur d'abord, puis même contrat (les plus récentes de `offres`, déjà triées).
 * Les listes par secteur et par contrat sont construites une fois ; chaque offre n'en lit que les premières entrées.
 */
export function creerSimilaires(offres: OffreLegere[], nombre = 3): (offre: OffreLegere) => OffreLegere[] {
  const parSecteur = new Map<string, OffreLegere[]>();
  const parContrat = new Map<string, OffreLegere[]>();
  const ajouter = (index: Map<string, OffreLegere[]>, cle: string | null, o: OffreLegere) => {
    if (!cle) return;
    const liste = index.get(cle);
    // Seules les premières entrées servent : de quoi en écarter l'offre elle-même et les doublons.
    if (!liste) index.set(cle, [o]);
    else if (liste.length < nombre + 1) liste.push(o);
  };
  for (const o of offres) {
    ajouter(parSecteur, o.secteur, o);
    ajouter(parContrat, o.typeContrat, o);
  }
  return (offre) => {
    const retenues: OffreLegere[] = [];
    for (const liste of [offre.secteur ? parSecteur.get(offre.secteur) : null, offre.typeContrat ? parContrat.get(offre.typeContrat) : null]) {
      for (const o of liste ?? []) {
        if (retenues.length >= nombre) break;
        if (o.slug !== offre.slug && !retenues.includes(o)) retenues.push(o);
      }
    }
    return retenues;
  };
}
