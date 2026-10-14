// Génère les schémas des composants Strapi (src/components/**). Relancer après modification :
//   node scripts/generer-composants.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');

const ICONES = ['emploi', 'entreprise', 'formation', 'territoire', 'logement', 'transport', 'sante', 'famille', 'loisirs', 'accompagnement', 'evenement', 'actualite', 'info'];

const str = (extra = {}) => ({ type: 'string', ...extra });
const image = (extra = {}) => ({ type: 'media', multiple: false, allowedTypes: ['images'], ...extra });
const comp = (component, repeatable, extra = {}) => ({ type: 'component', component, repeatable, ...extra });
// Lien choisi dans une liste (pages du site, Gestmax) ou saisi (autre site) : champ personnalisé « global::lien ».
const lien = (extra = {}) => ({ type: 'customField', customField: 'global::lien', ...extra });

const composants = {
  'shared/seo': ['SEO', 'search', {
    metaTitle: str({ maxLength: 70 }),
    metaDescription: { type: 'text', maxLength: 170 },
    metaImage: image(),
    noIndex: { type: 'boolean', default: false },
  }],
  'shared/lien': ['Lien', 'link', {
    libelle: str({ required: true }),
    url: lien({ required: true }),
    nouvelOnglet: { type: 'boolean', default: false },
  }, 'URL interne (/page), externe (https://…) ou Gestmax (gestmax:/chemin)'],
  'shared/reseau-social': ['Réseau social', 'earth', {
    reseau: { type: 'enumeration', enum: ['facebook', 'linkedin', 'instagram', 'youtube', 'x', 'tiktok'], required: true },
    url: str({ required: true }),
  }],
  'shared/script': ['Script', 'code', {
    nom: str({ required: true, maxLength: 80 }),
    code: { type: 'text', required: true },
    emplacement: { type: 'enumeration', enum: ['head', 'body'], default: 'head', required: true },
    actif: { type: 'boolean', default: true },
    consentement: { type: 'boolean', default: true },
  }, 'Code HTML / JavaScript ajouté à toutes les pages du site (mesure d’audience, chat…)'],
  'navigation/entree': ['Entrée de menu', 'bulletList', {
    libelle: str({ required: true }),
    url: lien(),
    sousLiens: comp('navigation.sous-lien', true),
  }, 'Lien de premier niveau, avec sous-menu facultatif'],
  'navigation/sous-lien': ['Lien de sous-menu', 'link', {
    libelle: str({ required: true }),
    url: lien({ required: true }),
    description: str(),
    nouvelOnglet: { type: 'boolean', default: false },
  }],

  // Éléments répétables utilisés dans les blocs
  'elements/chiffre': ['Chiffre clé', 'chartCircle', {
    valeur: str({ required: true }),
    libelle: str({ required: true }),
  }],
  'elements/carte': ['Carte', 'dashboard', {
    icone: { type: 'enumeration', enum: ICONES },
    titre: str({ required: true }),
    texte: { type: 'text' },
    lien: lien(),
    libelleLien: str(),
  }],
  'elements/bouton': ['Bouton', 'cursor', {
    libelle: str({ required: true }),
    url: lien({ required: true }),
    style: { type: 'enumeration', enum: ['principal', 'secondaire'], default: 'principal' },
    nouvelOnglet: { type: 'boolean', default: false },
  }],
  'elements/question': ['Question / réponse', 'question', {
    question: str({ required: true }),
    reponse: { type: 'blocks', required: true },
  }],
  'elements/logo': ['Logo', 'picture', {
    nom: str({ required: true }),
    image: image({ required: true }),
    url: str(),
  }],
  'elements/temoignage': ['Témoignage', 'quote', {
    citation: { type: 'text', required: true, maxLength: 400 },
    nom: str({ required: true }),
    role: str(),
    photo: image(),
  }],

  // Catalogue FERMÉ de blocs de page : garantit le respect du gabarit.
  'blocs/texte': ['Texte', 'paragraph', {
    titre: str(),
    contenu: { type: 'blocks', required: true },
  }],
  'blocs/texte-image': ['Texte et image côte à côte', 'layout', {
    titre: str(),
    contenu: { type: 'blocks', required: true },
    image: image({ required: true }),
    positionImage: { type: 'enumeration', enum: ['droite', 'gauche'], default: 'droite' },
    bouton: comp('elements.bouton', false),
  }],
  'blocs/chiffres-cles': ['Chiffres clés', 'chartBubble', {
    titre: str(),
    chiffres: comp('elements.chiffre', true, { min: 1, max: 6 }),
  }, 'Dans une valeur, {offres}, {entreprises} et {evenements} sont remplacés par les chiffres réels'],
  'blocs/cartes': ['Cartes avec icônes', 'apps', {
    titre: str(),
    introduction: { type: 'text' },
    cartes: comp('elements.carte', true, { min: 1, max: 12 }),
  }],
  'blocs/appel-action': ["Appel à l'action", 'cursor', {
    titre: str({ required: true }),
    texte: { type: 'text' },
    boutons: comp('elements.bouton', true, { max: 2 }),
  }],
  'blocs/faq': ['Questions fréquentes', 'question', {
    titre: str(),
    questions: comp('elements.question', true, { min: 1 }),
  }],
  'blocs/logos': ['Logos des partenaires', 'picture', {
    titre: str(),
    logos: comp('elements.logo', true, { min: 1 }),
  }],
  'blocs/recherche-offres': ["Recherche d'offres", 'search', {
    titre: str(),
    texte: { type: 'text' },
  }, 'Formulaire de recherche qui mène à la liste des offres'],
  'blocs/dernieres-offres': ['Dernières offres', 'briefcase', {
    titre: str({ default: 'Les dernières offres' }),
    mode: { type: 'enumeration', enum: ['liste', 'iframe-gestmax'], default: 'liste' },
    nombre: { type: 'integer', default: 6, min: 1, max: 24 },
    typeContrat: str(),
    cheminIframe: str({ default: '/search/last' }),
  }, 'Offres synchronisées depuis Gestmax, ou iframe Gestmax'],
  'blocs/dernieres-actualites': ['Dernières actualités', 'feather', {
    titre: str({ default: 'Actualités' }),
    nombre: { type: 'integer', default: 3, min: 1, max: 12 },
  }],
  'blocs/prochains-evenements': ['Prochains événements', 'calendar', {
    titre: str({ default: 'Prochains événements' }),
    nombre: { type: 'integer', default: 3, min: 1, max: 12 },
  }],
  'blocs/entreprises': ['Entreprises à la une', 'store', {
    titre: str({ default: 'Ils recrutent sur le territoire' }),
    nombre: { type: 'integer', default: 6, min: 1, max: 24 },
  }],
  'blocs/temoignages': ['Témoignages', 'quote', {
    titre: str({ default: 'Ils ont choisi le territoire' }),
    temoignages: comp('elements.temoignage', true, { min: 1, max: 6 }),
  }, "Paroles de salariés, de nouveaux arrivants ou d'employeurs"],
  'blocs/iframe': ['Contenu externe intégré', 'code', {
    titre: str(),
    url: str({ required: true }),
    titreAccessible: str({ required: true }),
    hauteur: { type: 'integer', default: 600, min: 200, max: 3000 },
  }, "Le titre accessible décrit le contenu de l'iframe (obligatoire RGAA)"],
};

for (const [chemin, [displayName, icon, attributes, description]] of Object.entries(composants)) {
  const [categorie, nom] = chemin.split('/');
  const schema = {
    collectionName: `components_${categorie}_${nom.replace(/-/g, '_')}`,
    info: { displayName, icon, ...(description ? { description } : {}) },
    options: {},
    attributes,
  };
  const fichier = join(racine, `${chemin}.json`);
  mkdirSync(dirname(fichier), { recursive: true });
  writeFileSync(fichier, JSON.stringify(schema, null, 2) + '\n');
}

console.log(`${Object.keys(composants).length} composants générés.`);
