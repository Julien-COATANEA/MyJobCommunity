// Jeton de l'« essai d'un template » (écran Apparence → page d'aperçu du site) : il remplace le secret d'aperçu, qui ouvre
// tous les brouillons et ne doit pas quitter le serveur. Signé avec ce secret, valable DUREE_MS et pour une seule page :
// l'accueil publié dont le documentId est signé. Format « <expiration en ms>.<HMAC-SHA256 hexadécimal> ».
// Vérifié par site/src/lib/essai-gabarit.ts (même format, même message signé).
import { createHmac } from 'node:crypto';

export const DUREE_MS = 4 * 3600_000;

export function jetonEssaiGabarit(documentId: string, secret: string, maintenant = Date.now()): string {
  const expiration = maintenant + DUREE_MS;
  const signature = createHmac('sha256', secret).update(`essai-gabarit:${documentId}:${expiration}`).digest('hex');
  return `${expiration}.${signature}`;
}
