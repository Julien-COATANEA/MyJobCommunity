import { describe, expect, it } from 'vitest';
import { contraste, cssTheme, fondSurvol, fondsTheme, melanger, nuancesTexte, texteSur } from './theme';

const tokens = {
  couleurPrimaire: '#1a5f7a',
  couleurSecondaire: '#0f3d4c',
  couleurAccent: '#e8833a',
  couleurTexte: '#1c2b33',
  couleurFond: '#ffffff',
  policeTitres: 'sora',
  policeTexte: 'systeme',
  arrondis: 'prononces',
};

describe('thème', () => {
  it('calcule le contraste WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contraste('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('choisit un texte lisible sur la couleur d’accent', () => {
    expect(texteSur('#e8833a', '#1c2b33')).toBe('#1c2b33');
    expect(texteSur('#0f3d4c', '#1c2b33')).toBe('#ffffff');
  });

  it('génère les variables CSS et la @font-face des seules polices choisies', () => {
    const css = cssTheme(tokens);
    // Sélecteur plus spécifique que le :root de repli de global.css (sinon le thème serait ignoré).
    expect(css).toContain('html:root{');
    expect(css).toContain('--c-primaire:#1a5f7a;');
    expect(css).toContain('--rayon:20px;');
    expect(css).toContain("font-family:'Sora Variable'");
    expect(css).not.toContain('Inter Variable');
    expect(css).toContain('--police-texte:system-ui');
  });

  it('garantit 4,5:1 au texte doux et au secondaire sur leurs fonds', () => {
    for (const couleurTexte of ['#1c2b33', '#595959', '#767676']) {
      const t = { ...tokens, couleurTexte, couleurPrimaire: '#757575', couleurSecondaire: '#7aa7c7' };
      const n = nuancesTexte(t);
      const doux = n['--c-texte-doux-theme'];
      const fonds = [t.couleurFond, melanger(t.couleurPrimaire, t.couleurFond, 0.11), melanger(t.couleurSecondaire, t.couleurFond, 0.09)];
      for (const f of fonds) expect(contraste(doux, f)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(n['--c-secondaire-texte-theme'], fonds[2])).toBeGreaterThanOrEqual(4.5);
      expect(contraste(n['--c-secondaire-texte-theme'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
    expect(cssTheme(tokens)).toMatch(/--c-texte-doux-theme:#[0-9a-f]{6};/);
  });

  it('garantit le texte sur l’accent, même quand ni le blanc ni le texte du thème ne suffisent', () => {
    // Bleu de luminance moyenne : blanc 3,4:1, texte sombre en dessous de 4,5:1 selon le texte choisi.
    for (const accent of ['#3a8ee8', '#ffcc00', '#e8833a', '#7a3ae8', '#00a3a3', '#808080']) {
      const texte = texteSur(accent, '#767676');
      expect(contraste(texte, accent)).toBeGreaterThanOrEqual(4.5);
      // Au survol, le contraste ne baisse pas.
      expect(contraste(texte, fondSurvol(accent, texte))).toBeGreaterThanOrEqual(contraste(texte, accent));
    }
  });

  it('garantit les nuances calculées sur tous les fonds clairs du thème, pour des palettes limites', () => {
    const palettes = [
      tokens,
      // Couleurs acceptées de justesse par le BO, accent jaune, texte gris.
      { ...tokens, couleurPrimaire: '#757575', couleurSecondaire: '#7aa7c7', couleurAccent: '#ffcc00', couleurTexte: '#767676' },
      { ...tokens, couleurPrimaire: '#2e7d32', couleurAccent: '#3a8ee8', couleurTexte: '#595959' },
      { ...tokens, couleurPrimaire: '#6a1b9a', couleurAccent: '#ff7043', couleurFond: '#fafaf5' },
    ];
    for (const t of palettes) {
      const n = nuancesTexte(t);
      const f = fondsTheme(t) as Record<string, string>;
      for (const fond of [f.fond, f.accentPale, f.primairePale, f.surface]) expect(contraste(n['--c-accent-texte-theme'], fond)).toBeGreaterThanOrEqual(4.5);
      for (const fond of [f.fond, f.primairePale, f.surface]) expect(contraste(n['--c-lien-theme'], fond)).toBeGreaterThanOrEqual(4.5);
      // Bordure des champs : composant d'interface, 3:1 (RGAA 3.3).
      for (const fond of [f.fond, f.surface]) expect(contraste(n['--c-bordure-champ-theme'], fond)).toBeGreaterThanOrEqual(3);
      for (const fond of [f.fond, f.primairePale, f.secondairePale, f.surface]) expect(contraste(n['--c-texte-doux-theme'], fond)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(n['--c-sur-accent'], t.couleurAccent)).toBeGreaterThanOrEqual(4.5);
      expect(contraste(n['--c-sur-accent'], n['--c-accent-survol-theme'])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('garde le texte sur l’accent quand la couleur de fond est invalide', () => {
    const n = nuancesTexte({ ...tokens, couleurFond: '' });
    expect(n['--c-sur-accent']).toMatch(/^#[0-9a-f]{6}$/);
    expect(n).not.toHaveProperty('--c-texte-doux-theme');
  });

  it('garde les nuances calculables quand une seule couleur est invalide', () => {
    const n = nuancesTexte({ ...tokens, couleurAccent: '#fc0' });
    expect(n).not.toHaveProperty('--c-accent-texte-theme');
    expect(n).not.toHaveProperty('--c-sur-accent');
    expect(n['--c-texte-doux-theme']).toMatch(/^#[0-9a-f]{6}$/);
    expect(n['--c-lien-theme']).toMatch(/^#[0-9a-f]{6}$/);
    expect(n['--c-bordure-champ-theme']).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('mélange deux couleurs comme color-mix(in srgb)', () => {
    expect(melanger('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(melanger('#1a5f7a', '#ffffff', 1)).toBe('#1a5f7a');
  });
});
