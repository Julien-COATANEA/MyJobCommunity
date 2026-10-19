import { factories } from '@strapi/strapi';
import { offresEnLigne } from '../../../utils/garde-offres';

/** Ajoute « offre non masquée et pas expirée » aux filtres de la requête publique. */
const seulementEnLigne = (ctx: any) => {
  const filtres = ctx.query?.filters;
  ctx.query = { ...ctx.query, filters: filtres ? { $and: [filtres, offresEnLigne()] } : offresEnLigne() };
};

export default factories.createCoreController('api::offre.offre', ({ strapi }) => ({
  // Les offres masquées par la collectivité ou expirées ne sont pas servies par l'API publique (ni listées ni cherchables).
  async find(ctx) {
    seulementEnLigne(ctx);
    return super.find(ctx);
  },

  // Contrôle en base, pas sur la réponse : avec `?fields[0]=titre`, « masquee » n'y figurerait pas.
  async findOne(ctx) {
    const enLigne = await strapi.db.query('api::offre.offre').count({ where: { $and: [{ documentId: ctx.params.id }, offresEnLigne()] } });
    if (!enLigne) return ctx.notFound();
    return super.findOne(ctx);
  },

  /** POST /api/offres/synchroniser (jeton d'API avec la permission « synchroniser »). */
  async synchroniser(ctx) {
    ctx.body = await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
  },
}));
