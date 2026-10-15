// Informations légales des Informations du site : elles remplissent les jetons des pages « Mentions légales »,
// « Données personnelles » et « Politique de cookies » (voir utils/modeles.ts et site/src/lib/jetons-legaux.ts).
export const PAGES_LEGALES = ['mentions-legales', 'donnees-personnelles', 'politique-de-cookies', 'accessibilite'] as const;

/** Champs à renseigner pour que les pages légales soient complètes (le contact des données peut être l'e-mail du site). */
export const CHAMPS_LEGAUX: { champ: string; libelle: string; secours?: string }[] = [
  { champ: 'editeurNom', libelle: 'Nom officiel de l’éditeur' },
  { champ: 'editeurSiret', libelle: 'N° SIRET' },
  { champ: 'directeurPublication', libelle: 'Directeur ou directrice de la publication' },
  { champ: 'adresse', libelle: 'Adresse' },
  { champ: 'telephone', libelle: 'Téléphone' },
  { champ: 'email', libelle: 'E-mail de contact' },
  { champ: 'hebergeurNom', libelle: 'Nom de l’hébergeur' },
  { champ: 'hebergeurAdresse', libelle: 'Adresse de l’hébergeur' },
  { champ: 'hebergeurTelephone', libelle: 'Téléphone de l’hébergeur' },
  { champ: 'contactDonneesEmail', libelle: 'E-mail pour exercer ses droits (données personnelles)', secours: 'email' },
];

/** Libellés des informations légales manquantes. */
export const infosLegalesManquantes = (parametres: Record<string, unknown> | null | undefined) =>
  CHAMPS_LEGAUX.filter(({ champ, secours }) => {
    const rempli = (c: string) => typeof parametres?.[c] === 'string' && (parametres[c] as string).trim() !== '';
    return !rempli(champ) && !(secours && rempli(secours));
  }).map((c) => c.libelle);
