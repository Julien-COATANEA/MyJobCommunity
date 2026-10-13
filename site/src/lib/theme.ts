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
  };
  const declarations = Object.entries(variables)
    .map(([k, v]) => `${k}:${v};`)
    .join('');
  // « html:root » est plus spécifique que le « :root » de repli de global.css : le thème l'emporte quel que soit
  // l'ordre des feuilles de style (Astro place ses fichiers CSS après ce bloc en ligne).
  return `${fontFaces}html:root{${declarations}}`;
}
