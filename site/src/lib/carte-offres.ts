// Carte des offres (page /offres, activée dans « Ma page d'offres » du BO) : fonctions pures, testées.
// Les offres sont géocodées à la ville : plusieurs offres partagent donc souvent le même point. On les regroupe
// en un seul repère par lieu, avec le nombre d'offres et leur liste dans l'infobulle.
import { echapper } from './carte-offre';

export interface OffreSurCarte {
  titre: string;
  slug: string;
  lieu: string | null;
  nomEntreprise: string | null;
  typeContrat: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

export interface Lieu {
  latitude: number;
  longitude: number;
  lieu: string;
  offres: OffreSurCarte[];
}

/** Nombre d'offres listées dans une infobulle ; au-delà, un lien filtre la liste sur le lieu. */
export const OFFRES_PAR_INFOBULLE = 5;

/** Un repère par position (arrondie à ~10 m), les lieux les plus fournis d'abord. */
export function regrouperParLieu(offres: OffreSurCarte[]): Lieu[] {
  const lieux = new Map<string, Lieu>();
  for (const o of offres) {
    // L'API renvoie les décimaux en texte.
    const latitude = Number(o.latitude);
    const longitude = Number(o.longitude);
    if (o.latitude == null || o.longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    const cle = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const lieu = lieux.get(cle) ?? { latitude, longitude, lieu: o.lieu?.trim() || 'Lieu non précisé', offres: [] };
    lieu.offres.push(o);
    lieux.set(cle, lieu);
  }
  return [...lieux.values()].sort((a, b) => b.offres.length - a.offres.length);
}

/** Contenu de l'infobulle d'un repère. */
export function htmlInfobulle(l: Lieu): string {
  const n = l.offres.length;
  const items = l.offres
    .slice(0, OFFRES_PAR_INFOBULLE)
    .map((o) => {
      const details = [o.nomEntreprise, o.typeContrat].filter(Boolean).map((t) => echapper(t!)).join(' · ');
      return `<li><a href="/offres/${encodeURIComponent(o.slug)}/">${echapper(o.titre)}</a>${details ? `<span>${details}</span>` : ''}</li>`;
    })
    .join('');
  const suite =
    n > OFFRES_PAR_INFOBULLE
      ? // Position du repère, pas le nom du lieu : une même ville est parfois écrite de plusieurs façons dans Gestmax.
        `<button type="button" class="lien-bouton" data-carte-lieu="${echapper(l.lieu)}" data-carte-lat="${l.latitude}" data-carte-lon="${l.longitude}">Voir les ${n} offres à ${echapper(l.lieu)}</button>`
      : '';
  return `<p class="carte-offres__lieu">${echapper(l.lieu)} : ${n} offre${n > 1 ? 's' : ''}</p><ul class="carte-offres__liste">${items}</ul>${suite}`;
}

/** Nom accessible d'un repère (lu par les lecteurs d'écran, au clavier). */
export const libelleRepere = (l: Lieu) => `${l.lieu} : ${l.offres.length} offre${l.offres.length > 1 ? 's' : ''}`;

/** Nom accessible d'un groupe de lieux (cliquer zoome dessus). */
export function libelleGroupe(lieux: Lieu[]): string {
  const n = lieux.reduce((t, l) => t + l.offres.length, 0);
  const noms = lieux.slice(0, 3).map((l) => l.lieu).join(', ');
  return `${n} offres autour de ${noms}${lieux.length > 3 ? '…' : ''} : zoomer sur cette zone`;
}

/**
 * Regroupe les lieux trop proches à l'écran (moins de `rayon` pixels) : un repère par groupe, comme
 * « leaflet.markercluster », mais avec le nombre d'offres et non de lieux. Les lieux les plus fournis servent de centre.
 */
export function regrouperProches<T extends { x: number; y: number; poids: number }>(points: T[], rayon: number): T[][] {
  const groupes: { centre: T; membres: T[] }[] = [];
  for (const p of [...points].sort((a, b) => b.poids - a.poids)) {
    const groupe = groupes.find((g) => Math.hypot(g.centre.x - p.x, g.centre.y - p.y) < rayon);
    if (groupe) groupe.membres.push(p);
    else groupes.push({ centre: p, membres: [p] });
  }
  return groupes.map((g) => g.membres);
}

export interface Zone { latMin: number; latMax: number; lonMin: number; lonMax: number }

/** Petite zone autour d'un repère : ses offres, quelle que soit l'orthographe de leur lieu. */
export const zoneAutour = (latitude: number, longitude: number): Zone => ({
  latMin: latitude - 0.0005, latMax: latitude + 0.0005, lonMin: longitude - 0.0005, lonMax: longitude + 0.0005,
});

/** Offre située dans la zone visible de la carte (les offres sans position en sont exclues). */
export function dansZone(o: Pick<OffreSurCarte, 'latitude' | 'longitude'>, z: Zone): boolean {
  if (o.latitude == null || o.longitude == null) return false;
  const lat = Number(o.latitude);
  const lon = Number(o.longitude);
  return lat >= z.latMin && lat <= z.latMax && lon >= z.lonMin && lon <= z.lonMax;
}

/** Épingle des cartes (offre seule, lieu d'un événement) : sa couleur suit currentColor. */
export const EPINGLE =
  '<svg viewBox="0 0 28 38" width="28" height="38" aria-hidden="true"><path d="M14 1.5C7.1 1.5 1.5 7 1.5 13.8c0 9.3 12.5 22.7 12.5 22.7s12.5-13.4 12.5-22.7C26.5 7 20.9 1.5 14 1.5z" fill="currentColor" stroke="#fff" stroke-width="2"/><circle cx="14" cy="13.8" r="4.8" fill="#fff"/></svg>';
