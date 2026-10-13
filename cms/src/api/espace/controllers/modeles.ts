// Création d'une page à partir d'un modèle (« Nouvelle page » du back-office).
import type { Core } from '@strapi/strapi';
import { slugifier } from '../../../utils/gestmax';
import { MODELES } from '../../../utils/modeles';

const PAGE = 'api::page.page';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  lister(ctx: any) {
    ctx.body = {
      modeles: MODELES.map(({ cle, titre, description, blocs, juridique, titrePage }) => ({ cle, titre, description, blocs, juridique: !!juridique, titrePage })),
    };
  },

  /** Crée un BROUILLON : rien n'est visible sur le site avant « Publier ». */
  async creer(ctx: any) {
    const modele = MODELES.find((m) => m.cle === ctx.request.body?.modele);
    if (!modele) return ctx.badRequest('Modèle inconnu.');
    const titre = String(ctx.request.body?.titre ?? modele.titrePage).trim().slice(0, 100) || modele.titrePage;

    // Adresse libre : « mentions-legales », sinon « mentions-legales-2 »…
    const base = slugifier(titre) || 'page';
    let slug = base;
    for (let n = 2; await strapi.db.query(PAGE).count({ where: { slug } }); n++) slug = `${base}-${n}`;

    const page: any = await strapi.documents(PAGE).create({
      data: { titre, slug, chapo: modele.chapo || null, sections: JSON.parse(JSON.stringify(modele.sections)) } as any,
    });
    ctx.body = { documentId: page.documentId, slug };
  },
});
