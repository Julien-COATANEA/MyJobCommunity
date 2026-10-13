import { join } from 'node:path';
import { factories, type Core } from '@strapi/strapi';
import { executerSynchro } from '../../../utils/garde-offres';
import { convertirOffre, estCandidatureSpontanee, recupererOffresGestmax, type ConfigGestmax } from '../../../utils/gestmax';
import { enregistrerSynchro } from '../../../utils/synchro';
import { creerGeocodeur } from '../../../utils/geocodage';

const UID = 'api::offre.offre';

export default factories.createCoreService(UID, ({ strapi }) => ({
  /**
   * Importe les offres en ligne de Gestmax : crée, met à jour et supprime pour refléter l'ATS.
   * C'est le SEUL chemin d'écriture sur les offres (voir utils/garde-offres.ts). Les réglages « à la une » et
   * « masquée » ne font pas partie des données importées : ils sont conservés d'une synchronisation à l'autre.
   */
  synchroniserDepuisGestmax() {
    return executerSynchro(() => synchroniser(strapi));
  },
}));

async function synchroniser(strapi: Core.Strapi) {
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

    // Rattachement à l'annuaire via le nom de l'entité Gestmax (customer_company).
    const entreprises = await strapi.db.query('api::entreprise.entreprise').findMany({
      select: ['documentId', 'nomEntiteGestmax'],
      where: { nomEntiteGestmax: { $notNull: true } },
    });
    const entrepriseParNom = new Map(
      entreprises.map((e: any) => [e.nomEntiteGestmax.trim().toLowerCase(), e.documentId]),
    );

    const existantes = await strapi.db.query(UID).findMany({ select: ['documentId', 'sourceId', 'empreinte', 'latitude'] });
    const geocodeur = await creerGeocodeur(strapi);
    const parSourceId = new Map(existantes.map((o: any) => [o.sourceId, o]));

    const bilan = { statut: 'ok', total: offres.length, creees: 0, modifiees: 0, supprimees: 0, dureeMs: 0 };
    const vues = new Set<string>();

    for (const offre of offres) {
      vues.add(offre.sourceId);
      const entreprise = offre.nomEntreprise ? entrepriseParNom.get(offre.nomEntreprise.toLowerCase()) ?? null : null;
      const position = await geocodeur.positionner(offre.lieu, offre.departement);
      const data: any = { ...offre, entreprise, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null };
      const existante: any = parSourceId.get(offre.sourceId);

      if (!existante) {
        await strapi.documents(UID).create({ data });
        bilan.creees++;
      } else if (existante.empreinte !== offre.empreinte || (position && existante.latitude == null)) {
        await strapi.documents(UID).update({ documentId: existante.documentId, data });
        bilan.modifiees++;
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
    strapi.log.info(`[gestmax] synchronisation : ${JSON.stringify(bilan)}`);
    await enregistrerSynchro(strapi, { statut: 'ok', bilan });
    return bilan;
  }
}
