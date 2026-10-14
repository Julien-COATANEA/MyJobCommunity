import { describe, expect, it } from 'vitest';
import { codesSuivi } from './suivi';

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
    expect(head.every((c) => !c.differe)).toBe(true);
  });

  it('ignore un identifiant mal formé (pas d’injection de code)', () => {
    expect(codesSuivi({ googleTagManagerId: "GTM-1');alert(1)//", googleAnalyticsId: 'UA-123' }).head).toEqual([]);
  });

  it('diffère les outils soumis au consentement quand le bandeau est actif', () => {
    const { head, body } = codesSuivi({
      bandeauCookies: true,
      googleAnalyticsId: 'G-XYZ98765',
      scripts: [script(), script({ nom: 'Chat', emplacement: 'body', consentement: false })],
    });
    expect(head.map((c) => c.differe)).toEqual([true, true]);
    expect(body).toEqual([{ code: '<script>matomo()</script>', differe: false }]);
  });

  it('écarte les scripts inactifs ou vides', () => {
    expect(codesSuivi({ scripts: [script({ actif: false }), script({ code: '  ' })] })).toEqual({ head: [], body: [] });
  });
});
