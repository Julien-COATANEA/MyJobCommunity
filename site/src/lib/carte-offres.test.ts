import { describe, expect, it } from 'vitest';
import {
  OFFRES_PAR_INFOBULLE, dansZone, htmlInfobulle, libelleRepere, regrouperParLieu, regrouperProches, zoneAutour, type OffreSurCarte,
} from './carte-offres';

const offre = (extra: Partial<OffreSurCarte> = {}): OffreSurCarte => ({
  titre: 'Comptable', slug: 'comptable', lieu: 'Annecy', nomEntreprise: 'Numérival', typeContrat: 'CDI',
  latitude: '45.8992', longitude: '6.1294', ...extra,
});

describe('carte des offres', () => {
  it('regroupe les offres d’une même ville en un seul repère', () => {
    const lieux = regrouperParLieu([
      offre(),
      offre({ slug: 'b' }),
      offre({ slug: 'c', lieu: 'Valence', latitude: 44.9334, longitude: 4.8924 }),
    ]);
    expect(lieux).toHaveLength(2);
    expect(lieux[0]).toMatchObject({ lieu: 'Annecy', latitude: 45.8992, longitude: 6.1294 });
    expect(lieux[0].offres).toHaveLength(2);
    expect(libelleRepere(lieux[0])).toBe('Annecy : 2 offres');
  });

  it('ignore les offres sans position', () => {
    expect(regrouperParLieu([offre({ latitude: null }), offre({ longitude: 'n/a' })])).toEqual([]);
  });

  it('échappe le contenu de l’infobulle', () => {
    const [lieu] = regrouperParLieu([offre({ titre: '<img src=x onerror=alert(1)>', lieu: 'A&B' })]);
    const html = htmlInfobulle(lieu);
    expect(html).not.toContain('<img');
    expect(html).toContain('A&amp;B : 1 offre');
  });

  it('regroupe les lieux proches à l’écran autour du plus fourni', () => {
    const groupes = regrouperProches(
      [
        { id: 'villeurbanne', x: 110, y: 100, poids: 2 },
        { id: 'lyon', x: 100, y: 100, poids: 8 },
        { id: 'paris', x: 400, y: 50, poids: 5 },
      ],
      50,
    );
    expect(groupes.map((g) => g.map((p) => p.id))).toEqual([['lyon', 'villeurbanne'], ['paris']]);
  });

  it('teste si une offre est dans la zone visible', () => {
    const zone = { latMin: 45, latMax: 46, lonMin: 4, lonMax: 5 };
    expect(dansZone({ latitude: '45.76', longitude: '4.83' }, zone)).toBe(true);
    expect(dansZone({ latitude: 48.85, longitude: 2.35 }, zone)).toBe(false);
    expect(dansZone({ latitude: null, longitude: null }, zone)).toBe(false);
  });

  it('propose de filtrer la liste quand le lieu compte beaucoup d’offres', () => {
    const offres = Array.from({ length: OFFRES_PAR_INFOBULLE + 2 }, (_, i) => offre({ slug: `o${i}` }));
    const html = htmlInfobulle(regrouperParLieu(offres)[0]);
    expect(html.match(/<li>/g)).toHaveLength(OFFRES_PAR_INFOBULLE);
    expect(html).toContain(`data-carte-lat="45.8992" data-carte-lon="6.1294">Voir les ${OFFRES_PAR_INFOBULLE + 2} offres à Annecy`);
  });

  it('retrouve les offres d’un repère malgré des orthographes différentes du lieu', () => {
    const offres = [offre(), offre({ slug: 'b', lieu: 'ANNECY (74)' }), offre({ slug: 'c', lieu: 'Valence', latitude: 44.93, longitude: 4.89 })];
    const [lieu] = regrouperParLieu(offres);
    const zone = zoneAutour(lieu.latitude, lieu.longitude);
    expect(offres.filter((o) => dansZone(o, zone)).map((o) => o.slug)).toEqual(['comptable', 'b']);
  });
});
