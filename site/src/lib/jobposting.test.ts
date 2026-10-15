import { describe, expect, it } from 'vitest';
import { construireJobPosting, salaireJobPosting, typesEmploi, type DonneesJobPosting } from './jobposting';

const base: DonneesJobPosting = {
  titre: 'Chef de projet IT (H/F)',
  sourceId: '646',
  descriptionHtml: '<p>Le poste</p>',
  resume: 'Chef de projet IT chez AD-RH',
  typeContrat: 'CDI',
  lieu: 'Lyon',
  departement: 'Rhône (69)',
  secteur: 'Informatique',
  salaire: '60-70 K€',
  nomEntreprise: 'AD-RH',
  logoUrl: 'https://exemple.fr/logo.png',
  latitude: 45.76,
  longitude: 4.83,
  dateActivation: '2025-10-17T11:27:16.000Z',
  dateFinPublication: null,
  urlOffre: 'https://site.fr/offres/chef-de-projet-it-646/',
  urlEntreprise: null,
  nomSite: 'My Job Community',
};

describe('typesEmploi', () => {
  it.each([
    ['CDI', ['FULL_TIME']],
    ['CDD', ['TEMPORARY']],
    ['Intérim', ['TEMPORARY']],
    ['Stage', ['INTERN']],
    ['Alternance', ['OTHER']],
    ['Contrat d’apprentissage', ['OTHER']],
    ['Freelance', ['CONTRACTOR']],
    ['CDI temps partiel', ['PART_TIME']],
    ['Autre chose', []],
    [null, []],
  ])('%s → %j', (contrat, attendu) => {
    expect(typesEmploi(contrat as string | null)).toEqual(attendu);
  });
});

describe('salaireJobPosting', () => {
  const annuel = (value: Record<string, unknown>) => ({ '@type': 'MonetaryAmount', currency: 'EUR', value: { '@type': 'QuantitativeValue', unitText: 'YEAR', ...value } });

  it('lit une fourchette en K€ (annuelle)', () => {
    expect(salaireJobPosting('50-55 K€')).toEqual(annuel({ minValue: 50000, maxValue: 55000 }));
  });
  it('lit « plus de 100 K€ » comme un plancher', () => {
    expect(salaireJobPosting('plus de 100 K€')).toEqual(annuel({ minValue: 100000 }));
  });
  it('lit une fourchette avec séparateurs de milliers', () => {
    expect(salaireJobPosting('35 000 - 40 000 € brut/an')).toEqual(annuel({ minValue: 35000, maxValue: 40000 }));
  });
  it('lit un montant unique', () => {
    expect(salaireJobPosting('42 000 €')).toEqual(annuel({ value: 42000 }));
  });
  it("reconnaît l'unité écrite", () => {
    expect(salaireJobPosting('2 500 € / mois')).toMatchObject({ value: { unitText: 'MONTH', value: 2500 } });
    expect(salaireJobPosting('12,50 €/heure')).toMatchObject({ value: { unitText: 'HOUR', value: 12.5 } });
  });
  it("n'invente pas : texte libre, montant sans unité ou sans devise → null", () => {
    expect(salaireJobPosting('selon profil')).toBeNull();
    expect(salaireJobPosting('à négocier')).toBeNull();
    expect(salaireJobPosting('2 500 €')).toBeNull();
    expect(salaireJobPosting('35h/semaine')).toBeNull();
    expect(salaireJobPosting('50-55 K')).toBeNull();
    expect(salaireJobPosting(null)).toBeNull();
  });
});

describe('construireJobPosting', () => {
  it('produit les propriétés exigées par Google Jobs', () => {
    const j: any = construireJobPosting(base);
    expect(j['@type']).toBe('JobPosting');
    expect(j.title).toBe('Chef de projet IT (H/F)');
    expect(j.description).toBe('<p>Le poste</p>');
    expect(j.datePosted).toBe('2025-10-17T11:27:16.000Z');
    expect(j.employmentType).toBe('FULL_TIME');
    expect(j.hiringOrganization).toEqual({ '@type': 'Organization', name: 'AD-RH', logo: 'https://exemple.fr/logo.png' });
    expect(j.jobLocation.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Lyon', addressRegion: 'Rhône (69)', addressCountry: 'FR' });
    expect(j.jobLocation.geo).toEqual({ '@type': 'GeoCoordinates', latitude: 45.76, longitude: 4.83 });
    expect(j.baseSalary.value).toMatchObject({ minValue: 60000, maxValue: 70000, unitText: 'YEAR' });
    expect(j.directApply).toBe(false);
    expect(j.url).toBe(base.urlOffre);
  });

  it("omet ce qui est inconnu au lieu d'écrire null ou undefined", () => {
    const j: any = construireJobPosting({ ...base, typeContrat: null, salaire: null, logoUrl: null, latitude: null, longitude: null, dateFinPublication: null, secteur: null });
    expect(j).not.toHaveProperty('employmentType');
    expect(j).not.toHaveProperty('baseSalary');
    expect(j).not.toHaveProperty('validThrough');
    expect(j).not.toHaveProperty('industry');
    expect(j.hiringOrganization).not.toHaveProperty('logo');
    expect(j.jobLocation).not.toHaveProperty('geo');
    expect(JSON.stringify(j)).not.toMatch(/null|undefined/);
  });

  it("n'écrit pas « FRANCE » comme région", () => {
    const j: any = construireJobPosting({ ...base, departement: 'FRANCE' });
    expect(j.jobLocation.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Lyon', addressCountry: 'FR' });
  });

  it('utilise le résumé quand la description est vide et le nom du site sans entreprise', () => {
    const j: any = construireJobPosting({ ...base, descriptionHtml: '', nomEntreprise: null });
    expect(j.description).toBe(base.resume);
    expect(j.hiringOrganization.name).toBe('My Job Community');
  });

  it('normalise les dates et écarte une fin de publication antérieure au début', () => {
    expect((construireJobPosting({ ...base, dateFinPublication: '2026-12-31T00:00:00+01:00' }) as any).validThrough).toBe('2026-12-30T23:00:00.000Z');
    expect(construireJobPosting({ ...base, dateFinPublication: '2020-01-01T00:00:00Z' })).not.toHaveProperty('validThrough');
    expect(construireJobPosting({ ...base, dateActivation: 'pas une date' })).not.toHaveProperty('datePosted');
  });

  it('renvoie une liste quand plusieurs types de contrat sont reconnus', () => {
    expect((construireJobPosting({ ...base, typeContrat: 'CDD ou stage' }) as any).employmentType).toEqual(['INTERN', 'TEMPORARY']);
  });
});
