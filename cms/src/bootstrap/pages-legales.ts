// Pages légales prêtes à l'emploi : au premier démarrage, les mentions légales, les données personnelles, la politique
// de cookies et la déclaration d'accessibilité sont créées EN BROUILLON à partir des modèles (utils/modeles.ts).
// Rien n'est visible tant que la collectivité n'a pas complété ses informations légales et publié les pages.
// Une page supprimée n'est pas recréée ; une page qui existe déjà (même adresse) n'est jamais modifiée.
import type { Core } from '@strapi/strapi';
import { MODELES } from '../utils/modeles';
import { slugifier } from '../utils/gestmax';

const PAGE = 'api::page.page';
const CLES_MODELES = ['mentions-legales', 'donnees-personnelles', 'politique-cookies', 'accessibilite'];

export async function assurerPagesLegales(strapi: Core.Strapi) {
  const magasin = strapi.store({ type: 'core', name: 'mjc', key: 'pages-legales-creees' });
  const faites = ((await magasin.get({})) as string[] | null) ?? [];

  for (const cle of CLES_MODELES) {
    if (faites.includes(cle)) continue;
    const modele = MODELES.find((m) => m.cle === cle);
    if (!modele) continue;
    const slug = slugifier(modele.titrePage);
    if (!(await strapi.db.query(PAGE).count({ where: { slug } }))) {
      await strapi.documents(PAGE).create({
        data: { titre: modele.titrePage, slug, chapo: modele.chapo || null, sections: JSON.parse(JSON.stringify(modele.sections)) } as any,
      });
      strapi.log.info(`[pages-legales] page « ${modele.titrePage} » créée en brouillon`);
    }
    faites.push(cle);
    await magasin.set({ value: faites });
  }
}
