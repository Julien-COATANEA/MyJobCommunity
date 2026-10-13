// Limiteur de débit en mémoire (formulaires publics) : au plus `max` appels par adresse IP et par fenêtre.
// Suffisant pour une instance Strapi unique par client ; derrière un reverse proxy, activer « proxy: true » dans server.ts.
const appels = new Map<string, number[]>();

export function tropDeRequetes(cle: string, ip: string, max = 8, fenetreMs = 10 * 60 * 1000): boolean {
  const maintenant = Date.now();
  const id = `${cle}:${ip}`;
  const recents = (appels.get(id) ?? []).filter((t) => maintenant - t < fenetreMs);
  recents.push(maintenant);
  appels.set(id, recents);

  // Nettoyage occasionnel pour ne pas grossir indéfiniment.
  if (appels.size > 5000) for (const [k, v] of appels) if (!v.some((t) => maintenant - t < fenetreMs)) appels.delete(k);
  return recents.length > max;
}
