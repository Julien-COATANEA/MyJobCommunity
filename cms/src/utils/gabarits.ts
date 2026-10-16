// Templates du site (« gabarits »), choisis et personnalisés dans « Apparence » du BO.
// Un template habille le même contenu (pages, articles, blocs, formulaires) : changer de template ne touche à aucun
// contenu. Il a ses réglages par défaut (options de disposition) et la collectivité peut les ajuster template par
// template : les réglages de chacun sont conservés (`reglagesGabarits`), on peut en essayer un autre et revenir.
// Utilisé par l'écran Apparence (admin) ET par le serveur (nettoyage des réglages enregistrés) : aucune dépendance.
// Identifiants, options, valeurs et réglages par défaut : tenus à l'identique dans site/src/lib/gabarits.ts.

export interface Valeur { libelle: string; aide?: string }
export interface Option { libelle: string; aide: string; valeurs: Record<string, Valeur> }

export const OPTIONS = {
  entete: {
    libelle: 'En-tête',
    aide: 'Sur grand écran. Sur mobile, le menu reste replié derrière le bouton « Menu ».',
    valeurs: {
      classique: { libelle: 'Logo à gauche, menu à droite' },
      centre: { libelle: 'Logo centré, menu en dessous' },
      'deux-lignes': { libelle: 'Logo, puis menu sur une barre', aide: 'La barre du menu reste visible en faisant défiler la page.' },
    },
  },
  accueil: {
    libelle: 'Haut de la page d’accueil',
    aide: 'La photo est celle de « Ma page d’accueil ».',
    valeurs: {
      'deux-colonnes': { libelle: 'Texte et photo côte à côte' },
      banniere: { libelle: 'Photo en fond, texte par-dessus', aide: 'Un voile sombre garantit la lisibilité du texte.' },
      empile: { libelle: 'Texte centré, photo en dessous', aide: 'La photo s’affiche en grand, sur toute la largeur du contenu.' },
    },
  },
  bandeaux: {
    libelle: 'En-tête des pages',
    aide: 'Pages, actualités, événements, annuaire, offres…',
    valeurs: {
      immersif: { libelle: 'Titre sur la photo ou un dégradé' },
      clair: { libelle: 'Titre sur fond clair', aide: 'La photo de la page s’affiche en bannière au-dessus du titre.' },
    },
  },
  filtres: {
    libelle: 'Filtres de la page des offres',
    aide: 'Sur grand écran. Sur mobile, les filtres restent au-dessus des offres.',
    valeurs: {
      haut: { libelle: 'Au-dessus des offres' },
      cote: { libelle: 'En colonne à gauche (facettes)' },
    },
  },
  cartes: {
    libelle: 'Cartes et encadrés',
    aide: 'Offres, actualités, événements, entreprises, questions…',
    valeurs: {
      relief: { libelle: 'En relief', aide: 'Ombre et léger soulèvement au survol.' },
      plat: { libelle: 'À plat', aide: 'Simple bordure, sans ombre.' },
    },
  },
  pied: {
    libelle: 'Pied de page',
    aide: 'Repris aussi par votre site Gestmax.',
    valeurs: {
      sombre: { libelle: 'Sombre' },
      clair: { libelle: 'Clair' },
    },
  },
} satisfies Record<string, Option>;

export type CleOption = keyof typeof OPTIONS;
export type Options = { [K in CleOption]: keyof (typeof OPTIONS)[K]['valeurs'] & string };
export const CLES_OPTIONS = Object.keys(OPTIONS) as CleOption[];

export interface Gabarit {
  id: string;
  nom: string;
  description: string;
  /** Points forts, affichés en étiquettes sur la carte du template. */
  points: string[];
  defauts: Options;
  /** Typographie et arrondis qui vont le mieux à ce template (proposés, jamais imposés). */
  conseil: { policeTitres: string; policeTexte: string; arrondis: string };
  /** Conseil pour en tirer le meilleur parti. */
  astuce?: string;
}

export const GABARIT_PAR_DEFAUT = 'communaute';

export const GABARITS: Gabarit[] = [
  {
    id: 'communaute',
    nom: 'Communauté',
    description: 'Le style d’origine : chaleureux et arrondi, avec des photos et des dégradés de vos couleurs.',
    points: ['Accueil texte et photo', 'Bandeaux en dégradé', 'Cartes en relief'],
    defauts: { entete: 'classique', accueil: 'deux-colonnes', bandeaux: 'immersif', filtres: 'haut', cartes: 'relief', pied: 'sombre' },
    conseil: { policeTitres: 'sora', policeTexte: 'inter', arrondis: 'legers' },
  },
  {
    id: 'institutionnel',
    nom: 'Institutionnel',
    description: 'Sobre et structuré : barre de menu de votre couleur, accueil en aplat foncé, titres soulignés à gauche.',
    points: ['Barre de menu colorée', 'Accueil en aplat', 'Angles droits'],
    defauts: { entete: 'deux-lignes', accueil: 'deux-colonnes', bandeaux: 'clair', filtres: 'haut', cartes: 'plat', pied: 'sombre' },
    conseil: { policeTitres: 'source-sans-3', policeTexte: 'source-sans-3', arrondis: 'carres' },
  },
  {
    id: 'facettes',
    nom: 'Facettes',
    description: 'Pensé pour la recherche d’emploi : en-tête sombre, bannière aux couleurs du site, cartes blanches sur fond gris, filtres en colonne.',
    points: ['En-tête sombre', 'Recherche à facettes', 'Affichage dense'],
    defauts: { entete: 'classique', accueil: 'banniere', bandeaux: 'immersif', filtres: 'cote', cartes: 'plat', pied: 'sombre' },
    conseil: { policeTitres: 'inter', policeTexte: 'inter', arrondis: 'legers' },
    astuce: 'Présentez les offres « en lignes » dans « Ma page d’offres » pour une liste façon moteur de recherche.',
  },
  {
    id: 'vitrine',
    nom: 'Vitrine',
    description: 'Met le territoire en scène : photo d’accueil presque plein écran, logo centré, cartes façon magazine sans cadre.',
    points: ['Photo plein écran', 'Logo centré', 'Cartes magazine'],
    defauts: { entete: 'centre', accueil: 'banniere', bandeaux: 'immersif', filtres: 'haut', cartes: 'relief', pied: 'sombre' },
    conseil: { policeTitres: 'sora', policeTexte: 'inter', arrondis: 'prononces' },
    astuce: 'Choisissez une belle photo dans « Ma page d’accueil » et activez la carte des offres dans « Ma page d’offres ».',
  },
  {
    id: 'epure',
    nom: 'Épuré',
    description: 'Neutre et minimal : beaucoup de blanc, cartes en liste séparées par des filets, la couleur réservée aux actions.',
    points: ['Accueil texte puis photo', 'Cartes en liste', 'Sans dégradés'],
    defauts: { entete: 'classique', accueil: 'empile', bandeaux: 'clair', filtres: 'cote', cartes: 'plat', pied: 'clair' },
    conseil: { policeTitres: 'inter', policeTexte: 'inter', arrondis: 'legers' },
  },
];

export const IDS_GABARITS = GABARITS.map((g) => g.id);

export type Reglages = Record<string, Partial<Options>>;

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export const trouverGabarit = (id: unknown): Gabarit =>
  GABARITS.find((g) => g.id === id) ?? GABARITS.find((g) => g.id === GABARIT_PAR_DEFAUT)!;

/** Réglages enregistrables : templates, options et valeurs connus seulement (le reste est ignoré). */
export function normaliserReglages(valeur: unknown): Reglages {
  const propres: Reglages = {};
  if (!estObjet(valeur)) return propres;
  for (const id of IDS_GABARITS) {
    const saisis = valeur[id];
    if (!estObjet(saisis)) continue;
    const options: Record<string, string> = {};
    for (const cle of CLES_OPTIONS) {
      const v = saisis[cle];
      if (typeof v === 'string' && Object.prototype.hasOwnProperty.call(OPTIONS[cle].valeurs, v)) options[cle] = v;
    }
    if (Object.keys(options).length) propres[id] = options as Partial<Options>;
  }
  return propres;
}

/** Options effectives d'un template : ses réglages par défaut, complétés de ceux enregistrés pour lui. */
export function optionsDe(id: string, reglages: unknown): Options {
  const gabarit = trouverGabarit(id);
  return { ...gabarit.defauts, ...(normaliserReglages(reglages)[gabarit.id] ?? {}) } as Options;
}
