// Droit du gestionnaire de contenu sur TOUT un type (réglable par rôle dans « Mon équipe »).
// Usage : { name: 'global::droit-contenu', config: { action: 'update', uid: 'api::entreprise.entreprise' } }
import { errors } from '@strapi/utils';
import { droitSansCondition } from '../utils/droits';

export default (contexte: any, config: { action: string; uid: string }) => {
  if (droitSansCondition(contexte.state?.userAbility, `plugin::content-manager.explorer.${config.action}`, config.uid)) return true;
  throw new errors.PolicyError('Vous n’avez pas les droits nécessaires pour cette action.');
};
