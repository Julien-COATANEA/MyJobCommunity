// Données structurées schema.org « JobPosting » d'une offre (Google for Jobs).
// Fonctions pures, testées. Règle suivie : mieux vaut omettre une propriété que l'inventer ou la deviner,
// Google rejette (ou déclasse) une annonce dont les valeurs sont fausses.

export interface DonneesJobPosting {
  titre: string;
  sourceId: string;
  /** HTML déjà nettoyé (balises de mise en forme seulement). */
  descriptionHtml: string;
  resume: string;
  typeContrat: string | null;
  lieu: string | null;
  departement: string | null;
  secteur: string | null;
  salaire: string | null;
  nomEntreprise: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  dateActivation: string | null;
  dateFinPublication: string | null;
  /** Adresse de la page de l'offre sur le site. */
  urlOffre: string;
  /** Site web de l'entreprise (annuaire), s'il est connu. */
  urlEntreprise: string | null;
  nomSite: string;
  /** Adresse où le candidat postule : sur le site Gestmax, pas sur ce site (directApply = false). */
  directApply?: boolean;
}

const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Valeurs acceptées par Google : FULL_TIME, PART_TIME, CONTRACTOR, TEMPORARY, INTERN, VOLUNTEER, PER_DIEM, OTHER. */
const TYPES_EMPLOI: [RegExp, string][] = [
  [/\btemps partiel\b/, 'PART_TIME'],
  [/\b(stage|stagiaire)\b/, 'INTERN'],
  [/\b(benevolat|benevole|volontariat)\b/, 'VOLUNTEER'],
  [/\b(freelance|independant|prestation|consultant)\b/, 'CONTRACTOR'],
  [/\b(cdd|interim|saisonnier|temporaire|mission)\b/, 'TEMPORARY'],
  [/\b(alternance|apprentissage|professionnalisation)\b/, 'OTHER'],
  [/\b(cdi|temps plein)\b/, 'FULL_TIME'],
];

/** « CDI », « Stage », « CDD - temps partiel »… → liste de valeurs `employmentType` (vide si inconnu). */
export function typesEmploi(contrat: string | null): string[] {
  if (!contrat) return [];
  const texte = normaliser(contrat);
  const trouves = new Set<string>();
  for (const [motif, type] of TYPES_EMPLOI) if (motif.test(texte)) trouves.add(type);
  // « CDI » et « Temps partiel » ensemble : le temps partiel est plus précis que le temps plein.
  if (trouves.has('PART_TIME')) trouves.delete('FULL_TIME');
  return [...trouves];
}

const UNITES: [RegExp, string][] = [
  [/\b(heure|horaire)\b|\/\s*h\b/, 'HOUR'],
  [/\b(jour|journalier)\b|\/\s*j\b/, 'DAY'],
  [/\bsemaine\b/, 'WEEK'],
  [/\bmois\b|\/\s*m\b/, 'MONTH'],
  [/\b(an|annee|annuel|annuelle)\b|\/\s*an\b/, 'YEAR'],
];

/**
 * « 50-55 K€ », « plus de 100 K€ », « 35 000 - 40 000 € brut/an », « 2 500 € / mois » → `baseSalary` schema.org.
 * Renvoie null quand le texte n'est pas un montant clair (« selon profil », « à négocier »…).
 */
export function salaireJobPosting(salaire: string | null): Record<string, unknown> | null {
  if (!salaire) return null;
  const texte = normaliser(salaire).replace(/ /g, ' ');
  if (!/€|eur/.test(texte)) return null;

  const montants: number[] = [];
  const motif = /(\d{1,3}(?:[ .]\d{3})+|\d+)(?:[.,](\d{1,2}))?\s*(k)?(?![\d])/g;
  for (const m of texte.matchAll(motif)) {
    let valeur = Number(`${m[1].replace(/[ .]/g, '')}${m[2] ? `.${m[2]}` : ''}`);
    if (m[3] === 'k') valeur *= 1000;
    montants.push(valeur);
  }
  // Un « k » collé au dernier montant vaut pour toute la fourchette : « 50-55 K€ ».
  if (montants.length === 2 && /\d\s*-\s*\d+(?:[.,]\d+)?\s*k/.test(texte) && montants[0] < 1000) montants[0] *= 1000;
  if (!montants.length || montants.length > 2 || montants.some((v) => !Number.isFinite(v) || v <= 0)) return null;

  const unite = UNITES.find(([re]) => re.test(texte))?.[1] ?? (Math.min(...montants) >= 10_000 ? 'YEAR' : null);
  // Sans unité et un petit montant (« 2 500 € »), annuel ou mensuel ? On ne devine pas.
  if (!unite) return null;

  const [min, max] = montants.length === 2 ? [Math.min(...montants), Math.max(...montants)] : [montants[0], montants[0]];
  const plancher = /\b(plus de|a partir de|minimum|min)\b/.test(texte);
  const valeur: Record<string, unknown> = { '@type': 'QuantitativeValue', unitText: unite };
  if (montants.length === 2) Object.assign(valeur, { minValue: min, maxValue: max });
  else if (plancher) Object.assign(valeur, { minValue: min });
  else Object.assign(valeur, { value: min });
  return { '@type': 'MonetaryAmount', currency: 'EUR', value: valeur };
}

/** Date ISO 8601 complète (avec fuseau, comme Google le recommande) ; null si illisible. */
const dateIso = (valeur: string | null) => {
  if (!valeur) return null;
  const d = new Date(valeur);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Les valeurs vides sont retirées : « undefined » n'apparaît pas, et un champ vide ne signale pas de fausse information. */
const sansVides = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '')) as T;

export function construireJobPosting(d: DonneesJobPosting): Record<string, unknown> {
  const emploi = typesEmploi(d.typeContrat);
  const employeur = d.nomEntreprise ?? d.nomSite;
  const datePosted = dateIso(d.dateActivation);
  const validThrough = dateIso(d.dateFinPublication);
  // Une date de fin antérieure à la date de publication est une saisie incohérente : on l'omet.
  const encoreValide = validThrough && (!datePosted || validThrough >= datePosted) ? validThrough : null;

  return sansVides({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: d.titre,
    description: d.descriptionHtml || d.resume,
    identifier: { '@type': 'PropertyValue', name: employeur, value: d.sourceId },
    url: d.urlOffre,
    datePosted,
    validThrough: encoreValide,
    employmentType: emploi.length ? (emploi.length === 1 ? emploi[0] : emploi) : null,
    industry: d.secteur,
    hiringOrganization: sansVides({
      '@type': 'Organization',
      name: employeur,
      sameAs: d.urlEntreprise,
      logo: d.logoUrl,
    }),
    jobLocation: {
      '@type': 'Place',
      address: sansVides({
        '@type': 'PostalAddress',
        addressLocality: d.lieu,
        // « FRANCE » (offre sans zone précise dans Gestmax) n'est pas une région.
        addressRegion: d.departement && normaliser(d.departement).trim() !== 'france' ? d.departement : null,
        addressCountry: 'FR',
      }),
      ...(d.latitude != null && d.longitude != null ? { geo: { '@type': 'GeoCoordinates', latitude: d.latitude, longitude: d.longitude } } : {}),
    },
    baseSalary: salaireJobPosting(d.salaire),
    directApply: d.directApply ?? false,
  });
}
