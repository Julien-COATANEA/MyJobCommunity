// Routes du back-office (tableau de bord, offres, apparence, équipe…), protégées par l'authentification de l'admin.
// Enregistrées dans src/index.ts via strapi.server.routes() : dans un dossier routes/ classique, Strapi
// les exposerait dans l'API publique (/api) avec l'authentification des visiteurs.
// Masquer une entrée de menu ne suffit pas : chaque route sensible contrôle ici le rôle ou les droits du compte.
// Politiques : src/policies (capacite, droit-contenu). Les capacités se règlent par rôle dans « Mon équipe ».
type Policy = string | { name: string; config: Record<string, string> };
const capacite = (cle: string): Policy => ({ name: 'global::capacite', config: { cle } });
const droit = (action: string, uid: string): Policy => ({ name: 'global::droit-contenu', config: { action, uid } });

const handler = (methode: string) => `api::espace.espace.${methode}`;
const avec = (...policies: Policy[]) => ({ policies: ['admin::isAuthenticatedAdmin', ...policies] });
const config = avec();
const route = (method: string, path: string, controleur: string, action: string, conf = config) => ({
  method, path, handler: `api::espace.${controleur}.${action}`, config: conf,
});

const ENTREPRISE = 'api::entreprise.entreprise';

export const routesEspace = {
  type: 'admin' as const,
  prefix: '',
  routes: [
    // Tableau de bord, offres, apparence
    { method: 'GET', path: '/espace/tableau-de-bord', handler: handler('tableauDeBord'), config },
    { method: 'GET', path: '/espace/offres', handler: handler('offres'), config },
    { method: 'PUT', path: '/espace/offres/:documentId', handler: handler('reglerOffre'), config: avec(capacite('offres')) },
    { method: 'POST', path: '/espace/offres/rattacher', handler: handler('rattacherEntreprise'), config: avec(capacite('offres'), droit('update', ENTREPRISE)) },
    { method: 'POST', path: '/espace/offres/synchroniser', handler: handler('synchroniserOffres'), config: avec(capacite('offres')) },
    { method: 'POST', path: '/espace/site/regenerer', handler: handler('regenererSite'), config: avec(capacite('regenerer')) },
    { method: 'GET', path: '/espace/apparence', handler: handler('lireApparence'), config },
    { method: 'PUT', path: '/espace/apparence', handler: handler('enregistrerApparence'), config: avec(capacite('apparence')) },

    // Suivi éditorial et inscriptions
    route('GET', '/espace/etat-site', 'suivi', 'etatSite'),
    route('GET', '/espace/lien-public', 'suivi', 'lienPublic'),
    route('GET', '/espace/evenements/:documentId/inscriptions', 'suivi', 'inscriptions', avec(capacite('inscrits-voir'))),
    route('GET', '/espace/evenements/:documentId/inscriptions.csv', 'suivi', 'inscriptionsCsv', avec(capacite('inscrits-voir'))),
    route('POST', '/espace/evenements/:documentId/message', 'suivi', 'messageInscrits', avec(capacite('inscrits-ecrire'))),

    // Mes pages (page d'accueil, page des offres et pages)
    route('GET', '/espace/pages', 'pages', 'lister'),

    // Site Gestmax
    // Lecture aussi réservée : la réponse contient le jeton de la page /header-footer/.
    route('GET', '/espace/site-carriere', 'site-carriere', 'lire', avec(capacite('site-gestmax'))),
    route('PUT', '/espace/site-carriere', 'site-carriere', 'enregistrer', avec(capacite('site-gestmax'))),
    route('POST', '/espace/site-carriere/verifier', 'site-carriere', 'verifier', avec(capacite('site-gestmax'))),

    // Cookies et scripts de suivi
    route('GET', '/espace/cookies', 'cookies', 'lire'),
    route('PUT', '/espace/cookies', 'cookies', 'enregistrer', avec(capacite('cookies'))),

    // Sélecteur de liens, santé du site, modèles de pages, recherche, équipe, statistiques
    route('GET', '/espace/liens', 'liens', 'lister'),
    route('POST', '/espace/liens/verifier', 'liens', 'verifier'),
    route('GET', '/espace/sante', 'sante', 'sante'),
    route('GET', '/espace/modeles', 'modeles', 'lister'),
    route('POST', '/espace/modeles/creer', 'modeles', 'creer', avec(droit('create', 'api::page.page'))),
    route('GET', '/espace/recherche', 'recherche', 'chercher'),
    route('GET', '/espace/equipe', 'equipe', 'lister', avec(capacite('equipe'))),
    route('POST', '/espace/equipe/inviter', 'equipe', 'inviter', avec(capacite('equipe'))),
    route('POST', '/espace/equipe/:id/renvoyer', 'equipe', 'renvoyer', avec(capacite('equipe'))),
    route('GET', '/espace/equipe/droits', 'equipe', 'lireDroits', avec(capacite('equipe'))),
    route('PUT', '/espace/equipe/droits/:code', 'equipe', 'ecrireDroits', avec(capacite('equipe'))),
    route('PUT', '/espace/equipe/:id', 'equipe', 'modifier', avec(capacite('equipe'))),
    route('DELETE', '/espace/equipe/:id', 'equipe', 'supprimer', avec(capacite('equipe'))),
    route('POST', '/espace/demande-publication', 'equipe', 'demanderPublication'),
    route('GET', '/espace/statistiques', 'statistiques', 'statistiques'),
  ],
};
