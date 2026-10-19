// Espace « Site Gestmax » : le site Gestmax où les candidats postulent, habillé avec l'en-tête et le pied
// de page du site (plugin Gestmax HeaderFooterWp qui lit la page /header-footer/ du site).
import type { Core } from '@strapi/strapi';
import { CHAMPS_GESTMAX, ecrireParametres } from '../../../utils/garde-parametres';

const PARAMETRES = 'api::parametres.parametres';
const CHAMPS = CHAMPS_GESTMAX;
const TTL_CACHE_SECONDES = 900;

const sansSlashFinal = (url: string) => url.replace(/\/+$/, '');
const urlSite = () => sansSlashFinal(process.env.SITE_URL ?? '');
// Adresse du site vue depuis le conteneur Strapi (réseau Docker) pour les vérifications.
const urlSiteInterne = () => sansSlashFinal(process.env.SITE_INTERNAL_URL ?? urlSite());
const jeton = () => process.env.HEADER_FOOTER_TOKEN ?? '';

const resoudre = (url: string | null | undefined, front: string | null | undefined) => {
  if (!url) return null;
  if (!url.startsWith('gestmax:')) return url;
  const chemin = url.slice('gestmax:'.length);
  return `${sansSlashFinal(front ?? '')}${chemin.startsWith('/') ? '' : '/'}${chemin}`;
};

const estLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url);

function configurationGestmax(nomSite: string) {
  const site = urlSite();
  return [
    `; Site Gestmax de ${nomSite} : en-tête et pied de page repris du site ${site}`,
    'plugin.HeaderFooterWp        = true',
    `headerFooterWp.url           = ${site}/header-footer/?token=${jeton()}`,
    `headerFooterWp.base_url      = ${site}`,
    `headerFooterWp.ttl           = ${TTL_CACHE_SECONDES}`,
  ].join('\n');
}

type Statut = 'ok' | 'attention' | 'erreur';
interface Verification { cle: string; libelle: string; statut: Statut; detail: string }

async function lire(url: string, timeout = 8000) {
  const reponse = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeout) });
  return { statut: reponse.status, texte: await reponse.text(), url: reponse.url };
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const lireParametres = async () => (await strapi.documents(PARAMETRES).findFirst()) as any;

  return {
    async lire(ctx: any) {
      const p = await lireParametres();
      ctx.body = {
        nomSite: p?.nomSite ?? '',
        urlSite: urlSite(),
        urlHeaderFooter: `${urlSite()}/header-footer/?token=${jeton()}`,
        jetonConfigure: jeton().length >= 16,
        siteLocal: estLocal(urlSite()),
        ttlMinutes: TTL_CACHE_SECONDES / 60,
        configuration: configurationGestmax(p?.nomSite ?? ''),
        ...Object.fromEntries(CHAMPS.map((c) => [c, p?.[c] ?? ''])),
      };
    },

    async enregistrer(ctx: any) {
      const corps = ctx.request.body ?? {};
      const data: Record<string, string | null> = Object.fromEntries(
        CHAMPS.filter((c) => c in corps).map((c) => [c, typeof corps[c] === 'string' && corps[c].trim() ? corps[c].trim() : null]),
      );
      if (data.gestmaxUrlFront) {
        if (!/^https?:\/\/[^\s/]+/.test(data.gestmaxUrlFront)) {
          ctx.status = 400;
          ctx.body = { error: { message: "L'adresse du site Gestmax doit commencer par https://" } };
          return;
        }
        data.gestmaxUrlFront = sansSlashFinal(data.gestmaxUrlFront);
      }
      // Seul chemin d'écriture de ces champs (voir garde-parametres).
      ctx.body = await ecrireParametres(strapi, 'gestmax', data);
    },

    /** Contrôle de bout en bout : page d'en-tête protégée, site Gestmax joignable et habillé, liens candidats. */
    async verifier(ctx: any) {
      const p = await lireParametres();
      const front = p?.gestmaxUrlFront ? sansSlashFinal(p.gestmaxUrlFront) : '';
      const resultats: Verification[] = [];
      const ajouter = (cle: string, libelle: string, statut: Statut, detail: string) => resultats.push({ cle, libelle, statut, detail });
      const pageHf = `${urlSiteInterne()}/header-footer/`;

      // 1. Page en-tête / pied de page au format attendu par HeaderFooterWp
      try {
        const r = await lire(`${pageHf}?token=${jeton()}`);
        if (r.statut !== 200) ajouter('page', "Page d'en-tête et de pied de page", 'erreur', `Réponse ${r.statut}.`);
        else if (!r.texte.includes('<!--COUPURE-->')) ajouter('page', "Page d'en-tête et de pied de page", 'erreur', 'Le marqueur <!--COUPURE--> est absent.');
        else ajouter('page', "Page d'en-tête et de pied de page", 'ok', `Disponible et au bon format (${Math.round(r.texte.length / 1024)} Ko).`);
      } catch (e) {
        ajouter('page', "Page d'en-tête et de pied de page", 'erreur', `Inaccessible : ${(e as Error).message}`);
      }

      // 2. Protection par jeton
      try {
        const r = await lire(pageHf);
        ajouter('jeton', 'Protection par jeton', r.statut === 404 && jeton().length >= 16 ? 'ok' : 'erreur',
          r.statut === 404 ? 'La page est refusée sans jeton.' : `La page est accessible sans jeton (réponse ${r.statut}).`);
      } catch (e) {
        ajouter('jeton', 'Protection par jeton', 'attention', (e as Error).message);
      }

      // 3. Adresse publique du site (Gestmax doit pouvoir la joindre)
      ajouter('public', 'Adresse publique du site', estLocal(urlSite()) ? 'attention' : 'ok',
        estLocal(urlSite())
          ? `${urlSite()} n'est accessible que depuis ce poste : Gestmax ne pourra pas lire l'en-tête tant que le site n'est pas en ligne.`
          : `${urlSite()}`);

      // 4 et 5. Site Gestmax joignable, puis habillé avec l'en-tête du site
      if (!front) {
        ajouter('front', 'Site Gestmax', 'erreur', "Renseignez l'adresse du site Gestmax.");
      } else {
        try {
          const r = await lire(front);
          ajouter('front', 'Site Gestmax', r.statut < 400 ? 'ok' : 'erreur', `${front} répond (${r.statut}).`);
          const habille = r.texte.includes('data-mjc-shell');
          ajouter('habillage', 'En-tête et pied de page sur le site Gestmax', habille ? 'ok' : 'attention',
            habille
              ? 'Le site Gestmax affiche bien votre en-tête et votre pied de page.'
              : `Pas encore visibles : la configuration Gestmax n'est pas faite, ou son cache n'est pas encore renouvelé (${TTL_CACHE_SECONDES / 60} min).`);
        } catch (e) {
          ajouter('front', 'Site Gestmax', 'erreur', `${front} ne répond pas : ${(e as Error).message}`);
        }
      }

      // 6. Liens candidats
      const liens: [string, string][] = [
        ['lienEspaceCandidat', 'Lien « Espace candidat »'],
        ['lienEspaceRecruteur', 'Lien « Espace recruteur »'],
        ['lienCandidatureSpontanee', 'Lien « Candidature spontanée »'],
      ];
      for (const [champ, libelle] of liens) {
        const url = resoudre(p?.[champ], front);
        if (!url) {
          ajouter(champ, libelle, 'attention', 'Non renseigné : le bouton ne sera pas affiché.');
          continue;
        }
        try {
          const r = await lire(url);
          ajouter(champ, libelle, r.statut < 400 ? 'ok' : 'erreur', `${url} (${r.statut})`);
        } catch (e) {
          ajouter(champ, libelle, 'erreur', `${url} : ${(e as Error).message}`);
        }
      }

      ctx.body = { date: new Date().toISOString(), resultats };
    },
  };
};
