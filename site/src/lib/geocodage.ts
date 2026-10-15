// Géocodage d'une adresse au build (géocodeur de l'IGN, Géoplateforme) : les coordonnées sont écrites dans la page,
// le navigateur du visiteur n'interroge plus le géocodeur. Échec ou adresse incertaine : null (pas de carte).
const DELAI_MS = 5000;
const cache = new Map<string, Promise<{ latitude: number; longitude: number } | null>>();

export function geocoder(adresse: string) {
  const cle = adresse.trim().toLowerCase();
  if (!cache.has(cle)) {
    const p = new URLSearchParams({ q: adresse, limit: '1' });
    cache.set(
      cle,
      fetch(`https://data.geopf.fr/geocodage/search?${p}`, { signal: AbortSignal.timeout(DELAI_MS) })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const f = j?.features?.[0];
          const [longitude, latitude] = f?.geometry?.coordinates ?? [];
          return f && f.properties?.score >= 0.5 && Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
        })
        .catch(() => null),
    );
  }
  return cache.get(cle)!;
}
