// Formulaire de contact : le message est envoyé par e-mail à l'adresse de contact des Informations du site (à défaut,
// à l'e-mail de notification). Rien n'est enregistré en base (RGPD : pas de données conservées sans nécessité).
//  - envoi JSON (formulaire amélioré en JavaScript) : réponse { statut, erreurs? } ;
//  - envoi classique (sans JavaScript) : redirection 303 vers /message-envoye/ ou /message-impossible/.
// Pas d'accusé de réception au visiteur : le formulaire servirait sinon à envoyer des e-mails à n'importe qui.
import type { Core } from '@strapi/strapi';
import { envoyerEmail } from '../../../utils/emails';
import { tropDeRequetes } from '../../../utils/limiteur';
import { origineSite } from '../../../utils/origine';
import { brut, coche, erreurEmail, erreurTelephone, ligne } from '../../../utils/validation';

type Statut = 'ok' | 'invalide' | 'indisponible' | 'trop-de-demandes' | 'erreur';
const MESSAGE_MIN = 10;

export function validerContact(corps: Record<string, unknown>) {
  const donnees = {
    nom: ligne(corps.nom),
    // E-mail et téléphone validés tels que saisis (jamais tronqués : une adresse coupée en serait une autre).
    email: brut(corps.email).toLowerCase(),
    telephone: brut(corps.telephone),
    sujet: ligne(corps.sujet),
    message: typeof corps.message === 'string' ? corps.message.trim().slice(0, 5000) : '',
    consentement: coche(corps.consentement),
  };
  const erreurs: Record<string, string> = {};
  if (!donnees.nom) erreurs.nom = 'Indiquez votre nom.';
  const email = erreurEmail(donnees.email);
  if (email) erreurs.email = email;
  const telephone = erreurTelephone(donnees.telephone);
  if (telephone) erreurs.telephone = telephone;
  if (donnees.message.length < MESSAGE_MIN) erreurs.message = `Écrivez votre message (${MESSAGE_MIN} caractères au moins, hors espaces de début et de fin).`;
  if (!donnees.consentement) erreurs.consentement = 'Vous devez accepter le traitement de vos données pour envoyer votre message.';
  return { donnees, erreurs };
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async envoyer(ctx: any) {
    const corps = (ctx.request.body ?? {}) as Record<string, unknown>;
    const enJson = ctx.is('application/json') === 'application/json';

    const repondre = (statut: Statut, code: number, extra: Record<string, unknown> = {}) => {
      if (enJson) {
        ctx.status = code;
        ctx.body = { statut, ...extra };
        return;
      }
      ctx.status = 303;
      // Sans JavaScript, une page par raison d'échec : le visiteur sait quoi corriger.
      ctx.redirect(`${origineSite(ctx)}/${statut === 'ok' ? 'message-envoye/' : `message-impossible/${statut}/`}`);
    };

    if (tropDeRequetes('contact', ctx.ip, 5)) return repondre('trop-de-demandes', 429);
    // Champ piège invisible : un robot le remplit, un humain non. On simule un succès.
    if (ligne(corps.site_web)) return repondre('ok', 201);

    const { donnees, erreurs } = validerContact(corps);
    if (Object.keys(erreurs).length) return repondre('invalide', 422, { erreurs });
    // Plafond pour tout le site : des envois depuis de nombreuses adresses n'inondent pas la boîte de la collectivité.
    if (tropDeRequetes('contact', 'tout-le-site', 50, 60 * 60 * 1000, false)) return repondre('trop-de-demandes', 429);

    const p: any = await strapi.db.query('api::parametres.parametres').findOne({ select: ['nomSite', 'email', 'emailNotificationInscriptions'] });
    const destinataire = p?.email || p?.emailNotificationInscriptions;
    if (!destinataire) {
      strapi.log.warn('[contact] aucune adresse de contact dans les Informations du site : message non envoyé');
      return repondre('indisponible', 503);
    }

    try {
      await envoyerEmail(strapi, {
        to: destinataire,
        repondreA: donnees.email,
        sujet: `[${p?.nomSite ?? 'Site'}] Contact : ${donnees.sujet || 'nouveau message'}`,
        texte: [
          `Nouveau message reçu depuis le formulaire de contact du site ${p?.nomSite ?? ''}.`.trim(),
          '',
          `Nom : ${donnees.nom}`,
          `E-mail : ${donnees.email}`,
          ...(donnees.telephone ? [`Téléphone : ${donnees.telephone}`] : []),
          ...(donnees.sujet ? [`Sujet : ${donnees.sujet}`] : []),
          '',
          donnees.message,
          '',
          '—',
          'Pour répondre, utilisez simplement « Répondre » : votre réponse partira à l’adresse de l’expéditeur.',
        ].join('\n'),
      });
    } catch (e) {
      strapi.log.error(`[contact] envoi impossible : ${(e as Error).message}`);
      return repondre('erreur', 502);
    }
    return repondre('ok', 201);
  },
});
