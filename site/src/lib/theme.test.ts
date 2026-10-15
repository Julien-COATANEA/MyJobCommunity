import { describe, expect, it } from 'vitest';
import { contraste, cssTheme, melanger, nuancesTexte, texteSur } from './theme';

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

  it('mélange deux couleurs comme color-mix(in srgb)', () => {
    expect(melanger('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(melanger('#1a5f7a', '#ffffff', 1)).toBe('#1a5f7a');
  });
});
