import type { Core } from '@strapi/strapi';
export default ({ env }: Core.Config.Shared.ConfigParams) => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGINS', ['http://localhost:4321', 'http://localhost:8080']),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // ?status=draft réservé à l'aperçu (sinon les brouillons seraient publics)
  'global::brouillons',
  // ?populate=deep → population complète (composants, zones dynamiques, médias, relations directes)
  'global::deep-populate',
];
