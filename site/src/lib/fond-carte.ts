// Réglages communs des cartes Leaflet : fond Plan IGN (Géoplateforme, service public, comme le géocodeur) et
// libellés en français.
import L from 'leaflet';

export const TUILES_IGN =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
  '&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';

/** Options de L.map : boutons de zoom ajoutés en français par preparerCarte. */
export const OPTIONS_CARTE: L.MapOptions = { zoomControl: false };

export function preparerCarte(carte: L.Map) {
  L.control.zoom({ zoomInTitle: 'Zoomer', zoomOutTitle: 'Dézoomer' }).addTo(carte);
  L.tileLayer(TUILES_IGN, { minZoom: 2, maxZoom: 18, attribution: '© IGN – Plan IGN' }).addTo(carte);
  carte.attributionControl.setPrefix(false);
  // Bouton de fermeture des infobulles : « Close popup » en anglais par défaut.
  carte.on('popupopen', (e) => {
    const fermer = e.popup.getElement()?.querySelector('.leaflet-popup-close-button');
    fermer?.setAttribute('aria-label', 'Fermer');
    fermer?.setAttribute('title', 'Fermer');
  });
}
