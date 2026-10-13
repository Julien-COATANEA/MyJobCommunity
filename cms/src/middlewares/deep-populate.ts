import type { Core } from '@strapi/strapi';
import { construirePopulate } from '../utils/populate';

/**
 * `GET /api/<type>?populate=deep` : remplace « deep » par la population complète du type.
 * Évite d'écrire à la main les populate imbriqués des zones dynamiques côté Astro.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.method === 'GET' && ctx.path.startsWith('/api/') && ctx.query?.populate === 'deep') {
      const segment = ctx.path.split('/')[2];
      const type: any = Object.values(strapi.contentTypes).find(
        (ct: any) => ct.uid.startsWith('api::') && (ct.info.pluralName === segment || ct.info.singularName === segment),
      );
      // ctx.query est mis en cache par le middleware strapi::query : on modifie l'objet en place.
      if (type) {
        const populate = construirePopulate(strapi, type.uid);
        if (Object.keys(populate).length) ctx.query.populate = populate;
        else delete ctx.query.populate;
      }
    }
    await next();
  };
};
