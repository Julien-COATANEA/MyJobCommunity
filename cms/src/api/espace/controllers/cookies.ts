// Écran « Cookies et suivi » : bandeau de consentement, Google Tag Manager / Analytics et scripts personnalisés.
// Un script collé ici s'exécute sur toutes les pages du site public : l'enregistrement exige la capacité « cookies ».
import type { Core } from '@strapi/strapi';
import { aCapacite } from '../../../utils/droits';
import { ecrireParametres } from '../../../utils/garde-parametres';
import { protocoleDangereux } from '../../../utils/garde-liens';

const PARAMETRES = 'api::parametres.parametres';
const MAX_SCRIPTS = 10;
const MAX_CODE = 20000;
const GTM = /^GTM-[A-Z0-9]{4,12}$/;
const GA4 = /^G-[A-Z0-9]{4,15}$/;

const texte = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const lireParametres = async () => (await strapi.documents(PARAMETRES).findFirst({ populate: { scripts: true } } as any)) as any;

  return {
    async lire(ctx: any) {
      const p = await lireParametres();
      ctx.body = {
        modifiable: aCapacite(ctx, 'cookies'),
        bandeauCookies: !!p?.bandeauCookies,
        texteBandeauCookies: p?.texteBandeauCookies ?? '',
        lienPolitiqueCookies: p?.lienPolitiqueCookies ?? '',
        googleTagManagerId: p?.googleTagManagerId ?? '',
        googleAnalyticsId: p?.googleAnalyticsId ?? '',
        scripts: (p?.scripts ?? []).map(({ nom, code, emplacement, actif, consentement }: any) => ({ nom, code, emplacement, actif: actif !== false, consentement: consentement !== false })),
      };
    },

    async enregistrer(ctx: any) {
      if (!aCapacite(ctx, 'cookies')) {
        return ctx.forbidden('Votre rôle ne permet pas de modifier les cookies et les scripts du site.');
      }
      const corps = ctx.request.body ?? {};
      const gtm = texte(corps.googleTagManagerId, 20)?.toUpperCase() ?? null;
      const ga = texte(corps.googleAnalyticsId, 20)?.toUpperCase() ?? null;
      if (gtm && !GTM.test(gtm)) return ctx.badRequest('Identifiant Google Tag Manager invalide (format attendu : GTM-ABC1234).');
      if (ga && !GA4.test(ga)) return ctx.badRequest('Identifiant Google Analytics invalide (format attendu : G-ABC123XYZ).');

      const recus = Array.isArray(corps.scripts) ? corps.scripts : [];
      if (recus.length > MAX_SCRIPTS) return ctx.badRequest(`${MAX_SCRIPTS} scripts au maximum.`);
      const scripts = recus.map((s: any) => ({
        nom: texte(s?.nom, 80),
        code: typeof s?.code === 'string' ? s.code.trim() : '',
        emplacement: s?.emplacement === 'body' ? 'body' : 'head',
        actif: s?.actif !== false,
        consentement: s?.consentement !== false,
      }));
      // Pas de suppression silencieuse : un script incomplet est signalé.
      const incomplet = scripts.findIndex((s: any) => !s.nom || !s.code);
      if (incomplet >= 0) return ctx.badRequest(`Script n° ${incomplet + 1} : le nom et le code sont obligatoires.`);
      if (scripts.some((s: any) => s.code.length > MAX_CODE)) return ctx.badRequest(`Un script dépasse ${MAX_CODE} caractères.`);

      const lien = texte(corps.lienPolitiqueCookies, 300);
      if (lien && (protocoleDangereux(lien) || !/^(https?:\/\/|\/)/i.test(lien))) {
        return ctx.badRequest('Lien « En savoir plus » : indiquez une adresse en https://… ou une page du site (/…).');
      }

      const data = {
        bandeauCookies: corps.bandeauCookies === true,
        texteBandeauCookies: texte(corps.texteBandeauCookies, 600),
        lienPolitiqueCookies: lien,
        googleTagManagerId: gtm,
        googleAnalyticsId: ga,
        scripts,
      };
      // Seul chemin d'écriture de ces champs (voir garde-parametres).
      await ecrireParametres(strapi, 'suivi', data);
      ctx.body = data;
    },
  };
};
