// Les scripts de suivi et le bandeau de cookies s'exécutent sur toutes les pages du site (et dans l'habillage repris
// par Gestmax) : ils ne s'écrivent QUE depuis l'écran « Cookies et suivi » (capacité « Cookies et suivi »). Sans
// cette garde, un rédacteur pourrait les modifier par le gestionnaire de contenu (« Informations du site ») ou son API.
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Core } from '@strapi/strapi';

export const UID_PARAMETRES = 'api::parametres.parametres';
export const CHAMPS_SUIVI = ['bandeauCookies', 'texteBandeauCookies', 'lienPolitiqueCookies', 'googleTagManagerId', 'googleAnalyticsId', 'scripts'];

/** Champ (ou sous-champ, ex. « scripts.code ») du suivi. */
export const estChampSuivi = (c: string) => CHAMPS_SUIVI.some((s) => c === s || c.startsWith(`${s}.`));

/** Champs des Informations du site accordables par le gestionnaire de contenu (tous sauf ceux du suivi). */
export const champsParametresSansSuivi = (strapi: Core.Strapi): string[] =>
  ((strapi.service('admin::content-type') as any).getNestedFields((strapi.contentTypes as any)[UID_PARAMETRES], { components: strapi.components }) as string[])
    .filter((c) => !estChampSuivi(c));

const ecranCookies = new AsyncLocalStorage<boolean>();
export const executerReglagesSuivi = <T>(travail: () => Promise<T>): Promise<T> => ecranCookies.run(true, travail);

export function protegerParametres(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== UID_PARAMETRES || ecranCookies.getStore() || !['create', 'update'].includes(context.action)) return next();
    // Le formulaire du gestionnaire de contenu renvoie tous les champs : on ignore ceux du suivi (ils restent inchangés).
    const donnees = (context.params as any).data;
    if (donnees && typeof donnees === 'object') {
      (context.params as any).data = Object.fromEntries(Object.entries(donnees).filter(([champ]) => !CHAMPS_SUIVI.includes(champ)));
    }
    return next();
  });
}

/** Retire les champs du suivi des droits de tous les rôles sauf le super administrateur (rejoué à chaque démarrage). */
export async function restreindreChampsSuivi(strapi: Core.Strapi) {
  const permissions: any[] = await strapi.db.query('admin::permission').findMany({
    where: { subject: UID_PARAMETRES, role: { code: { $ne: 'strapi-super-admin' } } },
  });
  const avecChamps = ['read', 'create', 'update'].map((a) => `plugin::content-manager.explorer.${a}`);
  for (const p of permissions) {
    if (!avecChamps.includes(p.action)) continue;
    // Sans liste de champs, la permission couvre TOUS les champs.
    const champs: string[] | undefined = p.properties?.fields;
    if (Array.isArray(champs) && !champs.some(estChampSuivi)) continue;
    await strapi.db.query('admin::permission').update({
      where: { id: p.id },
      data: { properties: { ...p.properties, fields: Array.isArray(champs) ? champs.filter((c) => !estChampSuivi(c)) : champsParametresSansSuivi(strapi) } },
    });
    strapi.log.info(`[roles] champs du suivi retirés d'une permission ${p.action} sur les Informations du site`);
  }
}
