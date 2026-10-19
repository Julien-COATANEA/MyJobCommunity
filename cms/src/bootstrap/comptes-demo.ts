// Comptes de test du back-office, créés au démarrage si SEED_DEMO=true.
// Identifiants lus dans .env (DEMO_ADMIN_* et DEMO_EDITEUR_*) : jamais en dur dans le code.
// Chaque compte n'est créé qu'une fois : supprimé dans le BO, il ne revient pas au redémarrage suivant.
import type { Core } from '@strapi/strapi';
import { effacerJetonsInscription } from '../utils/roles';

const COMPTES = [
  { prefixe: 'DEMO_ADMIN', role: 'strapi-super-admin', firstname: 'Admin', lastname: 'Agence' },
  { prefixe: 'DEMO_EDITEUR', role: 'mjc-responsable', firstname: 'Responsable', lastname: 'Collectivité' },
];

export async function creerComptesDemo(strapi: Core.Strapi) {
  const magasin = strapi.store({ type: 'core', name: 'mjc', key: 'comptes-demo' });
  const deja = new Set(((await magasin.get({})) as string[] | null) ?? []);
  for (const compte of COMPTES) {
    const email = process.env[`${compte.prefixe}_EMAIL`]?.toLowerCase();
    const password = process.env[`${compte.prefixe}_PASSWORD`];
    if (!email || !password || deja.has(email)) continue;

    const existe = await strapi.db.query('admin::user').findOne({ where: { email } });
    if (!existe) {
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
    deja.add(email);
    await magasin.set({ value: [...deja] });
  }
  // Strapi pose un jeton d'inscription même sur un compte créé avec son mot de passe.
  await effacerJetonsInscription(strapi);
}
