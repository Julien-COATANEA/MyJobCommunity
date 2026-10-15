// Liste des liens possibles du site (sélecteur de liens du BO) et contrôle des liens internes existants.
import type { Core } from '@strapi/strapi';
import { construirePopulate } from './populate';

export interface OptionLien { libelle: string; valeur: string; detail?: string }
export interface GroupeLiens { libelle: string; options: OptionLien[] }

/** Pages fixes du site (toujours présentes). */
export const PAGES_FIXES: OptionLien[] = [
  { libelle: 'Accueil', valeur: '/' },
  { libelle: "Offres d'emploi", valeur: '/offres' },
  { libelle: 'Actualités', valeur: '/actualites' },
  { libelle: 'Événements', valeur: '/evenements' },
  { libelle: 'Annuaire des entreprises', valeur: '/entreprises' },
  { libelle: 'Plan du site', valeur: '/plan-du-site' },
];

export const RACCOURCIS_GESTMAX: OptionLien[] = [
  { libelle: 'Espace candidat (connexion, candidatures)', valeur: 'gestmax:/account/login' },
  { libelle: 'Alerte e-mail sur les offres', valeur: 'gestmax:/alert' },
  { libelle: 'Candidature spontanée', valeur: 'gestmax:/apply/1/1/candidature-spontanee' },
  { libelle: 'Accueil du site Gestmax', valeur: 'gestmax:/' },
];

const DOCUMENTS: { uid: string; groupe: string; chemin: (slug: string) => string; champ: string; tri: string; limite: number }[] = [
  { uid: 'api::page.page', groupe: 'Mes pages', chemin: (s) => `/${s}`, champ: 'titre', tri: 'titre:asc', limite: 100 },
  { uid: 'api::article.article', groupe: 'Mes articles', chemin: (s) => `/actualites/${s}`, champ: 'titre', tri: 'datePublication:desc', limite: 40 },
  { uid: 'api::evenement.evenement', groupe: 'Mes événements', chemin: (s) => `/evenements/${s}`, champ: 'titre', tri: 'dateDebut:desc', limite: 40 },
  { uid: 'api::entreprise.entreprise', groupe: 'Entreprises', chemin: (s) => `/entreprises/${s}`, champ: 'nom', tri: 'nom:asc', limite: 200 },
];

/** Tous les liens proposés, regroupés (les pages publiées uniquement). */
export async function listerLiens(strapi: Core.Strapi, avecGestmax: boolean): Promise<GroupeLiens[]> {
  const groupes: GroupeLiens[] = [{ libelle: 'Pages du site', options: PAGES_FIXES }];

  for (const d of DOCUMENTS) {
    const docs: any[] = await strapi.documents(d.uid as any).findMany({ fields: ['slug', d.champ], sort: d.tri, limit: d.limite } as any);
    if (docs.length) groupes.push({ libelle: d.groupe, options: docs.map((x) => ({ libelle: x[d.champ], valeur: d.chemin(x.slug) })) });
  }

  // Valeurs distinctes en SQL : charger toutes les offres pour cela ne tient pas avec des dizaines de milliers d'offres.
  const contrats: any[] = await strapi.db.connection('offre').distinct('type_contrat as typeContrat').whereNotNull('type_contrat').where('type_contrat', '<>', '').limit(200);
  const distincts = [...new Set(contrats.map((c) => c.typeContrat).filter(Boolean))].sort() as string[];
  if (distincts.length) {
    groupes.push({
      libelle: "Offres d'emploi filtrées",
      options: distincts.map((c) => ({ libelle: `Offres : ${c}`, valeur: `/offres?contrat=${encodeURIComponent(c)}` })),
    });
  }
  if (avecGestmax) groupes.push({ libelle: 'Site Gestmax', options: RACCOURCIS_GESTMAX });
  return groupes;
}

/** Ensemble des adresses internes valides (sans ancre ni paramètres). */
export async function cheminsConnus(strapi: Core.Strapi): Promise<Set<string>> {
  const groupes = await listerLiens(strapi, false);
  const chemins = new Set<string>();
  for (const g of groupes) for (const o of g.options) chemins.add(o.valeur.split(/[?#]/)[0].replace(/\/+$/, '') || '/');
  return chemins;
}

// Fichiers de la médiathèque (« /uploads/… ») : pas des pages du site.
export const estInterne = (url: unknown): url is string => typeof url === 'string' && /^\/(?!\/)/.test(url) && !url.startsWith('/uploads/');
export const normaliserChemin = (url: string) => url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export interface LienTrouve { champ: string; url: string }

/** Parcourt un document (composants, zones dynamiques, texte riche) et liste ses liens internes. */
export function extraireLiensInternes(valeur: unknown, chemin = ''): LienTrouve[] {
  const trouves: LienTrouve[] = [];
  const visiter = (v: any, c: string) => {
    if (Array.isArray(v)) return v.forEach((x, i) => visiter(x, `${c}[${i}]`));
    if (!v || typeof v !== 'object') return;
    // Nœud « lien » du texte riche
    if (v.type === 'link' && estInterne(v.url)) trouves.push({ champ: `${c} (lien dans le texte)`, url: v.url });
    for (const [cle, x] of Object.entries(v)) {
      if (['url', 'lien'].includes(cle) && estInterne(x)) trouves.push({ champ: `${c}.${cle}`.replace(/^\./, ''), url: x });
      else if (typeof x === 'object') visiter(x, c ? `${c}.${cle}` : cle);
    }
  };
  visiter(valeur, chemin);
  return trouves;
}

export interface LienCasse { type: string; titre: string; lien: string; url: string; modifier: string }

/** Liens internes (menus, boutons, cartes, textes) qui pointent vers une page inexistante. */
export async function trouverLiensCasses(strapi: Core.Strapi): Promise<LienCasse[]> {
  const connus = await cheminsConnus(strapi);
  const casses: LienCasse[] = [];
  const verifier = (type: string, titre: string, modifier: string, doc: unknown) => {
    for (const l of extraireLiensInternes(doc)) {
      if (!connus.has(normaliserChemin(l.url))) casses.push({ type, titre, lien: l.champ, url: l.url, modifier });
    }
  };

  const unique = async (uid: string, type: string, titre: string, modifier: string) => {
    const doc = await strapi.documents(uid as any).findFirst({ populate: construirePopulate(strapi, uid) } as any);
    if (doc) verifier(type, titre, modifier, doc);
  };
  await unique('api::navigation.navigation', 'Menus du site', 'Menus du site', '/content-manager/single-types/api::navigation.navigation');
  await unique('api::accueil.accueil', 'Page', "Page d'accueil", '/content-manager/single-types/api::accueil.accueil');
  await unique('api::page-offres.page-offres', 'Page', 'Page des offres', '/content-manager/single-types/api::page-offres.page-offres');

  const pages: any[] = await strapi.documents('api::page.page' as any).findMany({ populate: construirePopulate(strapi, 'api::page.page'), limit: 200 } as any);
  for (const p of pages) verifier('Page', p.titre, `/content-manager/collection-types/api::page.page/${p.documentId}`, p);
  const articles: any[] = await strapi.documents('api::article.article' as any).findMany({ limit: 200 } as any);
  for (const a of articles) verifier('Article', a.titre, `/content-manager/collection-types/api::article.article/${a.documentId}`, a);
  return casses;
}
