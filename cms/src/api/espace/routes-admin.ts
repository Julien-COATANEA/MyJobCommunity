// Routes du back-office (tableau de bord, offres, apparence), protégées par l'authentification de l'admin.
// Enregistrées dans src/index.ts via strapi.server.routes() : dans un dossier routes/ classique, Strapi
// les exposerait dans l'API publique (/api) avec l'authentification des visiteurs.
const handler = (methode: string) => `api::espace.espace.${methode}`;
const config = { policies: ['admin::isAuthenticatedAdmin'] };

export const routesEspace = {
  type: 'admin' as const,
  prefix: '',
  routes: [
    { method: 'GET', path: '/espace/tableau-de-bord', handler: handler('tableauDeBord'), config },
    { method: 'GET', path: '/espace/offres', handler: handler('offres'), config },
    { method: 'POST', path: '/espace/offres/synchroniser', handler: handler('synchroniserOffres'), config },
    { method: 'POST', path: '/espace/site/regenerer', handler: handler('regenererSite'), config },
    { method: 'GET', path: '/espace/apparence', handler: handler('lireApparence'), config },
    { method: 'PUT', path: '/espace/apparence', handler: handler('enregistrerApparence'), config },
    { method: 'GET', path: '/espace/etat-site', handler: 'api::espace.suivi.etatSite', config },
    { method: 'GET', path: '/espace/lien-public', handler: 'api::espace.suivi.lienPublic', config },
    { method: 'GET', path: '/espace/evenements/:documentId/inscriptions', handler: 'api::espace.suivi.inscriptions', config },
    { method: 'GET', path: '/espace/evenements/:documentId/inscriptions.csv', handler: 'api::espace.suivi.inscriptionsCsv', config },
    { method: 'GET', path: '/espace/site-carriere', handler: 'api::espace.site-carriere.lire', config },
    { method: 'PUT', path: '/espace/site-carriere', handler: 'api::espace.site-carriere.enregistrer', config },
    { method: 'POST', path: '/espace/site-carriere/verifier', handler: 'api::espace.site-carriere.verifier', config },
  ],
};
