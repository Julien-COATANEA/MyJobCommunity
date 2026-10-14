// Validation des formulaires publics (inscriptions aux événements, contact) : une seule définition des règles.

/**
 * Adresse e-mail simple : une seule adresse, sans virgule, point-virgule, chevrons, guillemets ni espace. Les adresses
 * saisies servent de destinataire (confirmation d'inscription) ou d'adresse de réponse : une liste ou un « nom
 * <adresse> » enverrait des e-mails à des tiers.
 */
export const EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export const TELEPHONE = /^[0-9+().\s-]{6,20}$/;
export const MAX_EMAIL = 254;
export const MAX_TELEPHONE = 20;

export const coche = (v: unknown) => v === true || v === 'true' || v === 'on' || v === '1';

/** Texte d'une ligne (retours à la ligne remplacés : la valeur peut aller dans un en-tête d'e-mail), tronqué. */
export const ligne = (v: unknown, max = 120) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '');

/** Valeur brute (sans retours à la ligne), NON tronquée : à valider avant usage. */
export const brut = (v: unknown) => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim() : '');

export const MESSAGES = {
  email: 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.',
  telephone: 'Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.',
};

/** Erreur de l'e-mail (obligatoire), ou null. */
export const erreurEmail = (email: string) => (email.length <= MAX_EMAIL && EMAIL.test(email) ? null : MESSAGES.email);
/** Erreur du téléphone (facultatif), ou null. */
export const erreurTelephone = (tel: string) => (!tel || (tel.length <= MAX_TELEPHONE && TELEPHONE.test(tel)) ? null : MESSAGES.telephone);
