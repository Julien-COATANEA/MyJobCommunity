import { describe, expect, it } from 'vitest';
import { liensLegauxParDefaut, lienPolitiqueCookiesEffectif } from './pages-legales';

const pages = (...slugs: string[]) => slugs.map((slug) => ({ slug }));

describe('liensLegauxParDefaut', () => {
  it('ne propose rien sans page légale publiée', () => {
    expect(liensLegauxParDefaut([])).toEqual([]);
    expect(liensLegauxParDefaut(pages('contact', 'a-propos'))).toEqual([]);
  });

  it('liste les pages légales publiées, dans l’ordre habituel', () => {
    expect(liensLegauxParDefaut(pages('accessibilite', 'contact', 'mentions-legales', 'politique-de-cookies'))).toEqual([
      { libelle: 'Mentions légales', url: '/mentions-legales/' },
      { libelle: 'Politique de cookies', url: '/politique-de-cookies/' },
      { libelle: 'Accessibilité', url: '/accessibilite/' },
    ]);
  });

  it('propose les quatre pages quand elles sont toutes publiées', () => {
    const liens = liensLegauxParDefaut(pages('mentions-legales', 'donnees-personnelles', 'politique-de-cookies', 'accessibilite'));
    expect(liens.map((l) => l.libelle)).toEqual(['Mentions légales', 'Données personnelles', 'Politique de cookies', 'Accessibilité']);
  });
});

describe('lienPolitiqueCookiesEffectif', () => {
  it('garde le lien saisi dans le BO', () => {
    expect(lienPolitiqueCookiesEffectif('/ma-page/', pages('politique-de-cookies'))).toBe('/ma-page/');
  });

  it('utilise la politique de cookies publiée quand le lien est vide', () => {
    expect(lienPolitiqueCookiesEffectif('', pages('politique-de-cookies'))).toBe('/politique-de-cookies/');
    expect(lienPolitiqueCookiesEffectif(null, pages('politique-de-cookies'))).toBe('/politique-de-cookies/');
    expect(lienPolitiqueCookiesEffectif('  ', pages('politique-de-cookies'))).toBe('/politique-de-cookies/');
  });

  it('n’en met pas si la page n’est pas publiée', () => {
    expect(lienPolitiqueCookiesEffectif(null, pages('mentions-legales'))).toBeNull();
    expect(lienPolitiqueCookiesEffectif(undefined, [])).toBeNull();
  });
});
