// Templates du site (« gabarits ») : un même balisage, plusieurs habillages, choisis dans le BO (Apparence).
//  - Le contenu ne change jamais de forme : pages, articles, blocs et formulaires sont rendus par les mêmes composants,
//    un template ne fait que les habiller. Tout bloc du catalogue fonctionne donc dans tous les templates.
//  - Chaque template a sa feuille de style (versionnée dans /_astro/), chargée SEULE : un site ne télécharge jamais
//    les autres. « Communauté » avec ses réglages d'origine n'en charge aucune : le site reste identique à l'octet près.
//  - Les options de disposition sont posées en attributs data-mjc-* sur <html> (site) et sur .mjc-shell (en-tête et
//    pied de page, repris par le site Gestmax). Les feuilles ne visent que ces attributs : rien ne fuit dans Gestmax.
//    Préfixe obligatoire : un script qui cherche « [data-filtres] » trouverait sinon <html> avant son formulaire.
// Identifiants, options, valeurs et réglages par défaut : tenus à l'identique dans cms/src/utils/gabarits.ts.
import communaute from '../styles/gabarits/communaute.css?url';
import institutionnel from '../styles/gabarits/institutionnel.css?url';
import facettes from '../styles/gabarits/facettes.css?url';
import vitrine from '../styles/gabarits/vitrine.css?url';
import epure from '../styles/gabarits/epure.css?url';

/** Options de disposition et leurs valeurs (la première n'est PAS forcément le défaut : voir chaque template). */
export const OPTIONS = {
  /** En-tête : logo à gauche et menu à droite, logo centré au-dessus du menu, ou menu sur une barre sous le logo. */
  entete: ['classique', 'centre', 'deux-lignes'],
  /** Haut de l'accueil : texte et photo côte à côte, photo en fond sur toute la largeur, ou texte centré et photo dessous. */
  accueil: ['deux-colonnes', 'banniere', 'empile'],
  /** En-têtes des pages : titre sur la photo ou un dégradé, ou titre sur fond clair (photo en bannière au-dessus). */
  bandeaux: ['immersif', 'clair'],
  /** Page des offres : filtres au-dessus de la liste, ou en colonne à gauche (recherche à facettes). */
  filtres: ['haut', 'cote'],
  /** Cartes et encadrés : ombre et soulèvement au survol, ou à plat avec une simple bordure. */
  cartes: ['relief', 'plat'],
  /** Pied de page sombre ou clair. */
  pied: ['sombre', 'clair'],
} as const;

export type CleOption = keyof typeof OPTIONS;
export type Options = { [K in CleOption]: (typeof OPTIONS)[K][number] };

interface Gabarit {
  feuille: string;
  defauts: Options;
}

export const GABARIT_PAR_DEFAUT = 'communaute';

export const GABARITS: Record<string, Gabarit> = {
  communaute: {
    feuille: communaute,
    defauts: { entete: 'classique', accueil: 'deux-colonnes', bandeaux: 'immersif', filtres: 'haut', cartes: 'relief', pied: 'sombre' },
  },
  institutionnel: {
    feuille: institutionnel,
    defauts: { entete: 'deux-lignes', accueil: 'deux-colonnes', bandeaux: 'clair', filtres: 'haut', cartes: 'plat', pied: 'sombre' },
  },
  facettes: {
    feuille: facettes,
    defauts: { entete: 'classique', accueil: 'banniere', bandeaux: 'immersif', filtres: 'cote', cartes: 'plat', pied: 'sombre' },
  },
  vitrine: {
    feuille: vitrine,
    defauts: { entete: 'centre', accueil: 'banniere', bandeaux: 'immersif', filtres: 'haut', cartes: 'relief', pied: 'sombre' },
  },
  epure: {
    feuille: epure,
    defauts: { entete: 'classique', accueil: 'empile', bandeaux: 'clair', filtres: 'cote', cartes: 'plat', pied: 'clair' },
  },
};

export interface ChoixGabarit {
  gabarit?: string | null;
  /** Réglages enregistrés pour chaque template : { vitrine: { entete: 'centre', … }, … }. */
  reglagesGabarits?: unknown;
}

export interface GabaritResolu {
  id: string;
  options: Options;
  /** Feuille de style à charger, ou null (Communauté avec ses réglages d'origine : rien à ajouter). */
  feuille: string | null;
  /** Attributs à poser sur <html> et sur l'habillage .mjc-shell. */
  attributs: Record<string, string>;
}

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Template et options effectifs. Toute valeur inconnue (template retiré, option mal saisie, ancien réglage) est
 * remplacée par la valeur par défaut : le site se construit toujours.
 */
export function resoudreGabarit({ gabarit, reglagesGabarits }: ChoixGabarit): GabaritResolu {
  const id = gabarit && Object.hasOwn(GABARITS, gabarit) ? gabarit : GABARIT_PAR_DEFAUT;
  const { defauts, feuille } = GABARITS[id];
  const saisis = estObjet(reglagesGabarits) && estObjet(reglagesGabarits[id]) ? reglagesGabarits[id] : {};
  const options = { ...defauts };
  for (const cle of Object.keys(OPTIONS) as CleOption[]) {
    const valeur = saisis[cle];
    if (typeof valeur === 'string' && (OPTIONS[cle] as readonly string[]).includes(valeur)) (options as Record<string, string>)[cle] = valeur;
  }
  const origine = id === GABARIT_PAR_DEFAUT && (Object.keys(OPTIONS) as CleOption[]).every((c) => options[c] === defauts[c]);
  const attributs: Record<string, string> = { 'data-mjc-gabarit': id };
  for (const cle of Object.keys(OPTIONS) as CleOption[]) attributs[`data-mjc-${cle}`] = options[cle];
  return { id, options, feuille: origine ? null : feuille, attributs };
}
