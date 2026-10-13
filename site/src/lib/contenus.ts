// Accès typés aux contenus Strapi.
import { lireTous, lireUnique, type Media, type Seo } from './strapi';
import type { Bloc } from './blocks';

export interface Lien { libelle: string; url: string; nouvelOnglet?: boolean | null }
export interface SousLien extends Lien { description?: string | null }
export interface EntreeMenu { id: number; libelle: string; url?: string | null; sousLiens: SousLien[] }

export interface Parametres {
  nomSite: string;
  baseline: string | null;
  logo: Media | null;
  logoTexte: string | null;
  favicon: Media | null;
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurTexte: string;
  couleurFond: string;
  policeTitres: string;
  policeTexte: string;
  arrondis: 'carres' | 'legers' | 'prononces';
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  reseauxSociaux: { reseau: string; url: string }[];
  gestmaxUrlFront: string | null;
  lienEspaceCandidat: string | null;
  lienEspaceRecruteur: string | null;
  lienCandidatureSpontanee: string | null;
  seoParDefaut: Seo | null;
}

export interface Navigation {
  menuPrincipal: EntreeMenu[];
  liensPiedDePage: Lien[];
  liensLegaux: Lien[];
}

/** Composant d'une zone dynamique (bloc de page). */
export interface Section { __component: string; id: number; [cle: string]: any }

export interface Accueil {
  heroTitre: string;
  heroTexte: string | null;
  heroImage: Media | null;
  heroRecherche: boolean;
  sections: Section[];
  seo: Seo | null;
}

export interface Page {
  documentId: string;
  titre: string;
  slug: string;
  chapo: string | null;
  imageBandeau: Media | null;
  sections: Section[];
  seo: Seo | null;
  updatedAt: string;
}

export interface Article {
  documentId: string;
  titre: string;
  slug: string;
  datePublication: string;
  categorie: { nom: string; slug: string } | null;
  extrait: string;
  image: Media | null;
  contenu: Bloc[];
  miseEnAvant: boolean;
  seo: Seo | null;
  updatedAt: string;
}

export interface Evenement {
  documentId: string;
  titre: string;
  slug: string;
  typeEvenement: string;
  dateDebut: string;
  dateFin: string | null;
  lieu: string | null;
  adresse: string | null;
  enLigne: boolean;
  extrait: string;
  image: Media | null;
  contenu: Bloc[] | null;
  inscriptionActive: boolean;
  placesMax: number | null;
  dateLimiteInscription: string | null;
  inscriptionExterneUrl: string | null;
  seo: Seo | null;
  updatedAt: string;
}

export interface Offre {
  documentId: string;
  sourceId: string;
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  departement: string | null;
  secteur: string | null;
  nomEntreprise: string | null;
  entreprise: { nom: string; slug: string; logo: Media | null } | null;
  salaire: string | null;
  descriptionHtml: string | null;
  profilHtml: string | null;
  dateActivation: string | null;
  dateFinPublication: string | null;
  urlDetailGestmax: string | null;
  urlCandidature: string | null;
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface Temoignage { citation: string; nom: string; role: string | null; photo: Media | null }

export interface Entreprise {
  documentId: string;
  nom: string;
  slug: string;
  secteur: { nom: string; slug: string } | null;
  ville: string;
  adresse: string | null;
  effectif: string | null;
  extrait: string;
  description: Bloc[] | null;
  logo: Media | null;
  image: Media | null;
  siteWeb: string | null;
  nomEntiteGestmax: string | null;
  miseEnAvant: boolean;
  offres: Offre[];
  seo: Seo | null;
  updatedAt: string;
}

export const lireParametres = async () => {
  const p = await lireUnique<Parametres>('parametres');
  if (!p) throw new Error('Les « Paramètres du site » ne sont pas renseignés dans Strapi.');
  return p;
};
export const lireNavigation = async () =>
  (await lireUnique<Navigation>('navigation')) ?? { menuPrincipal: [], liensPiedDePage: [], liensLegaux: [] };
export const lireAccueil = () => lireUnique<Accueil>('accueil');
export const lirePages = () => lireTous<Page>('pages', { sort: 'titre:asc' });
export const lireArticles = () => lireTous<Article>('articles', { sort: 'datePublication:desc' });
export const lireEvenements = () => lireTous<Evenement>('evenements', { sort: 'dateDebut:asc' });
export const lireEntreprises = () => lireTous<Entreprise>('entreprises', { sort: 'nom:asc' });
export const lireOffres = () => lireTous<Offre>('offres', { sort: 'dateActivation:desc' });

/** Événements à venir (ou en cours) à la date du build. */
export async function lireEvenementsAVenir(): Promise<Evenement[]> {
  const maintenant = Date.now();
  return (await lireEvenements()).filter((e) => new Date(e.dateFin ?? e.dateDebut).getTime() >= maintenant);
}

/** Chiffres réels du site, pour l'accroche de l'accueil et les jetons {offres}, {entreprises}, {evenements}. */
export async function lireCompteurs() {
  const [offres, entreprises, evenements] = await Promise.all([lireOffres(), lireEntreprises(), lireEvenementsAVenir()]);
  return { offres: offres.length, entreprises: entreprises.length, evenements: evenements.length };
}

/** Remplace {offres}, {entreprises} et {evenements} par les valeurs réelles. */
export function remplacerCompteurs(texte: string, compteurs: Record<string, number>): string {
  return texte.replace(/\{(offres|entreprises|evenements)\}/g, (_m, cle) => new Intl.NumberFormat('fr-FR').format(compteurs[cle] ?? 0));
}
