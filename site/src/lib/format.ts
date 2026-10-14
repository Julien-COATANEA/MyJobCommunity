const FUSEAU = 'Europe/Paris';

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU }).format(new Date(iso));

export const formatDateLongue = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: FUSEAU }).format(new Date(iso));

export const formatHeure = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: FUSEAU }).format(new Date(iso)).replace(':', ' h ');

/** « 21 nov. » pour les pastilles de date. */
export function jourMois(iso: string): { jour: string; mois: string } {
  const d = new Date(iso);
  return {
    jour: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: FUSEAU }).format(d),
    mois: new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: FUSEAU }).format(d),
  };
}

export function horaireEvenement(debut: string, fin: string | null): string {
  if (!fin) return `${formatDateLongue(debut)}, ${formatHeure(debut)}`;
  const memeJour = formatDate(debut) === formatDate(fin);
  return memeJour
    ? `${formatDateLongue(debut)}, de ${formatHeure(debut)} à ${formatHeure(fin)}`
    : `Du ${formatDateLongue(debut)} au ${formatDateLongue(fin)}`;
}

/** « aujourd'hui », « hier », « il y a 3 jours », « il y a 2 semaines »… (calculé au build, rebuild quotidien). */
export function ilYA(iso: string, maintenant = Date.now()): string {
  const jours = Math.floor((maintenant - new Date(iso).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 30) return `il y a ${Math.floor(jours / 7)} semaine${jours >= 14 ? 's' : ''}`;
  return `le ${formatDate(iso)}`;
}

/** Offre publiée depuis moins de 7 jours. */
export const estNouveau = (iso: string | null, maintenant = Date.now()) =>
  !!iso && maintenant - new Date(iso).getTime() < 7 * 86_400_000;

/** Classe de couleur selon le type de contrat (cdi, cdd, alternance, stage, autre). */
export function classeContrat(contrat: string | null): string {
  const c = (contrat ?? '').toLowerCase();
  if (c.includes('cdi')) return 'cdi';
  if (c.includes('cdd') || c.includes('saison') || c.includes('intérim') || c.includes('interim')) return 'cdd';
  if (c.includes('altern') || c.includes('apprenti')) return 'alternance';
  if (c.includes('stage')) return 'stage';
  return 'autre';
}

const MOTS_IGNORES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'à', 'au', 'aux']);

/**
 * Initiales d'un nom (vignettes d'entreprise, logo de secours du site) : première lettre des mots, sans les petits
 * mots (« de », « la »…) ni espace. « My Job Community » → « MJC », « Clinique des Tilleuls » → « CT ».
 */
export function initiales(nom: string, max = 2): string {
  const mots = nom.split(/[\s'’-]+/).filter(Boolean);
  const utiles = mots.filter((m) => !MOTS_IGNORES.has(m.toLowerCase()));
  return (utiles.length ? utiles : mots)
    .slice(0, max)
    .map((m) => m[0]!.toLocaleUpperCase('fr'))
    .join('');
}
