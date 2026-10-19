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

  it('ne prend pas le « 13e mois » pour un montant ni pour l’unité', () => {
    expect(salaireJobPosting('45 K€ brut annuel + 13e mois')).toEqual(annuel({ value: 45000 }));
    expect(salaireJobPosting('1 800 € / mois + 13ème mois')).toMatchObject({ value: { unitText: 'MONTH', value: 1800 } });
    expect(salaireJobPosting('38 000 € brut/an, treizième mois')).toEqual(annuel({ value: 38000 }));
  });

  it('ne prend pas le temps de travail pour l’unité du salaire', () => {
    expect(salaireJobPosting("11,88 € brut de l'heure, 35 heures par semaine")).toMatchObject({ value: { unitText: 'HOUR', value: 11.88 } });
    expect(salaireJobPosting('1 800 € par mois, 7 h par jour')).toMatchObject({ value: { unitText: 'MONTH', value: 1800 } });
  });

  it('lit l’unité près des montants, pas dans le reste du texte', () => {
    const mensuel = (value: number) => ({ value: { unitText: 'MONTH', value } });
    expect(salaireJobPosting("1 800 € brut / mois, CDD d'un an")).toMatchObject(mensuel(1800));
    expect(salaireJobPosting('2 000 € par mois + prime annuelle')).toMatchObject(mensuel(2000));
    expect(salaireJobPosting('1 700 € net/mois, une semaine sur deux')).toMatchObject(mensuel(1700));
    expect(salaireJobPosting('Salaire mensuel : 2 100 €')).toMatchObject(mensuel(2100));
    expect(salaireJobPosting('Salaire mensuel brut selon expérience : 2 000 €')).toMatchObject(mensuel(2000));
    expect(salaireJobPosting("CDD d'un an, 1 800 € par mois")).toMatchObject(mensuel(1800));
    // « eur » de « heure » n'est pas un symbole monétaire.
    expect(salaireJobPosting('1 900 € brut par mois, majoration de nuit par heure')).toMatchObject(mensuel(1900));
    // Unité hors de la partie de phrase des montants : cherchée dans tout le texte.
    expect(salaireJobPosting('2 000 € brut, par mois')).toMatchObject(mensuel(2000));
    expect(salaireJobPosting('1 800 € brut + primes par mois')).toMatchObject(mensuel(1800));
    // « un an » ailleurs dans le texte : 1 800 € par an serait invraisemblable, rien n'est publié.
    expect(salaireJobPosting("CDD d'un an, 1 800 €")).toBeNull();
  });
  it("n'invente pas : texte libre, montant sans unité ou sans devise → null", () => {
    expect(salaireJobPosting('selon profil')).toBeNull();
    // Plusieurs unités : montants impossibles à rattacher.
    expect(salaireJobPosting('1 500 € par mois soit 18 000 €/an')).toBeNull();
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
