// Navigation hors de l'arbre React de Strapi : recherche Ctrl + K, volet « Tous les contenus » repliable, bouton « Retour » masqué.
// On écrit l'historique comme React Router (clé + index) pour que le bouton précédent du navigateur reste cohérent.

export function allerVers(lien: string) {
  const index = typeof window.history.state?.idx === 'number' ? window.history.state.idx : 0;
  window.history.pushState({ usr: null, key: Math.random().toString(36).slice(2, 10), idx: index + 1 }, '', `/admin${lien}`);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}


// ---------- Bouton « Retour » masqué ----------
// Les fiches s'ouvrent depuis le menu ou la recherche : le bouton de Strapi, inactif dès qu'on arrive directement
// sur une fiche, n'apportait que de la confusion. Il est repéré par son libellé puis masqué.

const TEXTES_RETOUR = ['retour', 'back'];
const estRetour = (a: Element): boolean =>
  a.tagName === 'A' && TEXTES_RETOUR.includes((a.textContent ?? '').trim().toLowerCase()) && !!a.querySelector('svg');

function installerRetour() {
  const style = document.createElement('style');
  style.textContent = `main a[data-mjc-retour] { display: none !important; }`;
  document.head.appendChild(style);

  const marquer = () => {
    document.querySelectorAll<HTMLAnchorElement>('main a:not([data-mjc-retour])').forEach((a) => {
      if (estRetour(a)) a.setAttribute('data-mjc-retour', '');
    });
  };
  let planifie = false;
  new MutationObserver(() => {
    if (planifie) return;
    planifie = true;
    requestAnimationFrame(() => {
      planifie = false;
      marquer();
    });
  }).observe(document.body, { childList: true, subtree: true });
  marquer();
}

// ---------- Volet « Tous les contenus » repliable ----------

const CLE = 'mjc-volet-contenus-ferme';
const VOLET = "nav[aria-label='Tous les contenus']";
const lire = () => {
  try { return localStorage.getItem(CLE) === '1'; } catch { return false; }
};
const ecrire = (ferme: boolean) => {
  try { localStorage.setItem(CLE, ferme ? '1' : '0'); } catch { /* sans conséquence */ }
};

function installerVolet() {
  const style = document.createElement('style');
  style.textContent = `
    body.mjc-volet-ferme div:has(> ${VOLET}) { display: none !important; }
    .mjc-volet-bouton {
      position: fixed; z-index: 60; width: 28px; height: 28px; border-radius: 50%;
      border: 1px solid #dcdce4; background: #fff; color: #32324d; cursor: pointer;
      display: none; align-items: center; justify-content: center; padding: 0;
      box-shadow: 0 1px 4px rgba(33,33,52,.15); font-family: inherit; font-size: 16px; font-weight: 700; line-height: 1;
    }
    .mjc-volet-bouton:hover { background: #f0f0ff; border-color: var(--mjc-primaire, #4945ff); }
    .mjc-volet-bouton:focus-visible { outline: 2px solid var(--mjc-primaire, #4945ff); outline-offset: 2px; }
  `;
  document.head.appendChild(style);

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'mjc-volet-bouton';
  document.body.appendChild(bouton);
  document.body.classList.toggle('mjc-volet-ferme', lire());

  bouton.addEventListener('click', () => {
    const ferme = !document.body.classList.contains('mjc-volet-ferme');
    document.body.classList.toggle('mjc-volet-ferme', ferme);
    ecrire(ferme);
    placer();
  });

  /** Bord droit du menu principal (le volet vient juste à sa droite). */
  const bordMenuPrincipal = () => {
    for (const nav of document.querySelectorAll('nav')) {
      const r = nav.getBoundingClientRect();
      if (r.left < 5 && r.width < 400 && r.height > 300 && nav.matches(VOLET) === false) return r.right;
    }
    return 0;
  };

  function placer() {
    // Uniquement dans la mise en page avec menu latéral : jamais en aperçu plein écran ni en vue mobile.
    const surContenus = window.location.pathname.includes('/content-manager') && !window.location.pathname.endsWith('/preview');
    const volet = document.querySelector<HTMLElement>(VOLET);
    const ferme = document.body.classList.contains('mjc-volet-ferme');
    const menuVisible = bordMenuPrincipal() > 0;
    if (!surContenus || !menuVisible || (!volet && !ferme)) {
      bouton.style.display = 'none';
      return;
    }
    const gauche = ferme ? bordMenuPrincipal() + 6 : (volet?.getBoundingClientRect().right ?? 0) - 36;
    bouton.style.display = 'flex';
    bouton.style.left = `${Math.max(gauche, 4)}px`;
    bouton.style.top = ferme ? '14px' : '16px';
    bouton.textContent = ferme ? '»' : '«';
    bouton.setAttribute('aria-expanded', String(!ferme));
    const libelle = ferme ? 'Afficher la liste des contenus' : 'Masquer la liste des contenus';
    bouton.setAttribute('aria-label', libelle);
    bouton.title = libelle;
  }

  setInterval(placer, 400);
  window.addEventListener('resize', placer);
  placer();
}

export function monterNavigation() {
  if (document.getElementById('mjc-navigation-ok')) return;
  const marque = document.createElement('meta');
  marque.id = 'mjc-navigation-ok';
  document.head.appendChild(marque);
  installerRetour();
  installerVolet();
}
