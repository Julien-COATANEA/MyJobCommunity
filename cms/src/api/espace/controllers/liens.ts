// Données du sélecteur de liens (champ personnalisé « Lien ») et vérification d'adresses.
import type { Core } from '@strapi/strapi';
import { cheminsConnus, estInterne, listerLiens, normaliserChemin } from '../../../utils/liens';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** Liste des liens possibles. Les raccourcis Gestmax ne sont proposés que si le site carrière est renseigné. */
  async lister(ctx: any) {
    const parametres: any = await strapi.db.query('api::parametres.parametres').findOne({ select: ['gestmaxUrlFront', 'nomSite'] });
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      groupes: await listerLiens(strapi, !!parametres?.gestmaxUrlFront),
      nomSite: parametres?.nomSite ?? '',
      urlSite: (process.env.SITE_URL ?? '').replace(/\/+$/, ''),
    };
  },

  /** Quelles adresses internes n'existent plus ? Entrée : { urls: string[] }. */
  async verifier(ctx: any) {
    const urls: unknown[] = Array.isArray(ctx.request.body?.urls) ? ctx.request.body.urls.slice(0, 200) : [];
    const connus = await cheminsConnus(strapi);
    ctx.body = { inconnues: urls.filter((u) => estInterne(u) && !connus.has(normaliserChemin(u))) };
  },
});
