// « Mon équipe » : inviter un collègue, choisir son rôle, le désactiver, régler les droits des rôles. Remplace les
// réglages de Strapi, masqués aux collectivités. Demande de publication d'un rédacteur à un responsable.
import type { Core } from '@strapi/strapi';
import { envoyerEmail, lireIdentite } from '../../../utils/emails';
import { ROLE_REDACTEUR, ROLE_RESPONSABLE } from '../../../utils/roles';
import { CAPACITES, CONTENUS, ROLES_REGLABLES, aCapacite, ecrireDroits, lireDroits, optionsContenu, type Capacite, type DroitsRole } from '../../../utils/droits';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES_ATTRIBUABLES = [ROLE_RESPONSABLE, ROLE_REDACTEUR];
const urlBO = () => (process.env.PUBLIC_STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '');
const codes = (u: any) => (u?.roles ?? []).map((r: any) => r.code);
const estSuperAdmin = (u: any) => codes(u).includes('strapi-super-admin');

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const users = () => strapi.service('admin::user') as any;
  const roleParCode = (code: string) => strapi.db.query('admin::role').findOne({ where: { code } }) as Promise<any>;

  const autorise = (ctx: any) => {
    // Doublé par la policy des routes : garde-fou si une route est ajoutée sans elle.
    if (aCapacite(ctx, 'equipe')) return true;
    ctx.status = 403;
    ctx.body = { error: { message: "Votre rôle ne permet pas de gérer l'équipe." } };
    return false;
  };

  const lienInvitation = (jeton: string) => `${urlBO()}/admin/auth/register?registrationToken=${jeton}`;

  const envoyerInvitation = async (utilisateur: any, jeton: string, parQui: any) => {
    const { nomSite } = await lireIdentite(strapi);
    await envoyerEmail(strapi, {
      to: utilisateur.email,
      sujet: `Invitation à gérer le site ${nomSite}`,
      texte: [
        `Bonjour${utilisateur.firstname ? ` ${utilisateur.firstname}` : ''},`,
        '',
        `${parQui.firstname ?? ''} ${parQui.lastname ?? ''}`.trim() + ` vous invite à gérer le site « ${nomSite} » (actualités, événements, pages…).`,
        '',
        `Créez votre compte en choisissant un mot de passe : ${lienInvitation(jeton)}`,
        '',
        'Ce lien est personnel. Si vous ne connaissez pas cette personne, ignorez ce message.',
      ].join('\n'),
    });
  };

  return {
    async lister(ctx: any) {
      if (!autorise(ctx)) return;
      const liste: any[] = await strapi.db.query('admin::user').findMany({ populate: { roles: true }, orderBy: { firstname: 'asc' } });
      const roles: any[] = await strapi.db.query('admin::role').findMany({ where: { code: { $in: ROLES_ATTRIBUABLES } } });
      ctx.body = {
        moi: ctx.state.user.id,
        peutModifierIdentite: estSuperAdmin(ctx.state.user),
        roles: roles.map((r) => ({ code: r.code, nom: r.name, description: r.description })),
        membres: liste.map((u) => ({
          id: u.id,
          email: u.email,
          prenom: u.firstname,
          nom: u.lastname,
          actif: !!u.isActive,
          invitationEnAttente: !u.isActive && !!u.registrationToken,
          roleCode: u.roles?.[0]?.code ?? null,
          roleNom: u.roles?.[0]?.name ?? '',
          modifiable: !codes(u).includes('strapi-super-admin') && u.id !== ctx.state.user.id,
        })),
      };
    },

    async inviter(ctx: any) {
      if (!autorise(ctx)) return;
      const { email, prenom, nom, role } = ctx.request.body ?? {};
      const adresse = String(email ?? '').trim().toLowerCase();
      if (!EMAIL.test(adresse)) return ctx.badRequest('Indiquez une adresse e-mail valide.');
      if (!ROLES_ATTRIBUABLES.includes(role)) return ctx.badRequest('Choisissez un rôle.');
      if (await users().exists({ email: adresse })) return ctx.badRequest('Cette adresse e-mail a déjà un compte.');

      const roleChoisi = await roleParCode(role);
      const cree = await users().create({
        email: adresse,
        firstname: String(prenom ?? '').trim().slice(0, 60) || adresse.split('@')[0],
        lastname: String(nom ?? '').trim().slice(0, 60) || '-',
        roles: [roleChoisi.id],
        isActive: false,
      });
      await envoyerInvitation(cree, cree.registrationToken, ctx.state.user).catch((e) =>
        strapi.log.error(`[equipe] invitation non envoyée : ${(e as Error).message}`),
      );
      // Le lien est aussi rendu à l'écran : utile si l'e-mail n'arrive pas.
      ctx.body = { id: cree.id, lien: lienInvitation(cree.registrationToken) };
    },

    async renvoyer(ctx: any) {
      if (!autorise(ctx)) return;
      const cible: any = await strapi.db.query('admin::user').findOne({ where: { id: ctx.params.id } });
      if (!cible?.registrationToken) return ctx.badRequest("Ce compte est déjà activé.");
      const jeton = (strapi.service('admin::token') as any).createToken();
      await strapi.db.query('admin::user').update({ where: { id: cible.id }, data: { registrationToken: jeton } });
      await envoyerInvitation(cible, jeton, ctx.state.user);
      ctx.body = { lien: lienInvitation(jeton) };
    },

    async modifier(ctx: any) {
      if (!autorise(ctx)) return;
      const corps = ctx.request.body ?? {};
      const cible: any = await strapi.db.query('admin::user').findOne({ where: { id: ctx.params.id }, populate: { roles: true } });
      if (!cible) return ctx.notFound();
      const donnees: Record<string, unknown> = {};

      // Nom, prénom, e-mail : réservés au super administrateur, pour tous les comptes (le sien compris).
      const identite = ['prenom', 'nom', 'email'].some((cle) => typeof corps[cle] === 'string');
      if (identite) {
        if (!estSuperAdmin(ctx.state.user)) return ctx.forbidden('Seul le super administrateur peut modifier le nom ou l’e-mail.');
        if (typeof corps.prenom === 'string') {
          const prenom = corps.prenom.trim().slice(0, 60);
          if (!prenom) return ctx.badRequest('Le prénom ne peut pas être vide.');
          donnees.firstname = prenom;
        }
        if (typeof corps.nom === 'string') donnees.lastname = corps.nom.trim().slice(0, 60) || '-';
        if (typeof corps.email === 'string') {
          const email = corps.email.trim().toLowerCase();
          if (!EMAIL.test(email)) return ctx.badRequest('Indiquez une adresse e-mail valide.');
          if (email !== cible.email) {
            const pris: any = await strapi.db.query('admin::user').findOne({ where: { email }, select: ['id'] });
            if (pris && pris.id !== cible.id) return ctx.badRequest('Cette adresse e-mail est déjà utilisée par un autre compte.');
            donnees.email = email;
          }
        }
      }

      // Rôle et activation : jamais sur un super administrateur ni sur son propre compte.
      const acces = ROLES_ATTRIBUABLES.includes(corps.role) || typeof corps.actif === 'boolean';
      if (acces) {
        if (codes(cible).includes('strapi-super-admin') || cible.id === ctx.state.user.id) return ctx.forbidden('Le rôle de ce compte ne peut pas être modifié ici.');
        if (ROLES_ATTRIBUABLES.includes(corps.role)) donnees.roles = [(await roleParCode(corps.role)).id];
        if (typeof corps.actif === 'boolean') donnees.isActive = corps.actif;
      }

      if (!Object.keys(donnees).length) return ctx.badRequest('Aucune modification.');
      await users().updateById(cible.id, donnees);
      ctx.body = { ok: true };
    },

    async supprimer(ctx: any) {
      if (!autorise(ctx)) return;
      const cible: any = await strapi.db.query('admin::user').findOne({ where: { id: ctx.params.id }, populate: { roles: true } });
      if (!cible || codes(cible).includes('strapi-super-admin') || cible.id === ctx.state.user.id) return ctx.forbidden('Ce compte ne peut pas être supprimé ici.');
      await users().deleteById(cible.id);
      ctx.body = { ok: true };
    },

    /** Grille des droits des rôles réglables (contenus et capacités de l'espace). */
    async lireDroits(ctx: any) {
      if (!autorise(ctx)) return;
      const roles: any[] = await strapi.db.query('admin::role').findMany({ where: { code: { $in: ROLES_REGLABLES } } });
      const mesRoles: string[] = codes(ctx.state.user);
      ctx.body = {
        contenus: CONTENUS.filter((c) => (strapi.contentTypes as any)[c.uid]).map((c) => ({ ...c, options: optionsContenu(strapi, c.uid) })),
        capacites: CAPACITES,
        roles: await Promise.all(
          ROLES_REGLABLES.map((code) => roles.find((r) => r.code === code)).filter(Boolean).map(async (r: any) => ({
            code: r.code,
            nom: r.name,
            description: r.description,
            // On ne retire pas la gestion de l'équipe à son propre rôle (on se fermerait la porte).
            estLeMien: mesRoles.includes(r.code),
            droits: await lireDroits(strapi, r.id),
          })),
        ),
      };
    },

    async ecrireDroits(ctx: any) {
      if (!autorise(ctx)) return;
      const code = ctx.params.code;
      if (!ROLES_REGLABLES.includes(code)) return ctx.forbidden('Les droits de ce rôle ne se règlent pas ici.');
      const role: any = await roleParCode(code);
      if (!role) return ctx.notFound();

      const corps = ctx.request.body ?? {};
      const capacites: Capacite[] = (Array.isArray(corps.capacites) ? corps.capacites : []).filter((c: unknown) => CAPACITES.some((x) => x.cle === c));
      if (codes(ctx.state.user).includes(code) && !capacites.includes('equipe')) {
        return ctx.badRequest('Vous ne pouvez pas retirer « Gérer l’équipe » à votre propre rôle.');
      }
      const contenus: DroitsRole['contenus'] = {};
      for (const { uid } of CONTENUS) {
        const d = corps.contenus?.[uid];
        if (!d || typeof d !== 'object') continue;
        // Modifier, publier ou supprimer supposent de voir le contenu.
        const voir = d.voir === true || d.modifier === true || d.publier === true || d.supprimer === true;
        contenus[uid] = { voir, modifier: d.modifier === true, publier: d.publier === true, supprimer: d.supprimer === true, seulementSiens: d.seulementSiens === true };
      }
      await ecrireDroits(strapi, role.id, { contenus, capacites });
      strapi.log.info(`[droits] droits du rôle ${code} modifiés par ${ctx.state.user.email}`);
      ctx.body = await lireDroits(strapi, role.id);
    },

    /** Un rédacteur (sans bouton Publier) demande à un responsable de publier un contenu. */
    async demanderPublication(ctx: any) {
      const { uid, documentId, message } = ctx.request.body ?? {};
      const types: Record<string, { libelle: string; unique: boolean; champ: string }> = {
        'api::page.page': { libelle: 'La page', unique: false, champ: 'titre' },
        'api::article.article': { libelle: "L'article", unique: false, champ: 'titre' },
        'api::accueil.accueil': { libelle: "La page d'accueil", unique: true, champ: 'heroTitre' },
        'api::page-offres.page-offres': { libelle: 'La page des offres', unique: true, champ: 'titre' },
      };
      const type = types[uid];
      if (!type) return ctx.badRequest('Contenu non concerné.');
      const doc: any = type.unique
        ? await strapi.documents(uid).findFirst({ status: 'draft' } as any)
        : await strapi.documents(uid).findOne({ documentId, status: 'draft' } as any);
      if (!doc) return ctx.notFound();

      // Destinataires : les personnes dont le rôle peut publier ce contenu (réglé dans « Mon équipe »).
      const publication: any[] = await strapi.db.query('admin::permission').findMany({
        where: { action: 'plugin::content-manager.explorer.publish', subject: uid },
        populate: { role: { select: ['id'] } },
      });
      // Sans condition : un rôle limité à « ses contenus » ne pourrait pas publier celui d'un autre.
      const rolesPublieurs = new Set(publication.filter((p) => !(p.conditions ?? []).length).map((p) => p.role?.id).filter(Boolean));
      const destinataires: any[] = (await strapi.db.query('admin::user').findMany({ where: { isActive: true }, populate: { roles: true } }))
        .filter((u: any) => u.id !== ctx.state.user.id && (u.roles ?? []).some((r: any) => rolesPublieurs.has(r.id)));
      const { nomSite } = await lireIdentite(strapi);
      const lien = `${urlBO()}/admin/content-manager/${type.unique ? 'single' : 'collection'}-types/${uid}${type.unique ? '' : `/${documentId}`}`;
      const auteur = `${ctx.state.user.firstname ?? ''} ${ctx.state.user.lastname ?? ''}`.trim() || ctx.state.user.email;

      for (const d of destinataires) {
        await envoyerEmail(strapi, {
          to: d.email,
          sujet: `[${nomSite}] Publication demandée : ${doc[type.champ]}`,
          texte: [
            `Bonjour ${d.firstname ?? ''},`.trim(),
            '',
            `${auteur} demande la publication de ${type.libelle.toLowerCase()} « ${doc[type.champ]} ».`,
            message ? `\nMessage : ${String(message).slice(0, 500)}` : '',
            '',
            `Relire et publier : ${lien}`,
          ].join('\n').replace(/\n{3,}/g, '\n\n'),
        }).catch((e) => strapi.log.error(`[equipe] demande non envoyée à ${d.email} : ${(e as Error).message}`));
      }
      ctx.body = { destinataires: destinataires.length };
    },
  };
};
