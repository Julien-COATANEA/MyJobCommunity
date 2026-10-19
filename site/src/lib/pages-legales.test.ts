import { describe, expect, it } from 'vitest';
import { avecConformite, libelleAccessibilite, liensLegauxParDefaut, lienPolitiqueCookiesEffectif } from './pages-legales';

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
      { libelle: 'Accessibilité : non conforme', url: '/accessibilite/' },
    ]);
  });

  it('indique l’état de conformité dans le lien vers la déclaration d’accessibilité', () => {
    expect(liensLegauxParDefaut(pages('accessibilite'), 'partiellement-conforme')[0].libelle).toBe('Accessibilité : partiellement conforme');
    // Sans valeur ou valeur inconnue : « non conforme », jamais une conformité non démontrée.
    expect(libelleAccessibilite(null)).toBe('Accessibilité : non conforme');
    expect(libelleAccessibilite('autre')).toBe('Accessibilité : non conforme');
  });

  it('propose les quatre pages quand elles sont toutes publiées', () => {
    const liens = liensLegauxParDefaut(pages('mentions-legales', 'donnees-personnelles', 'politique-de-cookies', 'accessibilite'));
    expect(liens.map((l) => l.libelle)).toEqual(['Mentions légales', 'Données personnelles', 'Politique de cookies', 'Accessibilité : non conforme']);
  });
});

describe('avecConformite', () => {
  it('ajoute l’état de conformité au lien d’accessibilité saisi dans le BO', () => {
    const liens = [{ libelle: 'Mentions', url: '/mentions-legales' }, { libelle: 'Accessibilité', url: '/accessibilite' }];
    expect(avecConformite(liens, 'totalement-conforme').map((l) => l.libelle)).toEqual(['Mentions', 'Accessibilité : totalement conforme']);
  });

  it('impose l’état réglé dans le BO, même si le libellé saisi en annonce un autre', () => {
    const liens = [{ libelle: 'Accessibilité : totalement conforme', url: '/accessibilite/' }];
    expect(avecConformite(liens, 'non-conforme')[0].libelle).toBe('Accessibilité : non conforme');
  });

  it('reconnaît le lien à son chemin, relatif ou absolu', () => {
    const liens = [
      { libelle: 'Déclaration', url: 'https://www.exemple.fr/declaration-accessibilite/' },
      { libelle: 'Contact', url: '/contact/' },
    ];
    expect(avecConformite(liens, 'partiellement-conforme').map((l) => l.libelle)).toEqual(['Accessibilité : partiellement conforme', 'Contact']);
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
