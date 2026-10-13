// Suivi éditorial pour le back-office : état du site public, brouillons non publiés,
// lien public d'une fiche et inscrits d'un événement (avec export CSV).
import type { Core } from '@strapi/strapi';

const urlSite = () => (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const urlBuilder = () => (process.env.BUILDER_WEBHOOK_URL ?? '').replace(/\/build$/, '');

/** Contenus publiés sur le site, avec leur adresse publique. */
export const TYPES_PUBLIES: Record<string, { libelle: string; url: (slug: string) => string; unique?: boolean }> = {
  'api::accueil.accueil': { libelle: "Page d'accueil", url: () => '/', unique: true },
  'api::page.page': { libelle: 'Pages', url: (s) => `/${s}/` },
  'api::article.article': { libelle: 'Articles', url: (s) => `/actualites/${s}/` },
  'api::evenement.evenement': { libelle: 'Événements', url: (s) => `/evenements/${s}/` },
  'api::entreprise.entreprise': { libelle: 'Entreprises', url: (s) => `/entreprises/${s}/` },
};

const lienListe = (uid: string) =>
  TYPES_PUBLIES[uid]?.unique ? `/content-manager/single-types/${uid}` : `/content-manager/collection-types/${uid}`;

/** Documents jamais publiés ou modifiés depuis leur publication. */
async function brouillons(strapi: Core.Strapi, uid: string) {
  const lignes = await strapi.db.query(uid as any).findMany({ select: ['documentId', 'publishedAt', 'updatedAt'] });
  const parDocument = new Map<string, { brouillon?: Date; publie?: Date }>();
  for (const l of lignes as any[]) {
    const etat = parDocument.get(l.documentId) ?? {};
    if (l.publishedAt) etat.publie = new Date(l.updatedAt);
    else etat.brouillon = new Date(l.updatedAt);
    parDocument.set(l.documentId, etat);
  }
  let jamaisPublies = 0;
  let modifies = 0;
  for (const { brouillon, publie } of parDocument.values()) {
    if (brouillon && !publie) jamaisPublies++;
    // Tolérance d'une seconde : à la publication, les deux versions sont écrites presque au même instant.
    else if (brouillon && publie && brouillon.getTime() - publie.getTime() > 1000) modifies++;
  }
  return { jamaisPublies, modifies };
}

const echapperCsv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const inscritsEvenement = async (documentId: string) => {
    const evenement: any = await strapi.documents('api::evenement.evenement').findOne({ documentId, status: 'published' })
      ?? await strapi.documents('api::evenement.evenement').findOne({ documentId });
    const inscrits: any[] = await strapi.documents('api::inscription.inscription').findMany({
      filters: { evenement: { documentId } },
      sort: 'createdAt:desc',
      limit: 10000,
    } as any);
    return { evenement, inscrits };
  };

  return {
    async etatSite(ctx: any) {
      let site = null;
      try {
        const r = await fetch(`${urlBuilder()}/status`, { signal: AbortSignal.timeout(2000) });
        site = r.ok ? await r.json() : null;
      } catch {
        site = null;
      }
      const details = [];
      for (const [uid, t] of Object.entries(TYPES_PUBLIES)) {
        const { jamaisPublies, modifies } = await brouillons(strapi, uid);
        if (jamaisPublies + modifies) details.push({ uid, libelle: t.libelle, jamaisPublies, modifies, lien: lienListe(uid) });
      }
      ctx.set('Cache-Control', 'no-store');
      ctx.body = {
        urlSite: urlSite(),
        site,
        brouillons: { total: details.reduce((n, d) => n + d.jamaisPublies + d.modifies, 0), details },
      };
    },

    /** Adresse publique d'une fiche et son état de publication (bouton « Voir sur le site »). */
    async lienPublic(ctx: any) {
      const { uid, documentId } = ctx.query;
      const type = TYPES_PUBLIES[uid];
      if (!type) return ctx.notFound();
      const lignes: any[] = await strapi.db.query(uid).findMany({
        where: type.unique ? {} : { documentId },
        select: ['slug', 'publishedAt', 'updatedAt'].filter((c) => c !== 'slug' || !type.unique),
      });
      const publiee = lignes.find((l) => l.publishedAt);
      const brouillon = lignes.find((l) => !l.publishedAt);
      ctx.body = {
        publie: !!publiee,
        modifie: !!(publiee && brouillon && new Date(brouillon.updatedAt).getTime() - new Date(publiee.updatedAt).getTime() > 1000),
        url: publiee ? `${urlSite()}${type.url(publiee.slug)}` : null,
      };
    },

    async inscriptions(ctx: any) {
      const { evenement, inscrits } = await inscritsEvenement(ctx.params.documentId);
      if (!evenement) return ctx.notFound();
      const confirmes = inscrits.filter((i) => i.statut === 'confirmee');
      ctx.body = {
        titre: evenement.titre,
        inscriptionActive: evenement.inscriptionActive,
        inscriptionExterneUrl: evenement.inscriptionExterneUrl,
        placesMax: evenement.placesMax ?? null,
        nombre: confirmes.length,
        liste: inscrits.slice(0, 50).map((i) => ({
          documentId: i.documentId,
          nom: `${i.prenom} ${i.nom}`,
          email: i.email,
          telephone: i.telephone,
          structure: i.structure,
          statut: i.statut,
          createdAt: i.createdAt,
        })),
      };
    },

    async inscriptionsCsv(ctx: any) {
      const { evenement, inscrits } = await inscritsEvenement(ctx.params.documentId);
      if (!evenement) return ctx.notFound();
      const entetes = ['Prénom', 'Nom', 'E-mail', 'Téléphone', 'Entreprise ou organisme', 'Statut', "Date d'inscription"];
      const lignes = inscrits.map((i) =>
        [i.prenom, i.nom, i.email, i.telephone, i.structure, i.statut === 'confirmee' ? 'Confirmée' : 'Annulée',
          new Date(i.createdAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })].map(echapperCsv).join(';'),
      );
      // BOM UTF-8 + séparateur « ; » : s'ouvre directement et correctement dans Excel.
      ctx.set('Content-Type', 'text/csv; charset=utf-8');
      ctx.set('Content-Disposition', `attachment; filename="inscrits-${evenement.slug ?? 'evenement'}.csv"`);
      ctx.body = `﻿${[entetes.join(';'), ...lignes].join('\r\n')}`;
    },
  };
};
