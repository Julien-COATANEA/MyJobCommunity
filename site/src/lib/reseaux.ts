// Réseaux sociaux : noms et logos (tracés pleins simplifiés, 24 × 24), pour le pied de page et les boutons de partage.
import { lienSur } from './liens';

export const NOMS_RESEAUX: Record<string, string> = {
  facebook: 'Facebook', linkedin: 'LinkedIn', instagram: 'Instagram', youtube: 'YouTube', x: 'X', tiktok: 'TikTok',
};

export const LOGOS_RESEAUX: Record<string, string> = {
  facebook: 'M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9H17l.5-4h-4V9c0-.6.4-1 1-1z',
  linkedin: 'M4.5 9h3.8v12H4.5zM6.4 3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4zM10.5 9h3.6v1.7c.5-1 1.8-2 3.7-2 3.9 0 4.7 2.6 4.7 5.9V21h-3.8v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21h-3.8z',
  instagram: 'M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 3.6c2.7 0 3 0 4.1.1 2.8.1 4.1 1.4 4.2 4.2.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.8-1.4 4.1-4.2 4.2-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.8-.1-4.1-1.4-4.2-4.2C3.6 15 3.6 14.7 3.6 12s0-3 .1-4.1c.1-2.8 1.4-4.1 4.2-4.2C9 3.6 9.3 3.6 12 3.6zM12 2c-2.7 0-3.1 0-4.2.1C4 2.2 2.2 4 2.1 7.8 2 8.9 2 9.3 2 12s0 3.1.1 4.2c.1 3.8 1.9 5.6 5.7 5.7 1.1.1 1.5.1 4.2.1s3.1 0 4.2-.1c3.8-.1 5.6-1.9 5.7-5.7.1-1.1.1-1.5.1-4.2s0-3.1-.1-4.2C21.8 4 20 2.2 16.2 2.1 15.1 2 14.7 2 12 2z',
  youtube: 'M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.5 2.5 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z',
  x: 'M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z',
  tiktok: 'M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.3v12.4a2.6 2.6 0 1 1-1.8-2.5V9.6a5.9 5.9 0 1 0 5.1 5.8V9.1a7.5 7.5 0 0 0 4.4 1.4V7.2a4.3 4.3 0 0 1-3.3-1.4z',
};

/** Liens de partage d'une page (sans script ni cookie de réseau social : de simples liens). */
export function liensPartage(url: string, titre: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titre);
  return [
    { reseau: 'linkedin', libelle: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { reseau: 'facebook', libelle: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { reseau: 'x', libelle: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
  ];
}

/** Réseaux du BO dont l'adresse est sûre (http, https…), adresse nettoyée. */
export const reseauxSurs = (reseaux: { reseau: string; url: string }[] | null | undefined) =>
  (reseaux ?? []).flatMap((r) => {
    const url = lienSur(r.url);
    return url ? [{ ...r, url }] : [];
  });
