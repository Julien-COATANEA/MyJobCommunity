import { describe, expect, it } from 'vitest';
import { absolu, estActif, resoudreLien } from './liens';

describe('resoudreLien', () => {
  it('résout les liens gestmax: vers le front Gestmax', () => {
    expect(resoudreLien('gestmax:/apply/1/1/x', 'https://emploi.gestmax.fr/')).toBe('https://emploi.gestmax.fr/apply/1/1/x');
    expect(resoudreLien('gestmax:search', 'https://emploi.gestmax.fr')).toBe('https://emploi.gestmax.fr/search');
  });

  it('laisse les autres liens intacts', () => {
    expect(resoudreLien('/offres', null)).toBe('/offres');
    expect(resoudreLien('https://exemple.fr', null)).toBe('https://exemple.fr');
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
  });
});
