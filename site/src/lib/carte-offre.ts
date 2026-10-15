// Balisage d'une carte d'offre, partagé par le rendu statique (CarteOffre.astro)
// et par la recherche dans le navigateur (page /offres) : un seul modèle à maintenir.
import { classeContrat, estNouveau, ilYA, initiales } from './format';
import { svgIcone } from './icones';
import { lienSur } from './liens';

export interface OffreCarte {
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  nomEntreprise: string | null;
  salaire: string | null;
  dateActivation: string | null;
  logoUrl: string | null;
  /** Secteur Gestmax (pastille en haut de la carte). */
  secteur?: string | null;
  aLaUne?: boolean;
  /** Distance en km (recherche autour d'une ville). */
  distance?: number | null;
}

export const echapper = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Informations masquables d'une carte (réglage « Ma page d'offres » du BO). */
export interface Masquer { logo?: boolean; salaire?: boolean; date?: boolean }

/** Lit l'attribut data-masquer (« logo,date ») du navigateur. */
export const lireMasquer = (valeur: string | undefined): Masquer =>
  Object.fromEntries((valeur ?? '').split(',').filter(Boolean).map((c) => [c, true]));

export function htmlCarteOffre(
  o: OffreCarte,
  { niveauTitre = 3, maintenant = Date.now(), masquer = {} as Masquer } = {},
): string {
  const h = `h${niveauTitre}`;
  // Le nom de l'entreprise est écrit en clair juste après : le logo est décoratif (alt vide).
  const logoUrl = lienSur(o.logoUrl);
  const logo = masquer.logo
    ? ''
    : logoUrl
      ? `<img class="offre__logo" src="${echapper(logoUrl)}" alt="" width="48" height="48" loading="lazy" decoding="async">`
      : o.nomEntreprise
        ? `<span class="offre__logo offre__logo--initiales" aria-hidden="true">${echapper(initiales(o.nomEntreprise))}</span>`
        : '';
  const badges = [
    o.aLaUne ? '<span class="badge-une">★ À la une</span>' : '',
    estNouveau(o.dateActivation, maintenant) ? '<span class="badge-nouveau">Nouveau</span>' : '',
  ].join('');
  // Étiquettes de la maquette : lieu, puis contrat (couleur de la famille de contrat).
  const etiquettes = [
    o.lieu
      ? `<li class="tag">${svgIcone('lieu', 16)}${echapper(o.lieu)}${o.distance != null && o.distance >= 1 ? ` <span class="offre__distance">(${Math.round(o.distance)} km)</span>` : ''}</li>`
      : '',
    o.typeContrat ? `<li class="tag tag--contrat badge-contrat badge-contrat--${classeContrat(o.typeContrat)}">${echapper(o.typeContrat)}</li>` : '',
  ].join('');
  const date = o.dateActivation && !masquer.date
    ? `<p class="offre__date">${svgIcone('horloge', 16)}<time datetime="${o.dateActivation}">Publiée ${ilYA(o.dateActivation, maintenant)}</time></p>`
    : '';
  const salaire = o.salaire && !masquer.salaire ? `<p class="offre__salaire">${svgIcone('euro', 16)}${echapper(o.salaire)}</p>` : '<span></span>';

  // data-slug : relie la carte à son repère sur la carte des offres (survol).
  return `<article class="carte carte--offre" data-slug="${echapper(o.slug)}">
  <div class="carte__corps">
    <div class="offre__haut">${logo}${o.secteur ? `<span class="offre__secteur">${echapper(o.secteur)}</span>` : ''}<div class="offre__badges">${badges}</div></div>
    <${h} class="carte__titre"><a href="/offres/${encodeURIComponent(o.slug)}/" class="carte__lien">${echapper(o.titre)}</a></${h}>
    ${o.nomEntreprise ? `<p class="offre__entreprise">${echapper(o.nomEntreprise)}</p>` : ''}
    ${etiquettes ? `<ul class="offre__tags">${etiquettes}</ul>` : ''}
    ${date}
    <div class="offre__pied">${salaire}<span class="lien-action" aria-hidden="true">Voir l'offre ${svgIcone('fleche', 16)}</span></div>
  </div>
</article>`;
}
