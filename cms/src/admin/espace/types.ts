// Types de contenus pris en charge par les encarts des fiches (« Sur le site », « Avant de publier », « Publication ») :
// un seul endroit à compléter quand on ajoute un type. Côté serveur, voir aussi TYPES_PUBLIES (suivi.ts) et
// demanderPublication (equipe.ts).

export interface DefinitionType {
  /** Page unique (single type) : pas de documentId dans l'URL de la fiche. */
  unique?: boolean;
  /** Contrôles qualité et référencement avant publication. */
  qualite?: boolean;
  /** Le site produit une description même sans résumé saisi : pas d'alerte « aucune description ». */
  descriptionAutomatique?: boolean;
  /** Brouillon puis publication : les rédacteurs demandent la publication à un responsable. */
  demandePublication?: boolean;
}

export const TYPES_FICHES: Record<string, DefinitionType> = {
  'api::accueil.accueil': { unique: true, qualite: true, descriptionAutomatique: true, demandePublication: true },
  'api::page-offres.page-offres': { unique: true, qualite: true, descriptionAutomatique: true, demandePublication: true },
  'api::page.page': { qualite: true, demandePublication: true },
  'api::article.article': { qualite: true, demandePublication: true },
  'api::evenement.evenement': { qualite: true },
  'api::entreprise.entreprise': { qualite: true },
};

export const definition = (model: string): DefinitionType | undefined => TYPES_FICHES[model];
