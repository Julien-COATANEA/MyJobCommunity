import { describe, expect, it } from 'vitest';
import { htmlCarteOffre, type OffreCarte } from './carte-offre';

const maintenant = new Date('2026-10-13T12:00:00Z').getTime();
const offre: OffreCarte = {
  titre: 'Technicien <maintenance>',
  slug: 'technicien-1042',
  typeContrat: 'CDI',
  lieu: 'Lyon',
  nomEntreprise: 'Ateliers du Val',
  salaire: '35-40 K€',
  dateActivation: '2026-10-10T08:00:00Z',
  logoUrl: null,
};

describe('htmlCarteOffre', () => {
  it('affiche contrat coloré, badge Nouveau, salaire et date relative', () => {
    const html = htmlCarteOffre(offre, { maintenant });
    expect(html).toContain('badge-contrat--cdi');
    expect(html).toContain('badge-nouveau');
    expect(html).toContain('35-40 K€');
    expect(html).toContain('Publiée il y a 3 jours');
    expect(html).toContain('href="/offres/technicien-1042/"');
  });

  it('échappe le titre et remplace le logo absent par des initiales décoratives', () => {
    const html = htmlCarteOffre(offre, { maintenant });
    expect(html).toContain('Technicien &lt;maintenance&gt;');
    expect(html).toContain('aria-hidden="true">AD</span>');
  });

  it('indique la distance lors d’une recherche autour d’une ville', () => {
    expect(htmlCarteOffre({ ...offre, distance: 12.4 }, { maintenant })).toContain('(12 km)');
  });
});
