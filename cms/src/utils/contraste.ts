// Calculs de contraste WCAG 2.x (critère RGAA 3.2 : 4,5:1 pour le texte courant).

export function luminance(hex: string): number {
  const valeur = hex.replace('#', '');
  const canaux = [0, 2, 4].map((i) => parseInt(valeur.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canaux.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratioContraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (sombre + 0.05);
}

const RATIO_TEXTE = 4.5;

interface Couleurs {
  couleurPrimaire?: string;
  couleurSecondaire?: string;
  couleurTexte?: string;
  couleurFond?: string;
}

/** Retourne la liste des combinaisons de couleurs non conformes RGAA (vide si tout est conforme). */
export function verifierContrastes(c: Couleurs): string[] {
  const erreurs: string[] = [];
  const hex = /^#[0-9A-Fa-f]{6}$/;
  const verifier = (avant: string | undefined, arriere: string | undefined, message: string) => {
    if (!avant || !arriere || !hex.test(avant) || !hex.test(arriere)) return;
    const ratio = ratioContraste(avant, arriere);
    if (ratio < RATIO_TEXTE) erreurs.push(`${message} (contraste ${ratio.toFixed(2)}:1, minimum ${RATIO_TEXTE}:1)`);
  };
  verifier(c.couleurTexte, c.couleurFond, 'Couleur du texte sur couleur de fond');
  // Les boutons et bandeaux affichent du texte blanc sur les couleurs primaire et secondaire.
  verifier('#ffffff', c.couleurPrimaire, 'Texte blanc sur couleur primaire');
  verifier('#ffffff', c.couleurSecondaire, 'Texte blanc sur couleur secondaire');
  // La couleur primaire sert aussi pour les liens sur le fond de page.
  verifier(c.couleurPrimaire, c.couleurFond, 'Liens (couleur primaire) sur couleur de fond');
  return erreurs;
}
