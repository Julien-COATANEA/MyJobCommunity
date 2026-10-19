// Mémorise le résultat de la dernière synchronisation Gestmax (affiché dans le BO) et prévient la collectivité
// quand une série d'échecs commence (un seul e-mail par série, pas un toutes les 30 minutes).
import type { Core } from '@strapi/strapi';
import { alerterCollectivite } from './emails';

const magasin = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'mjc', key: 'synchro-gestmax' });

export interface DerniereSynchro {
  date: string | null;
  statut: string | null;
  bilan?: Record<string, unknown>;
  erreur?: string;
}

/**
 * 0 : réussie ; 1 : partielle (synchronisation faite, quelques offres non importées : elle a un bilan) ; 2 : échec.
 * L'alerte part quand la gravité augmente : une offre impossible à importer, signalée à chaque passage, ne doit pas
 * masquer une vraie panne de Gestmax qui surviendrait ensuite.
 */
const gravite = (s: Pick<DerniereSynchro, 'statut' | 'bilan'> | null) => (s?.statut !== 'erreur' ? 0 : s.bilan ? 1 : 2);

export async function enregistrerSynchro(strapi: Core.Strapi, valeur: Omit<DerniereSynchro, 'date'>) {
  const precedente = (await magasin(strapi).get({})) as DerniereSynchro | null;
  await magasin(strapi).set({ value: { ...valeur, date: new Date().toISOString() } });

  if (gravite(valeur) > gravite(precedente)) {
    const partielle = gravite(valeur) === 1;
    await alerterCollectivite(
      strapi,
      partielle ? 'Des offres Gestmax n’ont pas pu être importées' : 'La synchronisation des offres Gestmax a échoué',
      [
        partielle ? 'La synchronisation a eu lieu, mais certaines offres n’ont pas pu être importées.' : 'Les offres n’ont pas pu être mises à jour depuis Gestmax.',
        '',
        `Détail : ${valeur.erreur ?? 'erreur inconnue'}`,
        '',
        'Les offres déjà en ligne restent affichées. Une nouvelle tentative est faite automatiquement ; vous ne recevrez pas d’autre message tant que le problème dure.',
        '',
        "Suivi : back-office › Mes offres d'emploi.",
      ].join('\n'),
    ).catch((e) => strapi.log.warn(`[alerte] e-mail non envoyé : ${(e as Error).message}`));
  }
}

export async function lireDerniereSynchro(strapi: Core.Strapi): Promise<DerniereSynchro> {
  return ((await magasin(strapi).get({})) as DerniereSynchro | null) ?? { date: null, statut: null };
}

// Offres absentes de la dernière lecture incomplète de Gestmax, pas encore supprimées (identifiants Gestmax).
const magasinAbsentes = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'mjc', key: 'offres-absentes' });
export const lireAbsentes = async (strapi: Core.Strapi) => new Set(((await magasinAbsentes(strapi).get({})) as string[] | null) ?? []);
export const memoriserAbsentes = (strapi: Core.Strapi, sourceIds: string[]) => magasinAbsentes(strapi).set({ value: sourceIds });

/** Identifie la source des offres (instance, section, mode démo) : un changement dans .env impose de resynchroniser. */
const cleSource = (strapi: Core.Strapi) => {
  const c: any = strapi.config.get('gestmax');
  return [c.mock ? 'demo' : 'api', c.url, c.frontOffice, c.user].join('|');
};
const magasinSource = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'mjc', key: 'source-gestmax' });
export const memoriserSource = (strapi: Core.Strapi) => magasinSource(strapi).set({ value: cleSource(strapi) });
export const sourceInchangee = async (strapi: Core.Strapi) => {
  const memorisee = await magasinSource(strapi).get({});
  // Installation d'avant cette mémorisation : la dernière synchronisation réussie fait foi.
  if (memorisee == null) {
    await memoriserSource(strapi);
    return true;
  }
  return memorisee === cleSource(strapi);
};
