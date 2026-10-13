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
    .filter(Boolean)
    .join(', ');
  return propre || null;
}

/** « LYON » → « Lyon », « RILLIEUX-LA-PAPE » → « Rillieux-La-Pape » ; une saisie en casse mixte est conservée. */
export function normaliserVille(valeur: string | null): string | null {
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
    urlDetailGestmax: texte(v.vacancy_detail_url),
    urlCandidature: lien && v.application_link_type === 'EMAIL' ? `mailto:${lien}` : lien,
    logoUrl: texte(v.cust_logo),
  };
  // L'empreinte évite de réécrire (et donc de déclencher un rebuild) une offre inchangée.
  const empreinte = createHash('sha1').update(JSON.stringify(offre)).digest('hex');
  return { ...offre, empreinte };
}

/** Description du poste, suivie de « Nous vous proposons » si l'instance renseigne ce champ. */
function description(v: OffreGestmax, conf: ConfigGestmax): string | null {
  const mission = texte(v[conf.champs.description]);
  const avantages = conf.champs.avantages ? texte(v[conf.champs.avantages]) : null;
  if (!avantages) return mission;
  return `${mission ?? ''}\n<h3>Nous vous proposons</h3>\n${avantages}`;
}

export async function recupererOffresGestmax(conf: ConfigGestmax, dossierDonnees: string): Promise<OffreGestmax[]> {
  if (conf.mock) {
    return JSON.parse(readFileSync(join(dossierDonnees, 'gestmax-mock.json'), 'utf8')).data;
  }

  const offres: OffreGestmax[] = [];
  const auth = Buffer.from(`${conf.user}:${conf.password}`).toString('base64');
  for (let page = 1; page <= 100; page++) {
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
      signal: AbortSignal.timeout(30_000),
    });
    if (!reponse.ok) throw new Error(`Gestmax a répondu ${reponse.status} ${reponse.statusText}`);

    const json = (await reponse.json()) as { data?: OffreGestmax[]; count?: number };
    const lot: OffreGestmax[] = json.data ?? [];
    offres.push(...lot);
    if (lot.length < conf.pageItems || (json.count && offres.length >= json.count)) break;
  }
  return offres;
}
