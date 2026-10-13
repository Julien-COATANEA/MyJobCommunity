import type { Core } from '@strapi/strapi';

export default {
  synchroOffresGestmax: {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
    },
    options: {
      rule: process.env.GESTMAX_SYNC_CRON || '*/30 * * * *',
    },
  },
};
