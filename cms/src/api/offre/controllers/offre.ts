import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::offre.offre', ({ strapi }) => ({
  /** POST /api/offres/synchroniser (jeton d'API avec la permission « synchroniser »). */
  async synchroniser(ctx) {
    ctx.body = await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
  },
}));
