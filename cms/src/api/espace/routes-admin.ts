// Routes du back-office (tableau de bord, offres, apparence, équipe…), protégées par l'authentification de l'admin.
// Enregistrées dans src/index.ts via strapi.server.routes() : dans un dossier routes/ classique, Strapi
// les exposerait dans l'API publique (/api) avec l'authentification des visiteurs.
const handler = (methode: string) => `api::espace.espace.${methode}`;
const config = { policies: ['admin::isAuthenticatedAdmin'] };
const route = (method: string, path: string, controleur: string, action: string) => ({
  method, path, handler: `api::espace.${controleur}.${action}`, config,
});

export const routesEspace = {
  type: 'admin' as const,
  prefix: '',
  routes: [
    // Tableau de bord, offres, apparence
    { method: 'GET', path: '/espace/tableau-de-bord', handler: handler('tableauDeBord'), config },
    { method: 'GET', path: '/espace/offres', handler: handler('offres'), config },
    { method: 'PUT', path: '/espace/offres/:documentId', handler: handler('reglerOffre'), config },
    { method: 'POST', path: '/espace/offres/rattacher', handler: handler('rattacherEntreprise'), config },
    { method: 'POST', path: '/espace/offres/synchroniser', handler: handler('synchroniserOffres'), config },
    { method: 'POST', path: '/espace/site/regenerer', handler: handler('regenererSite'), config },
    { method: 'GET', path: '/espace/apparence', handler: handler('lireApparence'), config },
    { method: 'PUT', path: '/espace/apparence', handler: handler('enregistrerApparence'), config },

    // Suivi éditorial et inscriptions
    route('GET', '/espace/etat-site', 'suivi', 'etatSite'),
    route('GET', '/espace/lien-public', 'suivi', 'lienPublic'),
    route('GET', '/espace/evenements/:documentId/inscriptions', 'suivi', 'inscriptions'),
    route('GET', '/espace/evenements/:documentId/inscriptions.csv', 'suivi', 'inscriptionsCsv'),
    route('POST', '/espace/evenements/:documentId/message', 'suivi', 'messageInscrits'),

    // Site carrière Gestmax
    route('GET', '/espace/site-carriere', 'site-carriere', 'lire'),
    route('PUT', '/espace/site-carriere', 'site-carriere', 'enregistrer'),
    route('POST', '/espace/site-carriere/verifier', 'site-carriere', 'verifier'),

    // Cookies et scripts de suivi
    route('GET', '/espace/cookies', 'cookies', 'lire'),
    route('PUT', '/espace/cookies', 'cookies', 'enregistrer'),

    // Sélecteur de liens, santé du site, modèles de pages, recherche, équipe, statistiques
    route('GET', '/espace/liens', 'liens', 'lister'),
    route('POST', '/espace/liens/verifier', 'liens', 'verifier'),
    route('GET', '/espace/sante', 'sante', 'sante'),
    route('GET', '/espace/modeles', 'modeles', 'lister'),
    route('POST', '/espace/modeles/creer', 'modeles', 'creer'),
    route('GET', '/espace/recherche', 'recherche', 'chercher'),
    route('GET', '/espace/equipe', 'equipe', 'lister'),
    route('POST', '/espace/equipe/inviter', 'equipe', 'inviter'),
    route('POST', '/espace/equipe/:id/renvoyer', 'equipe', 'renvoyer'),
    route('PUT', '/espace/equipe/:id', 'equipe', 'modifier'),
    route('DELETE', '/espace/equipe/:id', 'equipe', 'supprimer'),
    route('POST', '/espace/demande-publication', 'equipe', 'demanderPublication'),
    route('GET', '/espace/statistiques', 'statistiques', 'statistiques'),
  ],
};
