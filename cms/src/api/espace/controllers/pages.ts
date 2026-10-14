// Écran « Mes pages » : toutes les pages du site au même endroit, page d'accueil et page des offres en tête
// (ce sont des contenus uniques, absents de la liste des pages du gestionnaire de contenu).
// Chaque contenu n'est listé que si la personne connectée a le droit de le consulter.
import type { Core } from '@strapi/strapi';
import { TYPES_PUBLIES } from './suivi';

const LIRE = 'plugin::content-manager.explorer.read';
const CREER = 'plugin::content-manager.explorer.create';
const PAGE = 'api::page.page';
const PRINCIPALES = [
  { uid: 'api::accueil.accueil', titre: "Page d'accueil", champTitre: null },
  { uid: 'api::page-offres.page-offres', titre: 'Page des offres', champTitre: 'titre' },
] as const;

const urlSite = () => (process.env.SITE_URL ?? '').replace(/\/+$/, '');

type Etat = 'publie' | 'modifie' | 'brouillon' | 'programme';

/** État d'un document à partir de ses versions brouillon et publiée (même tolérance que le suivi éditorial). */
function etatDocument(versions: any[]) {
  const publiee = versions.find((v) => v.publishedAt);
  const brouillon = versions.find((v) => !v.publishedAt);
  let etat: Etat = 'brouillon';
  if (publiee) {
    const modifie = brouillon && new Date(brouillon.updatedAt).getTime() - new Date(publiee.updatedAt).getTime() > 1000;
    etat = modifie ? 'modifie' : 'publie';
  } else if (brouillon?.publierLe && new Date(brouillon.publierLe).getTime() > Date.now()) {
    etat = 'programme';
  }
  const reference = brouillon ?? publiee;
  return { etat, publiee, reference, modifieLe: reference?.updatedAt ?? null };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async lister(ctx: any) {
    const peut = (action: string, uid: string) => !!ctx.state.userAbility?.can(action, uid);
    const site = urlSite();

    const principales = [];
    for (const p of PRINCIPALES) {
      if (!peut(LIRE, p.uid)) continue;
      const versions: any[] = await strapi.db.query(p.uid as any).findMany({
        select: ['documentId', 'publishedAt', 'updatedAt', ...(p.champTitre ? [p.champTitre] : [])],
      });
      const { etat, publiee, reference, modifieLe } = etatDocument(versions);
      principales.push({
        uid: p.uid,
        titre: p.titre,
        sousTitre: p.champTitre && reference?.[p.champTitre] ? reference[p.champTitre] : null,
        // Contenu unique jamais enregistré : la fiche s'ouvre quand même (Strapi la crée au premier enregistrement).
        etat: versions.length ? etat : 'brouillon',
        modifieLe,
        adresse: TYPES_PUBLIES[p.uid].url(''),
        url: publiee && site ? `${site}${TYPES_PUBLIES[p.uid].url('')}` : null,
        lien: `/content-manager/single-types/${p.uid}`,
      });
    }

    const pages = [];
    if (peut(LIRE, PAGE)) {
      const versions: any[] = await strapi.db.query(PAGE).findMany({
        select: ['documentId', 'titre', 'slug', 'publishedAt', 'updatedAt', 'publierLe'],
      });
      const parDocument = new Map<string, any[]>();
      for (const v of versions) parDocument.set(v.documentId, [...(parDocument.get(v.documentId) ?? []), v]);
      for (const [documentId, liste] of parDocument) {
        const { etat, publiee, reference, modifieLe } = etatDocument(liste);
        pages.push({
          documentId,
          titre: reference?.titre || 'Sans titre',
          adresse: reference?.slug ? `/${reference.slug}/` : null,
          etat,
          publierLe: etat === 'programme' ? reference?.publierLe : null,
          modifieLe,
          url: publiee && site ? `${site}/${publiee.slug}/` : null,
          lien: `/content-manager/collection-types/${PAGE}/${documentId}`,
        });
      }
      pages.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    }

    ctx.set('Cache-Control', 'no-store');
    ctx.body = { principales, pages, peutCreer: peut(CREER, PAGE), peutListerPages: peut(LIRE, PAGE) };
  },
});
