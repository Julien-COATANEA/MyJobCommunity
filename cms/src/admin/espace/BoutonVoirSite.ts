// Bouton « Voir mon site » en haut du tableau de bord, juste après le titre « Bonjour … » (comme sur l'écran Apparence).
// L'en-tête de la page d'accueil de Strapi n'a pas d'emplacement prévu : le bouton est posé après le titre dès que la page
// s'affiche (même principe que les autres ajouts hors de l'arbre React, voir navigation.ts). Il reprend les couleurs du
// bouton voisin « Ajouter un widget » : identique en thème clair comme en thème sombre. Sans adresse du site (SITE_URL),
// pas de bouton.
import { getFetchClient } from '@strapi/strapi/admin';

const MARQUE = 'data-mjc-voir-site';
let adresse: Promise<string | null> | null = null;

/** Adresse publique du site, lue une seule fois (nouvel essai au prochain affichage en cas d'échec). */
const lireAdresse = () =>
  (adresse ??= getFetchClient()
    .get<{ urlSite?: string }>('/espace/etat-site')
    .then(({ data }) => data.urlSite || null)
    .catch(() => {
      adresse = null;
      return null;
    }));

const surTableauDeBord = () => /^\/admin\/?$/.test(location.pathname);
const titreDuTableauDeBord = () => (surTableauDeBord() ? document.querySelector<HTMLHeadingElement>('main h1') : null);
const dejaPose = (titre: Element) => !!titre.parentElement?.querySelector(`[${MARQUE}]`);

function creerBouton(url: string): HTMLAnchorElement {
  const lien = document.createElement('a');
  lien.setAttribute(MARQUE, '');
  lien.className = 'mjc-voir-site';
  lien.href = url;
  lien.target = '_blank';
  lien.rel = 'noopener';
  lien.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<span>Voir mon site</span><span class="mjc-voir-site__sr"> (nouvel onglet)</span>';
  return lien;
}

/** Reprend le fond, la bordure et le texte du bouton voisin « Ajouter un widget » (thème clair ou sombre de Strapi). */
function harmoniser(lien: HTMLAnchorElement, titre: Element) {
  // En-tête de Strapi : [bloc du titre (h1 + notre bouton)] [zone de l'action principale (bouton, parfois enveloppé)].
  const zone = titre.parentElement?.nextElementSibling;
  const voisin = zone?.matches('button') ? (zone as HTMLElement) : zone?.querySelector<HTMLElement>('button');
  if (!voisin) return;
  const style = getComputedStyle(voisin);
  lien.style.backgroundColor = style.backgroundColor;
  lien.style.borderColor = style.borderColor;
  lien.style.color = style.color;
}

function poser() {
  const titre = titreDuTableauDeBord();
  if (!titre || dejaPose(titre)) return;
  void lireAdresse().then((url) => {
    // La page a pu changer pendant la lecture de l'adresse.
    if (!url || !titre.isConnected || titre !== titreDuTableauDeBord() || dejaPose(titre)) return;
    const lien = creerBouton(url);
    titre.insertAdjacentElement('afterend', lien);
    harmoniser(lien, titre);
  });
}

export function monterBoutonVoirSite() {
  if (document.getElementById('mjc-voir-site-styles')) return;
  const style = document.createElement('style');
  style.id = 'mjc-voir-site-styles';
  // Même gabarit qu'un bouton « tertiaire » de Strapi (32 px de haut, angles de 4 px), espacé du titre comme un
  // « secondaryAction » d'en-tête.
  style.textContent = `
    .mjc-voir-site {
      display: inline-flex; align-items: center; gap: 0.8rem; flex: none; margin-left: 1.6rem; min-height: 3.2rem;
      padding: 0.6rem 1.6rem; border: 1px solid color-mix(in srgb, currentColor 22%, transparent); border-radius: 4px;
      background: transparent; color: inherit; font: inherit; font-size: 1.2rem; font-weight: 600; line-height: 1.33;
      text-decoration: none; white-space: nowrap; transition: background-color 0.15s, border-color 0.15s;
    }
    .mjc-voir-site:hover { filter: brightness(0.97); text-decoration: underline; }
    .mjc-voir-site:focus-visible { outline: 2px solid var(--mjc-primaire, #4945ff); outline-offset: 2px; }
    .mjc-voir-site svg { flex: none; }
    .mjc-voir-site__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  `;
  document.head.appendChild(style);

  let planifie = false;
  new MutationObserver(() => {
    if (planifie) return;
    planifie = true;
    requestAnimationFrame(() => {
      planifie = false;
      poser();
    });
  }).observe(document.body, { childList: true, subtree: true });
  poser();
}
