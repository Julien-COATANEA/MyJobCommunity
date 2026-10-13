import type { Core } from '@strapi/strapi';
export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  // Bouton « Aperçu » des fiches : affiche la page du site avec le brouillon en cours, avant publication.
  preview: {
    enabled: !!env('APERCU_URL') && !!env('APERCU_SECRET'),
    config: {
      allowedOrigins: [env('APERCU_URL', 'http://localhost:4321')],
      async handler(uid: string, { documentId, status }: { documentId: string; status?: string }) {
        const types: Record<string, string> = {
          'api::accueil.accueil': 'accueil',
          'api::page.page': 'page',
          'api::article.article': 'article',
          'api::evenement.evenement': 'evenement',
          'api::entreprise.entreprise': 'entreprise',
        };
        if (!types[uid]) return null;
        const parametres = new URLSearchParams({ statut: status ?? 'draft', secret: env('APERCU_SECRET', '') });
        return `${env('APERCU_URL')}/apercu/${types[uid]}/${documentId}?${parametres}`;
      },
    },
  },
  // Back-office en marque blanche : pas de promotions Strapi ni de sondages.
  flags: {
    nps: false,
    promoteEE: false,
  },
});
