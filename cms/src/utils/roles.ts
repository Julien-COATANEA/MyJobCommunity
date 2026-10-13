// Rôles propres aux collectivités, créés au démarrage s'ils n'existent pas :
//  - Responsable : prépare ET publie ;
//  - Rédacteur   : prépare, puis « demande la publication » à un responsable (pas de bouton Publier).
// Ils reprennent les droits du rôle « Éditeur » de Strapi ; les offres restent en lecture seule pour tous (voir garde-offres).
import type { Core } from '@strapi/strapi';

export const ROLE_RESPONSABLE = 'mjc-responsable';
export const ROLE_REDACTEUR = 'mjc-redacteur';
export const ROLES_GESTION_EQUIPE = ['strapi-super-admin', ROLE_RESPONSABLE, 'strapi-editor'];
export const ROLES_PUBLICATION = ['strapi-super-admin', ROLE_RESPONSABLE, 'strapi-editor'];

const ACTION_PUBLIER = 'plugin::content-manager.explorer.publish';

const DEFINITIONS = [
  { code: ROLE_RESPONSABLE, name: 'Responsable', description: 'Prépare et publie les contenus du site, gère son équipe.', publier: true },
  { code: ROLE_REDACTEUR, name: 'Rédacteur', description: 'Prépare les contenus et demande leur publication à un responsable.', publier: false },
];

export async function assurerRoles(strapi: Core.Strapi) {
  const editeur: any = await strapi.db.query('admin::role').findOne({ where: { code: 'strapi-editor' }, populate: { permissions: true } });
  if (!editeur) return;
  const roleService = strapi.service('admin::role') as any;

  for (const d of DEFINITIONS) {
    if (await strapi.db.query('admin::role').findOne({ where: { code: d.code } })) continue;
    const role = await roleService.create({ name: d.name, code: d.code, description: d.description });
    const permissions = editeur.permissions
      .filter((p: any) => d.publier || p.action !== ACTION_PUBLIER)
      .map((p: any) => ({ action: p.action, subject: p.subject, properties: p.properties ?? {}, conditions: p.conditions ?? [] }));
    await roleService.assignPermissions(role.id, permissions);
    strapi.log.info(`[roles] rôle « ${d.name} » créé (${permissions.length} permissions)`);
  }
}
