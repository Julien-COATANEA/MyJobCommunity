// Routes publiques du formulaire d'inscription aux événements (le site statique n'a pas de backend).
export default {
  routes: [
    {
      method: 'POST',
      path: '/inscriptions-evenements',
      handler: 'inscription.inscrire',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/inscriptions-evenements/:evenementId/places',
      handler: 'inscription.places',
      config: { auth: false },
    },
  ],
};
