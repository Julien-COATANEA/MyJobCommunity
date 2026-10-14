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

const ROLES_EDITION = ['strapi-editor', ROLE_RESPONSABLE, ROLE_REDACTEUR];
const EXPLORER = 'plugin::content-manager.explorer';
const ACTIONS_AVEC_CHAMPS = ['read', 'create', 'update'].map((a) => `${EXPLORER}.${a}`);

/**
 * Droits des rôles des collectivités sur un type ajouté après leur création : Strapi ne les donne qu'au super
 * administrateur, et n'ajoute pas non plus les nouveaux champs aux droits existants. Rejoué à chaque démarrage.
 */
export async function assurerDroitsType(strapi: Core.Strapi, uid: string) {
  const modele = (strapi.contentTypes as any)[uid];
  if (!modele) return;
  const champs: string[] = (strapi.service('admin::content-type') as any).getNestedFields(modele, { components: strapi.components });
  const roleService = strapi.service('admin::role') as any;

  for (const code of ROLES_EDITION) {
    const role: any = await strapi.db.query('admin::role').findOne({ where: { code } });
    if (!role) continue;
    const existantes: any[] = await strapi.db.query('admin::permission').findMany({ where: { subject: uid, role: role.id } });
    const aAjouter: any[] = [];
    // Publier : seulement pour un type avec brouillon, et jamais pour le rédacteur (il demande la publication).
    const publier = modele.options?.draftAndPublish && ROLES_PUBLICATION.includes(code) ? [ACTION_PUBLIER] : [];
    for (const action of [...ACTIONS_AVEC_CHAMPS, `${EXPLORER}.delete`, ...publier]) {
      const avecChamps = ACTIONS_AVEC_CHAMPS.includes(action);
      const existante = existantes.find((p) => p.action === action);
      if (!existante) {
        aAjouter.push({ action, subject: uid, properties: avecChamps ? { fields: champs } : {}, conditions: [] });
        continue;
      }
      const actuels: string[] = existante.properties?.fields ?? [];
      if (avecChamps && champs.some((c) => !actuels.includes(c))) {
        await strapi.db.query('admin::permission').update({
          where: { id: existante.id },
          data: { properties: { ...existante.properties, fields: [...new Set([...actuels, ...champs])] } },
        });
      }
    }
    if (aAjouter.length) {
      await roleService.addPermissions(role.id, aAjouter);
      strapi.log.info(`[roles] droits sur ${uid} ajoutés au rôle ${code}`);
    }
  }
}
