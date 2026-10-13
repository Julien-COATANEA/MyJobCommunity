import type { Core } from '@strapi/strapi';

/**
 * L'API publique de Strapi renvoie les brouillons à quiconque ajoute « ?status=draft ».
 * Un événement pas encore annoncé ou un article en préparation ne doit pas fuiter :
 * seule la page d'aperçu du site (qui présente le secret APERCU_SECRET) peut les lire.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    if (ctx.path.startsWith('/api/') && ctx.query?.status === 'draft') {
      const secret = process.env.APERCU_SECRET;
      if (!secret || ctx.get('x-apercu') !== secret) {
        strapi.log.debug(`[brouillons] lecture refusée : ${ctx.path}`);
        return ctx.forbidden('La lecture des brouillons est réservée à l’aperçu du back-office.');
      }
    }
    await next();
  };
};
