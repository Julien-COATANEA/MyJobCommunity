// Pages légales créées en brouillon par le CMS pour chaque nouveau client : elles ne sont liées (pied de page, bandeau
// de cookies) que lorsqu'elles sont publiées, sinon le lien mènerait à une 404.

export const PAGES_LEGALES = [
  { slug: 'mentions-legales', libelle: 'Mentions légales' },
  { slug: 'donnees-personnelles', libelle: 'Données personnelles' },
  { slug: 'politique-de-cookies', libelle: 'Politique de cookies' },
  { slug: 'accessibilite', libelle: 'Accessibilité' },
] as const;

/** Liens par défaut du pied de page : ceux des pages légales publiées (`pages` = pages Strapi publiées). */
export function liensLegauxParDefaut(pages: { slug: string }[]): { libelle: string; url: string }[] {
  const publiees = new Set(pages.map((p) => p.slug));
  return PAGES_LEGALES.filter((p) => publiees.has(p.slug)).map((p) => ({ libelle: p.libelle, url: `/${p.slug}/` }));
}

/** Lien « En savoir plus » du bandeau : celui du BO, sinon la politique de cookies si elle est publiée. */
export function lienPolitiqueCookiesEffectif(lien: string | null | undefined, pages: { slug: string }[]): string | null {
  if (lien?.trim()) return lien;
  return pages.some((p) => p.slug === 'politique-de-cookies') ? '/politique-de-cookies/' : null;
}
