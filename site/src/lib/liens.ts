// Résolution des liens saisis dans le BO.
//   /chemin            → lien interne
//   https://…          → lien externe
//   gestmax:/chemin    → front Gestmax de la collectivité (Paramètres du site > gestmaxUrlFront)

export function resoudreLien(url: string | null | undefined, gestmaxUrlFront: string | null | undefined): string {
  if (!url) return '#';
  if (url.startsWith('gestmax:')) {
    const base = (gestmaxUrlFront ?? '').replace(/\/+$/, '');
    const chemin = url.slice('gestmax:'.length);
    return `${base}${chemin.startsWith('/') ? '' : '/'}${chemin}`;
  }
  return url;
}

export const estExterne = (url: string) => /^https?:\/\//.test(url);

/** Rend un lien absolu (utile pour l'en-tête/pied de page repris par Gestmax). */
export function absolu(url: string, base: string | undefined): string {
  if (!base || !url.startsWith('/')) return url;
  return `${base.replace(/\/+$/, '')}${url}`;
}

/** Le lien correspond-il à la page courante (ou à une de ses sous-pages) ? */
export function estActif(url: string, cheminCourant: string): boolean {
  if (!url.startsWith('/')) return false;
  const cible = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const courant = cheminCourant.replace(/\/+$/, '') || '/';
  return cible === '/' ? courant === '/' : courant === cible || courant.startsWith(`${cible}/`);
}
