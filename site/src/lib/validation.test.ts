import { describe, expect, it } from 'vitest';
import { erreurEmail, erreurTelephone } from './validation';

describe('validation des formulaires', () => {
  it('accepte une adresse e-mail simple', () => {
    for (const ok of ['nom@domaine.fr', 'prenom.nom+emploi@sous.domaine.org', "o'neil@exemple.ie"]) expect(erreurEmail(ok)).toBeNull();
  });
  it('refuse les listes et les « nom <adresse> » (envoi à des tiers)', () => {
    for (const ko of ['x,victime@cible.fr', 'a<autre@evil.fr>', 'a@b.fr;c@d.fr', '"a"@b.fr', 'sans-arobase', 'nom@domaine', 'a b@c.fr']) {
      expect(erreurEmail(ko)).not.toBeNull();
    }
  });
  it('refuse une adresse trop longue au lieu de la tronquer', () => {
    expect(erreurEmail(`${'a'.repeat(250)}@b.fr`)).not.toBeNull();
  });
  it('valide le téléphone facultatif sans le tronquer', () => {
    expect(erreurTelephone('')).toBeNull();
    expect(erreurTelephone('06 12 34 56 78')).toBeNull();
    expect(erreurTelephone('06 12 34 56 78 99 99 99')).not.toBeNull();
  });
});
