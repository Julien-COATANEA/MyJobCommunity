import { describe, expect, it } from 'vitest';
import { boiteEnglobante, distanceKm, ecrireFiltres, filtresActifs, lireFiltres, requeteStrapi, FILTRES_VIDES } from './recherche-offres';

const LYON = { latitude: 45.758, longitude: 4.835 };
const RILLIEUX = { latitude: 45.818, longitude: 4.893 };

describe('filtres ↔ URL', () => {
  it('relit et réécrit les seuls filtres renseignés', () => {
    const f = lireFiltres('?q=dev&lieu=Lyon&rayon=20&tri=proche&inconnu=x');
    expect(f).toMatchObject({ q: 'dev', lieu: 'Lyon', rayon: '20', tri: 'proche', contrat: '' });
    expect(ecrireFiltres(f)).toBe('q=dev&lieu=Lyon&rayon=20&tri=proche');
    expect(lireFiltres('?tri=nimporte').tri).toBe('recent');
  });
});

describe('géographie', () => {
  it('calcule la distance Lyon – Rillieux-la-Pape (environ 8 km)', () => {
    expect(distanceKm(LYON, RILLIEUX)).toBeGreaterThan(7);
    expect(distanceKm(LYON, RILLIEUX)).toBeLessThan(9);
  });

  it('la boîte de 20 km contient Rillieux', () => {
    const b = boiteEnglobante(LYON, 20);
    expect(RILLIEUX.latitude).toBeGreaterThan(b.latMin);
    expect(RILLIEUX.latitude).toBeLessThan(b.latMax);
    expect(RILLIEUX.longitude).toBeLessThan(b.lonMax);
  });
});

describe('requeteStrapi', () => {
  it('combine contrat, ville et mot-clé', () => {
    const p = requeteStrapi({ ...FILTRES_VIDES, q: 'dev', lieu: 'Lyon', contrat: 'CDI' }, { page: 1, parPage: 24 });
    expect(p.get('filters[$and][0][typeContrat][$eq]')).toBe('CDI');
    expect(p.get('filters[$and][1][lieu][$containsi]')).toBe('Lyon');
    expect(p.get('filters[$and][2][$or][0][titre][$containsi]')).toBe('dev');
    expect(p.get('sort')).toBe('dateActivation:desc');
  });

  it('remplace la ville par la zone géographique et peut ignorer le contrat (comptage)', () => {
    const p = requeteStrapi({ ...FILTRES_VIDES, lieu: 'Lyon', rayon: '20', contrat: 'CDI' }, { page: 1, parPage: 100, boite: boiteEnglobante(LYON, 20), sansContrat: true });
    expect([...p.keys()].some((k) => k.includes('[lieu]'))).toBe(false);
    expect([...p.keys()].some((k) => k.includes('[typeContrat]'))).toBe(false);
    expect([...p.keys()].filter((k) => k.includes('[latitude]'))).toHaveLength(2);
  });
});

describe('filtresActifs', () => {
  it('libelle les pastilles', () => {
    expect(filtresActifs({ ...FILTRES_VIDES, lieu: 'Lyon', rayon: '20', contrat: 'CDI' }).map((a) => a.libelle)).toEqual(['Lyon (20 km)', 'CDI']);
  });
});
