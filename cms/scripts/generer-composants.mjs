// Génère les schémas des composants Strapi (src/components/**). Relancer après modification :
//   node scripts/generer-composants.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');

const ICONES = ['emploi', 'entreprise', 'formation', 'territoire', 'logement', 'transport', 'sante', 'famille', 'loisirs', 'accompagnement', 'evenement', 'actualite', 'info', 'utilisateur', 'valide'];

const str = (extra = {}) => ({ type: 'string', ...extra });
const image = (extra = {}) => ({ type: 'media', multiple: false, allowedTypes: ['images'], ...extra });
const comp = (component, repeatable, extra = {}) => ({ type: 'component', component, repeatable, ...extra });
// Lien choisi dans une liste (pages du site, Gestmax) ou saisi (autre site) : champ personnalisé « global::lien ».
const lien = (extra = {}) => ({ type: 'customField', customField: 'global::lien', ...extra });
// En-tête de section de la maquette : surtitre en pastille (« Votre espace personnel »), titre, introduction.
const surtitre = str({ maxLength: 60 });
const introduction = { type: 'text', maxLength: 400 };

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

  'elements/atout': ['Atout', 'check', {
    icone: { type: 'enumeration', enum: ICONES, default: 'valide' },
    titre: str({ required: true, maxLength: 60 }),
    texte: str({ maxLength: 120 }),
  }],
  'elements/carte-photo': ['Carte avec photo', 'picture', {
    image: image({ required: true }),
    etiquette: str({ maxLength: 12 }),
    titre: str({ required: true }),
    sousTitre: str(),
    lien: lien(),
  }],
  'elements/creneau': ['Créneau du programme', 'clock', {
    horaire: str({ required: true, maxLength: 30 }),
    titre: str({ required: true }),
    description: { type: 'text', maxLength: 300 },
  }],
  'elements/espace': ['Espace (candidat, recruteur…)', 'user', {
    titre: str({ required: true }),
    texte: { type: 'text', maxLength: 300 },
    icone: { type: 'enumeration', enum: ICONES, default: 'utilisateur' },
    couleur: { type: 'enumeration', enum: ['principale', 'secondaire'], default: 'principale' },
    bouton: comp('elements.bouton', false),
  }],

  // Catalogue FERMÉ de blocs de page : garantit le respect du gabarit.
  'blocs/texte': ['Texte', 'paragraph', {
    titre: str(),
    contenu: { type: 'blocks', required: true },
  }],
  'blocs/texte-image': ['Texte et image côte à côte', 'layout', {
    surtitre,
    titre: str(),
    contenu: { type: 'blocks', required: true },
    image: image({ required: true }),
    // Deux photos de plus : mosaïque de trois photos (maquette « Un territoire d'exception »).
    imagesComplementaires: { type: 'media', multiple: true, allowedTypes: ['images'] },
    atouts: comp('elements.atout', true, { max: 6 }),
    positionImage: { type: 'enumeration', enum: ['droite', 'gauche'], default: 'droite' },
    bouton: comp('elements.bouton', false),
  }, 'Une photo, ou trois en mosaïque ; liste d’atouts facultative sous le texte'],
  'blocs/chiffres-cles': ['Chiffres clés', 'chartBubble', {
    surtitre,
    titre: str(),
    introduction,
    chiffres: comp('elements.chiffre', true, { min: 1, max: 6 }),
  }, 'Dans une valeur, {offres}, {entreprises}, {recrutent} (entreprises qui ont des offres) et {evenements} sont remplacés par les chiffres réels'],
  'blocs/cartes': ['Cartes avec icônes', 'apps', {
    surtitre,
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
    surtitre,
    titre: str(),
    introduction,
    questions: comp('elements.question', true, { min: 1 }),
  }],
  'blocs/logos': ['Logos des partenaires', 'picture', {
    surtitre,
    titre: str(),
    introduction,
    logos: comp('elements.logo', true, { min: 1 }),
  }],
  'blocs/recherche-offres': ["Recherche d'offres", 'search', {
    surtitre,
    titre: str(),
    texte: { type: 'text' },
  }, 'Formulaire de recherche qui mène à la liste des offres'],
  'blocs/dernieres-offres': ['Dernières offres', 'briefcase', {
    surtitre,
    titre: str({ default: 'Les dernières offres' }),
    introduction,
    mode: { type: 'enumeration', enum: ['liste', 'iframe-gestmax'], default: 'liste' },
    nombre: { type: 'integer', default: 6, min: 1, max: 24 },
    typeContrat: str(),
    cheminIframe: str({ default: '/search/last' }),
  }, 'Offres synchronisées depuis Gestmax, ou iframe Gestmax'],
  'blocs/dernieres-actualites': ['Dernières actualités', 'feather', {
    surtitre,
    titre: str({ default: 'Actualités' }),
    introduction,
    nombre: { type: 'integer', default: 3, min: 1, max: 12 },
  }],
  'blocs/prochains-evenements': ['Prochains événements', 'calendar', {
    surtitre,
    titre: str({ default: 'Prochains événements' }),
    introduction,
    nombre: { type: 'integer', default: 3, min: 1, max: 12 },
  }],
  'blocs/entreprises': ['Entreprises à la une', 'store', {
    surtitre,
    titre: str({ default: 'Ils recrutent sur le territoire' }),
    introduction,
    nombre: { type: 'integer', default: 6, min: 1, max: 24 },
  }],
  'blocs/temoignages': ['Témoignages', 'quote', {
    surtitre,
    titre: str({ default: 'Ils ont choisi le territoire' }),
    introduction,
    temoignages: comp('elements.temoignage', true, { min: 1, max: 6 }),
  }, "Paroles de salariés, de nouveaux arrivants ou d'employeurs"],
  'blocs/espaces': ['Espaces candidat et recruteur', 'user', {
    surtitre,
    titre: str({ default: 'Candidats et recruteurs, votre tableau de bord' }),
    introduction,
    espaces: comp('elements.espace', true, { min: 1, max: 3 }),
  }, 'Grandes cartes colorées qui mènent aux espaces candidat et recruteur'],
  'blocs/cartes-photo': ['Cartes avec photo', 'picture', {
    surtitre,
    titre: str(),
    introduction,
    cartes: comp('elements.carte-photo', true, { min: 1, max: 12 }),
  }, 'Grandes cartes photo avec étiquette (départements, villes, quartiers…)'],
  'blocs/galerie': ['Galerie photo', 'landscape', {
    surtitre,
    titre: str(),
    introduction,
    photos: { type: 'media', multiple: true, required: true, allowedTypes: ['images'] },
  }, 'Mosaïque de photos ; la légende de chaque photo (médiathèque) s’affiche dessus'],
  'blocs/formulaire-contact': ['Formulaire de contact', 'envelop', {
    surtitre,
    titre: str({ default: 'Écrivez-nous' }),
    introduction,
    afficherCoordonnees: { type: 'boolean', default: true },
  }, 'Les messages sont envoyés à l’e-mail de contact des Informations du site'],
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
