// Mini-carte du lieu d'un événement (OpenStreetMap, Leaflet), chargée à la demande une fois l'adresse géocodée.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { EPINGLE } from './carte-offres';

export function afficherLieu(conteneur: HTMLElement, latitude: number, longitude: number, libelle: string) {
  // Molette désactivée : la carte est dans une colonne, elle ne doit pas capturer le défilement de la page.
  const carte = L.map(conteneur, { scrollWheelZoom: false }).setView([latitude, longitude], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">Contributeurs OpenStreetMap</a>',
  }).addTo(carte);
  carte.attributionControl.setPrefix(false);
  const icone = L.divIcon({ className: 'carte-lieu__epingle', html: EPINGLE, iconSize: [28, 38], iconAnchor: [14, 37] });
  L.marker([latitude, longitude], { icon: icone, title: libelle, keyboard: false }).addTo(carte);
}
