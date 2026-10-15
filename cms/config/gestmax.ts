import type { Core } from '@strapi/strapi';
// Accessible via strapi.config.get('gestmax').
export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  url: env('GESTMAX_URL', '').replace(/\/+$/, ''),
  user: env('GESTMAX_REST_USER', ''),
  password: env('GESTMAX_REST_PASSWORD', ''),
  frontOffice: env('GESTMAX_FRONT_OFFICE', ''),
  mock: env.bool('GESTMAX_MOCK', false),
  // Offres par page de l'API (1 000 au plus). Plus c'est grand, moins il y a d'appels pour un gros volume.
  pageItems: env.int('GESTMAX_PAGE_ITEMS', 100),
  // Garde-fou de lecture : au-delà, l'import s'arrête en erreur (liste incomplète) plutôt que de supprimer des offres.
  maxPages: env.int('GESTMAX_MAX_PAGES', 2000),
  // Limite volontaire du nombre d'offres importées (les plus récentes), pour un test de charge. 0 = toutes.
  maxOffres: env.int('GESTMAX_MAX_OFFRES', 0),
  // Les champs vac_* sont propres à chaque instance Gestmax (voir /rest/v2/apidoc).
  champs: {
    contrat: env('GESTMAX_FIELD_CONTRAT', 'vac_contract'),
    lieu: env('GESTMAX_FIELD_LIEU', 'vac_town'),
    departement: env('GESTMAX_FIELD_DEPARTEMENT', 'vac_localisation'),
    secteur: env('GESTMAX_FIELD_SECTEUR', 'vac_function'),
    description: env('GESTMAX_FIELD_DESCRIPTION', 'vac_tasks'),
    avantages: env('GESTMAX_FIELD_AVANTAGES', 'vac_offer'),
    profil: env('GESTMAX_FIELD_PROFIL', 'vac_profil'),
    salaire: env('GESTMAX_FIELD_SALAIRE', 'vac_salaire'),
  },
});
