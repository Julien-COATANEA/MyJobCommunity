import { describe, expect, it } from 'vitest';
import { classeContrat, estNouveau, ilYA, initiales, jsonPourScript } from './format';

const JOUR = 86_400_000;
const maintenant = new Date('2026-10-13T12:00:00Z').getTime();

describe('dates relatives', () => {
  it('formule la fraîcheur d’une offre', () => {
    expect(ilYA(new Date(maintenant - 2 * 3600_000).toISOString(), maintenant)).toBe("aujourd'hui");
    expect(ilYA(new Date(maintenant - JOUR).toISOString(), maintenant)).toBe('hier');
    expect(ilYA(new Date(maintenant - 3 * JOUR).toISOString(), maintenant)).toBe('il y a 3 jours');
    expect(ilYA(new Date(maintenant - 15 * JOUR).toISOString(), maintenant)).toBe('il y a 2 semaines');
  });

  it('repère les offres de moins de 7 jours', () => {
    expect(estNouveau(new Date(maintenant - 6 * JOUR).toISOString(), maintenant)).toBe(true);
    expect(estNouveau(new Date(maintenant - 8 * JOUR).toISOString(), maintenant)).toBe(false);
    expect(estNouveau(null, maintenant)).toBe(false);
  });
});

describe('classeContrat', () => {
  it('regroupe les libellés Gestmax en familles de couleur', () => {
    expect(classeContrat('CDI')).toBe('cdi');
    expect(classeContrat('Saisonnier')).toBe('cdd');
    expect(classeContrat("Contrat d'apprentissage")).toBe('alternance');
    expect(classeContrat('Stage')).toBe('stage');
    expect(classeContrat('Mandataire')).toBe('autre');
  });

  it('donne les initiales d’un nom sans les petits mots ni espace', () => {
    expect(initiales('My Job Community', 3)).toBe('MJC');
    expect(initiales('Clinique des Tilleuls')).toBe('CT');
    expect(initiales("Communauté d'agglomération de la Vallée", 3)).toBe('CAV');
    expect(initiales('Le Havre')).toBe('H');
    expect(initiales('De La')).toBe('DL');
  });
});

describe('jsonPourScript', () => {
  it('échappe ce qui fermerait la balise <script> sans changer les données', () => {
    const donnees = { titre: '</script><script>alert(1)</script>', ligne: 'a\u2028b\u2029c' };
    const json = jsonPourScript(donnees);
    expect(json).not.toContain('<');
    expect(json).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(json)).toEqual(donnees);
  });
});
