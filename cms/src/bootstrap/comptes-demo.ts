// Comptes de test du back-office, créés au démarrage si SEED_DEMO=true.
// Identifiants lus dans .env (DEMO_ADMIN_* et DEMO_EDITEUR_*) : jamais en dur dans le code.
import type { Core } from '@strapi/strapi';

const COMPTES = [
  { prefixe: 'DEMO_ADMIN', role: 'strapi-super-admin', firstname: 'Admin', lastname: 'Agence' },
  { prefixe: 'DEMO_EDITEUR', role: 'strapi-editor', firstname: 'Éditeur', lastname: 'Collectivité' },
];

export async function creerComptesDemo(strapi: Core.Strapi) {
  for (const compte of COMPTES) {
    const email = process.env[`${compte.prefixe}_EMAIL`]?.toLowerCase();
    const password = process.env[`${compte.prefixe}_PASSWORD`];
    if (!email || !password) continue;

    const existe = await strapi.db.query('admin::user').findOne({ where: { email } });
    if (existe) continue;

    const role = await strapi.db.query('admin::role').findOne({ where: { code: compte.role } });
    if (!role) continue;

    await strapi.service('admin::user').create({
      email,
      password,
      firstname: compte.firstname,
      lastname: compte.lastname,
      isActive: true,
      roles: [role.id],
    });
    strapi.log.info(`[demo] compte ${compte.role} créé : ${email}`);
  }
}
