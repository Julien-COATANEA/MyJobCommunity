import { factories } from '@strapi/strapi';
import { alerterCollectivite } from '../../../utils/emails';
import {
  EVENEMENT, INSCRIPTION, emailConfirmation, etatInscriptions, formatDate, lieuEvenement, nouveauJeton, promouvoirListeAttente,
} from '../../../utils/inscriptions';
import { tropDeRequetes } from '../../../utils/limiteur';
import { origineSite } from '../../../utils/origine';
import { brut, coche, erreurEmail, erreurTelephone } from '../../../utils/validation';

type Statut = 'ok' | 'attente' | 'invalide' | 'ferme' | 'complet' | 'deja-inscrit' | 'trop-de-demandes';

const nettoyer = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function valider(corps: Record<string, unknown>) {
  const donnees = {
    prenom: nettoyer(corps.prenom),
    nom: nettoyer(corps.nom),
    // E-mail (destinataire de la confirmation) et téléphone validés tels que saisis, jamais tronqués.
    email: brut(corps.email).toLowerCase(),
    telephone: brut(corps.telephone),
    structure: nettoyer(corps.structure),
    consentement: coche(corps.consentement),
  };
  const erreurs: Record<string, string> = {};
  if (!donnees.prenom) erreurs.prenom = 'Indiquez votre prénom.';
  if (!donnees.nom) erreurs.nom = 'Indiquez votre nom.';
  const email = erreurEmail(donnees.email);
  if (email) erreurs.email = email;
  const telephone = erreurTelephone(donnees.telephone);
  if (telephone) erreurs.telephone = telephone;
  if (!donnees.consentement) erreurs.consentement = 'Vous devez accepter le traitement de vos données pour vous inscrire.';
  return { donnees, erreurs };
}

export default factories.createCoreController(INSCRIPTION, ({ strapi }) => ({
  async places(ctx) {
    const etat = await etatInscriptions(strapi, ctx.params.evenementId);
    if (!etat) return ctx.notFound();
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { ouvert: etat.ouvert, placesMax: etat.placesMax, placesRestantes: etat.placesRestantes, listeAttente: etat.listeAttente };
  },

  /**
   * Accepte un envoi JSON (formulaire amélioré en JS) ou un envoi de formulaire classique
   * (sans JS) : dans ce cas, redirection 303 vers la page de résultat du site.
   */
  async inscrire(ctx) {
    const corps = (ctx.request.body ?? {}) as Record<string, unknown>;
    const enJson = ctx.is('application/json') === 'application/json';

    const repondre = (statut: Statut, code: number, extra: Record<string, unknown> = {}) => {
      if (enJson) {
        ctx.status = code;
        ctx.body = { statut, ...extra };
        return;
      }
      const page = statut === 'ok' || statut === 'attente' ? 'inscription-confirmee' : 'inscription-impossible';
      ctx.status = 303;
      ctx.redirect(`${origineSite(ctx)}/evenements/${page}/?raison=${statut}`);
    };

    if (tropDeRequetes('inscription', ctx.ip)) return repondre('trop-de-demandes', 429);

    // Champ piège invisible : un robot le remplit, un humain non. On simule un succès.
    if (nettoyer(corps.site_web)) return repondre('ok', 201);

    const { donnees, erreurs } = valider(corps);
    if (Object.keys(erreurs).length) return repondre('invalide', 422, { erreurs });

    const etat = await etatInscriptions(strapi, nettoyer(corps.evenement, 64));
    if (!etat) return repondre('ferme', 404);
    if (!etat.ouvert) return repondre(etat.complet ? 'complet' : 'ferme', 409);

    const doublon = await strapi.documents(INSCRIPTION).count({
      filters: { evenement: { documentId: etat.evenement.documentId }, email: { $eqi: donnees.email }, statut: { $in: ['confirmee', 'attente'] } },
    });
    if (doublon) return repondre('deja-inscrit', 409);

    const enAttente = etat.complet;
    const jeton = nouveauJeton();
    await strapi.documents(INSCRIPTION).create({
      data: { ...donnees, jeton, statut: enAttente ? 'attente' : 'confirmee', evenement: etat.evenement.documentId } as any,
    });

    await emailConfirmation(strapi, etat.evenement, { ...donnees, jeton }, enAttente).catch((e: Error) =>
      strapi.log.error(`[inscription] e-mail au participant impossible : ${e.message}`),
    );
    await alerterCollectivite(
      strapi,
      `${enAttente ? 'Liste d’attente' : 'Nouvelle inscription'} : ${etat.evenement.titre}`,
      `${donnees.prenom} ${donnees.nom} (${donnees.email}${donnees.telephone ? `, ${donnees.telephone}` : ''}${donnees.structure ? `, ${donnees.structure}` : ''}) ` +
        `${enAttente ? 'a rejoint la liste d’attente de' : 's’est inscrit(e) à'} « ${etat.evenement.titre} » du ${formatDate(etat.evenement.dateDebut)}.`,
    ).catch((e: Error) => strapi.log.error(`[inscription] notification impossible : ${e.message}`));

    return repondre(enAttente ? 'attente' : 'ok', 201, {
      placesRestantes: etat.placesRestantes === null ? null : Math.max(etat.placesRestantes - (enAttente ? 0 : 1), 0),
    });
  },

  /** Informations pour la page d'annulation du site (titre et date, sans données personnelles). */
  async infoAnnulation(ctx) {
    const jeton = nettoyer(ctx.query.jeton, 64);
    const inscription: any = jeton ? await strapi.db.query(INSCRIPTION).findOne({ where: { jeton }, populate: { evenement: true } }) : null;
    if (!inscription?.evenement) return ctx.notFound();
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      titre: inscription.evenement.titre,
      date: inscription.evenement.dateDebut,
      lieu: lieuEvenement(inscription.evenement),
      statut: inscription.statut,
      attente: inscription.statut === 'attente',
    };
  },

  /** Annulation par le participant (lien de l'e-mail) : libère la place et prévient le suivant en liste d'attente. */
  async annuler(ctx) {
    if (tropDeRequetes('annulation', ctx.ip, 12)) {
      ctx.status = 429;
      ctx.body = { statut: 'trop-de-demandes' };
      return;
    }
    const jeton = nettoyer((ctx.request.body as any)?.jeton, 64);
    const inscription: any = jeton ? await strapi.db.query(INSCRIPTION).findOne({ where: { jeton }, populate: { evenement: true } }) : null;
    if (!inscription?.evenement) return ctx.notFound();

    if (inscription.statut !== 'annulee') {
      await strapi.db.query(INSCRIPTION).update({ where: { id: inscription.id }, data: { statut: 'annulee' } });
      await promouvoirListeAttente(strapi, inscription.evenement.documentId);
    }
    ctx.body = { statut: 'annulee', titre: inscription.evenement.titre };
  },
}));

export { EVENEMENT };
