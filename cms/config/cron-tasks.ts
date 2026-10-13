import type { Core } from '@strapi/strapi';
import { envoyerRappels, publierProgrammees, purgerInscriptions } from '../src/utils/taches';

type Tache = { strapi: Core.Strapi };

export default {
  // Offres Gestmax : toutes les 30 minutes par défaut.
  synchroOffresGestmax: {
    task: async ({ strapi }: Tache) => {
      await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
    },
    options: { rule: process.env.GESTMAX_SYNC_CRON || '*/30 * * * *' },
  },
  // Pages et articles dont la publication est programmée.
  publicationProgrammee: {
    task: async ({ strapi }: Tache) => {
      await publierProgrammees(strapi);
    },
    options: { rule: '* * * * *' },
  },
  // Rappel de la veille aux inscrits (8 h, heure de Paris).
  rappelsEvenements: {
    task: async ({ strapi }: Tache) => {
      await envoyerRappels(strapi);
    },
    options: { rule: '0 8 * * *', tz: 'Europe/Paris' },
  },
  // Purge RGPD des inscriptions de plus d'un an (chaque nuit).
  purgeInscriptions: {
    task: async ({ strapi }: Tache) => {
      await purgerInscriptions(strapi);
    },
    options: { rule: '30 3 * * *', tz: 'Europe/Paris' },
  },
};
