// Mini-carte du lieu d'un événement (Leaflet, fond Plan IGN), chargée à la demande ; adresse géocodée au build.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EPINGLE } from './carte-offres';
import { OPTIONS_CARTE, preparerCarte } from './fond-carte';

export function afficherLieu(conteneur: HTMLElement, latitude: number, longitude: number, libelle: string) {
  // Molette désactivée : la carte est dans une colonne, elle ne doit pas capturer le défilement de la page.
  const carte = L.map(conteneur, { ...OPTIONS_CARTE, scrollWheelZoom: false }).setView([latitude, longitude], 15);
  preparerCarte(carte);
  const icone = L.divIcon({ className: 'carte-lieu__epingle', html: EPINGLE, iconSize: [28, 38], iconAnchor: [14, 37] });
  L.marker([latitude, longitude], { icon: icone, title: libelle, keyboard: false }).addTo(carte);
}
