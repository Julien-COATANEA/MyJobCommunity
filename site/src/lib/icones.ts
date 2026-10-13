// Tracés des icônes SVG (partagés par le composant Icone.astro et les scripts du navigateur).
export const TRACES: Record<string, string> = {
  emploi: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
  entreprise: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4M8 7h2M14 7h2M8 11h2M14 11h2"/>',
  formation: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  territoire: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  lieu: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  logement: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  transport: '<rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16M8 21v-4M16 21v-4"/>',
  sante: '<path d="M20.8 6.6a5 5 0 0 0-8.8-2.1 5 5 0 0 0-8.8 2.1C2.4 11 12 20 12 20s9.6-9 8.8-13.4z"/>',
  famille: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5 5"/>',
  loisirs: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
  accompagnement: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  evenement: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  actualite: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  contrat: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  euro: '<path d="M17 6a7 7 0 1 0 0 12M4 10h9M4 14h9"/>',
  recherche: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  externe: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fermer: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  telephone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  utilisateur: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  valide: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  alerte: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  calendrier: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 14v4M10 16h4"/>',
  filtre: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  retour: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  cloche: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
  guillemet: '<path d="M9 7H5v6h4v-2c0 2-1 4-3 4M19 7h-4v6h4v-2c0 2-1 4-3 4"/>',
};

/** Icône décorative en SVG (aria-hidden) sous forme de chaîne HTML. */
export function svgIcone(nom: string, taille = 18): string {
  return `<svg class="icone" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TRACES[nom] ?? TRACES.info}</svg>`;
}
