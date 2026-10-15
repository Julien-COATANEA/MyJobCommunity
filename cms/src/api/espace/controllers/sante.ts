// « Santé du site » : tout ce qui demande l'attention de la collectivité, au même endroit.
import { CHAMPS_LEGAUX, PAGES_LEGALES, infosLegalesManquantes } from '../../../utils/infos-legales';
import type { Core } from '@strapi/strapi';
import { OFFRES_VISIBLES } from '../../../utils/garde-offres';
import { trouverLiensCasses } from '../../../utils/liens';
import { lireDerniereSynchro } from '../../../utils/synchro';

type Statut = 'ok' | 'attention' | 'erreur';
interface Controle {
  cle: string;
  libelle: string;
  statut: Statut;
  detail: string;
  /** Éléments concernés (jusqu'à 10) : titre + lien pour les corriger. */
  elements?: { titre: string; precision?: string; lien?: string }[];
  lien?: string;
  libelleLien?: string;
}

const JOUR = 24 * 3600 * 1000;
const ilYAJours = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / JOUR);

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const db = (uid: string) => strapi.db.query(uid as any);

  /** Images utilisées sur le site sans texte alternatif (hors logos, décoratifs ou nommés par le site). */
  const imagesSansAlt = async () => {
    const lignes: any[] = await strapi.db.connection.raw(
      `select distinct f.id, f.name, r.related_type as type, r.field as champ
         from files f join files_related_mph r on r.file_id = f.id
        where (f.alternative_text is null or f.alternative_text = '')
          and r.related_type like 'api::%' and r.field in ('image', 'imageBandeau', 'photo', 'heroImage')
        limit 50`,
    ).then((r: any) => (Array.isArray(r[0]) ? r[0] : r));
    const vues = new Map<number, any>();
    for (const l of lignes) vues.set(l.id, l);
    return [...vues.values()];
  };

  const controles = async (): Promise<Controle[]> => {
    const resultats: Controle[] = [];
    const ajouter = (c: Controle) => resultats.push(c);

    // 1. Synchronisation Gestmax
    const synchro = await lireDerniereSynchro(strapi);
    const mock = strapi.config.get('gestmax.mock');
    if (!synchro.date) {
      ajouter({ cle: 'synchro', libelle: 'Synchronisation Gestmax', statut: 'attention', detail: "Aucune synchronisation n'a encore eu lieu.", lien: '/mes-offres', libelleLien: 'Voir mes offres' });
    } else if (synchro.statut === 'erreur') {
      ajouter({ cle: 'synchro', libelle: 'Synchronisation Gestmax', statut: 'erreur', detail: `Échec : ${synchro.erreur}. Les offres déjà en ligne restent affichées.`, lien: '/mes-offres', libelleLien: 'Voir mes offres' });
    } else if (ilYAJours(synchro.date) >= 1) {
      ajouter({ cle: 'synchro', libelle: 'Synchronisation Gestmax', statut: 'attention', detail: `Dernière synchronisation il y a ${ilYAJours(synchro.date)} jours.`, lien: '/mes-offres', libelleLien: 'Voir mes offres' });
    } else {
      ajouter({ cle: 'synchro', libelle: 'Synchronisation Gestmax', statut: 'ok', detail: mock ? 'Données de démonstration (pas de connexion à Gestmax).' : 'Les offres sont à jour.' });
    }

    // 2. Offres non rattachées à l'annuaire (requêtes agrégées : des dizaines de milliers d'offres ne se chargent pas en mémoire)
    const connexion = strapi.db.connection;
    const visibleSql = (q: any) => q.where((w: any) => w.whereNull('o.masquee').orWhere('o.masquee', false));
    const sansFicheLignes: any[] = await visibleSql(connexion('offre as o').leftJoin('offre_entreprise_lnk as l', 'l.offre_id', 'o.id'))
      .whereNull('l.offre_id').whereNotNull('o.nom_entreprise').where('o.nom_entreprise', '<>', '')
      // Même regroupement que « Mes offres d'emploi » (casse et espaces ignorés, comparaison binaire).
      .groupByRaw("LOWER(REGEXP_REPLACE(TRIM(o.nom_entreprise), '[[:space:]]+', ' ')) COLLATE utf8mb4_bin")
      .select(connexion.raw('MIN(o.nom_entreprise) as nom')).count('* as offres').orderBy('offres', 'desc').limit(1001);
    const sansFiche = sansFicheLignes.map((l) => l.nom as string);
    ajouter(
      sansFiche.length
        ? {
            cle: 'offres-sans-fiche', libelle: "Entreprises sans fiche dans l'annuaire", statut: 'attention',
            detail: `${sansFiche.length > 1000 ? 'Plus de 1 000' : sansFiche.length} entreprise${sansFiche.length > 1 ? 's ont' : ' a'} des offres en ligne mais pas de fiche : les candidats ne peuvent pas la découvrir. Créez les fiches des plus gros recruteurs, puis couplez-les depuis « Mes offres d'emploi ».`,
            elements: sansFicheLignes.slice(0, 10).map((l) => ({ titre: l.nom, precision: `${l.offres} offre${Number(l.offres) > 1 ? 's' : ''}`, lien: '/content-manager/collection-types/api::entreprise.entreprise/create' })),
            lien: '/mes-offres', libelleLien: 'Coupler les entreprises',
          }
        : { cle: 'offres-sans-fiche', libelle: "Entreprises sans fiche dans l'annuaire", statut: 'ok', detail: 'Toutes les entreprises qui recrutent ont leur fiche.' },
    );

    // 3. Offres qui expirent bientôt
    const maintenant = new Date();
    const dans7j = new Date(Date.now() + 7 * JOUR);
    const bientotBase = () => visibleSql(connexion('offre as o')).whereBetween('o.date_fin_publication', [maintenant, dans7j]);
    const nbBientot = Number((await bientotBase().count('* as n').first())?.n ?? 0);
    if (nbBientot) {
      const echeances: any[] = await bientotBase().select('o.titre', 'o.nom_entreprise').orderBy('o.date_fin_publication', 'asc').limit(10);
      ajouter({ cle: 'offres-expirent', libelle: 'Offres bientôt expirées', statut: 'attention', detail: `${nbBientot} offre${nbBientot > 1 ? 's' : ''} se termine${nbBientot > 1 ? 'nt' : ''} dans moins de 7 jours (à renouveler dans Gestmax si besoin).`, elements: echeances.map((o) => ({ titre: o.titre, precision: o.nom_entreprise })) });
    }

    // 4. Événements proches avec peu d'inscrits
    const dans14j = new Date(Date.now() + 14 * JOUR);
    const evenements: any[] = await db('api::evenement.evenement').findMany({ where: { dateDebut: { $gte: new Date(), $lte: dans14j }, inscriptionActive: true } });
    const faibles: Controle['elements'] = [];
    for (const e of evenements) {
      if (e.inscriptionExterneUrl || !e.placesMax) continue;
      const inscrits = await db('api::inscription.inscription').count({ where: { evenement: { documentId: e.documentId }, statut: 'confirmee' } });
      if (inscrits < e.placesMax * 0.2) {
        faibles.push({ titre: e.titre, precision: `${inscrits} / ${e.placesMax} inscrits, le ${new Date(e.dateDebut).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })}`, lien: `/content-manager/collection-types/api::evenement.evenement/${e.documentId}` });
      }
    }
    if (faibles.length) {
      ajouter({ cle: 'evenements-faibles', libelle: 'Événements peu remplis', statut: 'attention', detail: 'Ces événements ont lieu dans moins de 15 jours et sont remplis à moins de 20 %. Pensez à les relayer.', elements: faibles });
    }

    // 5. Images sans texte alternatif
    const images = await imagesSansAlt();
    ajouter(
      images.length
        ? {
            cle: 'images-alt', libelle: 'Images sans texte alternatif', statut: 'attention',
            detail: `${images.length} image${images.length > 1 ? 's' : ''} utilisée${images.length > 1 ? 's' : ''} sur le site n'ont pas de description pour les personnes aveugles (obligation d'accessibilité RGAA). À renseigner dans la médiathèque.`,
            elements: images.slice(0, 10).map((i) => ({ titre: i.name, lien: '/plugins/upload' })),
            lien: '/plugins/upload', libelleLien: 'Ouvrir la médiathèque',
          }
        : { cle: 'images-alt', libelle: 'Images sans texte alternatif', statut: 'ok', detail: 'Toutes les images ont une description.' },
    );

    // 6. Liens internes cassés
    const casses = await trouverLiensCasses(strapi);
    ajouter(
      casses.length
        ? {
            cle: 'liens-casses', libelle: 'Liens vers des pages qui n’existent plus', statut: 'erreur',
            detail: `${casses.length} lien${casses.length > 1 ? 's mènent' : ' mène'} vers une page inexistante : les visiteurs arriveraient sur une erreur 404.`,
            elements: casses.slice(0, 10).map((c) => ({ titre: `${c.type} « ${c.titre} »`, precision: `${c.url} (${c.lien})`, lien: c.modifier })),
          }
        : { cle: 'liens-casses', libelle: 'Liens internes', statut: 'ok', detail: 'Aucun lien ne mène vers une page inexistante.' },
    );

    // 7. Brouillons oubliés
    const anciens: any[] = [];
    for (const uid of ['api::page.page', 'api::article.article']) {
      const lignes: any[] = await db(uid).findMany({ where: { publishedAt: { $null: true }, updatedAt: { $lt: new Date(Date.now() - 14 * JOUR) } }, select: ['documentId', 'titre', 'updatedAt'] });
      const publies = new Set((await db(uid).findMany({ where: { publishedAt: { $notNull: true } }, select: ['documentId'] })).map((x: any) => x.documentId));
      for (const l of lignes) if (!publies.has(l.documentId)) anciens.push({ uid, ...l });
    }
    if (anciens.length) {
      ajouter({
        cle: 'brouillons-oublies', libelle: 'Brouillons jamais publiés', statut: 'attention',
        detail: `${anciens.length} brouillon${anciens.length > 1 ? 's' : ''} n'ont pas bougé depuis plus de 2 semaines.`,
        elements: anciens.slice(0, 10).map((a) => ({ titre: a.titre, precision: `modifié il y a ${ilYAJours(a.updatedAt)} jours`, lien: `/content-manager/collection-types/${a.uid}/${a.documentId}` })),
      });
    }

    // 8. Adresse de notification
    const parametres: any = await db('api::parametres.parametres').findOne({ select: ['emailNotificationInscriptions', 'email'] });
    ajouter(
      parametres?.emailNotificationInscriptions
        ? { cle: 'notification', libelle: 'Adresse de notification', statut: 'ok', detail: 'Les inscriptions et les alertes sont envoyées à votre adresse de notification.' }
        : { cle: 'notification', libelle: 'Adresse de notification', statut: 'attention', detail: "Aucune adresse n'est renseignée : vous ne serez pas prévenu des inscriptions ni d'un problème de synchronisation.", lien: '/content-manager/single-types/api::parametres.parametres', libelleLien: 'Renseigner l’adresse' },
    );

    // 9. Informations légales et pages légales
    const legal: any = await db('api::parametres.parametres').findOne({ select: CHAMPS_LEGAUX.map((c) => c.champ) });
    const manquantes = infosLegalesManquantes(legal);
    const pagesLegalesPubliees: any[] = await db('api::page.page').findMany({ where: { publishedAt: { $notNull: true }, slug: { $in: [...PAGES_LEGALES] } }, select: ['slug'] });
    const lienInfos = '/content-manager/single-types/api::parametres.parametres';
    if (manquantes.length) {
      ajouter({
        cle: 'infos-legales', libelle: 'Informations légales', statut: pagesLegalesPubliees.length ? 'erreur' : 'attention',
        detail: pagesLegalesPubliees.length
          ? `Des pages légales sont en ligne, mais ${manquantes.length} information${manquantes.length > 1 ? 's' : ''} manque${manquantes.length > 1 ? 'nt' : ''} : « [à compléter] » s’affiche sur le site.`
          : `Complétez ${manquantes.length} information${manquantes.length > 1 ? 's' : ''} avant de publier les mentions légales et la politique de confidentialité.`,
        elements: manquantes.map((titre) => ({ titre, lien: lienInfos })),
        lien: lienInfos, libelleLien: 'Compléter les informations',
      });
    } else {
      ajouter({ cle: 'infos-legales', libelle: 'Informations légales', statut: 'ok', detail: 'Les mentions légales et la politique de confidentialité se remplissent avec vos informations.' });
    }
    return resultats;
  };

  return {
    async sante(ctx: any) {
      const liste = await controles();
      ctx.set('Cache-Control', 'no-store');
      ctx.body = {
        date: new Date().toISOString(),
        controles: liste,
        aTraiter: liste.filter((c) => c.statut !== 'ok').length,
        erreurs: liste.filter((c) => c.statut === 'erreur').length,
      };
    },
  };
};
