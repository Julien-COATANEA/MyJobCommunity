import { describe, expect, it } from 'vitest';
import { bandeauNecessaire, codesSuivi, outilsCookies } from './suivi';

const script = (extra = {}) => ({ nom: 'Matomo', code: '<script>matomo()</script>', emplacement: 'head' as const, actif: true, consentement: true, ...extra });

describe('codes de suivi', () => {
  it('ne produit rien sans réglage', () => {
    expect(codesSuivi({})).toEqual({ head: [], body: [] });
  });

  it('écrit Google Tag Manager et Analytics à partir de leur identifiant', () => {
    const { head } = codesSuivi({ googleTagManagerId: 'gtm-abc1234', googleAnalyticsId: 'G-XYZ98765' });
    expect(head).toHaveLength(2);
    expect(head[0].code).toContain("'GTM-ABC1234'");
    expect(head[1].code).toContain('gtag/js?id=G-XYZ98765');
    // Toujours soumis au consentement, même sans l'option « bandeau » du BO.
    expect(head.every((c) => c.differe)).toBe(true);
  });

  it('ignore un identifiant mal formé (pas d’injection de code)', () => {
    expect(codesSuivi({ googleTagManagerId: "GTM-1');alert(1)//", googleAnalyticsId: 'UA-123' }).head).toEqual([]);
  });

  it('diffère les outils soumis au consentement, bandeau coché ou non', () => {
    // Le script « Chat » est marqué « sans consentement » : écrit tel quel.
    for (const bandeauCookies of [true, false, null]) {
      const { head, body } = codesSuivi({
        bandeauCookies,
        googleAnalyticsId: 'G-XYZ98765',
        scripts: [script(), script({ nom: 'Chat', emplacement: 'body', consentement: false })],
      });
      expect(head.map((c) => c.differe)).toEqual([true, true]);
      expect(body).toEqual([{ code: '<script>matomo()</script>', differe: false }]);
    }
  });

  it('affiche le bandeau seulement si un code attend l’accord', () => {
    expect(bandeauNecessaire(codesSuivi({}))).toBe(false);
    expect(bandeauNecessaire(codesSuivi({ bandeauCookies: true }))).toBe(false);
    expect(bandeauNecessaire(codesSuivi({ scripts: [script({ consentement: false })] }))).toBe(false);
    expect(bandeauNecessaire(codesSuivi({ bandeauCookies: false, googleTagManagerId: 'GTM-ABC1234' }))).toBe(true);
    expect(bandeauNecessaire(codesSuivi({ scripts: [script({ consentement: null })] }))).toBe(true);
  });

  it('écarte les scripts inactifs ou vides', () => {
    expect(codesSuivi({ scripts: [script({ actif: false }), script({ code: '  ' })] })).toEqual({ head: [], body: [] });
  });
});

describe('outils de la liste des cookies', () => {
  it('ne contient que la mémorisation du choix sans outil', () => {
    const outils = outilsCookies({});
    expect(outils).toHaveLength(1);
    expect(outils[0]).toMatchObject({ nom: 'Mémorisation de votre choix', cookies: ['mjc-cookies'], duree: '6 mois', requis: false });
    expect(outils[0].consentement).toBe('Non requis (strictement nécessaire)');
  });

  it('ajoute Google Analytics avec le cookie propre à l’identifiant', () => {
    const outils = outilsCookies({ googleAnalyticsId: 'g-abc123' });
    expect(outils.map((o) => o.nom)).toEqual(['Mémorisation de votre choix', 'Google Analytics (Google Ireland Ltd)']);
    expect(outils[1].cookies).toEqual(['_ga', '_ga_ABC123']);
    expect(outils[1].requis).toBe(true);
    expect(outils[1].duree).toContain('13 mois recommandés par la CNIL');
    expect(outils[1].note).toContain('États-Unis');
  });

  it('ajoute Google Tag Manager seul, sans cookie en propre', () => {
    const outils = outilsCookies({ googleTagManagerId: 'GTM-ABC1234' });
    expect(outils.map((o) => o.nom)).toEqual(['Mémorisation de votre choix', 'Google Tag Manager']);
    expect(outils[1]).toMatchObject({ cookies: [], requis: true, consentement: 'Requis' });
  });

  it('liste GTM puis GA quand les deux sont configurés', () => {
    const outils = outilsCookies({ googleTagManagerId: 'GTM-ABC1234', googleAnalyticsId: 'G-XYZ98765' });
    expect(outils.map((o) => o.nom)).toEqual(['Mémorisation de votre choix', 'Google Analytics (Google Ireland Ltd)', 'Google Tag Manager']);
  });

  it('ignore des identifiants mal formés', () => {
    expect(outilsCookies({ googleTagManagerId: 'GTM-<x>', googleAnalyticsId: 'UA-1' })).toHaveLength(1);
  });

  it('liste les scripts actifs avec du code, selon leur consentement', () => {
    const outils = outilsCookies({
      scripts: [
        script({ nom: 'Matomo' }),
        script({ nom: 'Chat', consentement: false }),
        script({ nom: 'Éteint', actif: false }),
        script({ nom: 'Vide', code: '  ' }),
      ],
    });
    expect(outils.map((o) => o.nom)).toEqual(['Mémorisation de votre choix', 'Matomo', 'Chat']);
    expect(outils[1]).toMatchObject({ consentement: 'Requis', requis: true, finalite: 'Outil ajouté par le site (voir la documentation du fournisseur)', precision: 'Selon le fournisseur' });
    expect(outils[2]).toMatchObject({ consentement: 'Non requis', requis: false });
  });
});
