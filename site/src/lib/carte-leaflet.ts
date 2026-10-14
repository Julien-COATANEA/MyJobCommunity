// Carte OpenStreetMap de la page /offres (Leaflet). Chargée à la demande, seulement si la carte est activée
// dans « Ma page d'offres » et affichée : les autres pages ne téléchargent ni Leaflet ni les tuiles.
//  - les lieux proches à l'écran sont regroupés (cercle avec le nombre d'offres) ; un clic zoome sur le groupe ;
//  - une offre seule est une épingle, un lieu à plusieurs offres un cercle : leur infobulle liste les offres ;
//  - quand le visiteur déplace ou zoome la carte, `surDeplacement` reçoit la zone visible (la page filtre la liste).
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  EPINGLE, htmlInfobulle, libelleGroupe, libelleRepere, regrouperParLieu, regrouperProches, type Lieu, type OffreSurCarte, type Zone,
} from './carte-offres';
import type { Position } from './recherche-offres';

const FRANCE: L.LatLngTuple = [46.6, 2.4];
/** Distance à l'écran sous laquelle deux lieux sont regroupés. */
const RAYON_GROUPE_PX = 56;

export interface OptionsCarte {
  /** Déplacement ou zoom fait par le visiteur (pas par la page) : zone visible. */
  surDeplacement?: (zone: Zone) => void;
}

const icone = (n: number) => {
  const taille = n >= 100 ? 48 : n >= 10 ? 42 : 36;
  return L.divIcon({
    className: 'carte-offres__repere',
    html: `<span aria-hidden="true">${n}</span>`,
    iconSize: [taille, taille],
    iconAnchor: [taille / 2, taille / 2],
    popupAnchor: [0, -taille / 2],
  });
};
const epingle = L.divIcon({ className: 'carte-offres__epingle', html: EPINGLE, iconSize: [28, 38], iconAnchor: [14, 37], popupAnchor: [0, -34] });

export function creerCarte(conteneur: HTMLElement, { surDeplacement }: OptionsCarte = {}) {
  const carte = L.map(conteneur, { zoomSnap: 0.5 }).setView(FRANCE, 5);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Contributeurs OpenStreetMap</a>',
  }).addTo(carte);
  carte.attributionControl.setPrefix(false);
  const calque = L.layerGroup().addTo(carte);

  let lieux: Lieu[] = [];
  let cercle: L.Circle | null = null;
  let cadre: L.LatLngBounds | null = null;
  // Survol d'une offre dans la liste : repère (lieu ou groupe) qui la contient, mis en évidence.
  let reperesParSlug = new Map<string, L.Marker>();
  let slugActif: string | null = null;
  let repereActif: L.Marker | null = null;

  // Les déplacements faits par la page (cadrage sur les résultats) ne doivent pas filtrer la liste.
  let parLaPage = 0;
  const sansSignaler = (action: () => void) => {
    parLaPage++;
    try {
      action();
    } finally {
      parLaPage--;
    }
  };
  // Deux déplacements ne sont pas des choix de zone : le décalage qui affiche une infobulle en entier (annoncé par
  // « autopanstart ») et le recentrage après un changement de taille de la fenêtre (« resize », puis « moveend »
  // 200 ms plus tard). On ignore le « moveend » qui suit chacun d'eux.
  let ignorerProchain = false;
  carte.on('autopanstart', () => {
    ignorerProchain = true;
  });
  carte.on('resize', () => {
    if (!parLaPage) ignorerProchain = true; // ajuster() émet son « moveend » tout de suite, déjà ignoré
  });

  function mettreEnEvidence() {
    repereActif?.getElement()?.classList.remove('est-actif');
    repereActif?.setZIndexOffset(0);
    repereActif = slugActif ? reperesParSlug.get(slugActif) ?? null : null;
    repereActif?.getElement()?.classList.add('est-actif');
    repereActif?.setZIndexOffset(1000);
  }

  function dessiner() {
    calque.clearLayers();
    reperesParSlug = new Map();
    repereActif = null;
    if (cercle) calque.addLayer(cercle);
    const points = lieux.map((lieu) => {
      const p = carte.latLngToLayerPoint([lieu.latitude, lieu.longitude]);
      return { x: p.x, y: p.y, poids: lieu.offres.length, lieu };
    });
    for (const groupe of regrouperProches(points, RAYON_GROUPE_PX)) {
      const membres = groupe.map((g) => g.lieu);
      const n = membres.reduce((t, l) => t + l.offres.length, 0);
      const [principal] = membres;
      let repere: L.Marker;
      let libelle: string;
      if (membres.length === 1) {
        libelle = libelleRepere(principal);
        repere = L.marker([principal.latitude, principal.longitude], { icon: n === 1 ? epingle : icone(n), keyboard: true, riseOnHover: true })
          .bindPopup(htmlInfobulle(principal), { maxWidth: 320 });
      } else {
        libelle = libelleGroupe(membres);
        const limites = L.latLngBounds(membres.map((l) => [l.latitude, l.longitude] as L.LatLngTuple));
        repere = L.marker(limites.getCenter(), { icon: icone(n), keyboard: true, riseOnHover: true })
          .on('click', () => carte.fitBounds(limites, { padding: [50, 50], maxZoom: 13 }));
      }
      calque.addLayer(repere);
      const element = repere.getElement();
      element?.setAttribute('aria-label', libelle);
      element?.setAttribute('title', libelle);
      for (const lieu of membres) for (const o of lieu.offres) reperesParSlug.set(o.slug, repere);
    }
    mettreEnEvidence();
  }

  function cadrer() {
    const zoom = carte.getZoom();
    sansSignaler(() => {
      if (cadre) carte.fitBounds(cadre, { padding: [30, 30], maxZoom: 12, animate: false });
      else carte.setView(FRANCE, 5, { animate: false });
    });
    // Un changement de zoom redessine déjà les repères (zoomend).
    if (carte.getZoom() === zoom) dessiner();
  }

  // Les groupes dépendent du zoom seulement : un simple déplacement ne les change pas.
  carte.on('zoomend', dessiner);
  let attente: ReturnType<typeof setTimeout>;
  carte.on('moveend', () => {
    if (parLaPage) return;
    if (ignorerProchain) {
      ignorerProchain = false;
      return;
    }
    if (!surDeplacement) return;
    clearTimeout(attente);
    attente = setTimeout(() => {
      const b = carte.getBounds();
      surDeplacement({ latMin: b.getSouth(), latMax: b.getNorth(), lonMin: b.getWest(), lonMax: b.getEast() });
    }, 150);
  });

  return {
    /** Remplace les repères et recadre ; `zone` : cercle de la recherche autour d'une ville. */
    afficher(offres: OffreSurCarte[], zone?: { centre: Position; km: number } | null) {
      lieux = regrouperParLieu(offres);
      cercle = zone
        ? // Couleurs dans global.css : les attributs SVG n'acceptent pas les variables CSS.
          L.circle([zone.centre.latitude, zone.centre.longitude], { radius: zone.km * 1000, className: 'carte-offres__zone', weight: 2, interactive: false })
        : null;
      cadre = zone
        ? L.latLng(zone.centre.latitude, zone.centre.longitude).toBounds(zone.km * 2000)
        : lieux.length
          ? L.latLngBounds(lieux.map((l) => [l.latitude, l.longitude] as L.LatLngTuple))
          : null;
      cadrer();
    },
    /** Revient au cadrage de tous les résultats. */
    recadrer: cadrer,
    /** À appeler quand la carte devient visible ou change de taille. */
    ajuster: () => sansSignaler(() => carte.invalidateSize({ pan: false })),
    fermerInfobulle: () => carte.closePopup(),
    /** Oublie un déplacement pas encore signalé (une nouvelle recherche le rendrait obsolète). */
    annulerDeplacement: () => clearTimeout(attente),
    /** Zoome sur un lieu sans le signaler comme choix de zone (la page a déjà filtré la liste sur ce lieu). */
    centrerSur(latitude: number, longitude: number) {
      sansSignaler(() => carte.setView([latitude, longitude], Math.max(carte.getZoom(), 12), { animate: false }));
    },
    /** Met en évidence le repère de l'offre survolée dans la liste (null : aucun). */
    surligner(slug: string | null) {
      slugActif = slug;
      mettreEnEvidence();
    },
  };
}

export type CarteOffres = ReturnType<typeof creerCarte>;
