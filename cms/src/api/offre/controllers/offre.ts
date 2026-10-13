import { factories } from '@strapi/strapi';
import { OFFRES_VISIBLES } from '../../../utils/garde-offres';

/** Ajoute « offre non masquée » aux filtres de la requête publique. */
const sansOffresMasquees = (ctx: any) => {
  const filtres = ctx.query?.filters;
  ctx.query = { ...ctx.query, filters: filtres ? { $and: [filtres, OFFRES_VISIBLES] } : OFFRES_VISIBLES };
};

export default factories.createCoreController('api::offre.offre', ({ strapi }) => ({
  // Les offres masquées par la collectivité ne sont plus servies par l'API publique (donc ni listées ni cherchables).
  async find(ctx) {
    sansOffresMasquees(ctx);
    return super.find(ctx);
  },

  async findOne(ctx) {
    const resultat = await super.findOne(ctx);
    return resultat?.data?.masquee ? ctx.notFound() : resultat;
  },

  /** POST /api/offres/synchroniser (jeton d'API avec la permission « synchroniser »). */
  async synchroniser(ctx) {
    ctx.body = await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
  },
}));
