// Accès à l'API REST v2 Gestmax (GET /rest/v2/onlinevacancy) et conversion en offres Strapi.
// Fonctions pures sauf recupererOffresGestmax : testables sans Strapi.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ConfigGestmax {
  url: string;
  user: string;
  password: string;
  frontOffice: string;
  mock: boolean;
  pageItems: number;
  maxPages?: number;
  maxOffres?: number;
  champs: Record<'contrat' | 'lieu' | 'departement' | 'secteur' | 'description' | 'avantages' | 'profil' | 'salaire', string>;
}

export type OffreGestmax = Record<string, any>;

export interface OffreConvertie {
  sourceId: string;
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  departement: string | null;
  secteur: string | null;
  nomEntreprise: string | null;
  salaire: string | null;
  descriptionHtml: string | null;
  profilHtml: string | null;
  dateActivation: string | null;
  dateFinPublication: string | null;
  urlDetailGestmax: string | null;
  urlCandidature: string | null;
  logoUrl: string | null;
  empreinte: string;
}

export function champsDemandes(conf: ConfigGestmax): string[] {
  return [
    'vacancy_id', 'vacancy_title', 'vacancy_activation_date', 'publication_end_date',
    'vacancy_detail_url', 'application_link', 'application_link_type', 'customer_company', 'cust_logo', 'is_unsolicited',
    ...Object.values(conf.champs).filter(Boolean),
  ];
}

export function slugifier(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

/** Accepte une date ISO ou au format français jj/mm/aaaa [hh:mm]. */
export function lireDate(valeur: unknown): string | null {
  if (typeof valeur !== 'string' || !valeur.trim()) return null;
  const fr = valeur.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  const date = fr
    ? new Date(Date.UTC(+fr[3], +fr[2] - 1, +fr[1], +(fr[4] ?? 0), +(fr[5] ?? 0)))
    : new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const texte = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = Array.isArray(v) ? v.join(', ') : String(v);
  return s.trim() || null;
};

/** « -- (69) Rhône » → « Rhône (69) » ; « - RHÔNE-ALPES » → « RHÔNE-ALPES ». */
export function nettoyerLocalisation(valeur: string | null): string | null {
  if (!valeur) return null;
  const propre = valeur
    .split(',')
    .map((v) => v.replace(/^[\s-]+/, '').trim())
    .map((v) => v.replace(/^\((\w+)\)\s*(.+)$/, '$2 ($1)'))
    // « 95 - Val d'Oise » → « Val d'Oise (95) »
    .map((v) => v.replace(/^(\d{2,3}|2[AB])\s*-\s*(.+)$/i, '$2 ($1)'))
    .filter(Boolean)
    .join(', ');
  return propre || null;
}

/** « LYON » → « Lyon », « RILLIEUX-LA-PAPE » → « Rillieux-La-Pape » ; une saisie en casse mixte est conservée. */
export function normaliserVille(brute: string | null): string | null {
  // « 95 - Cergy » (code du département en préfixe, selon l'instance) → « Cergy »
  const valeur = brute?.replace(/^\s*(\d{2,3}|2[AB])\s*-\s*/i, '').trim() || null;
  if (!valeur || valeur !== valeur.toUpperCase()) return valeur;
  return valeur.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, sep, l) => sep + l.toUpperCase());
}

/** Une candidature spontanée est une « offre » technique de Gestmax : elle n'a pas sa place dans la liste. */
export const estCandidatureSpontanee = (v: OffreGestmax) => ['1', 'true'].includes(String(v.is_unsolicited));

export function convertirOffre(v: OffreGestmax, conf: ConfigGestmax): OffreConvertie {
  const sourceId = String(v.vacancy_id);
  const titre = texte(v.vacancy_title)?.replace(/\s+/g, ' ') ?? `Offre ${sourceId}`;
  const lien = texte(v.application_link);
  const offre: Omit<OffreConvertie, 'empreinte'> = {
    sourceId,
    titre,
    slug: `${slugifier(titre)}-${slugifier(sourceId)}`,
    typeContrat: texte(v[conf.champs.contrat]),
    lieu: normaliserVille(texte(v[conf.champs.lieu])),
    departement: nettoyerLocalisation(texte(v[conf.champs.departement])),
    secteur: texte(v[conf.champs.secteur]),
    nomEntreprise: texte(v.customer_company),
    salaire: texte(v[conf.champs.salaire]),
    descriptionHtml: description(v, conf),
    profilHtml: texte(v[conf.champs.profil]),
    dateActivation: lireDate(v.vacancy_activation_date_full ?? v.vacancy_activation_date),
    dateFinPublication: lireDate(v.publication_end_date_full ?? v.publication_end_date),
    urlDetailGestmax: urlWeb(texte(v.vacancy_detail_url)),
    urlCandidature: lien && v.application_link_type === 'EMAIL' ? (/^[^\s:/?#]+@[^\s:/?#]+$/.test(lien) ? `mailto:${lien}` : null) : urlWeb(lien),
    logoUrl: urlWeb(texte(v.cust_logo)),
  };
  // L'empreinte évite de réécrire (et donc de déclencher un rebuild) une offre inchangée.
  const empreinte = createHash('sha1').update(JSON.stringify(offre)).digest('hex');
  return { ...offre, empreinte };
}

/** Adresse http(s) uniquement : un « javascript: » venu de Gestmax finirait dans un lien du site. */
function urlWeb(url: string | null): string | null {
  if (!url) return null;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

/** Description du poste, suivie de « Nous vous proposons » si l'instance renseigne ce champ. */
function description(v: OffreGestmax, conf: ConfigGestmax): string | null {
  const mission = texte(v[conf.champs.description]);
  const avantages = conf.champs.avantages ? texte(v[conf.champs.avantages]) : null;
  if (!avantages) return mission;
  return `${mission ?? ''}\n<h3>Nous vous proposons</h3>\n${avantages}`;
}

// Pages lues en même temps (l'API Gestmax répond en 1 à 2 s pour 500 offres).
const PAGES_SIMULTANEES = 4;

export async function recupererOffresGestmax(conf: ConfigGestmax, dossierDonnees: string): Promise<OffreGestmax[]> {
  if (conf.mock) {
    return JSON.parse(readFileSync(join(dossierDonnees, 'gestmax-mock.json'), 'utf8')).data;
  }

  const auth = Buffer.from(`${conf.user}:${conf.password}`).toString('base64');
  const maxPages = conf.maxPages ?? 2000;
  const limite = conf.maxOffres && conf.maxOffres > 0 ? conf.maxOffres : Infinity;

  const lirePage = async (page: number): Promise<{ lot: OffreGestmax[]; total: number | null }> => {
    const params = new URLSearchParams({
      fields: champsDemandes(conf).join(','),
      page: String(page),
      pageItems: String(conf.pageItems),
      returnCount: '1',
      orderField: 'vacancy_activation_date',
      orderDir: 'desc',
    });
    if (conf.frontOffice) params.set('frontOffice', conf.frontOffice);
    const reponse = await fetch(`${conf.url}/rest/v2/onlinevacancy?${params}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(60_000),
    });
    if (!reponse.ok) throw new Error(`Gestmax a répondu ${reponse.status} ${reponse.statusText}`);
    const json = (await reponse.json()) as { data?: unknown; count?: unknown };
    // Une réponse d'une autre forme ne doit pas passer pour « aucune offre » (toutes seraient supprimées).
    if (!Array.isArray(json?.data)) throw new Error('Gestmax : réponse inattendue (pas de liste « data »).');
    const compte = Number(json.count);
    return { lot: json.data as OffreGestmax[], total: json.count != null && json.count !== '' && Number.isFinite(compte) && compte > 0 ? compte : null };
  };
  const trop = () => new Error(`Gestmax : plus de ${maxPages} pages d’offres, lecture interrompue (liste incomplète). Augmentez GESTMAX_MAX_PAGES ou GESTMAX_PAGE_ITEMS.`);

  const premiere = await lirePage(1);
  const total = premiere.total;
  const lots: OffreGestmax[][] = [premiere.lot];

  if (total !== null && premiere.lot.length) {
    // Total connu : les pages suivantes sont lues quelques-unes à la fois (une centaine de pages pour 50 000 offres).
    const utiles = Math.min(Math.ceil(total / conf.pageItems), Number.isFinite(limite) ? Math.ceil(limite / conf.pageItems) : Infinity);
    if (utiles > maxPages) throw trop();
    let prochaine = 2;
    await Promise.all(
      Array.from({ length: Math.min(PAGES_SIMULTANEES, Math.max(0, utiles - 1)) }, async () => {
        while (prochaine <= utiles) {
          const page = prochaine++;
          lots[page - 1] = (await lirePage(page)).lot;
        }
      }),
    );
  } else if (premiere.lot.length >= conf.pageItems) {
    // Total inconnu : lecture page après page jusqu'à une page incomplète.
    for (let page = 2; ; page++) {
      if (page > maxPages) throw trop();
      const { lot } = await lirePage(page);
      lots.push(lot);
      if (lot.length < conf.pageItems) break;
    }
  }

  // Le tri par date n'est pas stable : une offre lue deux fois n'est gardée qu'une fois.
  const offres = new Map<string, OffreGestmax>();
  for (const lot of lots) for (const o of lot ?? []) offres.set(String(o.vacancy_id), o);
  // Instance qui plafonne la taille des pages (moins d'offres par page que demandé) : le nombre de pages calculé était
  // trop petit. On lit les pages suivantes tant que le total annoncé (ou la limite) n'est pas atteint.
  if (total !== null) {
    const attendu = Math.min(total, limite);
    for (let page = lots.length + 1; offres.size < attendu; page++) {
      if (page > maxPages) throw trop();
      const { lot } = await lirePage(page);
      if (!lot.length) break;
      for (const o of lot) offres.set(String(o.vacancy_id), o);
    }
  }
  // Limite volontaire : on garde les plus récentes.
  if (offres.size > limite) for (const id of [...offres.keys()].slice(limite)) offres.delete(id);
  // Total annoncé non atteint (doublons du tri, offres filtrées par frontOffice…) : simple signalement, le garde-fou
  // de la synchronisation (forte baisse du nombre d'offres) protège le site.
  if (!Number.isFinite(limite) && total !== null && offres.size < total) console.warn(`[gestmax] ${offres.size} offres lues sur ${total} annoncées`);
  return [...offres.values()];
}
