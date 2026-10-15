// Les offres d'emploi viennent UNIQUEMENT de Gestmax : elles ne se créent, ne se modifient et ne se suppriment
// pas depuis le back-office. Seule exception : les deux réglages éditoriaux « à la une » et « masquée ».
// Le contrôle est fait côté serveur (la suppression des boutons dans l'interface ne suffirait pas).
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

export const UID_OFFRE = 'api::offre.offre';
export const REGLAGES_EDITORIAUX = ['aLaUne', 'masquee'] as const;

// Le code qui s'exécute dans cette portée est la synchronisation Gestmax : elle a tous les droits.
const synchronisation = new AsyncLocalStorage<boolean>();
export const executerSynchro = <T>(travail: () => Promise<T>): Promise<T> => synchronisation.run(true, travail);
export const synchroEnCours = () => synchronisation.getStore() === true;

/**
 * Pendant la synchronisation, les offres créées, modifiées ou supprimées n'envoient PAS un webhook chacune (90 000
 * offres = 90 000 appels au constructeur du site) : un seul message « offres » est envoyé à la fin (voir service offre).
 */
export function regrouperEvenementsOffres(strapi: Core.Strapi) {
  const hub: any = strapi.eventHub;
  const emettre = hub.emit.bind(hub);
  hub.emit = (evenement: string, ...args: any[]) => {
    const charge = args[0];
    if (synchroEnCours() && typeof evenement === 'string' && evenement.startsWith('entry.') && charge?.uid === UID_OFFRE) return Promise.resolve();
    return emettre(evenement, ...args);
  };
  return (evenement = 'entry.update', entry: Record<string, unknown> = { publishedAt: new Date().toISOString() }) =>
    emettre(evenement, { model: 'offre', uid: UID_OFFRE, entry });
}

const ACTIONS_INTERDITES = ['create', 'delete', 'deleteMany', 'publish', 'unpublish', 'discardDraft', 'clone'];

export function protegerOffres(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    if (context.uid !== UID_OFFRE || synchronisation.getStore()) return next();

    if (ACTIONS_INTERDITES.includes(context.action)) {
      throw new errors.ForbiddenError(
        'Les offres viennent de Gestmax : créez, modifiez ou supprimez-les dans Gestmax. Elles apparaissent ensuite automatiquement sur le site.',
      );
    }
    if (context.action === 'update') {
      // L'éditeur envoie tout le formulaire : on ne retient que les réglages éditoriaux.
      const donnees = ((context.params as any).data ?? {}) as Record<string, unknown>;
      (context.params as any).data = Object.fromEntries(REGLAGES_EDITORIAUX.filter((c) => c in donnees).map((c) => [c, donnees[c]]));
    }
    return next();
  });
}

/** Filtre « offre visible sur le site » (tolère les anciennes lignes sans valeur). */
export const OFFRES_VISIBLES = { $or: [{ masquee: { $null: true } }, { masquee: false }] };
