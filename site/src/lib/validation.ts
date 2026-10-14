// Règles de validation des formulaires publics, côté navigateur (inscription, contact). Identiques à celles de
// Strapi (cms/src/utils/validation.ts) : même expression, mêmes messages, pour un retour cohérent.

/** Une seule adresse : ni virgule, point-virgule, chevrons, guillemets ni espace. */
export const EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const TELEPHONE = /^[0-9+().\s-]{6,20}$/;

export const MESSAGES = {
  email: 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.',
  telephone: 'Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.',
};

export const erreurEmail = (email: string) => (email.length <= 254 && EMAIL.test(email) ? null : MESSAGES.email);
export const erreurTelephone = (tel: string) => (!tel || (tel.length <= 20 && TELEPHONE.test(tel)) ? null : MESSAGES.telephone);
