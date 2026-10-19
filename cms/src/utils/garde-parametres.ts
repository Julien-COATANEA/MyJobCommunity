// Les scripts de suivi et le bandeau de cookies s'exécutent sur toutes les pages du site (et dans l'habillage repris
// par Gestmax) : ils ne s'écrivent QUE depuis l'écran « Cookies et suivi » (capacité « Cookies et suivi »). Sans
// cette garde, un rédacteur pourrait les modifier par le gestionnaire de contenu (« Informations du site ») ou son API.
// Même règle pour l'adresse du site Gestmax et les liens candidats (« Postuler », « Espace candidat ») : ils ne s'écrivent
// que depuis l'écran « Site Gestmax » (capacité « Site Gestmax »).
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Core } from '@strapi/strapi';

export const UID_PARAMETRES = 'api::parametres.parametres';
export const CHAMPS_SUIVI = ['bandeauCookies', 'texteBandeauCookies', 'lienPolitiqueCookies', 'googleTagManagerId', 'googleAnalyticsId', 'scripts'];

export const CHAMPS_GESTMAX = ['gestmaxUrlFront', 'lienEspaceCandidat', 'lienEspaceRecruteur', 'lienCandidatureSpontanee'];
/** Champs réservés à un écran de l'espace : jamais accordés par le gestionnaire de contenu. */
const CHAMPS_RESERVES = [...CHAMPS_SUIVI, ...CHAMPS_GESTMAX];

/** Champ (ou sous-champ, ex. « scripts.code ») réservé à l'écran « Cookies et suivi » ou « Site Gestmax ». */
export const estChampReserve = (c: string) => CHAMPS_RESERVES.some((s) => c === s || c.startsWith(`${s}.`));

/** Champs des Informations du site accordables par le gestionnaire de contenu (tous sauf les champs réservés). */
export const champsParametresSansSuivi = (strapi: Core.Strapi): string[] =>
  ((strapi.service('admin::content-type') as any).getNestedFields((strapi.contentTypes as any)[UID_PARAMETRES], { components: strapi.components }) as string[])
    .filter((c) => !estChampReserve(c));

/** Template du site et réglages de chaque template : écrits seulement par l'écran « Apparence » (capacité « Apparence »). */
export const CHAMPS_TEMPLATE = ['gabarit', 'reglagesGabarits'];

/** Champs réservés à chaque écran de l'espace : ignorés dans toute autre écriture des Informations du site. */
const CHAMPS_PAR_ECRAN = { suivi: CHAMPS_SUIVI, apparence: CHAMPS_TEMPLATE, gestmax: CHAMPS_GESTMAX };
type Ecran = keyof typeof CHAMPS_PAR_ECRAN;
const ecranEnCours = new AsyncLocalStorage<Ecran>();
const executerReglages = <T>(ecran: Ecran, travail: () => Promise<T>): Promise<T> => ecranEnCours.run(ecran, travail);
// Données de démonstration : posent l'adresse et les liens Gestmax sous la même autorisation que l'écran.
export const executerReglagesGestmax = <T>(travail: () => Promise<T>) => executerReglages('gestmax', travail);

export function protegerParametres(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== UID_PARAMETRES || !['create', 'update'].includes(context.action)) return next();
    // Le formulaire du gestionnaire de contenu renvoie tous les champs, même masqués : on ignore les champs réservés aux
    // autres écrans (ils restent inchangés). Sans cela, un enregistrement des Informations du site resté ouvert pendant
    // un changement de template remettrait l'ancien template.
    const ecran = ecranEnCours.getStore();
    const exclus = (Object.keys(CHAMPS_PAR_ECRAN) as Ecran[]).filter((e) => e !== ecran).flatMap((e) => CHAMPS_PAR_ECRAN[e]);
    const donnees = (context.params as any).data;
    if (exclus.length && donnees && typeof donnees === 'object') {
      (context.params as any).data = Object.fromEntries(Object.entries(donnees).filter(([champ]) => !exclus.includes(champ)));
    }
    return next();
  });
}

/**
 * Droits de tous les rôles sauf le super administrateur sur les Informations du site (rejoué à chaque démarrage) :
 *  - les champs réservés à un écran de l'espace sont retirés ;
 *  - les champs apparus dans le schéma depuis le démarrage précédent (ex. conformité RGAA) sont ajoutés aux droits
 *    existants : Strapi ne le fait pas, le champ resterait invisible pour les responsables. Seuls les nouveaux champs
 *    sont ajoutés, un champ retiré à la main dans Paramètres › Rôles ne revient pas.
 */
export async function restreindreChampsSuivi(strapi: Core.Strapi) {
  const autorises = champsParametresSansSuivi(strapi);
  const magasin = strapi.store({ type: 'core', name: 'mjc', key: 'champs-parametres' });
  const permissions: any[] = await strapi.db.query('admin::permission').findMany({
    where: { subject: UID_PARAMETRES, role: { code: { $ne: 'strapi-super-admin' } } },
  });
  // Premier passage, sans historique : sont nouveaux les champs absents de toutes les listes existantes.
  const connus = ((await magasin.get({})) as string[] | null) ??
    [...new Set(permissions.flatMap((p) => (Array.isArray(p.properties?.fields) ? p.properties.fields : [])))];
  const nouveaux = autorises.filter((c) => !connus.includes(c));
  const avecChamps = ['read', 'create', 'update'].map((a) => `plugin::content-manager.explorer.${a}`);
  for (const p of permissions) {
    if (!avecChamps.includes(p.action)) continue;
    // Sans liste de champs, la permission couvre TOUS les champs.
    const champs: string[] | undefined = p.properties?.fields;
    const attendus = Array.isArray(champs) ? [...new Set([...champs.filter((c) => !estChampReserve(c)), ...nouveaux])] : autorises;
    if (Array.isArray(champs) && attendus.length === champs.length && attendus.every((c) => champs.includes(c))) continue;
    await strapi.db.query('admin::permission').update({ where: { id: p.id }, data: { properties: { ...p.properties, fields: attendus } } });
    strapi.log.info(`[roles] champs d'une permission ${p.action} sur les Informations du site mis à jour`);
  }
  await magasin.set({ value: autorises });
}

/**
 * Écrit les Informations du site depuis un écran de l'espace (seul chemin d'écriture de ses champs réservés). Base
 * neuve, sans fiche : elle est créée, avec un nom provisoire (nomSite est obligatoire et sans valeur par défaut).
 */
export async function ecrireParametres(strapi: Core.Strapi, ecran: Ecran, data: Record<string, unknown>) {
  const existant = await strapi.documents(UID_PARAMETRES as any).findFirst();
  return executerReglages(ecran, () =>
    existant
      ? strapi.documents(UID_PARAMETRES as any).update({ documentId: existant.documentId, data } as any)
      : strapi.documents(UID_PARAMETRES as any).create({ data: { nomSite: 'Mon site', ...data } } as any),
  );
}
