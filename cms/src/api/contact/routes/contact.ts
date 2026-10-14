// Formulaire de contact du site (route publique : le site statique n'a pas de backend).
export default {
  routes: [{ method: 'POST', path: '/contact', handler: 'contact.envoyer', config: { auth: false } }],
};
