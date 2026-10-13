// Génère les schémas des types de contenu (src/api/<type>/content-types/<type>/schema.json)
// et le code de base (controller / route / service) quand il n'existe pas encore.
//   node scripts/generer-types.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'api');

const str = (extra = {}) => ({ type: 'string', ...extra });
const image = (extra = {}) => ({ type: 'media', multiple: false, allowedTypes: ['images'], ...extra });
const comp = (component, repeatable, extra = {}) => ({ type: 'component', component, repeatable, ...extra });
const couleur = (defaut) => ({
  type: 'customField',
  customField: 'plugin::color-picker.color',
  options: { format: 'hex' },
  regex: '^#[0-9A-Fa-f]{6}$',
  required: true,
  default: defaut,
});
const lien = (extra = {}) => ({ type: 'customField', customField: 'global::lien', ...extra });
const seo = comp('shared.seo', false);

const BLOCS = [
  'blocs.texte', 'blocs.texte-image', 'blocs.chiffres-cles', 'blocs.cartes', 'blocs.appel-action',
  'blocs.faq', 'blocs.logos', 'blocs.recherche-offres', 'blocs.dernieres-offres',
  'blocs.dernieres-actualites', 'blocs.prochains-evenements', 'blocs.entreprises', 'blocs.temoignages', 'blocs.iframe',
];

const types = {
  // ---------- Paramétrage ----------
  parametres: {
    kind: 'singleType', draftAndPublish: false,
    singular: 'parametres', plural: 'parametres-list',
    displayName: 'Informations du site',
    description: 'Identité, thème (couleurs, polices, logo), coordonnées et intégration Gestmax',
    attributes: {
      nomSite: str({ required: true }),
      baseline: str(),
      logo: image(),
      logoTexte: str({ maxLength: 4 }),
      favicon: image(),
      // Tokens de thème → variables CSS au build du site
      couleurPrimaire: couleur('#1a5f7a'),
      couleurSecondaire: couleur('#0f3d4c'),
      couleurAccent: couleur('#e8833a'),
      couleurTexte: couleur('#1c2b33'),
      couleurFond: couleur('#ffffff'),
      policeTitres: { type: 'enumeration', enum: ['sora', 'inter', 'source-sans-3', 'atkinson-hyperlegible', 'systeme'], default: 'sora', required: true },
      policeTexte: { type: 'enumeration', enum: ['inter', 'source-sans-3', 'atkinson-hyperlegible', 'sora', 'systeme'], default: 'inter', required: true },
      arrondis: { type: 'enumeration', enum: ['carres', 'legers', 'prononces'], default: 'legers', required: true },
      // Coordonnées (pied de page)
      adresse: { type: 'text' },
      telephone: str(),
      email: { type: 'email' },
      reseauxSociaux: comp('shared.reseau-social', true),
      emailNotificationInscriptions: { type: 'email', private: true },
      // Gestmax
      gestmaxUrlFront: str(),
      lienEspaceCandidat: lien(),
      lienEspaceRecruteur: lien(),
      lienCandidatureSpontanee: lien(),
      seoParDefaut: seo,
    },
  },
  navigation: {
    kind: 'singleType', draftAndPublish: false,
    singular: 'navigation', plural: 'navigations',
    displayName: 'Menus du site',
    description: "Menu principal et liens du pied de page. Les URL « gestmax:/chemin » pointent vers le front Gestmax.",
    attributes: {
      menuPrincipal: comp('navigation.entree', true),
      liensPiedDePage: comp('shared.lien', true),
      liensLegaux: comp('shared.lien', true),
    },
  },
  accueil: {
    kind: 'singleType', draftAndPublish: true,
    singular: 'accueil', plural: 'accueils',
    displayName: "Page d'accueil",
    attributes: {
      heroTitre: str({ required: true }),
      heroTexte: { type: 'text' },
      heroImage: image(),
      heroRecherche: { type: 'boolean', default: true },
      sections: { type: 'dynamiczone', components: BLOCS },
      seo,
    },
  },

  // ---------- Contenus éditoriaux ----------
  page: {
    kind: 'collectionType', draftAndPublish: true,
    singular: 'page', plural: 'pages',
    displayName: 'Pages',
    description: 'Page libre composée de blocs standardisés',
    attributes: {
      titre: str({ required: true }),
      slug: { type: 'uid', targetField: 'titre', required: true },
      chapo: { type: 'text' },
      imageBandeau: image(),
      sections: { type: 'dynamiczone', components: BLOCS },
      publierLe: { type: 'datetime' },
      seo,
    },
  },
  'categorie-article': {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'categorie-article', plural: 'categories-articles',
    displayName: "Catégories d'articles",
    attributes: {
      nom: str({ required: true, unique: true }),
      slug: { type: 'uid', targetField: 'nom', required: true },
      articles: { type: 'relation', relation: 'oneToMany', target: 'api::article.article', mappedBy: 'categorie' },
    },
  },
  article: {
    kind: 'collectionType', draftAndPublish: true,
    singular: 'article', plural: 'articles',
    displayName: 'Articles',
    attributes: {
      titre: str({ required: true }),
      slug: { type: 'uid', targetField: 'titre', required: true },
      datePublication: { type: 'date', required: true },
      categorie: { type: 'relation', relation: 'manyToOne', target: 'api::categorie-article.categorie-article', inversedBy: 'articles' },
      extrait: { type: 'text', required: true, maxLength: 300 },
      image: image(),
      contenu: { type: 'blocks', required: true },
      miseEnAvant: { type: 'boolean', default: false },
      publierLe: { type: 'datetime' },
      seo,
    },
  },
  evenement: {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'evenement', plural: 'evenements',
    displayName: 'Événements',
    attributes: {
      titre: str({ required: true }),
      slug: { type: 'uid', targetField: 'titre', required: true },
      typeEvenement: { type: 'enumeration', enum: ['Forum emploi', 'Job dating', 'Atelier', 'Webinaire', 'Visite entreprise', 'Réunion d\'information', 'Autre'], required: true },
      dateDebut: { type: 'datetime', required: true },
      dateFin: { type: 'datetime' },
      // Champs conditionnels : n'apparaissent dans le BO que lorsqu'ils servent.
      enLigne: { type: 'boolean', default: false },
      lieu: str({ conditions: { visible: { '==': [{ var: 'enLigne' }, false] } } }),
      adresse: str({ conditions: { visible: { '==': [{ var: 'enLigne' }, false] } } }),
      extrait: { type: 'text', required: true, maxLength: 300 },
      image: image(),
      contenu: { type: 'blocks' },
      // Inscription en ligne
      inscriptionActive: { type: 'boolean', default: false },
      placesMax: { type: 'integer', min: 1, conditions: { visible: { '==': [{ var: 'inscriptionActive' }, true] } } },
      dateLimiteInscription: { type: 'datetime', conditions: { visible: { '==': [{ var: 'inscriptionActive' }, true] } } },
      listeAttente: { type: 'boolean', default: false, conditions: { visible: { '==': [{ var: 'inscriptionActive' }, true] } } },
      inscriptionExterneUrl: str(),
      inscriptions: { type: 'relation', relation: 'oneToMany', target: 'api::inscription.inscription', mappedBy: 'evenement' },
      seo,
    },
  },
  inscription: {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'inscription', plural: 'inscriptions',
    displayName: 'Inscriptions',
    attributes: {
      evenement: { type: 'relation', relation: 'manyToOne', target: 'api::evenement.evenement', inversedBy: 'inscriptions' },
      prenom: str({ required: true }),
      nom: str({ required: true }),
      email: { type: 'email', required: true },
      telephone: str(),
      structure: str(),
      statut: { type: 'enumeration', enum: ['confirmee', 'attente', 'annulee'], default: 'confirmee', required: true },
      consentement: { type: 'boolean', required: true },
      present: { type: 'boolean', default: false },
      // Jeton secret du lien d'annulation envoyé par e-mail ; rappel de la veille déjà envoyé ?
      jeton: str({ private: true }),
      rappelEnvoye: { type: 'boolean', default: false, private: true },
    },
  },

  // ---------- Annuaire et offres ----------
  secteur: {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'secteur', plural: 'secteurs',
    displayName: "Secteurs d'activité",
    attributes: {
      nom: str({ required: true, unique: true }),
      slug: { type: 'uid', targetField: 'nom', required: true },
      entreprises: { type: 'relation', relation: 'oneToMany', target: 'api::entreprise.entreprise', mappedBy: 'secteur' },
    },
  },
  entreprise: {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'entreprise', plural: 'entreprises',
    displayName: 'Entreprises',
    description: "Fiche de l'annuaire des entreprises",
    attributes: {
      nom: str({ required: true }),
      slug: { type: 'uid', targetField: 'nom', required: true },
      secteur: { type: 'relation', relation: 'manyToOne', target: 'api::secteur.secteur', inversedBy: 'entreprises' },
      ville: str({ required: true }),
      adresse: str(),
      effectif: { type: 'enumeration', enum: ['moins de 10 salariés', 'de 10 à 49 salariés', 'de 50 à 249 salariés', 'de 250 à 999 salariés', 'plus de 1000 salariés'] },
      extrait: { type: 'text', required: true, maxLength: 300 },
      description: { type: 'blocks' },
      logo: image(),
      image: image(),
      siteWeb: str(),
      miseEnAvant: { type: 'boolean', default: false },
      // Nom de l'entité dans Gestmax (customer_company) pour rattacher les offres synchronisées
      nomEntiteGestmax: str(),
      offres: { type: 'relation', relation: 'oneToMany', target: 'api::offre.offre', mappedBy: 'entreprise' },
      seo,
    },
  },
  offre: {
    kind: 'collectionType', draftAndPublish: false,
    singular: 'offre', plural: 'offres',
    displayName: "Offres d'emploi",
    description: 'Importée de Gestmax : jamais créée ni modifiée ici (seuls « à la une » et « masquée » se règlent dans le BO)',
    attributes: {
      sourceId: str({ required: true, unique: true }),
      titre: str({ required: true }),
      slug: str({ required: true, unique: true }),
      typeContrat: str(),
      lieu: str(),
      departement: str(),
      secteur: str(),
      nomEntreprise: str(),
      entreprise: { type: 'relation', relation: 'manyToOne', target: 'api::entreprise.entreprise', inversedBy: 'offres' },
      salaire: str(),
      descriptionHtml: { type: 'text' },
      profilHtml: { type: 'text' },
      dateActivation: { type: 'datetime' },
      dateFinPublication: { type: 'datetime' },
      urlDetailGestmax: str(),
      urlCandidature: str(),
      logoUrl: str(),
      // Seuls réglages modifiables dans le BO : tout le reste vient de Gestmax
      aLaUne: { type: 'boolean', default: false },
      masquee: { type: 'boolean', default: false },
      // Position de la ville (géocodée à la synchronisation) : recherche par rayon
      latitude: { type: 'decimal' },
      longitude: { type: 'decimal' },
      empreinte: str({ private: true }),
    },
  },
};

const fichier = (chemin, contenu) => {
  if (existsSync(chemin)) return;
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, contenu);
};

for (const [nom, t] of Object.entries(types)) {
  const uid = `api::${nom}.${nom}`;
  const schema = {
    kind: t.kind,
    collectionName: nom.replace(/-/g, '_'),
    info: {
      singularName: t.singular,
      pluralName: t.plural,
      displayName: t.displayName,
      ...(t.description ? { description: t.description } : {}),
    },
    options: { draftAndPublish: t.draftAndPublish },
    pluginOptions: {},
    attributes: t.attributes,
  };
  const dossier = join(racine, nom);
  const schemaPath = join(dossier, 'content-types', nom, 'schema.json');
  mkdirSync(dirname(schemaPath), { recursive: true });
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + '\n');

  fichier(join(dossier, 'controllers', `${nom}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreController('${uid}');\n`);
  fichier(join(dossier, 'routes', `${nom}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreRouter('${uid}');\n`);
  fichier(join(dossier, 'services', `${nom}.ts`), `import { factories } from '@strapi/strapi';\n\nexport default factories.createCoreService('${uid}');\n`);
}

console.log(`${Object.keys(types).length} types de contenu générés.`);
