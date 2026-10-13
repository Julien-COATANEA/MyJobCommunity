import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { verifierContrastes } from './utils/contraste';
import { initialiserDonneesDemo } from './bootstrap/demo';
import { creerComptesDemo } from './bootstrap/comptes-demo';
import { configurerBackOffice } from './bootstrap/back-office';
import { routesEspace } from './api/espace/routes-admin';
import { protegerOffres, UID_OFFRE } from './utils/garde-offres';
import { INSCRIPTION, promouvoirListeAttente } from './utils/inscriptions';

// Lecture publique (rôle « Public ») : le site statique lit l'API sans jeton.
const LECTURE_PUBLIQUE = [
  'api::article.article.find',
  'api::article.article.findOne',
  'api::categorie-article.categorie-article.find',
  'api::categorie-article.categorie-article.findOne',
  'api::evenement.evenement.find',
  'api::evenement.evenement.findOne',
  'api::entreprise.entreprise.find',
  'api::entreprise.entreprise.findOne',
  'api::secteur.secteur.find',
  'api::secteur.secteur.findOne',
  'api::offre.offre.find',
  'api::offre.offre.findOne',
  'api::page.page.find',
  'api::page.page.findOne',
  'api::accueil.accueil.find',
  'api::navigation.navigation.find',
  'api::parametres.parametres.find',
];

const WEBHOOK_REBUILD = 'Régénération du site';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.server.routes(routesEspace as any);

    // Champ « Lien » des formulaires : liste des pages du site, raccourcis Gestmax ou adresse libre (voir admin/espace/LienInput).
    strapi.customFields.register({ name: 'lien', type: 'string' });

    // Les offres viennent de Gestmax : jamais créées ni modifiées depuis le BO.
    protegerOffres(strapi);

    // Une inscription annulée ou supprimée dans le BO libère une place : on prévient le suivant de la liste d'attente.
    strapi.documents.use(async (context, next) => {
      if (context.uid !== INSCRIPTION || !['update', 'delete'].includes(context.action)) return next();
      const documentId = (context.params as any).documentId;
      const avant: any = documentId
        ? await strapi.db.query(INSCRIPTION).findOne({ where: { documentId }, populate: { evenement: { select: ['documentId'] } } })
        : null;
      const resultat = await next();
      if (avant?.evenement) {
        await promouvoirListeAttente(strapi, avant.evenement.documentId).catch((e) =>
          strapi.log.error(`[inscription] liste d'attente : ${(e as Error).message}`),
        );
      }
      return resultat;
    });

    // Refuse l'enregistrement de couleurs non conformes RGAA : le message s'affiche dans le BO.
    strapi.documents.use(async (context, next) => {
      if (context.uid === 'api::parametres.parametres' && (context.action === 'create' || context.action === 'update')) {
        const erreurs = verifierContrastes((context.params as any).data ?? {});
        if (erreurs.length) {
          throw new errors.ValidationError(`Couleurs non conformes à l'accessibilité (RGAA) : ${erreurs.join(' ; ')}`);
        }
      }
      return next();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await accorderLecturePublique(strapi);
    // Anciennes lignes sans valeur : « offre visible » repose sur « masquée = faux ».
    await strapi.db.query(UID_OFFRE).updateMany({ where: { masquee: { $null: true } }, data: { masquee: false } });
    await strapi.db.query(UID_OFFRE).updateMany({ where: { aLaUne: { $null: true } }, data: { aLaUne: false } });
    await assurerWebhookRebuild(strapi);
    await configurerBackOffice(strapi).catch((e) => strapi.log.error(`[back-office] ${e.stack ?? e}`));

    if (process.env.SEED_DEMO === 'true') {
      await initialiserDonneesDemo(strapi).catch((e) => strapi.log.error(`[demo] ${e.stack ?? e}`));
      await creerComptesDemo(strapi).catch((e) => strapi.log.error(`[demo] comptes : ${e.message}`));
    }

    // Première synchronisation sans attendre le cron (ne bloque pas le démarrage).
    strapi
      .service('api::offre.offre')
      .synchroniserDepuisGestmax()
      .catch((e: Error) => strapi.log.error(`[gestmax] ${e.message}`));
  },
};

async function accorderLecturePublique(strapi: Core.Strapi) {
  const rolePublic = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  if (!rolePublic) return;
  for (const action of LECTURE_PUBLIQUE) {
    const existe = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: rolePublic.id } });
    if (!existe) {
      await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: rolePublic.id } });
    }
  }
}

/** Crée le webhook Strapi → builder qui régénère le site statique après chaque modification. */
async function assurerWebhookRebuild(strapi: Core.Strapi) {
  const url = process.env.BUILDER_WEBHOOK_URL;
  if (!url) return;
  const store: any = strapi.get('webhookStore');
  const existants = await store.findWebhooks();
  if (existants.some((w: any) => w.name === WEBHOOK_REBUILD)) return;

  const webhook = await store.createWebhook({
    name: WEBHOOK_REBUILD,
    url,
    headers: { Authorization: `Bearer ${process.env.BUILD_TOKEN ?? ''}` },
    events: [
      'entry.create', 'entry.update', 'entry.delete', 'entry.publish', 'entry.unpublish',
      'media.create', 'media.update', 'media.delete',
    ],
    isEnabled: true,
  });
  strapi.get('webhookRunner').add(webhook);
  strapi.log.info(`[webhook] « ${WEBHOOK_REBUILD} » créé vers ${url}`);
}
