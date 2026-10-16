// Droits des rôles des collectivités, réglés depuis « Mon équipe » (les réglages de Strapi leur sont masqués).
//  - Contenus : grille simple (voir / modifier / publier / supprimer / seulement ses contenus) traduite en
//    permissions du gestionnaire de contenu de Strapi ;
//  - Capacités de l'espace (apparence, cookies, site Gestmax…) : permissions Strapi propres au projet
//    (« api::espace.* »), contrôlées par les routes /espace (policy « capacite ») et le menu de l'admin.
import type { Core } from '@strapi/strapi';
import { UID_PARAMETRES, champsParametresSansSuivi } from './garde-parametres';
import { ROLE_REDACTEUR, ROLE_RESPONSABLE } from './roles';

export const CAPACITES = [
  { cle: 'apparence', libelle: 'Apparence', description: 'Template, logo, couleurs et polices du site.' },
  { cle: 'cookies', libelle: 'Cookies et suivi', description: 'Bandeau de cookies, Google Analytics et scripts ajoutés à toutes les pages.' },
  { cle: 'site-gestmax', libelle: 'Site Gestmax', description: 'Adresse du site Gestmax et liens de l’espace candidat.' },
  { cle: 'offres', libelle: 'Offres d’emploi', description: 'Mettre à la une, masquer, coupler aux entreprises, relancer la synchronisation.' },
  { cle: 'regenerer', libelle: 'Mise en ligne du site', description: 'Relancer la mise à jour du site public.' },
  { cle: 'inscrits-voir', libelle: 'Voir les inscrits', description: 'Liste et export des inscriptions aux événements (données personnelles).' },
  { cle: 'inscrits-ecrire', libelle: 'Écrire aux inscrits', description: 'Envoyer un message à tous les inscrits d’un événement.' },
  { cle: 'equipe', libelle: 'Gérer l’équipe', description: 'Inviter, retirer des personnes et régler les droits des rôles.' },
] as const;
export type Capacite = (typeof CAPACITES)[number]['cle'];
export const actionCapacite = (cle: string) => `api::espace.${cle}`;

export const CONTENUS = [
  { uid: 'api::page.page', libelle: 'Pages' },
  { uid: 'api::accueil.accueil', libelle: 'Page d’accueil' },
  { uid: 'api::page-offres.page-offres', libelle: 'Page des offres' },
  { uid: 'api::article.article', libelle: 'Actualités' },
  { uid: 'api::categorie-article.categorie-article', libelle: 'Catégories d’actualités' },
  { uid: 'api::evenement.evenement', libelle: 'Événements' },
  { uid: 'api::entreprise.entreprise', libelle: 'Entreprises' },
  { uid: 'api::navigation.navigation', libelle: 'Menus' },
  { uid: UID_PARAMETRES, libelle: 'Informations du site' },
] as const;

/** Rôles réglables depuis « Mon équipe » (le super administrateur garde tous les droits). */
export const ROLES_REGLABLES = [ROLE_RESPONSABLE, ROLE_REDACTEUR];

const CM = 'plugin::content-manager.explorer';
const A = { lire: `${CM}.read`, creer: `${CM}.create`, modifier: `${CM}.update`, supprimer: `${CM}.delete`, publier: `${CM}.publish` };
const CONDITION_AUTEUR = 'admin::is-creator';

export interface DroitsContenu { voir: boolean; modifier: boolean; publier: boolean; supprimer: boolean; seulementSiens: boolean }
export interface DroitsRole { contenus: Record<string, DroitsContenu>; capacites: Capacite[] }

/** Déclare les capacités auprès de Strapi. À appeler dans register() : après, l'admin efface les permissions inconnues. */
export async function declarerCapacites(strapi: Core.Strapi) {
  await (strapi.service('admin::permission') as any).actionProvider.registerMany(
    CAPACITES.map((c) => ({ uid: `espace.${c.cle}`, section: 'settings', category: 'Espace My Job Community', subCategory: 'Capacités', displayName: c.libelle })),
  );
}

const modele = (strapi: Core.Strapi, uid: string) => (strapi.contentTypes as any)[uid];
const estCollection = (strapi: Core.Strapi, uid: string) => modele(strapi, uid)?.kind === 'collectionType';
const avecBrouillon = (strapi: Core.Strapi, uid: string) => !!modele(strapi, uid)?.options?.draftAndPublish;

/** Ce que la grille permet pour un contenu (publier : types avec brouillon ; supprimer, seulement les siens : collections). */
export const optionsContenu = (strapi: Core.Strapi, uid: string) => ({
  publier: avecBrouillon(strapi, uid),
  supprimer: estCollection(strapi, uid),
  seulementSiens: estCollection(strapi, uid),
});

const champsDe = (strapi: Core.Strapi, uid: string): string[] =>
  // Scripts de suivi : jamais par le gestionnaire de contenu (voir garde-parametres).
  uid === UID_PARAMETRES
    ? champsParametresSansSuivi(strapi)
    : (strapi.service('admin::content-type') as any).getNestedFields(modele(strapi, uid), { components: strapi.components });

export async function lireDroits(strapi: Core.Strapi, roleId: number): Promise<DroitsRole> {
  const permissions: any[] = await strapi.db.query('admin::permission').findMany({ where: { role: roleId } });
  const contenus: Record<string, DroitsContenu> = {};
  for (const { uid } of CONTENUS) {
    if (!modele(strapi, uid)) continue;
    const de = permissions.filter((p) => p.subject === uid);
    const a = (action: string) => de.find((p) => p.action === action);
    const options = optionsContenu(strapi, uid);
    contenus[uid] = {
      voir: !!a(A.lire),
      modifier: !!a(A.modifier),
      publier: options.publier && !!a(A.publier),
      supprimer: options.supprimer && !!a(A.supprimer),
      seulementSiens: options.seulementSiens && de.some((p) => (p.conditions ?? []).includes(CONDITION_AUTEUR)),
    };
  }
  const capacites = CAPACITES.map((c) => c.cle).filter((cle) => permissions.some((p) => p.action === actionCapacite(cle)));
  return { contenus, capacites };
}

/** Remplace les droits d'un rôle sur les contenus de la grille et les capacités (les autres permissions sont gardées). */
export async function ecrireDroits(strapi: Core.Strapi, roleId: number, droits: DroitsRole) {
  const subjects: string[] = CONTENUS.map((c) => c.uid).filter((uid) => modele(strapi, uid));
  const actionsCapacites = CAPACITES.map((c) => actionCapacite(c.cle));
  const nouvelles: any[] = [];

  for (const uid of subjects) {
    const d = droits.contenus[uid];
    if (!d?.voir) continue;
    const options = optionsContenu(strapi, uid);
    const conditions = options.seulementSiens && d.seulementSiens ? [CONDITION_AUTEUR] : [];
    const champs = champsDe(strapi, uid);
    const ajouter = (action: string, avecChamps: boolean) =>
      nouvelles.push({ action, subject: uid, properties: avecChamps ? { fields: champs } : {}, conditions });
    ajouter(A.lire, true);
    if (d.modifier) { ajouter(A.creer, true); ajouter(A.modifier, true); }
    if (d.publier && options.publier) ajouter(A.publier, false);
    if (d.supprimer && options.supprimer) ajouter(A.supprimer, false);
  }
  for (const cle of droits.capacites) {
    if (CAPACITES.some((c) => c.cle === cle)) nouvelles.push({ action: actionCapacite(cle), subject: null, properties: {}, conditions: [] });
  }

  await strapi.db.transaction(async () => {
    await strapi.db.query('admin::permission').deleteMany({
      where: { role: roleId, $or: [{ subject: { $in: subjects } }, { action: { $in: actionsCapacites } }] },
    });
    if (nouvelles.length) await (strapi.service('admin::role') as any).addPermissions(roleId, nouvelles);
  });
}

/**
 * Capacités par défaut, données une seule fois (ensuite, elles se règlent dans « Mon équipe ») :
 * Responsable et Éditeur ont tout, le Rédacteur voit les inscrits.
 */
export async function initialiserCapacites(strapi: Core.Strapi) {
  const magasin = strapi.store({ type: 'core', name: 'mjc', key: 'capacites-initialisees' });
  if (await magasin.get({})) return;
  const parRole: Record<string, string[]> = {
    [ROLE_RESPONSABLE]: CAPACITES.map((c) => c.cle),
    'strapi-editor': CAPACITES.map((c) => c.cle),
    [ROLE_REDACTEUR]: ['inscrits-voir'],
  };
  for (const [code, capacites] of Object.entries(parRole)) {
    const role: any = await strapi.db.query('admin::role').findOne({ where: { code } });
    if (!role) continue;
    const existantes: any[] = await strapi.db.query('admin::permission').findMany({ where: { role: role.id, action: { $in: capacites.map(actionCapacite) } } });
    const manquantes = capacites.filter((c) => !existantes.some((p) => p.action === actionCapacite(c)));
    if (manquantes.length) {
      await (strapi.service('admin::role') as any).addPermissions(role.id, manquantes.map((c) => ({ action: actionCapacite(c), subject: null, properties: {}, conditions: [] })));
    }
  }
  await magasin.set({ value: true });
  strapi.log.info('[droits] capacités de l’espace attribuées aux rôles');
}

/** La personne connectée a-t-elle cette capacité ? (le super administrateur les a toutes) */
export const aCapacite = (ctx: any, cle: Capacite) => !!ctx.state?.userAbility?.can(actionCapacite(cle));

/**
 * Droit sur tout le type, pas seulement sur certains documents : `can(action, uid)` répond oui dès qu'une règle
 * conditionnelle existe (« seulement ses contenus »), ce qui ne suffit pas pour une action qui touche tous les documents.
 */
export const droitSansCondition = (ability: any, action: string, uid: string) =>
  !!ability?.can(action, uid) && (ability.rulesFor?.(action, uid) ?? []).some((r: any) => !r.inverted && !r.conditions);
