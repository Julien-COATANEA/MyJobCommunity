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

/**
 * Couleur de texte lisible sur un fond donné : blanc ou texte du thème (le plus contrasté), sinon noir ou blanc purs
 * quand aucun des deux n'atteint 4,5:1 (fond de luminance moyenne : bleu #3a8ee8, par exemple). L'un des deux atteint
 * toujours 4,5:1, quel que soit le fond.
 */
export function texteSur(fond: string, texteSombre: string): string {
  const prefere = contraste('#ffffff', fond) >= contraste(texteSombre, fond) ? '#ffffff' : texteSombre;
  if (contraste(prefere, fond) >= 4.5) return prefere;
  return contraste('#000000', fond) >= contraste('#ffffff', fond) ? '#000000' : '#ffffff';
}

/**
 * Fond d'un bouton au survol : assombri sous un texte clair, éclairci sous un texte sombre. Le contraste ne peut
 * qu'augmenter (un assombrissement fixe le faisait tomber sous 4,5:1 avec un texte sombre).
 */
export function fondSurvol(fond: string, texte: string): string {
  return luminance(texte) > luminance(fond) ? melanger(fond, '#000000', 0.88) : melanger(fond, '#ffffff', 0.88);
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
function versContraste(couleur: string, cible: string, depart: number, fonds: string[], ratio = 4.5): string | null {
  if (![couleur, cible, ...fonds].every((c) => HEX.test(c))) return null;
  const lisible = (c: string) => fonds.every((f) => contraste(c, f) >= ratio);
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
 * Fonds clairs du thème (mêmes mélanges que jetons.css). Chaque fond vaut null si une couleur dont il dépend est
 * invalide : les autres nuances restent calculées (une couleur d'accent mal saisie ne retire pas le texte doux).
 */
export function fondsTheme(t: TokensTheme) {
  const fond = HEX.test(t.couleurFond) ? t.couleurFond : null;
  const pale = (couleur: string, p: number) => (fond && HEX.test(couleur) ? melanger(couleur, fond, p) : null);
  return {
    fond,
    primairePale: pale(t.couleurPrimaire, 0.11),
    secondairePale: pale(t.couleurSecondaire, 0.09),
    accentPale: pale(t.couleurAccent, 0.2),
    // Fond des champs et de certains gabarits (Facettes : tout le contenu).
    surface: fond && HEX.test(t.couleurTexte) && HEX.test(t.couleurPrimaire)
      ? melanger(t.couleurPrimaire, melanger(t.couleurTexte, fond, 0.02), 0.04)
      : null,
  };
}

/**
 * Nuances dont le contraste est garanti (RGAA 3.2 et 3.3), quelles que soient les couleurs du BO :
 *  - texte doux : texte éclairci vers le fond, lisible sur le fond, la surface et les fonds pâles ;
 *  - secondaire « texte » : secondaire assombri, lisible sur son fond pâle (bouton espace recruteur, étiquettes) ;
 *  - accent « texte » : accent assombri juste ce qu'il faut (surtitres, liens du texte riche, badge « Nouveau ») ;
 *  - liens : primaire, assombri s'il le faut pour rester lisible sur les fonds teintés des gabarits ;
 *  - bordure des champs : 3:1 au moins sur le fond et sur la surface (composant d'interface, RGAA 3.3) ;
 *  - texte sur l'accent et fond de survol des boutons d'accent.
 * Une nuance dont une couleur est invalide est omise : la feuille de style garde alors sa valeur de repli.
 */
export function nuancesTexte(t: TokensTheme): Record<string, string> {
  // Texte sur l'accent : ne dépend que de l'accent et du texte, calculé même si le fond est invalide.
  const surAccent = HEX.test(t.couleurAccent) && HEX.test(t.couleurTexte) ? texteSur(t.couleurAccent, t.couleurTexte) : null;
  const variablesAccent = surAccent ? { '--c-sur-accent': surAccent, '--c-accent-survol-theme': fondSurvol(t.couleurAccent, surAccent) } : {};
  const f = fondsTheme(t);
  if (!f.fond) return variablesAccent;
  const sur = (...fonds: (string | null)[]) => fonds.filter((x): x is string => !!x);
  const doux = versContraste(t.couleurTexte, f.fond, 0.78, sur(f.fond, f.primairePale, f.secondairePale, f.surface));
  // De la couleur pure (p = 0 côté noir) vers le noir.
  const secondaire = f.secondairePale ? versContraste('#000000', t.couleurSecondaire, 0, [f.secondairePale]) : null;
  const accent = versContraste('#000000', t.couleurAccent, 0, sur(f.fond, f.accentPale, f.primairePale, f.surface));
  const lien = versContraste('#000000', t.couleurPrimaire, 0, sur(f.fond, f.primairePale, f.surface));
  // Au moins 45 % de texte : une bordure franche, même quand 3:1 est atteint plus tôt.
  const bordure = versContraste(t.couleurTexte, f.fond, 0.45, sur(f.fond, f.surface), 3);
  return {
    ...(doux ? { '--c-texte-doux-theme': doux } : {}),
    ...(secondaire ? { '--c-secondaire-texte-theme': secondaire } : {}),
    ...(accent ? { '--c-accent-texte-theme': accent } : {}),
    ...(lien ? { '--c-lien-theme': lien } : {}),
    ...(bordure ? { '--c-bordure-champ-theme': bordure } : {}),
    ...variablesAccent,
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
