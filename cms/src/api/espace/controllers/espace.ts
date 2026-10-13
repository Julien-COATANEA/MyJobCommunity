import type { Core } from '@strapi/strapi';
import { lireDerniereSynchro } from '../../../utils/synchro';

const UID = {
  page: 'api::page.page',
  article: 'api::article.article',
  evenement: 'api::evenement.evenement',
  inscription: 'api::inscription.inscription',
  entreprise: 'api::entreprise.entreprise',
  offre: 'api::offre.offre',
  parametres: 'api::parametres.parametres',
} as const;

// Champs de l'écran « Apparence ».
const CHAMPS_APPARENCE = [
  'nomSite', 'baseline', 'logoTexte',
  'couleurPrimaire', 'couleurSecondaire', 'couleurAccent', 'couleurTexte', 'couleurFond',
  'policeTitres', 'policeTexte', 'arrondis',
] as const;

const urlSite = () => (process.env.SITE_URL ?? '').replace(/\/+$/, '');
const urlBuilder = () => (process.env.BUILDER_WEBHOOK_URL ?? '').replace(/\/build$/, '');

async function etatBuilder() {
  if (!urlBuilder()) return null;
  try {
    const reponse = await fetch(`${urlBuilder()}/status`, { signal: AbortSignal.timeout(2000) });
    return reponse.ok ? await reponse.json() : null;
  } catch {
    return null;
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const db = (uid: string) => strapi.db.query(uid as any);
  const publies = { publishedAt: { $notNull: true } };

  /** « Votre site est prêt à X % » : étapes de mise en route d'une nouvelle collectivité. */
  const listeDemarrage = async (p: any, c: { pages: number; articles: number; entreprises: number; evenementsAVenir: number }) => {
    const navigation: any = await strapi.documents('api::navigation.navigation').findFirst({ populate: { menuPrincipal: true } } as any);
    const pagesLegales = await db(UID.page).count({ where: { ...publies, slug: { $in: ['mentions-legales', 'accessibilite'] } } });
    const cm = (uid: string, unique = false) => `/content-manager/${unique ? 'single' : 'collection'}-types/${uid}`;
    return [
      { cle: 'logo', libelle: 'Déposer votre logo et choisir vos couleurs', fait: !!p?.logo && p?.couleurPrimaire !== '#1a5f7a', lien: '/apparence' },
      { cle: 'coordonnees', libelle: 'Renseigner vos coordonnées', fait: !!(p?.email && p?.telephone), lien: cm('api::parametres.parametres', true) },
      { cle: 'menu', libelle: 'Construire le menu du site', fait: (navigation?.menuPrincipal?.length ?? 0) > 0, lien: cm('api::navigation.navigation', true) },
      { cle: 'carriere', libelle: 'Relier votre site carrière Gestmax', fait: !!p?.gestmaxUrlFront, lien: '/site-carriere' },
      { cle: 'legal', libelle: 'Publier les mentions légales et la page accessibilité', fait: pagesLegales >= 2, lien: cm(UID.page) },
      { cle: 'entreprises', libelle: "Présenter au moins 3 entreprises dans l'annuaire", fait: c.entreprises >= 3, lien: cm(UID.entreprise) },
      { cle: 'articles', libelle: 'Publier vos 3 premiers articles', fait: c.articles >= 3, lien: cm(UID.article) },
      { cle: 'evenement', libelle: 'Annoncer un événement', fait: c.evenementsAVenir >= 1, lien: cm(UID.evenement) },
    ];
  };

  return {
    async tableauDeBord(ctx: any) {
      const maintenant = new Date();
      const il30Jours = new Date(maintenant.getTime() - 30 * 24 * 3600 * 1000);

      const [pages, articles, entreprises, offres, evenementsAVenir, inscriptions30j, prochains, recentes, parametres] = await Promise.all([
        db(UID.page).count({ where: publies }),
        db(UID.article).count({ where: publies }),
        db(UID.entreprise).count({ where: publies }),
        db(UID.offre).count({}),
        db(UID.evenement).count({ where: { ...publies, dateDebut: { $gte: maintenant } } }),
        db(UID.inscription).count({ where: { createdAt: { $gte: il30Jours }, statut: 'confirmee' } }),
        db(UID.evenement).findMany({
          where: { ...publies, dateDebut: { $gte: maintenant } },
          orderBy: { dateDebut: 'asc' },
          limit: 5,
          select: ['documentId', 'titre', 'slug', 'dateDebut', 'placesMax', 'inscriptionActive', 'inscriptionExterneUrl'],
        }),
        db(UID.inscription).findMany({
          orderBy: { createdAt: 'desc' },
          limit: 5,
          select: ['documentId', 'prenom', 'nom', 'createdAt'],
          populate: { evenement: { select: ['titre'] } },
        }),
        db(UID.parametres).findOne({
          select: ['nomSite', 'gestmaxUrlFront', 'couleurPrimaire', 'email', 'telephone'],
          populate: { logo: { select: ['id'] } },
        }),
      ]);

      // Nombre d'inscrits par événement (version publiée, comme sur le site).
      const evenements = await Promise.all(
        prochains.map(async (e: any) => ({
          ...e,
          inscrits: await strapi.documents(UID.inscription).count({ filters: { evenement: { documentId: e.documentId }, statut: 'confirmee' } }),
        })),
      );

      ctx.body = {
        nomSite: parametres?.nomSite ?? 'Mon site',
        urlSite: urlSite(),
        compteurs: { pages, articles, entreprises, offres, evenementsAVenir, inscriptions30j },
        prochainsEvenements: evenements,
        inscriptionsRecentes: recentes.map((i: any) => ({
          documentId: i.documentId,
          nom: `${i.prenom} ${i.nom.charAt(0)}.`,
          evenement: i.evenement?.titre ?? null,
          createdAt: i.createdAt,
        })),
        site: await etatBuilder(),
        gestmax: { ...(await lireDerniereSynchro(strapi)), mock: strapi.config.get('gestmax.mock'), urlFront: parametres?.gestmaxUrlFront ?? null },
        demarrage: await listeDemarrage(parametres, { pages, articles, entreprises, evenementsAVenir }),
      };
    },

    async offres(ctx: any) {
      const toutes = await db(UID.offre).findMany({
        select: ['documentId', 'titre', 'slug', 'typeContrat', 'lieu', 'nomEntreprise', 'dateActivation', 'dateFinPublication', 'urlDetailGestmax'],
        populate: { entreprise: { select: ['documentId', 'nom'] } },
        orderBy: { dateActivation: 'desc' },
      });
      const compter = (cle: (o: any) => string | null) =>
        Object.entries(
          toutes.reduce((acc: Record<string, number>, o: any) => {
            const k = cle(o) ?? 'Non renseigné';
            acc[k] = (acc[k] ?? 0) + 1;
            return acc;
          }, {}),
        )
          .map(([libelle, nombre]) => ({ libelle, nombre }))
          .sort((a, b) => b.nombre - a.nombre);
      const parametres = await db(UID.parametres).findOne({ select: ['gestmaxUrlFront'] });

      ctx.body = {
        total: toutes.length,
        parContrat: compter((o) => o.typeContrat),
        parEntreprise: compter((o) => o.nomEntreprise).slice(0, 8),
        nonRattachees: toutes.filter((o: any) => !o.entreprise).length,
        dernieres: toutes.slice(0, 15),
        synchro: await lireDerniereSynchro(strapi),
        mock: strapi.config.get('gestmax.mock'),
        frequence: process.env.GESTMAX_SYNC_CRON ?? '*/30 * * * *',
        urlFront: parametres?.gestmaxUrlFront ?? null,
        urlSite: urlSite(),
      };
    },

    async synchroniserOffres(ctx: any) {
      try {
        ctx.body = await strapi.service('api::offre.offre').synchroniserDepuisGestmax();
      } catch (e) {
        ctx.status = 502;
        ctx.body = { statut: 'erreur', message: (e as Error).message };
      }
    },

    async regenererSite(ctx: any) {
      const reponse = await fetch(`${urlBuilder()}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.BUILD_TOKEN ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'manuel', model: 'back-office' }),
      }).catch(() => null);
      ctx.body = { planifie: !!reponse?.ok };
    },

    async lireApparence(ctx: any) {
      const p = await strapi.documents(UID.parametres).findFirst({ populate: { logo: true } } as any);
      ctx.body = { ...p, urlSite: urlSite() };
    },

    async enregistrerApparence(ctx: any) {
      const corps = ctx.request.body ?? {};
      const data: Record<string, unknown> = Object.fromEntries(CHAMPS_APPARENCE.filter((c) => c in corps).map((c) => [c, corps[c]]));
      if ('logo' in corps) data.logo = corps.logo ?? null;

      const existant = await strapi.documents(UID.parametres).findFirst();
      try {
        // Passe par le service documents : le contrôle des contrastes RGAA s'applique.
        const resultat = existant
          ? await strapi.documents(UID.parametres).update({ documentId: existant.documentId, data } as any)
          : await strapi.documents(UID.parametres).create({ data } as any);
        ctx.body = resultat;
      } catch (e: any) {
        ctx.status = 400;
        ctx.body = { error: { message: e.message } };
      }
    },
  };
};
