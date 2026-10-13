import { factories } from '@strapi/strapi';

const EVENEMENT = 'api::evenement.evenement';
const INSCRIPTION = 'api::inscription.inscription';

type Statut = 'ok' | 'invalide' | 'ferme' | 'complet' | 'deja-inscrit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEPHONE = /^[0-9+().\s-]{6,20}$/;

const coche = (v: unknown) => v === true || v === 'true' || v === 'on' || v === '1';
const nettoyer = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function valider(corps: Record<string, unknown>) {
  const donnees = {
    prenom: nettoyer(corps.prenom),
    nom: nettoyer(corps.nom),
    email: nettoyer(corps.email, 254).toLowerCase(),
    telephone: nettoyer(corps.telephone, 20),
    structure: nettoyer(corps.structure),
    consentement: coche(corps.consentement),
  };
  const erreurs: Record<string, string> = {};
  if (!donnees.prenom) erreurs.prenom = 'Indiquez votre prénom.';
  if (!donnees.nom) erreurs.nom = 'Indiquez votre nom.';
  if (!EMAIL.test(donnees.email)) erreurs.email = 'Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.';
  if (donnees.telephone && !TELEPHONE.test(donnees.telephone)) erreurs.telephone = 'Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.';
  if (!donnees.consentement) erreurs.consentement = 'Vous devez accepter le traitement de vos données pour vous inscrire.';
  return { donnees, erreurs };
}

/** État des inscriptions d'un événement publié. */
async function etatInscriptions(strapi: any, documentId: string) {
  const evenement = await strapi.documents(EVENEMENT).findOne({ documentId, status: 'published' });
  if (!evenement) return null;
  const maintenant = new Date();
  const limite = evenement.dateLimiteInscription ?? evenement.dateDebut;
  const inscrits = await strapi.documents(INSCRIPTION).count({
    filters: { evenement: { documentId }, statut: 'confirmee' },
  });
  const placesRestantes = evenement.placesMax ? Math.max(evenement.placesMax - inscrits, 0) : null;
  const ouvert =
    evenement.inscriptionActive && !evenement.inscriptionExterneUrl && new Date(limite) > maintenant && placesRestantes !== 0;
  return { evenement, ouvert, placesMax: evenement.placesMax ?? null, placesRestantes };
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(iso));

export default factories.createCoreController(INSCRIPTION, ({ strapi }) => ({
  async places(ctx) {
    const etat = await etatInscriptions(strapi, ctx.params.evenementId);
    if (!etat) return ctx.notFound();
    const { ouvert, placesMax, placesRestantes } = etat;
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { ouvert, placesMax, placesRestantes };
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
      const page = statut === 'ok' ? 'inscription-confirmee' : 'inscription-impossible';
      ctx.status = 303;
      ctx.redirect(`${origineSite(ctx)}/evenements/${page}/?raison=${statut}`);
    };

    // Champ piège invisible : un robot le remplit, un humain non. On simule un succès.
    if (nettoyer(corps.site_web)) return repondre('ok', 201);

    const { donnees, erreurs } = valider(corps);
    if (Object.keys(erreurs).length) return repondre('invalide', 422, { erreurs });

    const etat = await etatInscriptions(strapi, nettoyer(corps.evenement, 64));
    if (!etat) return repondre('ferme', 404);
    if (!etat.ouvert) return repondre(etat.placesRestantes === 0 ? 'complet' : 'ferme', 409);

    const doublon = await strapi.documents(INSCRIPTION).count({
      filters: { evenement: { documentId: etat.evenement.documentId }, email: { $eqi: donnees.email }, statut: 'confirmee' },
    });
    if (doublon) return repondre('deja-inscrit', 409);

    await strapi.documents(INSCRIPTION).create({
      data: { ...donnees, statut: 'confirmee', evenement: etat.evenement.documentId } as any,
    });

    await envoyerEmails(strapi, etat.evenement, donnees).catch((e: Error) =>
      strapi.log.error(`[inscription] envoi des e-mails impossible : ${e.message}`),
    );

    return repondre('ok', 201, {
      placesRestantes: etat.placesRestantes === null ? null : etat.placesRestantes - 1,
    });
  },
}));

/** Origine du site pour la redirection : celle de la requête si elle est autorisée, sinon SITE_URL. */
function origineSite(ctx: any): string {
  const autorisees = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  let origine = ctx.get('origin');
  if (!origine && ctx.get('referer')) {
    try {
      origine = new URL(ctx.get('referer')).origin;
    } catch {
      origine = '';
    }
  }
  return autorisees.includes(origine) ? origine : (process.env.SITE_URL ?? '').replace(/\/+$/, '');
}

async function envoyerEmails(strapi: any, evenement: any, d: { prenom: string; nom: string; email: string; telephone: string; structure: string }) {
  const parametres = await strapi.db.query('api::parametres.parametres').findOne({});
  const nomSite = parametres?.nomSite ?? 'My Job Community';
  const quand = formatDate(evenement.dateDebut);
  const ou = evenement.enLigne ? 'En ligne' : [evenement.lieu, evenement.adresse].filter(Boolean).join(', ');
  const email = strapi.plugin('email').service('email');

  await email.send({
    to: d.email,
    subject: `Inscription confirmée : ${evenement.titre}`,
    text: [
      `Bonjour ${d.prenom},`,
      '',
      `Votre inscription à « ${evenement.titre} » est confirmée.`,
      `Date : ${quand}`,
      ou ? `Lieu : ${ou}` : '',
      '',
      `L'équipe ${nomSite}`,
    ].filter((l) => l !== null).join('\n'),
  });

  if (parametres?.emailNotificationInscriptions) {
    await email.send({
      to: parametres.emailNotificationInscriptions,
      subject: `Nouvelle inscription : ${evenement.titre}`,
      text: `${d.prenom} ${d.nom} (${d.email}${d.telephone ? `, ${d.telephone}` : ''}${d.structure ? `, ${d.structure}` : ''}) s'est inscrit(e) à « ${evenement.titre} » du ${quand}.`,
    });
  }
}
