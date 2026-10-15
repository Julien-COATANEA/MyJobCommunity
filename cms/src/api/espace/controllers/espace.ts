import type { Core } from '@strapi/strapi';
import { lireDerniereSynchro } from '../../../utils/synchro';
import { OFFRES_VISIBLES } from '../../../utils/garde-offres';
import { rattacher } from '../../../utils/rattachement';
import { PAGES_LEGALES } from '../../../utils/infos-legales';

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
const entierRequete = (v: unknown, defaut: number, min: number, max: number) => {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaut;
};
const texteRequete = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 100) : '');
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
  // Types sans brouillon (événements, entreprises) : tout est publié, pas de filtre à appliquer.
  const avecBrouillon = (uid: string) => !!(strapi.contentTypes as any)[uid]?.options?.draftAndPublish;
  const publies = { publishedAt: { $notNull: true } };
  const pub = (uid: string) => (avecBrouillon(uid) ? publies : {});

  /** « Votre site est prêt à X % » : étapes de mise en route d'une nouvelle collectivité. */
  const listeDemarrage = async (p: any, c: { pages: number; articles: number; entreprises: number; evenementsAVenir: number }) => {
    const navigation: any = await strapi.documents('api::navigation.navigation').findFirst({ populate: { menuPrincipal: true } } as any);
    const pagesLegales = await db(UID.page).count({ where: { ...publies, slug: { $in: [...PAGES_LEGALES] } } });
    const cm = (uid: string, unique = false) => `/content-manager/${unique ? 'single' : 'collection'}-types/${uid}`;
    return [
      { cle: 'logo', libelle: 'Déposer votre logo et choisir vos couleurs', fait: !!p?.logo && p?.couleurPrimaire !== '#1a5f7a', lien: '/apparence' },
      { cle: 'coordonnees', libelle: 'Renseigner vos coordonnées', fait: !!(p?.email && p?.telephone), lien: cm('api::parametres.parametres', true) },
      { cle: 'menu', libelle: 'Construire le menu du site', fait: (navigation?.menuPrincipal?.length ?? 0) > 0, lien: cm('api::navigation.navigation', true) },
      { cle: 'carriere', libelle: 'Relier votre site Gestmax', fait: !!p?.gestmaxUrlFront, lien: '/site-carriere' },
      { cle: 'legal', libelle: 'Compléter les informations légales et publier les pages légales', fait: pagesLegales >= PAGES_LEGALES.length, lien: cm(UID.page) },
      { cle: 'entreprises', libelle: "Présenter au moins 3 entreprises dans l'annuaire", fait: c.entreprises >= 3, lien: cm(UID.entreprise) },
      { cle: 'articles', libelle: 'Publier vos 3 premiers articles', fait: c.articles >= 3, lien: cm(UID.article) },
      { cle: 'evenement', libelle: 'Annoncer un événement', fait: c.evenementsAVenir >= 1, lien: cm(UID.evenement) },
    ];
  };

  // ---------- Écran « Mes offres d'emploi » : agrégats SQL et listes paginées ----------

  // Métadonnées lues à l'appel : la base n'est pas encore initialisée quand le contrôleur est créé.
  type Lien = { name: string; joinColumn: { name: string }; inverseJoinColumn: { name: string } };
  const meta = () => strapi.db.metadata.get(UID.offre) as any;
  const colonne = (attribut: string): string => meta().attributes[attribut].columnName;
  // Même normalisation que normaliserNom (rattachement.ts), comparée à l'octet près comme le fait le JS.
  const CLE_NOM = "LOWER(REGEXP_REPLACE(TRIM(??), '[[:space:]]+', ' ')) COLLATE utf8mb4_bin";
  const nomRenseigne = (q: any, col: string) => q.whereNotNull(col).whereRaw('TRIM(??) <> ?', [col, '']);
  const visibles = (q: any, col = colonne('masquee')) => q.where((w: any) => w.whereNull(col).orWhere(col, false));
  const comme = (terme: string) => `%${terme.replace(/[\\%_]/g, '\\$&')}%`;

  const syntheseOffres = async () => {
    const knex = strapi.db.connection;
    const metaOffre = meta();
    const lien: Lien = metaOffre.attributes.entreprise.joinTable;
    const cMasquee = `o.${colonne('masquee')}`;
    const cNom = `o.${colonne('nomEntreprise')}`;
    const nombre = knex.raw('COUNT(*) as nombre');
    const [[totaux], parContrat, parEntreprise, [sansFiche], parametres, annuaire, synchro] = await Promise.all([
      knex(`${metaOffre.tableName} as o`).select(
        knex.raw('COUNT(*) as total'),
        knex.raw('COALESCE(SUM(?? = 1), 0) as masquees', [cMasquee]),
        knex.raw('COALESCE(SUM((?? IS NULL OR ?? = 0) AND ?? = 1), 0) as a_la_une', [cMasquee, cMasquee, `o.${colonne('aLaUne')}`]),
      ),
      visibles(knex(`${metaOffre.tableName} as o`), cMasquee)
        .select(knex.raw('COALESCE(??, ?) as libelle', [`o.${colonne('typeContrat')}`, 'Non renseigné']), nombre)
        .groupBy('libelle').orderBy('nombre', 'desc').orderBy('libelle').limit(50),
      nomRenseigne(visibles(knex(`${metaOffre.tableName} as o`), cMasquee), cNom)
        .select(knex.raw('MIN(TRIM(??)) as libelle', [cNom]), nombre)
        .groupByRaw(CLE_NOM, [cNom]).orderBy('nombre', 'desc').orderBy('libelle').limit(8),
      visibles(knex(`${metaOffre.tableName} as o`), cMasquee)
        .whereNotExists(knex(lien.name).select(knex.raw('1')).whereRaw('?? = ??', [`${lien.name}.${lien.joinColumn.name}`, 'o.id']))
        .count({ n: '*' }),
      db(UID.parametres).findOne({ select: ['gestmaxUrlFront'] }),
      db(UID.entreprise).findMany({ select: ['documentId', 'nom'], orderBy: { nom: 'asc' }, limit: 5000 }),
      lireDerniereSynchro(strapi),
    ]);
    const masquees = Number(totaux.masquees);
    return {
      total: Number(totaux.total) - masquees,
      masquees,
      alaUne: Number(totaux.a_la_une),
      parContrat: parContrat.map((l: any) => ({ libelle: l.libelle, nombre: Number(l.nombre) })),
      parEntreprise: parEntreprise.map((l: any) => ({ libelle: l.libelle, nombre: Number(l.nombre) })),
      nonRattachees: Number((sansFiche as any).n),
      annuaire,
      synchro,
      mock: strapi.config.get('gestmax.mock'),
      frequence: process.env.GESTMAX_SYNC_CRON ?? '*/30 * * * *',
      urlFront: (parametres as any)?.gestmaxUrlFront ?? null,
      urlSite: urlSite(),
    };
  };

  const listeOffres = async (query: any) => {
    const taille = entierRequete(query.pageSize, 25, 1, 100);
    const terme = texteRequete(query.q);
    const where = terme
      ? { $or: [{ titre: { $containsi: terme } }, { nomEntreprise: { $containsi: terme } }, { lieu: { $containsi: terme } }] }
      : {};
    const tri = texteRequete(query.tri);
    const orderBy =
      tri === 'anciennes' ? [{ dateActivation: 'asc' }, { id: 'asc' }]
      : tri === 'titre' ? [{ titre: 'asc' }, { id: 'asc' }]
      : [{ aLaUne: 'desc' }, { dateActivation: 'desc' }, { id: 'desc' }];
    const pageDemandee = entierRequete(query.page, 1, 1, 1e9);
    const pageDe = (n: number) =>
      db(UID.offre).findMany({
        where,
        select: ['documentId', 'titre', 'slug', 'typeContrat', 'lieu', 'nomEntreprise', 'dateActivation', 'dateFinPublication', 'urlDetailGestmax', 'aLaUne', 'masquee'],
        populate: { entreprise: { select: ['documentId', 'nom'] } },
        orderBy: orderBy as any,
        limit: taille,
        offset: (n - 1) * taille,
      });
    // Total et page en parallèle : la page n'est redemandée que si elle dépasse la dernière.
    const [total, premiere] = await Promise.all([db(UID.offre).count({ where }), pageDe(pageDemandee)]);
    const pageCount = Math.max(1, Math.ceil(total / taille));
    const page = Math.min(pageDemandee, pageCount);
    const liste = page === pageDemandee ? premiere : await pageDe(page);
    return { liste, total, page, pageCount };
  };

  /** Noms d'entreprise Gestmax (regroupés par nom normalisé) et fiche de l'annuaire couplée : non couplés d'abord, puis par nombre d'offres. */
  const listeEntreprisesOffres = async (query: any) => {
    const knex = strapi.db.connection;
    const metaOffre = meta();
    const lien: Lien = metaOffre.attributes.entreprise.joinTable;
    const taille = entierRequete(query.pageSizeEntreprises, 25, 1, 100);
    const terme = texteRequete(query.qEntreprise);
    const cNom = `o.${colonne('nomEntreprise')}`;
    const cLien = `l.${lien.inverseJoinColumn.name}`;
    const groupes = () => {
      const q = nomRenseigne(knex(`${metaOffre.tableName} as o`).leftJoin(`${lien.name} as l`, `l.${lien.joinColumn.name}`, 'o.id'), cNom);
      if (terme) q.whereRaw('?? LIKE ?', [cNom, comme(terme)]);
      q.groupByRaw(CLE_NOM, [cNom]);
      if (query.seulementNonCouplees === 'true') q.havingRaw('MAX(??) IS NULL', [cLien]);
      return q;
    };
    const pageDemandee = entierRequete(query.pageEntreprises, 1, 1, 1e9);
    const pageDe = (n: number) =>
      groupes()
        .select(knex.raw('MIN(TRIM(??)) as nom', [cNom]), knex.raw('COUNT(*) as nombre'), knex.raw('MAX(??) as entreprise_id', [cLien]))
        .orderByRaw('(MAX(??) IS NOT NULL) ASC, COUNT(*) DESC, MIN(TRIM(??)) ASC', [cLien, cNom])
        .limit(taille).offset((n - 1) * taille) as Promise<any[]>;
    // Total et page en parallèle : la page n'est redemandée que si elle dépasse la dernière.
    const [comptage, premiere] = await Promise.all([
      knex.count({ total: '*' }).from(groupes().select(knex.raw('1 as un')).as('g')) as Promise<any[]>,
      pageDe(pageDemandee),
    ]);
    const total = Number(comptage[0].total);
    const pageCount = Math.max(1, Math.ceil(total / taille));
    const page = Math.min(pageDemandee, pageCount);
    const lignes: any[] = page === pageDemandee ? premiere : await pageDe(page);
    const ids = [...new Set(lignes.map((l) => l.entreprise_id).filter((id) => id != null))];
    const fiches: any[] = ids.length ? await db(UID.entreprise).findMany({ where: { id: { $in: ids } }, select: ['id', 'documentId', 'nom'] }) : [];
    const parId = new Map(fiches.map((f) => [f.id, { documentId: f.documentId, nom: f.nom }]));
    return {
      liste: lignes.map((l) => ({ nom: l.nom, nombre: Number(l.nombre), entreprise: parId.get(l.entreprise_id) ?? null })),
      total,
      page,
      pageCount,
    };
  };

  return {
    async tableauDeBord(ctx: any) {
      const maintenant = new Date();
      const il30Jours = new Date(maintenant.getTime() - 30 * 24 * 3600 * 1000);

      const [pages, articles, entreprises, offres, evenementsAVenir, inscriptions30j, prochains, recentes, parametres] = await Promise.all([
        db(UID.page).count({ where: publies }),
        db(UID.article).count({ where: publies }),
        db(UID.entreprise).count({ where: pub(UID.entreprise) }),
        db(UID.offre).count({ where: OFFRES_VISIBLES }),
        db(UID.evenement).count({ where: { ...pub(UID.evenement), dateDebut: { $gte: maintenant } } }),
        db(UID.inscription).count({ where: { createdAt: { $gte: il30Jours }, statut: 'confirmee' } }),
        db(UID.evenement).findMany({
          where: { ...pub(UID.evenement), dateDebut: { $gte: maintenant } },
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

    /**
     * Écran « Mes offres d'emploi » : tout est calculé en SQL (90 000 offres) et paginé côté serveur.
     * Query : sections (synthese,offres,entreprises ; toutes par défaut), page/pageSize + q + tri (offres),
     * pageEntreprises/pageSizeEntreprises + qEntreprise + seulementNonCouplees (entreprises).
     */
    async offres(ctx: any) {
      const demandees = new Set(texteRequete(ctx.query.sections).split(',').map((s) => s.trim()).filter(Boolean));
      const veut = (section: string) => !demandees.size || demandees.has(section);
      // Sections indépendantes : calculées en parallèle.
      const [synthese, offres, entreprisesOffres] = await Promise.all([
        veut('synthese') ? syntheseOffres() : null,
        veut('offres') ? listeOffres(ctx.query) : null,
        veut('entreprises') ? listeEntreprisesOffres(ctx.query) : null,
      ]);
      ctx.body = { ...(synthese ?? {}), ...(offres ? { offres } : {}), ...(entreprisesOffres ? { entreprisesOffres } : {}) };
    },

    /** « À la une » et « masquée » : les deux seuls réglages éditoriaux d'une offre (le reste vient de Gestmax). */
    async reglerOffre(ctx: any) {
      const corps = ctx.request.body ?? {};
      const data: Record<string, boolean> = {};
      for (const cle of ['aLaUne', 'masquee'] as const) if (typeof corps[cle] === 'boolean') data[cle] = corps[cle];
      if (!Object.keys(data).length) {
        ctx.status = 400;
        ctx.body = { error: { message: 'Aucun réglage reconnu.' } };
        return;
      }
      // Masquer une offre la retire aussi de la une.
      if (data.masquee) data.aLaUne = false;
      await strapi.documents(UID.offre).update({ documentId: ctx.params.documentId, data } as any);
      ctx.body = data;
    },

    /** Couple le nom d'entreprise Gestmax des offres avec une fiche de l'annuaire (documentId null : découple). */
    async rattacherEntreprise(ctx: any) {
      const { nomEntreprise, entreprise } = ctx.request.body ?? {};
      if (typeof nomEntreprise !== 'string' || !nomEntreprise.trim()) return ctx.badRequest('Nom d’entreprise manquant.');
      if (entreprise !== null && typeof entreprise !== 'string') return ctx.badRequest('Fiche entreprise invalide.');
      // « ; » sépare plusieurs noms dans « Nom dans Gestmax » : un nom qui en contient serait découpé au passage suivant.
      if (nomEntreprise.includes(';')) return ctx.badRequest('Le nom d’entreprise ne doit pas contenir de « ; ».');
      try {
        // Après une éventuelle synchronisation en cours : elle réécrirait sinon l'ancien rattachement.
        ctx.body = await strapi.service('api::offre.offre').apresSynchro(() => rattacher(strapi, nomEntreprise, entreprise));
      } catch (e) {
        return ctx.badRequest((e as Error).message);
      }
    },

    async synchroniserOffres(ctx: any) {
      try {
        // « Forcer » : passe outre le garde-fou d'une forte baisse du nombre d'offres.
        ctx.body = await strapi.service('api::offre.offre').synchroniserDepuisGestmax({ forcer: ctx.request.body?.forcer === true });
      } catch (e) {
        // Format d'erreur de Strapi : l'interface n'affiche sinon qu'« Unknown Server Error ».
        ctx.status = 502;
        ctx.body = { data: null, statut: 'erreur', message: (e as Error).message, error: { status: 502, name: 'GestmaxError', message: (e as Error).message, details: {} } };
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
