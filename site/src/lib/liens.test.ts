import { describe, expect, it } from 'vitest';
import { absolu, avecSlash, estActif, lienSur, resoudreLien, urlPagination } from './liens';

describe('resoudreLien', () => {
  it('résout les liens gestmax: vers le front Gestmax', () => {
    expect(resoudreLien('gestmax:/apply/1/1/x', 'https://emploi.gestmax.fr/')).toBe('https://emploi.gestmax.fr/apply/1/1/x');
    expect(resoudreLien('gestmax:search', 'https://emploi.gestmax.fr')).toBe('https://emploi.gestmax.fr/search');
  });

  it('laisse les liens externes intacts et termine les chemins internes par « / »', () => {
    expect(resoudreLien('/offres', null)).toBe('/offres/');
    expect(resoudreLien('/offres?contrat=CDI#liste', null)).toBe('/offres/?contrat=CDI#liste');
    expect(resoudreLien('https://exemple.fr', null)).toBe('https://exemple.fr');
  });

  it('écarte les liens vides ou dangereux', () => {
    expect(resoudreLien('', null)).toBeNull();
    expect(resoudreLien(null, null)).toBeNull();
    expect(resoudreLien('javascript:alert(1)', null)).toBeNull();
    expect(resoudreLien('gestmax:/x', 'javascript:alert(1)//')).toBeNull();
  });
});

describe('lienSur', () => {
  it('accepte http, https, mailto, tel et les chemins relatifs', () => {
    for (const u of ['https://a.fr', 'http://a.fr', 'mailto:a@b.fr', 'tel:+33100000000', '/page', '#ancre']) expect(lienSur(u)).toBe(u);
    expect(lienSur('  https://a.fr ')).toBe('https://a.fr');
  });

  it('refuse les autres protocoles', () => {
    for (const u of ['javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'exemple.fr', '', null, undefined]) {
      expect(lienSur(u)).toBeNull();
    }
  });
});

describe('avecSlash', () => {
  it('ajoute la barre finale aux pages internes seulement', () => {
    expect(avecSlash('/actualites')).toBe('/actualites/');
    expect(avecSlash('/')).toBe('/');
    expect(avecSlash('/offres/')).toBe('/offres/');
    expect(avecSlash('/evenements/salon.ics')).toBe('/evenements/salon.ics');
    expect(avecSlash('/sitemap-index.xml')).toBe('/sitemap-index.xml');
    expect(avecSlash('https://exemple.fr/page')).toBe('https://exemple.fr/page');
    expect(avecSlash('//cdn.exemple.fr/page')).toBe('//cdn.exemple.fr/page');
    expect(avecSlash('#contenu')).toBe('#contenu');
  });
});

describe('estActif', () => {
  it('reconnaît la page et ses sous-pages', () => {
    expect(estActif('/actualites', '/actualites/mon-article/')).toBe(true);
    expect(estActif('/offres?contrat=CDI', '/offres/')).toBe(true);
    expect(estActif('/', '/offres/')).toBe(false);
    expect(estActif('/', '/')).toBe(true);
  });
});

describe('absolu', () => {
  it('préfixe uniquement les chemins internes', () => {
    expect(absolu('/offres', 'https://site.fr/')).toBe('https://site.fr/offres');
    expect(absolu('https://autre.fr', 'https://site.fr')).toBe('https://autre.fr');
    expect(absolu(null, 'https://site.fr')).toBeNull();
  });
});

describe('urlPagination', () => {
  it('construit les liens numérotés depuis la page 1 (sans page.url.first) comme depuis les suivantes', () => {
    const page1 = { current: '/actualites', next: '/actualites/2' };
    expect(urlPagination(page1, 1, 1)).toBe('/actualites/');
    expect(urlPagination(page1, 1, 3)).toBe('/actualites/3/');
    const page2 = { current: '/actualites/2', first: '/actualites', prev: '/actualites' };
    expect(urlPagination(page2, 2, 1)).toBe('/actualites/');
    expect(urlPagination(page2, 2, 3)).toBe('/actualites/3/');
  });
});
