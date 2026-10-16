// Vérifie le jeton de l'« essai d'un template » émis par le BO (cms/src/utils/essai-gabarit.ts : même format, même
// message signé). Il n'ouvre que l'accueil publié dont le documentId est signé, jusqu'à son expiration : jamais un brouillon.
import { createHmac, timingSafeEqual } from 'node:crypto';

export function jetonEssaiValide(jeton: string | null, documentId: string, secret: string | undefined, maintenant = Date.now()): boolean {
  if (!jeton || !secret) return false;
  const [expiration, signature] = jeton.split('.');
  if (!/^\d{13}$/.test(expiration ?? '') || !/^[0-9a-f]{64}$/.test(signature ?? '') || Number(expiration) < maintenant) return false;
  const attendue = createHmac('sha256', secret).update(`essai-gabarit:${documentId}:${expiration}`).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), attendue);
}
