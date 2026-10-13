// Règles métier des inscriptions aux événements : places, liste d'attente, annulation, e-mails.
import { randomBytes } from 'node:crypto';
import type { Core } from '@strapi/strapi';
import { envoyerEmail, lireIdentite, urlSite } from './emails';

export const EVENEMENT = 'api::evenement.evenement';
export const INSCRIPTION = 'api::inscription.inscription';

export const nouveauJeton = () => randomBytes(24).toString('hex');
export const lienAnnulation = (jeton: string) => `${urlSite()}/evenements/annuler/?jeton=${jeton}`;

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(iso));

export const lieuEvenement = (e: any) => (e.enLigne ? 'En ligne' : [e.lieu, e.adresse].filter(Boolean).join(', '));

/** État des inscriptions d'un événement : ouvert ? complet ? liste d'attente ? */
export async function etatInscriptions(strapi: Core.Strapi, documentId: string) {
  const evenement: any = await strapi.documents(EVENEMENT).findOne({ documentId });
  if (!evenement) return null;
  const limite = evenement.dateLimiteInscription ?? evenement.dateDebut;
  const confirmes = await strapi.documents(INSCRIPTION).count({ filters: { evenement: { documentId }, statut: 'confirmee' } });
  const placesRestantes = evenement.placesMax ? Math.max(evenement.placesMax - confirmes, 0) : null;
  const complet = placesRestantes === 0;
  const dansLesDelais = new Date(limite) > new Date();
  const listeAttente = !!evenement.listeAttente && complet;
  const ouvert = !!evenement.inscriptionActive && !evenement.inscriptionExterneUrl && dansLesDelais && (!complet || listeAttente);
  return { evenement, ouvert, complet, listeAttente, placesMax: evenement.placesMax ?? null, placesRestantes, confirmes };
}

export async function emailConfirmation(strapi: Core.Strapi, evenement: any, i: any, enAttente: boolean) {
  const { nomSite } = await lireIdentite(strapi);
  const quand = formatDate(evenement.dateDebut);
  const ou = lieuEvenement(evenement);
  const texte = enAttente
    ? [
        `Bonjour ${i.prenom},`,
        '',
        `L'événement « ${evenement.titre} » est complet : vous êtes inscrit(e) sur la liste d'attente.`,
        'Si une place se libère, vous recevrez automatiquement un e-mail de confirmation.',
        '',
        `Date : ${quand}`,
        ou ? `Lieu : ${ou}` : '',
        '',
        `Vous ne souhaitez plus attendre ? Quitter la liste d'attente : ${lienAnnulation(i.jeton)}`,
      ]
    : [
        `Bonjour ${i.prenom},`,
        '',
        `Votre inscription à « ${evenement.titre} » est confirmée.`,
        `Date : ${quand}`,
        ou ? `Lieu : ${ou}` : '',
        '',
        `Un empêchement ? Libérez votre place pour un autre participant : ${lienAnnulation(i.jeton)}`,
        '',
        `L'équipe ${nomSite}`,
      ];
  await envoyerEmail(strapi, {
    to: i.email,
    sujet: enAttente ? `Liste d'attente : ${evenement.titre}` : `Inscription confirmée : ${evenement.titre}`,
    texte: texte.join('\n').replace(/\n{3,}/g, '\n\n'),
  });
}

export async function emailPlaceLiberee(strapi: Core.Strapi, evenement: any, i: any) {
  const { nomSite } = await lireIdentite(strapi);
  await envoyerEmail(strapi, {
    to: i.email,
    sujet: `Une place s'est libérée : ${evenement.titre}`,
    texte: [
      `Bonjour ${i.prenom},`,
      '',
      `Bonne nouvelle : une place s'est libérée, votre inscription à « ${evenement.titre} » est maintenant confirmée.`,
      `Date : ${formatDate(evenement.dateDebut)}`,
      lieuEvenement(evenement) ? `Lieu : ${lieuEvenement(evenement)}` : '',
      '',
      `Un empêchement ? Merci de libérer votre place : ${lienAnnulation(i.jeton)}`,
      '',
      `L'équipe ${nomSite}`,
    ].join('\n').replace(/\n{3,}/g, '\n\n'),
  });
}

/** Promeut les premiers inscrits de la liste d'attente tant qu'il reste des places. */
export async function promouvoirListeAttente(strapi: Core.Strapi, evenementDocumentId: string) {
  const etat = await etatInscriptions(strapi, evenementDocumentId);
  if (!etat || etat.placesMax === null) return 0;
  let libres = etat.placesRestantes ?? 0;
  let promus = 0;
  while (libres > 0) {
    const [suivant] = (await strapi.documents(INSCRIPTION).findMany({
      filters: { evenement: { documentId: evenementDocumentId }, statut: 'attente' },
      sort: 'createdAt:asc',
      limit: 1,
    } as any)) as any[];
    if (!suivant) break;
    // Écriture directe en base : évite de relancer le contrôle « liste d'attente » du service documents.
    await strapi.db.query(INSCRIPTION).update({ where: { documentId: suivant.documentId }, data: { statut: 'confirmee' } });
    // Le jeton est un champ privé : relu en base pour le lien d'annulation du message.
    const complet: any = await strapi.db.query(INSCRIPTION).findOne({ where: { documentId: suivant.documentId } });
    await emailPlaceLiberee(strapi, etat.evenement, { ...suivant, jeton: complet?.jeton }).catch((e) =>
      strapi.log.error(`[inscription] e-mail de promotion impossible : ${(e as Error).message}`),
    );
    libres--;
    promus++;
  }
  return promus;
}
