import { join } from 'node:path';
import { factories, type Core } from '@strapi/strapi';
import { executerSynchro } from '../../../utils/garde-offres';
import { convertirOffre, estCandidatureSpontanee, recupererOffresGestmax, type ConfigGestmax } from '../../../utils/gestmax';
import { enregistrerSynchro, memoriserSource } from '../../../utils/synchro';
import { creerGeocodeur } from '../../../utils/geocodage';
import { indexEntreprises, normaliserNom } from '../../../utils/rattachement';

const UID = 'api::offre.offre';
// Baisse au-delà de laquelle la synchronisation s'arrête (mauvais paramétrage, droits retirés, panne de Gestmax…).
const BAISSE_MAX = 0.5;
// Écritures simultanées pendant la synchronisation.
const SIMULTANES = 8;

/** Exécute `travail` sur chaque élément, `n` à la fois. */
async function enParallele<T>(elements: T[], n: number, travail: (e: T) => Promise<void>) {
  let prochain = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, elements.length) }, async () => {
      while (prochain < elements.length) await travail(elements[prochain++]);
    }),
  );
}

// Synchronisation et couplage manuel passent l'un après l'autre (cron, démarrage, bouton du BO, API) : deux
// synchronisations simultanées créeraient des doublons, et une synchronisation lancée pendant un couplage réécrirait
// l'ancien rattachement.
let file: Promise<unknown> = Promise.resolve();
const exclusif = <T>(travail: () => Promise<T>): Promise<T> => {
  const resultat = file.then(travail, travail);
  file = resultat.catch(() => {});
  return resultat;
};
let synchroEnAttente: Promise<unknown> | null = null;

export default factories.createCoreService(UID, ({ strapi }) => ({
  /**
   * Importe les offres en ligne de Gestmax : crée, met à jour et supprime pour refléter l'ATS.
   * C'est le SEUL chemin d'écriture sur les offres (voir utils/garde-offres.ts). Les réglages « à la une » et
   * « masquée » ne font pas partie des données importées : ils sont conservés d'une synchronisation à l'autre.
   */
  synchroniserDepuisGestmax(options: { forcer?: boolean } = {}) {
    // Une synchronisation normale déjà prévue suffit ; « Forcer » passe toujours (après celle en cours).
    if (synchroEnAttente && !options.forcer) return synchroEnAttente;
    const promesse = exclusif(() => executerSynchro(() => synchroniser(strapi, !!options.forcer)));
    synchroEnAttente = promesse;
    promesse.finally(() => { if (synchroEnAttente === promesse) synchroEnAttente = null; }).catch(() => {});
    return promesse;
  },

  /** Exécute `travail` hors de toute synchronisation (rattachement manuel d'une entreprise, par exemple). */
  apresSynchro<T>(travail: () => Promise<T>): Promise<T> {
    return exclusif(travail);
  },
}));

async function synchroniser(strapi: Core.Strapi, forcer: boolean) {
  {
    const conf = strapi.config.get('gestmax') as ConfigGestmax;
    if (!conf.mock && !(conf.url && conf.user)) {
      strapi.log.debug('[gestmax] synchronisation désactivée (GESTMAX_URL / GESTMAX_REST_USER absents)');
      return { statut: 'desactivee' };
    }

    const debut = Date.now();
    let brutes;
    try {
      brutes = await recupererOffresGestmax(conf, join(strapi.dirs.app.root, 'data'));
    } catch (e) {
      await enregistrerSynchro(strapi, { statut: 'erreur', erreur: (e as Error).message });
      throw e;
    }
    const offres = brutes.filter((v) => !estCandidatureSpontanee(v)).map((v) => convertirOffre(v, conf));

    // Rattachement à l'annuaire via le nom de l'entité Gestmax (customer_company), voir utils/rattachement.
    const entrepriseParNom = await indexEntreprises(strapi);

    const existantes = await strapi.db.query(UID).findMany({
      select: ['documentId', 'sourceId', 'empreinte', 'latitude'],
      populate: { entreprise: { select: ['documentId'] } },
    });

    // Garde-fou : une réponse vide ou une forte baisse supprimerait les offres du site (et leurs réglages).
    if (!forcer && existantes.length) {
      const erreur = !offres.length
        ? 'Gestmax n’a renvoyé aucune offre alors que le site en compte : synchronisation arrêtée par sécurité.'
        : offres.length < existantes.length * (1 - BAISSE_MAX)
          ? `Gestmax n’a renvoyé que ${offres.length} offres (${existantes.length} sur le site) : synchronisation arrêtée par sécurité.`
          : null;
      if (erreur) {
        await enregistrerSynchro(strapi, { statut: 'erreur', erreur: `${erreur} Si c’est normal, lancez « Forcer la synchronisation » dans Mes offres d’emploi.` });
        throw new Error(erreur);
      }
    }

    const geocodeur = await creerGeocodeur(strapi);
    const villes = await geocodeur.preparer(offres);
    if (villes) strapi.log.info(`[gestmax] ${villes} ville(s) géocodée(s)`);
    const parSourceId = new Map(existantes.map((o: any) => [o.sourceId, o]));

    const bilan = { statut: 'ok', total: offres.length, creees: 0, modifiees: 0, supprimees: 0, dureeMs: 0 };
    const vues = new Set<string>();
    const echecs: string[] = [];

    // Écritures en parallèle (la base de Strapi n'est pas le goulot) ; l'avancement est écrit dans les logs.
    let traitees = 0;
    await enParallele(offres, SIMULTANES, async (offre) => {
      vues.add(offre.sourceId);
      try {
        const entreprise = offre.nomEntreprise ? entrepriseParNom.get(normaliserNom(offre.nomEntreprise)) ?? null : null;
        const position = await geocodeur.positionner(offre.lieu, offre.departement);
        const data: any = { ...offre, entreprise, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null };
        const existante: any = parSourceId.get(offre.sourceId);

        if (!existante) {
          await strapi.documents(UID).create({ data });
          bilan.creees++;
        } else if (
          existante.empreinte !== offre.empreinte ||
          (position && existante.latitude == null) ||
          // Fiche entreprise créée ou « Nom dans Gestmax » modifié depuis le dernier passage.
          (existante.entreprise?.documentId ?? null) !== entreprise
        ) {
          await strapi.documents(UID).update({ documentId: existante.documentId, data });
          bilan.modifiees++;
        }
      } catch (e) {
        // Une offre en erreur (champ trop long…) ne bloque pas les autres ; elle est signalée dans le BO.
        echecs.push(`« ${offre.titre} » (${offre.sourceId}) : ${(e as Error).message}`);
      }
      if (++traitees % 5000 === 0) strapi.log.info(`[gestmax] ${traitees}/${offres.length} offres traitées`);
    });

    // Offres disparues de Gestmax : suppression par lots (une requête par lot, pas une par offre).
    const disparues = (existantes as any[]).filter((e) => !vues.has(e.sourceId)).map((e) => e.documentId);
    for (let i = 0; i < disparues.length; i += 500) {
      await strapi.db.query(UID).deleteMany({ where: { documentId: { $in: disparues.slice(i, i + 500) } } });
    }
    bilan.supprimees = disparues.length;

    await geocodeur.enregistrer();
    bilan.dureeMs = Date.now() - debut;
    // Un seul message de reconstruction pour toute la synchronisation (voir regrouperEvenementsOffres).
    if (bilan.creees || bilan.modifiees || bilan.supprimees) await (strapi as any).notifierOffres?.();
    if (echecs.length) {
      bilan.statut = 'erreur';
      strapi.log.error(`[gestmax] ${echecs.length} offre(s) non importée(s), dont : ${echecs.slice(0, 20).join(' ; ')}`);
      await enregistrerSynchro(strapi, { statut: 'erreur', bilan, erreur: `${echecs.length} offre(s) non importée(s) : ${echecs.slice(0, 3).join(' ; ')}` });
      return bilan;
    }
    strapi.log.info(`[gestmax] synchronisation : ${JSON.stringify(bilan)}`);
    await enregistrerSynchro(strapi, { statut: 'ok', bilan });
    await memoriserSource(strapi);
    return bilan;
  }
}
