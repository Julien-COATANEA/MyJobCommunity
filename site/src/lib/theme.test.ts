import { describe, expect, it } from 'vitest';
import { contraste, cssTheme, texteSur } from './theme';

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
});
