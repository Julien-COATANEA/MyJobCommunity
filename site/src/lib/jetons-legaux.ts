// Jetons des pages légales (mentions légales, données personnelles…) : {editeur}, {siret}, {site}… sont remplacés au
// build par les valeurs des « Paramètres du site ». Une valeur vide devient « [à compléter] » (visible : la
// collectivité doit la renseigner). Un jeton inconnu (ex. {offres}, géré ailleurs) est laissé tel quel.

export interface ParametresLegaux {
  nomSite?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  editeurNom?: string | null;
  editeurSiret?: string | null;
  directeurPublication?: string | null;
  hebergeurNom?: string | null;
  hebergeurAdresse?: string | null;
  hebergeurTelephone?: string | null;
  contactDonneesEmail?: string | null;
  prestataireNom?: string | null;
}

export const A_COMPLETER = '[à compléter]';

const propre = (v?: string | null) => v?.trim() || '';

/** Valeurs des jetons ; `urlSite` est l'adresse publique du site (SITE_URL). */
export function valeursJetonsLegaux(p: ParametresLegaux, urlSite?: string | null): Record<string, string> {
  return {
    editeur: propre(p.editeurNom) || propre(p.nomSite),
    siret: propre(p.editeurSiret),
    directeur: propre(p.directeurPublication),
    adresse: propre(p.adresse),
    telephone: propre(p.telephone),
    email: propre(p.email),
    hebergeur: propre(p.hebergeurNom),
    'hebergeur-adresse': propre(p.hebergeurAdresse),
    'hebergeur-telephone': propre(p.hebergeurTelephone),
    'contact-donnees': propre(p.contactDonneesEmail) || propre(p.email),
    prestataire: propre(p.prestataireNom),
    site: propre(p.nomSite),
    'url-site': propre(urlSite).replace(/\/+$/, ''),
  };
}

/** Texte brut : l'échappement HTML est fait ensuite par le rendu (voir lib/blocks.ts). */
export function remplacerJetonsLegaux(texte: string, p: ParametresLegaux, urlSite?: string | null): string {
  const valeurs = valeursJetonsLegaux(p, urlSite);
  return texte.replace(/\{([a-z-]+)\}/g, (jeton, cle: string) =>
    Object.prototype.hasOwnProperty.call(valeurs, cle) ? valeurs[cle] || A_COMPLETER : jeton,
  );
}
