// Réglages d'identité de l'écran « Apparence » (couleurs, polices, arrondis) et petits calculs de couleur de l'aperçu.
import { ratioContraste } from '../../../utils/contraste';

export interface Theme {
  nomSite: string;
  baseline: string;
  logoTexte: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurTexte: string;
  couleurFond: string;
  policeTitres: string;
  policeTexte: string;
  arrondis: string;
}
export interface Logo { id: number; url: string; name: string }

export const POLICES: Record<string, { libelle: string; nom: string; famille: string }> = {
  sora: { libelle: 'Sora (géométrique, moderne)', nom: 'Sora', famille: "'Sora Variable', system-ui, sans-serif" },
  inter: { libelle: 'Inter (neutre, très lisible)', nom: 'Inter', famille: "'Inter Variable', system-ui, sans-serif" },
  'source-sans-3': { libelle: 'Source Sans 3 (institutionnelle)', nom: 'Source Sans 3', famille: "'Source Sans 3 Variable', system-ui, sans-serif" },
  'atkinson-hyperlegible': { libelle: 'Atkinson Hyperlegible (accessibilité renforcée)', nom: 'Atkinson Hyperlegible', famille: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" },
  systeme: { libelle: 'Police du système (la plus légère)', nom: 'police du système', famille: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
};
export const ARRONDIS: Record<string, { libelle: string; rayon: number }> = {
  carres: { libelle: 'Angles droits', rayon: 2 },
  legers: { libelle: 'Légèrement arrondis', rayon: 10 },
  prononces: { libelle: 'Très arrondis', rayon: 20 },
};
export const PALETTES: { nom: string; couleurs: Pick<Theme, 'couleurPrimaire' | 'couleurSecondaire' | 'couleurAccent'> }[] = [
  // Palette de la maquette MyJobCommunity (vert, bleu, orange).
  { nom: 'MyJobCommunity', couleurs: { couleurPrimaire: '#1a7460', couleurSecondaire: '#15506e', couleurAccent: '#f08a3c' } },
  { nom: 'Océan', couleurs: { couleurPrimaire: '#1a5f7a', couleurSecondaire: '#0f3d4c', couleurAccent: '#e8833a' } },
  { nom: 'Forêt', couleurs: { couleurPrimaire: '#2d6a4f', couleurSecondaire: '#1b4332', couleurAccent: '#f4a261' } },
  { nom: 'Ardoise', couleurs: { couleurPrimaire: '#3d5a80', couleurSecondaire: '#293241', couleurAccent: '#ee6c4d' } },
  { nom: 'Bordeaux', couleurs: { couleurPrimaire: '#8d2f45', couleurSecondaire: '#4a1a2a', couleurAccent: '#e9a23b' } },
  { nom: 'Terre', couleurs: { couleurPrimaire: '#8a4b2a', couleurSecondaire: '#3e2a1e', couleurAccent: '#d8a031' } },
  { nom: 'Violet', couleurs: { couleurPrimaire: '#5b3f8c', couleurSecondaire: '#2e1f4d', couleurAccent: '#3fb7a5' } },
];
export const COULEURS: { cle: keyof Theme; libelle: string; aide: string }[] = [
  { cle: 'couleurPrimaire', libelle: 'Couleur principale', aide: 'Boutons, liens, éléments actifs' },
  { cle: 'couleurSecondaire', libelle: 'Couleur secondaire', aide: 'Espace recruteur, dates d’événements, dégradés des bandeaux' },
  { cle: 'couleurAccent', libelle: "Couleur d'accent", aide: 'Soulignés, étiquettes, bouton de recherche' },
  { cle: 'couleurTexte', libelle: 'Couleur du texte', aide: 'Texte courant et titres' },
  { cle: 'couleurFond', libelle: 'Couleur de fond', aide: 'Fond des pages' },
];

export const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Blanc ou couleur sombre, la plus lisible sur un fond ; noir ou blanc purs sous 4,5:1 (même règle que le site, theme.ts). */
export const texteSur = (fond: string, sombre: string) => {
  if (!HEX.test(fond)) return sombre;
  const prefere = ratioContraste('#ffffff', fond) >= ratioContraste(sombre, fond) ? '#ffffff' : sombre;
  if (ratioContraste(prefere, fond) >= 4.5) return prefere;
  return ratioContraste('#000000', fond) >= ratioContraste('#ffffff', fond) ? '#000000' : '#ffffff';
};

/** Accent assombri juste assez pour être lisible (4,5:1) sur chacun des fonds, comme --c-accent-texte du site. */
export const accentLisible = (accent: string, fonds: string[]) => {
  if (!HEX.test(accent) || !fonds.every((f) => HEX.test(f))) return accent;
  for (let p = 1; p > 0; p -= 0.02) {
    const c = melange(accent, p, '#000000');
    if (fonds.every((f) => ratioContraste(c, f) >= 4.5)) return c;
  }
  return '#000000';
};

/** Équivalent de color-mix(in srgb, hex ratio, avec) : mêmes nuances que jetons.css sur le site. */
export const melange = (hex: string, ratio: number, avec = '#ffffff') => {
  if (!HEX.test(hex) || !HEX.test(avec)) return hex;
  const c = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(c(hex, i) * ratio + c(avec, i) * (1 - ratio)).toString(16).padStart(2, '0')).join('')}`;
};
