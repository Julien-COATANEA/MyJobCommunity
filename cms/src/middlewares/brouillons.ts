import { timingSafeEqual } from 'node:crypto';
import type { Core } from '@strapi/strapi';

/**
 * L'API publique de Strapi renvoie les brouillons à quiconque ajoute « ?status=draft ».
 * Un événement pas encore annoncé ou un article en préparation ne doit pas fuiter :
 * seule la page d'aperçu du site (qui présente le secret APERCU_SECRET) peut les lire.
 * Le routeur ignore la casse (« /Api/ ») et `status` peut arriver en tableau (« status[0]=draft ») :
 * tout `status` autre que la chaîne « published » exige le secret.
 */
const secretValide = (recu: unknown, attendu: string) => {
  if (typeof recu !== 'string') return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
};

export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const status = ctx.query?.status;
    if (ctx.path.toLowerCase().startsWith('/api/') && status !== undefined && status !== 'published') {
      const secret = process.env.APERCU_SECRET;
      if (!secret || !secretValide(ctx.get('x-apercu'), secret)) {
        strapi.log.debug(`[brouillons] lecture refusée : ${ctx.path}`);
        return ctx.forbidden('La lecture des brouillons est réservée à l’aperçu du back-office.');
      }
    }
    await next();
  };
};
