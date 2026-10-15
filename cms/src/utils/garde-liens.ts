// Refuse les adresses « javascript: », « vbscript: » et « data: » dans les contenus : un lien piégé saisi dans le BO
// s'exécuterait chez les visiteurs du site et dans l'habillage repris par Gestmax. Le site filtre aussi à l'affichage.
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

// Comme les navigateurs : caractères de contrôle et espaces de tête ignorés, tabulations et retours à la ligne
// retirés partout (« java\tscript: »). Les espaces internes comptent : « Data : analyste » n'est pas une adresse.
export const protocoleDangereux = (v: string) =>
  /^(javascript|vbscript|data):/i.test(v.replace(/[\t\n\r]/g, '').replace(/^[\u0000-\u0020]+/, ''));

// Champs qui contiennent une adresse : lien, url (y compris les liens du texte riche), siteWeb, *Url, lien*.
const CHAMP_LIEN = /^(url|lien|siteWeb|href)$|Url$|^lien[A-Z]/;

function chercher(valeur: unknown, chemin: string, cle: string): string | null {
  if (typeof valeur === 'string') return CHAMP_LIEN.test(cle) && protocoleDangereux(valeur) ? chemin : null;
  if (Array.isArray(valeur)) {
    for (let i = 0; i < valeur.length; i++) {
      const trouve = chercher(valeur[i], `${chemin}[${i}]`, cle);
      if (trouve) return trouve;
    }
  } else if (valeur && typeof valeur === 'object') {
    for (const [k, v] of Object.entries(valeur)) {
      const trouve = chercher(v, chemin ? `${chemin}.${k}` : k, k);
      if (trouve) return trouve;
    }
  }
  return null;
}

export function protegerLiens(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    if (!context.uid.startsWith('api::') || !['create', 'update'].includes(context.action)) return next();
    const champ = chercher((context.params as any).data, '', '');
    if (champ) {
      throw new errors.ValidationError(`Adresse refusée dans « ${champ} » : seuls les liens http(s), mailto:, tel: et les pages du site sont acceptés.`);
    }
    return next();
  });
}
