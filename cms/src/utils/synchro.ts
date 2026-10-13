// Mémorise le résultat de la dernière synchronisation Gestmax (affiché dans le BO).
import type { Core } from '@strapi/strapi';

const magasin = (strapi: Core.Strapi) => strapi.store({ type: 'core', name: 'mjc', key: 'synchro-gestmax' });

export interface DerniereSynchro {
  date: string | null;
  statut: string | null;
  bilan?: Record<string, unknown>;
  erreur?: string;
}

export async function enregistrerSynchro(strapi: Core.Strapi, valeur: Omit<DerniereSynchro, 'date'>) {
  await magasin(strapi).set({ value: { ...valeur, date: new Date().toISOString() } });
}

export async function lireDerniereSynchro(strapi: Core.Strapi): Promise<DerniereSynchro> {
  return ((await magasin(strapi).get({})) as DerniereSynchro | null) ?? { date: null, statut: null };
}
