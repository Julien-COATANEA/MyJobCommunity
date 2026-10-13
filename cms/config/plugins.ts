import type { Core } from '@strapi/strapi';
export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'localhost'),
        port: env.int('SMTP_PORT', 1025),
        secure: env.bool('SMTP_SECURE', false),
        ignoreTLS: !env.bool('SMTP_SECURE', false),
        ...(env('SMTP_USERNAME')
          ? { auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') } }
          : {}),
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'no-reply@myjobcommunity.local'),
        defaultReplyTo: env('SMTP_REPLY_TO', 'contact@myjobcommunity.local'),
      },
    },
  },
  upload: {
    config: {
      // Formats réactifs générés par Strapi inutiles : Astro optimise les images au build.
      breakpoints: {},
      sizeLimit: 10 * 1024 * 1024,
      // Fichiers téléversés nommés avec une empreinte, donc immuables : cache long (en ms). Le build
      // Astro réutilise alors ses images optimisées d'un build à l'autre au lieu de tout recalculer.
      providerOptions: { localServer: { maxage: 31536000000 } },
    },
  },
});
