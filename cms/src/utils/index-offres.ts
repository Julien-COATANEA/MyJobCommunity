// Index de la table des offres : filtres du site (contrat, lieu, tri par date), écrans du back-office et recherche.
// Sans eux, chaque requête lit les dizaines de milliers de lignes. Créés au démarrage, sans effet s'ils existent déjà.
import type { Core } from '@strapi/strapi';

const INDEX: { nom: string; colonnes: string }[] = [
  { nom: 'mjc_offre_tri', colonnes: 'a_la_une, date_activation' },
  { nom: 'mjc_offre_contrat', colonnes: 'type_contrat' },
  { nom: 'mjc_offre_lieu', colonnes: 'lieu(100)' },
  { nom: 'mjc_offre_entreprise_nom', colonnes: 'nom_entreprise(100)' },
  { nom: 'mjc_offre_masquee', colonnes: 'masquee, date_fin_publication' },
  { nom: 'mjc_offre_geo', colonnes: 'latitude, longitude' },
];

export async function assurerIndexOffres(strapi: Core.Strapi) {
  const db = strapi.db.connection;
  const client = String(strapi.config.get('database.connection.client'));
  if (!['mysql', 'mysql2'].includes(client)) return;
  for (const { nom, colonnes } of INDEX) {
    try {
      const [existants] = await db.raw('SHOW INDEX FROM `offre` WHERE Key_name = ?', [nom]);
      if (existants.length) continue;
      await db.raw(`CREATE INDEX \`${nom}\` ON \`offre\` (${colonnes})`);
      strapi.log.info(`[offres] index ${nom} créé`);
    } catch (e) {
      strapi.log.warn(`[offres] index ${nom} non créé : ${(e as Error).message}`);
    }
  }
}
