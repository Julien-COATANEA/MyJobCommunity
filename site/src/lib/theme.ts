// Transforme les tokens de thème saisis dans le BO (Paramètres du site) en variables CSS.
import interUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import soraUrl from '@fontsource-variable/sora/files/sora-latin-wght-normal.woff2?url';
import sourceSansUrl from '@fontsource-variable/source-sans-3/files/source-sans-3-latin-wght-normal.woff2?url';
import atkinsonUrl from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2?url';

export interface TokensTheme {
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurTexte: string;
  couleurFond: string;
  policeTitres: string;
  policeTexte: string;
  arrondis: string;
}

const SYSTEME = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Polices auto-hébergées (sous-ensemble latin uniquement : poids minimal, aucun appel à un tiers). */
export const POLICES: Record<string, { famille: string; url: string | null }> = {
  inter: { famille: 'Inter Variable', url: interUrl },
  sora: { famille: 'Sora Variable', url: soraUrl },
  'source-sans-3': { famille: 'Source Sans 3 Variable', url: sourceSansUrl },
  'atkinson-hyperlegible': { famille: 'Atkinson Hyperlegible Next Variable', url: atkinsonUrl },
  systeme: { famille: '', url: null },
};

const RAYONS: Record<string, string> = { carres: '2px', legers: '10px', prononces: '20px' };

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Couleur de texte (blanc ou texte du thème) la plus lisible sur un fond donné. */
export function texteSur(fond: string, texteSombre: string): string {
  return contraste('#ffffff', fond) >= contraste(texteSombre, fond) ? '#ffffff' : texteSombre;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Équivalent de color-mix(in srgb, a p%, b) ; p entre 0 et 1. */
export function melanger(a: string, b: string, p: number): string {
  const canal = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(canal(a, i) * p + canal(b, i) * (1 - p)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Mélange le moins prononcé de `couleur` vers `cible` (à partir de `depart`) qui atteint 4,5:1 sur chacun des fonds ;
 * si `couleur` elle-même n'y suffit pas, elle est poussée vers le noir (ou le blanc sur un fond sombre).
 * Sans réglage possible (couleurs invalides), null : la feuille de style garde sa valeur de repli.
 */
function versContraste(couleur: string, cible: string, depart: number, fonds: string[]): string | null {
  if (![couleur, cible, ...fonds].every((c) => HEX.test(c))) return null;
  const lisible = (c: string) => fonds.every((f) => contraste(c, f) >= 4.5);
  for (let p = depart; p < 1; p += 0.02) {
    const c = melanger(couleur, cible, p);
    if (lisible(c)) return c;
  }
  const extreme = contraste('#000000', fonds[0]) >= contraste('#ffffff', fonds[0]) ? '#000000' : '#ffffff';
  for (let p = 0; p < 1; p += 0.05) {
    const c = melanger(extreme, couleur, p);
    if (lisible(c)) return c;
  }
  return extreme;
}

/**
 * Nuances de texte dont le contraste est garanti (RGAA 3.2), quelles que soient les couleurs du BO :
 *  - texte doux : texte éclairci vers le fond, lisible sur le fond et les fonds pâles (primaire, secondaire) ;
 *  - secondaire « texte » : secondaire assombri, lisible sur son fond pâle (bouton espace recruteur, étiquettes).
 * Les fonds pâles reprennent les mélanges de jetons.css.
 */
export function nuancesTexte(t: TokensTheme): Record<string, string> {
  const fond = t.couleurFond;
  const fonds = [fond];
  if (HEX.test(fond) && HEX.test(t.couleurPrimaire)) fonds.push(melanger(t.couleurPrimaire, fond, 0.11));
  if (HEX.test(fond) && HEX.test(t.couleurSecondaire)) fonds.push(melanger(t.couleurSecondaire, fond, 0.09));
  // Texte doux : au moins 78 % de texte, plus si nécessaire (jusqu'au texte lui-même).
  const doux = versContraste(t.couleurTexte, fond, 0.78, fonds);
  // Secondaire : de la couleur pure (p = 0 côté noir) vers le noir.
  const secondaire = HEX.test(t.couleurSecondaire)
    ? versContraste('#000000', t.couleurSecondaire, 0, fonds.length > 2 ? [fonds[2]] : fonds)
    : null;
  return {
    ...(doux ? { '--c-texte-doux-theme': doux } : {}),
    ...(secondaire ? { '--c-secondaire-texte-theme': secondaire } : {}),
  };
}

const pile = (cle: string) => {
  const police = POLICES[cle] ?? POLICES.systeme;
  return police.famille ? `'${police.famille}', ${SYSTEME}` : SYSTEME;
};

/** Polices effectivement utilisées (à précharger). */
export function policesUtilisees(t: TokensTheme): { famille: string; url: string }[] {
  const cles = [...new Set([t.policeTitres, t.policeTexte])];
  return cles.map((c) => POLICES[c]).filter((p): p is { famille: string; url: string } => !!p?.url);
}

/** CSS injecté en ligne dans le <head> : @font-face des polices choisies + variables du thème. */
export function cssTheme(t: TokensTheme): string {
  const fontFaces = policesUtilisees(t)
    .map(
      (p) =>
        `@font-face{font-family:'${p.famille}';font-style:normal;font-display:swap;font-weight:100 900;src:url(${p.url}) format('woff2-variations');}`,
    )
    .join('');
  const variables = {
    '--c-primaire': t.couleurPrimaire,
    '--c-secondaire': t.couleurSecondaire,
    '--c-accent': t.couleurAccent,
    '--c-sur-accent': texteSur(t.couleurAccent, t.couleurTexte),
    '--c-texte': t.couleurTexte,
    '--c-fond': t.couleurFond,
    '--police-titres': pile(t.policeTitres),
    '--police-texte': pile(t.policeTexte),
    '--rayon': RAYONS[t.arrondis] ?? RAYONS.legers,
    ...nuancesTexte(t),
  };
  const declarations = Object.entries(variables)
    .map(([k, v]) => `${k}:${v};`)
    .join('');
  // « html:root » est plus spécifique que le « :root » de repli de global.css : le thème l'emporte quel que soit
  // l'ordre des feuilles de style (Astro place ses fichiers CSS après ce bloc en ligne).
  return `${fontFaces}html:root{${declarations}}`;
}
