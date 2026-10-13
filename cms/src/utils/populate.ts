import type { Core } from '@strapi/strapi';

// Relations jamais exposées via la population profonde (données personnelles).
const RELATIONS_EXCLUES = new Set(['api::inscription.inscription']);

const PROFONDEUR_MAX = 6;

/**
 * Construit l'objet `populate` complet d'un type de contenu ou d'un composant :
 * médias, composants et zones dynamiques récursivement ; relations sur un niveau
 * (avec leurs médias, ex. le logo d'une entreprise liée).
 */
export function construirePopulate(strapi: Core.Strapi, uid: string, profondeur = 0): Record<string, any> {
  const modele: any = strapi.getModel(uid as any);
  const populate: Record<string, any> = {};
  if (!modele || profondeur > PROFONDEUR_MAX) return populate;

  const sous = (uidComposant: string) => {
    const enfant = construirePopulate(strapi, uidComposant, profondeur + 1);
    return Object.keys(enfant).length ? { populate: enfant } : true;
  };

  for (const [nom, attr] of Object.entries<any>(modele.attributes)) {
    if (attr.private) continue;
    switch (attr.type) {
      case 'media':
        populate[nom] = true;
        break;
      case 'component':
        populate[nom] = sous(attr.component);
        break;
      case 'dynamiczone':
        populate[nom] = { on: Object.fromEntries(attr.components.map((c: string) => [c, sous(c)])) };
        break;
      case 'relation':
        if (attr.target?.startsWith('api::') && !RELATIONS_EXCLUES.has(attr.target) && profondeur === 0) {
          const m = medias(strapi, attr.target);
          populate[nom] = Object.keys(m).length ? { populate: m } : true;
        }
        break;
    }
  }
  return populate;
}

function medias(strapi: Core.Strapi, uid: string): Record<string, true> {
  const modele: any = strapi.getModel(uid as any);
  return Object.fromEntries(
    Object.entries<any>(modele?.attributes ?? {})
      .filter(([, attr]) => attr.type === 'media')
      .map(([nom]) => [nom, true]),
  );
}
