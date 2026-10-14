// Écran « Cookies et suivi » : bandeau de consentement, Google Tag Manager / Analytics et scripts personnalisés.
// Un script collé ici s'exécute sur toutes les pages du site public : l'enregistrement est réservé aux responsables.
import type { Core } from '@strapi/strapi';
import { ROLES_GESTION_EQUIPE } from '../../../utils/roles';

const PARAMETRES = 'api::parametres.parametres';
const MAX_SCRIPTS = 10;
const MAX_CODE = 20000;
const GTM = /^GTM-[A-Z0-9]{4,12}$/;
const GA4 = /^G-[A-Z0-9]{4,15}$/;

const codes = (u: any) => (u?.roles ?? []).map((r: any) => r.code);
const texte = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const lireParametres = async () => (await strapi.documents(PARAMETRES).findFirst({ populate: { scripts: true } } as any)) as any;

  return {
    async lire(ctx: any) {
      const p = await lireParametres();
      ctx.body = {
        modifiable: codes(ctx.state.user).some((c: string) => ROLES_GESTION_EQUIPE.includes(c)),
        bandeauCookies: !!p?.bandeauCookies,
        texteBandeauCookies: p?.texteBandeauCookies ?? '',
        lienPolitiqueCookies: p?.lienPolitiqueCookies ?? '',
        googleTagManagerId: p?.googleTagManagerId ?? '',
        googleAnalyticsId: p?.googleAnalyticsId ?? '',
        scripts: (p?.scripts ?? []).map(({ nom, code, emplacement, actif, consentement }: any) => ({ nom, code, emplacement, actif: actif !== false, consentement: consentement !== false })),
      };
    },

    async enregistrer(ctx: any) {
      if (!codes(ctx.state.user).some((c: string) => ROLES_GESTION_EQUIPE.includes(c))) {
        return ctx.forbidden('Seuls les responsables peuvent modifier les cookies et les scripts du site.');
      }
      const corps = ctx.request.body ?? {};
      const gtm = texte(corps.googleTagManagerId, 20)?.toUpperCase() ?? null;
      const ga = texte(corps.googleAnalyticsId, 20)?.toUpperCase() ?? null;
      if (gtm && !GTM.test(gtm)) return ctx.badRequest('Identifiant Google Tag Manager invalide (format attendu : GTM-ABC1234).');
      if (ga && !GA4.test(ga)) return ctx.badRequest('Identifiant Google Analytics invalide (format attendu : G-ABC123XYZ).');

      const scripts = (Array.isArray(corps.scripts) ? corps.scripts : []).slice(0, MAX_SCRIPTS).map((s: any) => ({
        nom: texte(s?.nom, 80) ?? 'Script',
        code: typeof s?.code === 'string' ? s.code.trim().slice(0, MAX_CODE) : '',
        emplacement: s?.emplacement === 'body' ? 'body' : 'head',
        actif: s?.actif !== false,
        consentement: s?.consentement !== false,
      })).filter((s: any) => s.code);

      const data = {
        bandeauCookies: corps.bandeauCookies === true,
        texteBandeauCookies: texte(corps.texteBandeauCookies, 600),
        lienPolitiqueCookies: texte(corps.lienPolitiqueCookies, 300),
        googleTagManagerId: gtm,
        googleAnalyticsId: ga,
        scripts,
      };
      const p = await lireParametres();
      await strapi.documents(PARAMETRES).update({ documentId: p.documentId, data } as any);
      ctx.body = data;
    },
  };
};
