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

export async function enregistrerSynchro(strapi: Core.Strapi, valeur: Omit<DerniereSynchro, 'date'>) {
  const precedente = (await magasin(strapi).get({})) as DerniereSynchro | null;
  await magasin(strapi).set({ value: { ...valeur, date: new Date().toISOString() } });

  if (valeur.statut === 'erreur' && precedente?.statut !== 'erreur') {
    await alerterCollectivite(
      strapi,
      'La synchronisation des offres Gestmax a échoué',
      [
        'Les offres n’ont pas pu être mises à jour depuis Gestmax.',
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
