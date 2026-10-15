import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::parametres.parametres', () => ({
  /** Les scripts désactivés ne quittent pas le BO (un jeton collé dans un script inactif resterait sinon public). */
  async find(ctx) {
    const reponse: any = await super.find(ctx);
    const scripts = reponse?.data?.scripts;
    if (Array.isArray(scripts)) reponse.data.scripts = scripts.filter((s: any) => s?.actif !== false);
    return reponse;
  },
}));
