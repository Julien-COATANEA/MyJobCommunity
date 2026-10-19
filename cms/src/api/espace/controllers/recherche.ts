// Recherche globale du back-office (Ctrl + K) : pages, articles, événements, entreprises, offres, inscrits.
import type { Core } from '@strapi/strapi';
import { aCapacite } from '../../../utils/droits';

const CM = '/content-manager/collection-types';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const db = (uid: string) => strapi.db.query(uid as any);
  const ressemble = (champs: string[], q: string) => ({ $or: champs.map((c) => ({ [c]: { $containsi: q } })) });

  return {
    async chercher(ctx: any) {
      const q = String(ctx.query.q ?? '').trim().slice(0, 80);
      if (q.length < 2) {
        ctx.body = { groupes: [] };
        return;
      }
      const limit = 6;
      const [pages, articles, evenements, entreprises, offres, inscrits] = await Promise.all([
        db('api::page.page').findMany({ where: ressemble(['titre', 'slug'], q), select: ['documentId', 'titre', 'slug'], limit: limit * 2 }),
        db('api::article.article').findMany({ where: ressemble(['titre', 'extrait'], q), select: ['documentId', 'titre', 'datePublication'], limit: limit * 2 }),
        db('api::evenement.evenement').findMany({ where: ressemble(['titre', 'lieu'], q), select: ['documentId', 'titre', 'dateDebut'], limit }),
        db('api::entreprise.entreprise').findMany({ where: ressemble(['nom', 'ville', 'nomEntiteGestmax'], q), select: ['documentId', 'nom', 'ville'], limit }),
        db('api::offre.offre').findMany({ where: ressemble(['titre', 'nomEntreprise', 'lieu'], q), select: ['documentId', 'titre', 'nomEntreprise', 'lieu'], limit }),
        // Données personnelles : seulement avec la capacité « Voir les inscrits ».
        aCapacite(ctx, 'inscrits-voir')
          ? db('api::inscription.inscription').findMany({ where: ressemble(['nom', 'prenom', 'email', 'structure'], q), select: ['documentId', 'nom', 'prenom', 'email'], populate: { evenement: { select: ['documentId', 'titre'] } }, limit })
          : [],
      ]);
      // Brouillon et version publiée d'un même contenu : une seule ligne.
      const uniques = (liste: any[]) => liste.filter((x, i, t) => t.findIndex((y) => y.documentId === x.documentId) === i).slice(0, limit);
      const date = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

      const groupes = [
        { libelle: 'Pages', resultats: uniques(pages).map((p: any) => ({ titre: p.titre, detail: `/${p.slug}`, lien: `${CM}/api::page.page/${p.documentId}` })) },
        { libelle: 'Articles', resultats: uniques(articles).map((a: any) => ({ titre: a.titre, detail: date(a.datePublication), lien: `${CM}/api::article.article/${a.documentId}` })) },
        { libelle: 'Événements', resultats: evenements.map((e: any) => ({ titre: e.titre, detail: date(e.dateDebut), lien: `${CM}/api::evenement.evenement/${e.documentId}` })) },
        { libelle: 'Entreprises', resultats: entreprises.map((e: any) => ({ titre: e.nom, detail: e.ville, lien: `${CM}/api::entreprise.entreprise/${e.documentId}` })) },
        { libelle: "Offres d'emploi", resultats: offres.map((o: any) => ({ titre: o.titre, detail: [o.nomEntreprise, o.lieu].filter(Boolean).join(' · '), lien: '/mes-offres' })) },
        {
          libelle: 'Inscrits aux événements',
          // Les inscrits se consultent dans l'encart de leur événement (pas de droit sur la collection, voir back-office).
          resultats: inscrits.filter((i: any) => i.evenement).map((i: any) => ({
            titre: `${i.prenom} ${i.nom}`,
            detail: `${i.email} · ${i.evenement.titre}`,
            lien: `${CM}/api::evenement.evenement/${i.evenement.documentId}`,
          })),
        },
      ].filter((g) => g.resultats.length);
      ctx.body = { groupes };
    },
  };
};
