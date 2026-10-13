// Tâches planifiées : publications programmées, rappels de la veille, purge RGPD des inscriptions.
import type { Core } from '@strapi/strapi';
import { envoyerEmail, lireIdentite } from './emails';
import { INSCRIPTION, EVENEMENT, formatDate, lienAnnulation, lieuEvenement } from './inscriptions';

const TYPES_PROGRAMMABLES = ['api::page.page', 'api::article.article'];
const DUREE_CONSERVATION_MOIS = 12;

/** Publie les brouillons dont la date « Publier automatiquement le » est passée. */
export async function publierProgrammees(strapi: Core.Strapi) {
  let publies = 0;
  for (const uid of TYPES_PROGRAMMABLES) {
    const dues: any[] = await strapi.db.query(uid).findMany({
      where: { publishedAt: { $null: true }, publierLe: { $lte: new Date() } },
      select: ['documentId', 'titre'],
    });
    for (const d of dues) {
      try {
        // On efface la date avant de publier : la version publiée ne porte pas de programmation en attente.
        await strapi.documents(uid as any).update({ documentId: d.documentId, data: { publierLe: null } as any });
        await strapi.documents(uid as any).publish({ documentId: d.documentId });
        strapi.log.info(`[programmation] « ${d.titre} » publié automatiquement`);
        publies++;
      } catch (e) {
        strapi.log.error(`[programmation] échec pour « ${d.titre} » : ${(e as Error).message}`);
      }
    }
  }
  return publies;
}

/** Rappel envoyé la veille aux inscrits confirmés (une seule fois par inscription). */
export async function envoyerRappels(strapi: Core.Strapi) {
  const debut = new Date(Date.now() + 16 * 3600_000);
  const fin = new Date(Date.now() + 40 * 3600_000);
  const evenements: any[] = await strapi.db.query(EVENEMENT).findMany({ where: { dateDebut: { $gte: debut, $lte: fin } } });
  const { nomSite } = await lireIdentite(strapi);
  let envoyes = 0;

  for (const e of evenements) {
    const inscrits: any[] = await strapi.db.query(INSCRIPTION).findMany({
      where: { evenement: { documentId: e.documentId }, statut: 'confirmee', rappelEnvoye: { $ne: true } },
    });
    for (const i of inscrits) {
      try {
        await envoyerEmail(strapi, {
          to: i.email,
          sujet: `Rappel : ${e.titre}, demain`,
          texte: [
            `Bonjour ${i.prenom},`,
            '',
            `Pour rappel, « ${e.titre} » a lieu demain.`,
            `Date : ${formatDate(e.dateDebut)}`,
            lieuEvenement(e) ? `Lieu : ${lieuEvenement(e)}` : '',
            '',
            `Un empêchement ? Merci de libérer votre place : ${lienAnnulation(i.jeton)}`,
            '',
            `À demain !\nL'équipe ${nomSite}`,
          ].join('\n').replace(/\n{3,}/g, '\n\n'),
        });
        await strapi.db.query(INSCRIPTION).update({ where: { id: i.id }, data: { rappelEnvoye: true } });
        envoyes++;
      } catch (err) {
        strapi.log.error(`[rappel] ${i.email} : ${(err as Error).message}`);
      }
    }
  }
  if (envoyes) strapi.log.info(`[rappel] ${envoyes} rappel(s) envoyé(s)`);
  return envoyes;
}

/** Supprime les inscriptions de plus de 12 mois après l'événement (engagement affiché dans « Données personnelles »). */
export async function purgerInscriptions(strapi: Core.Strapi) {
  const limite = new Date();
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);

  const anciennes: any[] = await strapi.db.query(INSCRIPTION).findMany({
    where: { $or: [{ evenement: { dateDebut: { $lt: limite } } }, { evenement: { $null: true }, createdAt: { $lt: limite } }] },
    select: ['id'],
  });
  if (!anciennes.length) return 0;
  await strapi.db.query(INSCRIPTION).deleteMany({ where: { id: { $in: anciennes.map((a) => a.id) } } });
  strapi.log.info(`[rgpd] ${anciennes.length} inscription(s) de plus de ${DUREE_CONSERVATION_MOIS} mois supprimée(s)`);
  return anciennes.length;
}
