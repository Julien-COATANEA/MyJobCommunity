import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { jetonEssaiValide } from './essai-gabarit';

const SECRET = 'secret-de-test';
// Même fabrication que cms/src/utils/essai-gabarit.ts.
const jeton = (documentId: string, expiration: number, secret = SECRET) =>
  `${expiration}.${createHmac('sha256', secret).update(`essai-gabarit:${documentId}:${expiration}`).digest('hex')}`;

describe('jeton d’essai d’un template', () => {
  const maintenant = Date.UTC(2026, 9, 16);
  const valable = jeton('accueil123', maintenant + 3600_000);

  it('accepte un jeton signé, pour la page signée, avant son expiration', () => {
    expect(jetonEssaiValide(valable, 'accueil123', SECRET, maintenant)).toBe(true);
  });

  it('refuse un jeton expiré, d’une autre page, d’un autre secret ou altéré', () => {
    expect(jetonEssaiValide(jeton('accueil123', maintenant - 1), 'accueil123', SECRET, maintenant)).toBe(false);
    expect(jetonEssaiValide(valable, 'autre-page', SECRET, maintenant)).toBe(false);
    expect(jetonEssaiValide(jeton('accueil123', maintenant + 3600_000, 'autre'), 'accueil123', SECRET, maintenant)).toBe(false);
    const [expiration, signature] = valable.split('.');
    expect(jetonEssaiValide(`${Number(expiration) + 1}.${signature}`, 'accueil123', SECRET, maintenant)).toBe(false);
    expect(jetonEssaiValide(`${expiration}.${signature.replace(/.$/, (c) => (c === '0' ? '1' : '0'))}`, 'accueil123', SECRET, maintenant)).toBe(false);
  });

  it('refuse un jeton absent, mal formé, ou sans secret configuré', () => {
    for (const j of [null, '', 'abc', `${maintenant + 1000}`, `${maintenant + 1000}.zz`, `x.${'0'.repeat(64)}`]) {
      expect(jetonEssaiValide(j, 'accueil123', SECRET, maintenant)).toBe(false);
    }
    expect(jetonEssaiValide(valable, 'accueil123', undefined, maintenant)).toBe(false);
    expect(jetonEssaiValide(valable, 'accueil123', '', maintenant)).toBe(false);
  });
});
