import type { Core } from '@strapi/strapi';
import cronTasks from './cron-tasks';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_STRAPI_URL', ''),
  app: {
    keys: env.array('APP_KEYS'),
  },
  // Derrière un reverse proxy (production), l'IP du visiteur est lue dans X-Forwarded-For, sinon tous les visiteurs
  // partageraient l'IP du proxy pour les limiteurs des formulaires. maxIpsCount = nombre de proxys de confiance :
  // seules les adresses ajoutées par eux comptent (un X-Forwarded-For forgé par le visiteur est ignoré).
  proxy: {
    koa: env.bool('PROXY_DE_CONFIANCE', false),
    maxIpsCount: env.int('PROXY_NOMBRE', 1),
  },
  cron: {
    enabled: env.bool('CRON_ENABLED', true),
    tasks: cronTasks,
  },
});
