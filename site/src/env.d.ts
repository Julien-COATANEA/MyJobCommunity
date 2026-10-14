// Données partagées entre la mise en page et les composants pendant le rendu d'une page.
declare namespace App {
  interface Locals {
    /** Fil d'Ariane de la page (transmis par Base.astro). */
    ariane?: import('./components/FilAriane.astro').Miette[];
    /** Vrai si un en-tête de page l'a déjà affiché dans son bandeau : Base ne le répète pas. */
    arianeAffichee?: boolean;
  }
}
