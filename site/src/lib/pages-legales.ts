// Pages légales créées en brouillon par le CMS pour chaque nouveau client : elles ne sont liées (pied de page, bandeau
// de cookies) que lorsqu'elles sont publiées, sinon le lien mènerait à une 404.

export const PAGES_LEGALES = [
  { slug: 'mentions-legales', libelle: 'Mentions légales' },
  { slug: 'donnees-personnelles', libelle: 'Données personnelles' },
  { slug: 'politique-de-cookies', libelle: 'Politique de cookies' },
  { slug: 'accessibilite', libelle: 'Accessibilité' },
] as const;

const CONFORMITE: Record<string, string> = {
  'non-conforme': 'non conforme',
  'partiellement-conforme': 'partiellement conforme',
  'totalement-conforme': 'totalement conforme',
};

/** Libellé du lien vers la déclaration d'accessibilité : l'état de conformité y est obligatoire (RGAA). */
export const libelleAccessibilite = (conformite: string | null | undefined) =>
  `Accessibilité : ${CONFORMITE[conformite ?? ''] ?? CONFORMITE['non-conforme']}`;

/** Lien vers la déclaration d'accessibilité : chemin contenant « accessibilite » (relatif ou absolu). */
const versAccessibilite = (url: string) => {
  try {
    return /accessibilite/i.test(new URL(url.trim(), 'https://site.invalid').pathname);
  } catch {
    return false;
  }
};

/**
 * Liens légaux saisis dans le BO : le lien vers la déclaration d'accessibilité prend le libellé réglementaire, avec
 * l'état de conformité réglé dans le BO (un libellé saisi à la main pourrait annoncer une autre conformité).
 */
export function avecConformite<T extends { libelle: string; url: string }>(liens: T[], conformite: string | null | undefined): T[] {
  return liens.map((l) => (versAccessibilite(l.url) ? { ...l, libelle: libelleAccessibilite(conformite) } : l));
}

/** Liens par défaut du pied de page : ceux des pages légales publiées (`pages` = pages Strapi publiées). */
export function liensLegauxParDefaut(pages: { slug: string }[], conformite?: string | null): { libelle: string; url: string }[] {
  const publiees = new Set(pages.map((p) => p.slug));
  return PAGES_LEGALES.filter((p) => publiees.has(p.slug)).map((p) => ({
    libelle: p.slug === 'accessibilite' ? libelleAccessibilite(conformite) : p.libelle,
    url: `/${p.slug}/`,
  }));
}

/** Lien « En savoir plus » du bandeau : celui du BO, sinon la politique de cookies si elle est publiée. */
export function lienPolitiqueCookiesEffectif(lien: string | null | undefined, pages: { slug: string }[]): string | null {
  if (lien?.trim()) return lien;
  return pages.some((p) => p.slug === 'politique-de-cookies') ? '/politique-de-cookies/' : null;
}
