import { describe, expect, it } from 'vitest';
import { calculerFacettes, comparerOffres, compterParEntreprise, creerSimilaires, type OffreLegere } from './offres';

let compteur = 0;
const offre = (extra: Partial<OffreLegere> = {}): OffreLegere => {
  compteur++;
  return {
    id: compteur, titre: `Offre ${compteur}`, slug: `offre-${compteur}`, typeContrat: null, lieu: null, secteur: null, nomEntreprise: null,
    salaire: null, dateActivation: null, logoUrl: null, latitude: null, longitude: null, aLaUne: false, entreprise: null, rang: compteur, ...extra,
  };
};

describe('comparerOffres', () => {
  it("met « à la une » d'abord, puis les plus récentes, l'id départageant les égalités", () => {
    const a = offre({ dateActivation: '2026-01-01T00:00:00.000Z' });
    const b = offre({ dateActivation: '2026-03-01T00:00:00.000Z' });
    const c = offre({ dateActivation: '2026-03-01T00:00:00.000Z' });
    const une = offre({ aLaUne: true, dateActivation: '2020-01-01T00:00:00.000Z' });
    const sansDate = offre();
    expect([a, b, c, une, sansDate].sort(comparerOffres)).toEqual([une, c, b, a, sansDate]);
  });
});

describe('calculerFacettes', () => {
  it('compte contrats, secteurs et employeurs en un passage', () => {
    const f = calculerFacettes([
      offre({ typeContrat: 'CDI', secteur: 'Santé', nomEntreprise: 'A' }),
      offre({ typeContrat: 'CDI', secteur: 'Éducation', nomEntreprise: 'A' }),
      offre({ typeContrat: 'CDD', nomEntreprise: 'B' }),
      offre(),
    ]);
    expect(f.total).toBe(4);
    expect(f.contrats).toEqual(['CDD', 'CDI']);
    expect(f.secteurs).toEqual(['Éducation', 'Santé']);
    expect(f.parContrat.get('CDI')).toBe(2);
    expect(f.employeurs).toBe(2);
  });
});

describe('compterParEntreprise', () => {
  it('compte par nom et ignore les offres sans entreprise', () => {
    const m = compterParEntreprise([offre({ nomEntreprise: 'A' }), offre({ nomEntreprise: 'A' }), offre({ nomEntreprise: 'B' }), offre()]);
    expect(m.get('A')).toBe(2);
    expect(m.get('B')).toBe(1);
    expect(m.size).toBe(2);
  });
});

describe('creerSimilaires', () => {
  const liste = [
    offre({ slug: 'a', secteur: 'S1', typeContrat: 'CDI' }),
    offre({ slug: 'b', secteur: 'S1', typeContrat: 'CDD' }),
    offre({ slug: 'c', secteur: 'S2', typeContrat: 'CDI' }),
    offre({ slug: 'd', secteur: 'S1', typeContrat: 'CDI' }),
    offre({ slug: 'e', secteur: 'S3', typeContrat: 'CDI' }),
    offre({ slug: 'f', secteur: 'S1', typeContrat: 'CDI' }),
  ];
  const similaires = creerSimilaires(liste);

  it("prend le même secteur d'abord, puis le même contrat, sans l'offre elle-même ni doublon", () => {
    expect(similaires(liste[0]).map((o) => o.slug)).toEqual(['b', 'd', 'f']);
    expect(similaires(liste[2]).map((o) => o.slug)).toEqual(['a', 'd', 'e']);
  });

  it('complète avec le contrat quand le secteur est absent ou trop petit', () => {
    expect(similaires(liste[4]).map((o) => o.slug)).toEqual(['a', 'c', 'd']);
    const seule = offre({ slug: 'z', secteur: null, typeContrat: null });
    expect(similaires(seule)).toEqual([]);
  });

  it('donne le même résultat que le filtrage naïf sur une grande liste', () => {
    const secteurs = ['x', 'y', null];
    const contrats = ['CDI', 'CDD', 'Stage', null];
    const grande = Array.from({ length: 300 }, (_, i) => offre({ slug: `g${i}`, secteur: secteurs[i % 3], typeContrat: contrats[(i * 7) % 4] }));
    const rapide = creerSimilaires(grande);
    for (const o of grande.filter((_, i) => i % 17 === 0)) {
      const autres = grande.filter((x) => x.slug !== o.slug);
      const attendu = [...autres.filter((x) => o.secteur && x.secteur === o.secteur), ...autres.filter((x) => o.typeContrat && x.typeContrat === o.typeContrat)]
        .filter((x, i, t) => t.findIndex((y) => y.slug === x.slug) === i)
        .slice(0, 3);
      expect(rapide(o).map((x) => x.slug)).toEqual(attendu.map((x) => x.slug));
    }
  });
});
