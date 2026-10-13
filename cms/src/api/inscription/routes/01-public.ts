// Routes publiques des inscriptions aux événements (le site statique n'a pas de backend).
export default {
  routes: [
    { method: 'POST', path: '/inscriptions-evenements', handler: 'inscription.inscrire', config: { auth: false } },
    { method: 'GET', path: '/inscriptions-evenements/:evenementId/places', handler: 'inscription.places', config: { auth: false } },
    // Lien d'annulation des e-mails : lecture des informations, puis annulation confirmée par le participant.
    { method: 'GET', path: '/inscriptions-evenements/annulation', handler: 'inscription.infoAnnulation', config: { auth: false } },
    { method: 'POST', path: '/inscriptions-evenements/annuler', handler: 'inscription.annuler', config: { auth: false } },
  ],
};
