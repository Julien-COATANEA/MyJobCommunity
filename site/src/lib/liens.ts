// Résolution des liens saisis dans le BO.
//   /chemin            → lien interne
//   https://…          → lien externe
//   gestmax:/chemin    → front Gestmax de la collectivité (Paramètres du site > gestmaxUrlFront)

/** Protocoles acceptés dans un href ou un src (plus les chemins relatifs et les ancres) : pas de javascript:, data:… */
export const URL_AUTORISEE = /^(https?:|mailto:|tel:|\/|#)/i;

/** Adresse sans danger dans un href ou un src (http, https, mailto, tel, chemin relatif), sinon null. */
export function lienSur(url: string | null | undefined): string | null {
  const u = url?.trim();
  return u && URL_AUTORISEE.test(u) ? u : null;
}

/**
 * Chemin interne terminé par « / » (avant ? et #) : les pages sont des dossiers, « /offres » coûterait une
 * redirection. Les fichiers (.ics, .xml, images…), les ancres et les liens externes restent tels quels.
 */
export function avecSlash(url: string): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const [, chemin, suite] = url.match(/^([^?#]*)(.*)$/)!;
  if (chemin.endsWith('/') || /\.[a-z0-9]+$/i.test(chemin)) return url;
  return `${chemin}/${suite}`;
}

/** Lien du BO prêt à écrire dans un href ; null s'il est vide ou d'un protocole non autorisé (javascript:…). */
export function resoudreLien(url: string | null | undefined, gestmaxUrlFront: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith('gestmax:')) {
    const base = (gestmaxUrlFront ?? '').replace(/\/+$/, '');
    const chemin = url.slice('gestmax:'.length);
    return lienSur(`${base}${chemin.startsWith('/') ? '' : '/'}${chemin}`);
  }
  const sur = lienSur(url);
  return sur && avecSlash(sur);
}

export const estExterne = (url: string) => /^https?:\/\//.test(url);

/** Rend un lien absolu (utile pour l'en-tête/pied de page repris par Gestmax). */
export function absolu(url: string, base: string | undefined): string;
export function absolu(url: string | null, base: string | undefined): string | null;
export function absolu(url: string | null, base: string | undefined): string | null {
  if (!url || !base || !url.startsWith('/') || url.startsWith('//')) return url;
  return `${base.replace(/\/+$/, '')}${url}`;
}

/** Le lien correspond-il à la page courante (ou à une de ses sous-pages) ? */
export function estActif(url: string, cheminCourant: string): boolean {
  if (!url.startsWith('/')) return false;
  const cible = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const courant = cheminCourant.replace(/\/+$/, '') || '/';
  return cible === '/' ? courant === '/' : courant === cible || courant.startsWith(`${cible}/`);
}

/**
 * Adresse de la page n d'une liste paginée (route [...page]). Astro ne fournit pas page.url.first sur la page 1 :
 * la base est alors l'adresse courante.
 */
export function urlPagination(url: { current: string; first?: string }, pageCourante: number, n: number): string {
  const base = (pageCourante === 1 || !url.first ? url.current : url.first).replace(/\/+$/, '');
  return avecSlash(n === 1 ? base || '/' : `${base}/${n}`);
}
