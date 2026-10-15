import { join } from 'node:path';
import { factories, type Core } from '@strapi/strapi';
import { executerSynchro } from '../../../utils/garde-offres';
import { convertirOffre, estCandidatureSpontanee, recupererOffresGestmax, type ConfigGestmax } from '../../../utils/gestmax';
import { enregistrerSynchro } from '../../../utils/synchro';
import { creerGeocodeur } from '../../../utils/geocodage';
import { indexEntreprises, normaliserNom } from '../../../utils/rattachement';

const UID = 'api::offre.offre';
// Baisse au-delà de laquelle la synchronisation s'arrête (mauvais paramétrage, droits retirés, panne de Gestmax…).
const BAISSE_MAX = 0.5;

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
    const parSourceId = new Map(existantes.map((o: any) => [o.sourceId, o]));

    const bilan = { statut: 'ok', total: offres.length, creees: 0, modifiees: 0, supprimees: 0, dureeMs: 0 };
    const vues = new Set<string>();
    const echecs: string[] = [];

    for (const offre of offres) {
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
    }

    for (const existante of existantes as any[]) {
      if (!vues.has(existante.sourceId)) {
        await strapi.documents(UID).delete({ documentId: existante.documentId });
        bilan.supprimees++;
      }
    }

    await geocodeur.enregistrer();
    bilan.dureeMs = Date.now() - debut;
    if (echecs.length) {
      bilan.statut = 'erreur';
      strapi.log.error(`[gestmax] ${echecs.length} offre(s) non importée(s) : ${echecs.join(' ; ')}`);
      await enregistrerSynchro(strapi, { statut: 'erreur', bilan, erreur: `${echecs.length} offre(s) non importée(s) : ${echecs.slice(0, 3).join(' ; ')}` });
      return bilan;
    }
    strapi.log.info(`[gestmax] synchronisation : ${JSON.stringify(bilan)}`);
    await enregistrerSynchro(strapi, { statut: 'ok', bilan });
    return bilan;
  }
}
