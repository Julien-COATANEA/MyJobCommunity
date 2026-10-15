// Capacité de l'espace exigée par une route /espace (réglée par rôle dans « Mon équipe », voir utils/droits).
// Usage : { name: 'global::capacite', config: { cle: 'apparence' } }
import { errors } from '@strapi/utils';
import { CAPACITES, aCapacite, type Capacite } from '../utils/droits';

export default (contexte: any, config: { cle: Capacite }) => {
  if (aCapacite(contexte, config.cle)) return true;
  const libelle = CAPACITES.find((c) => c.cle === config.cle)?.libelle ?? config.cle;
  throw new errors.PolicyError(`Votre rôle ne permet pas cette action (« ${libelle} »). Demandez à un responsable du site.`);
};
