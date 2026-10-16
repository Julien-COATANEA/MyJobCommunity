// Confort du back-office pour les collectivités :
//  - libellés et aides en français sur chaque champ (au lieu de « heroTitre », « couleurPrimaire »…) ;
//  - colonnes et tri des listes adaptés à chaque contenu ;
//  - offres en lecture seule pour les rôles Éditeur et Auteur (elles viennent de Gestmax).
// Les libellés ne remplacent que les valeurs par défaut : une personnalisation faite dans le BO est conservée.
import type { Core } from '@strapi/strapi';
import { ROLE_REDACTEUR, ROLE_RESPONSABLE, assurerDroitsType, assurerRoles, harmoniserRoles } from '../utils/roles';
import { CHAMPS_SUIVI, UID_PARAMETRES, restreindreChampsSuivi } from '../utils/garde-parametres';
import { initialiserCapacites } from '../utils/droits';

type Libelle = string | [libelle: string, description: string];

const COMMUNS: Record<string, Libelle> = {
  titre: 'Titre',
  slug: ['Adresse de la page (URL)', "Générée à partir du titre. Si vous la modifiez, l'ancienne adresse ne fonctionnera plus."],
  seo: ['Référencement (Google)', 'Facultatif : par défaut, le titre et le résumé du contenu sont utilisés.'],
  sections: ['Contenu de la page', 'Ajoutez, déplacez ou supprimez les blocs qui composent la page.'],
  extrait: ['Résumé', 'Affiché dans les listes et lors des partages sur les réseaux sociaux.'],
  contenu: 'Contenu',
  image: 'Image',
  miseEnAvant: ['Mettre en avant', "Affiché en priorité sur la page d'accueil."],
  nom: 'Nom',
  lieu: 'Lieu',
  adresse: 'Adresse',
  email: 'E-mail',
  telephone: 'Téléphone',
  description: 'Description',
  createdAt: 'Créé le',
  updatedAt: 'Modifié le',
  publishedAt: 'Publié le',
  // Composants
  libelle: 'Libellé',
  url: ['Lien', 'Choisissez une page du site dans la liste. Pour un autre site, sélectionnez « Autre adresse » et saisissez son adresse complète.'],
  nouvelOnglet: 'Ouvrir dans un nouvel onglet',
  sousLiens: 'Sous-menu',
  reseau: 'Réseau social',
  metaTitle: ['Titre pour Google', '70 caractères maximum.'],
  metaDescription: ['Description pour Google', '160 caractères environ.'],
  metaImage: ['Image de partage', 'Affichée lors des partages sur les réseaux sociaux.'],
  noIndex: ['Masquer cette page des moteurs de recherche', ''],
  valeur: ['Valeur', 'Ex. : 1 200, 8 %, 30 min'],
  icone: 'Icône',
  texte: 'Texte',
  lien: 'Lien',
  libelleLien: 'Texte du lien',
  style: 'Style',
  question: 'Question',
  reponse: 'Réponse',
  introduction: ['Introduction', 'Une ou deux phrases sous le titre (facultatif).'],
  surtitre: ['Surtitre', 'Petite pastille au-dessus du titre, ex. : « Votre espace personnel » (facultatif).'],
  espaces: 'Espaces',
  auteur: ['Auteur', 'Facultatif : affiché sous le titre (« Par Marie Rousset »).'],
  programme: ['Programme', 'Facultatif : les grandes étapes de la journée, dans l’ordre.'],
  horaire: ['Horaire', 'Ex. : 9 h 00, ou 9 h – 10 h 30'],
  afficherCoordonnees: ['Afficher nos coordonnées', 'Adresse, téléphone et e-mail des Informations du site, à côté du formulaire.'],
  imagesComplementaires: ['Photos complémentaires', 'Facultatif : ajoutez 2 photos pour une mosaïque de trois photos (au-delà, seules les 2 premières sont affichées).'],
  atouts: ['Atouts', 'Facultatif : courtes mentions avec icône sous le texte (ex. « Cadre de vie — Montagne, lacs, nature à 20 min »).'],
  etiquette: ['Étiquette', 'Petite pastille sur la photo, ex. : numéro de département (69).'],
  sousTitre: ['Sous-titre', 'Ex. : la préfecture ou une précision.'],
  photos: ['Photos', 'Le texte alternatif et la légende de chaque photo se règlent dans la médiathèque.'],
  couleur: ['Couleur', 'principale : couleur principale du site ; secondaire : couleur secondaire (ex. espace recruteur).'],
  cartes: 'Cartes',
  chiffres: 'Chiffres',
  boutons: 'Boutons',
  bouton: 'Bouton',
  positionImage: "Position de l'image",
  questions: 'Questions',
  logos: 'Logos',
  mode: ['Affichage', 'Liste du site (recommandé : référencée par Google) ou intégration du site Gestmax.'],
  nombre: "Nombre d'éléments affichés",
  typeContrat: 'Type de contrat',
  cheminIframe: ['Page Gestmax intégrée', 'Uniquement en mode iframe. Par défaut : /search/last'],
  titreAccessible: ['Titre accessible', "Décrit le contenu intégré pour les personnes aveugles (obligatoire, RGAA)."],
  hauteur: 'Hauteur (pixels)',
  publierLe: ['Publier automatiquement le', 'Facultatif : quand le brouillon est prêt, il se met en ligne tout seul à cette date.'],
  present: ['Présent le jour J', 'À cocher à l’accueil de l’événement.'],
  citation: ['Citation', 'Quelques phrases, entre guillemets sur le site.'],
  role: ['Fonction ou situation', 'Ex. : Technicienne de maintenance, arrivée en 2025'],
  photo: ['Photo', 'Portrait carré de préférence.'],
  temoignages: 'Témoignages',
};

const PAR_TYPE: Record<string, Record<string, Libelle>> = {
  'api::accueil.accueil': {
    heroTitre: 'Titre principal',
    heroTexte: "Texte d'accroche",
    heroImage: ['Image de fond du bandeau', 'Grande photo du territoire, au format paysage.'],
    heroRecherche: "Afficher la recherche d'offres dans le bandeau",
  },
  'api::page-offres.page-offres': {
    titre: 'Titre de la page',
    chapo: ['Introduction', 'Laisser vide pour afficher le nombre d’offres à pourvoir.'],
    carte: ['Afficher la carte des offres', 'Carte OpenStreetMap à droite de la liste : déplacer la carte filtre les offres affichées.'],
    affichage: ['Présentation des offres', 'colonnes : cartes côte à côte ; lignes : une offre par ligne, logo à gauche.'],
    colonnes: ['Nombre de colonnes', 'De 1 à 4 sur grand écran (moins sur mobile ou quand la carte est affichée).'],
    offresParPage: ['Offres par page', 'Avant le bouton « Afficher plus d’offres » (6 à 60).'],
    afficherLogo: 'Afficher le logo de l’entreprise',
    afficherSalaire: 'Afficher le salaire',
    afficherDate: 'Afficher la date de publication',
    imageBandeauOffre: ['Bannière des fiches d’offre', 'Image affichée en haut de chaque page de détail d’une offre, au format paysage très large (ex. 1600 × 400 px).'],
    sections: ['Blocs sous la liste des offres', 'Facultatif : candidature spontanée, questions fréquentes, entreprises…'],
  },
  'api::page.page': {
    chapo: ['Introduction', 'Une ou deux phrases affichées sous le titre.'],
    imageBandeau: 'Image du bandeau',
  },
  'api::article.article': {
    datePublication: 'Date de publication',
    categorie: 'Catégorie',
  },
  'api::evenement.evenement': {
    typeEvenement: "Type d'événement",
    dateDebut: 'Début',
    dateFin: 'Fin',
    enLigne: 'Événement en ligne',
    inscriptionActive: ['Inscription en ligne sur le site', 'Affiche un formulaire d’inscription sur la page de l’événement.'],
    placesMax: ['Nombre de places', 'Laisser vide pour ne pas limiter les inscriptions.'],
    dateLimiteInscription: ["Date limite d'inscription", "Par défaut : le début de l'événement."],
    inscriptionExterneUrl: ["Lien d'inscription externe", 'Si renseigné, remplace le formulaire du site.'],
    listeAttente: ["Ouvrir une liste d'attente", "Quand l'événement est complet, les nouveaux inscrits sont mis en attente et prévenus automatiquement si une place se libère."],
    inscriptions: 'Inscriptions',
  },
  'api::inscription.inscription': {
    evenement: 'Événement',
    prenom: 'Prénom',
    structure: 'Entreprise ou organisme',
    statut: 'Statut',
    consentement: 'Consentement (RGPD)',
    present: 'Présent',
  },
  'api::entreprise.entreprise': {
    secteur: "Secteur d'activité",
    ville: 'Ville',
    effectif: 'Effectif',
    description: 'Présentation',
    logo: 'Logo',
    image: 'Photo',
    siteWeb: 'Site web',
    nomEntiteGestmax: ['Nom dans Gestmax', "Nom exact de l'entité dans Gestmax : ses offres seront rattachées automatiquement à cette fiche. Plusieurs noms : séparez-les par « ; »."],
    offres: 'Offres en ligne',
  },
  'api::offre.offre': {
    sourceId: 'Identifiant Gestmax',
    lieu: 'Lieu',
    departement: 'Département',
    secteur: 'Secteur',
    nomEntreprise: 'Entreprise',
    entreprise: "Fiche dans l'annuaire",
    salaire: 'Salaire',
    descriptionHtml: 'Description du poste',
    profilHtml: 'Profil recherché',
    dateActivation: 'Publiée le',
    dateFinPublication: 'Fin de publication',
    urlDetailGestmax: 'Offre sur Gestmax',
    urlCandidature: 'Lien de candidature',
    aLaUne: ['À la une', 'Affichée en premier dans les listes et sur l’accueil.'],
    masquee: ['Masquer du site', 'L’offre disparaît du site sans être supprimée dans Gestmax.'],
    logoUrl: "Logo de l'entreprise",
    latitude: 'Latitude',
    longitude: 'Longitude',
  },
  'api::parametres.parametres': {
    nomSite: 'Nom du site',
    baseline: 'Slogan',
    logo: 'Logo',
    logoTexte: ['Initiales', 'Affichées à la place du logo si aucun logo n’est déposé (4 caractères max).'],
    favicon: ["Icône d'onglet", 'Petite image carrée affichée dans les onglets du navigateur.'],
    couleurPrimaire: ['Couleur principale', 'Boutons, liens, éléments actifs. Doit rester lisible avec du texte blanc.'],
    couleurSecondaire: ['Couleur secondaire', 'Espace recruteur, dates d’événements, dégradés des bandeaux. Doit rester lisible avec du texte blanc.'],
    couleurAccent: ["Couleur d'accent", 'Touches de couleur : soulignés, étiquettes, bouton de recherche.'],
    couleurTexte: 'Couleur du texte',
    couleurFond: 'Couleur de fond',
    policeTitres: 'Police des titres',
    policeTexte: 'Police du texte',
    arrondis: 'Arrondis des angles',
    gabarit: ['Template du site', 'Se choisit et se personnalise dans « Apparence ».'],
    reglagesGabarits: 'Réglages des templates',
    email: 'E-mail de contact',
    reseauxSociaux: 'Réseaux sociaux',
    editeurNom: ['Nom officiel de l’éditeur', 'Ex. : Communauté d’agglomération de la Vallée Verte. Utilisé dans les mentions légales et la politique de confidentialité.'],
    editeurSiret: ['N° SIRET', '14 chiffres, sans lettres.'],
    directeurPublication: ['Directeur ou directrice de la publication', 'Nom et fonction, ex. : Mme Claire Martin, Présidente.'],
    hebergeurNom: ['Nom de l’hébergeur', 'Société qui héberge le site (obligatoire dans les mentions légales).'],
    hebergeurAdresse: 'Adresse de l’hébergeur',
    hebergeurTelephone: 'Téléphone de l’hébergeur',
    contactDonneesEmail: ['E-mail pour exercer ses droits', 'Adresse du délégué à la protection des données (DPO) ou du service qui répond aux demandes RGPD. Si vide : l’e-mail de contact.'],
    prestataireNom: ['Conception et maintenance', 'Nom du prestataire qui apparaît dans les mentions légales.'],
    emailNotificationInscriptions: ['E-mail de notification', 'Reçoit un message à chaque inscription à un événement.'],
    gestmaxUrlFront: ['Adresse du site Gestmax', 'Ex. : https://emploi.ma-collectivite.fr'],
    lienEspaceCandidat: 'Lien « Espace candidat »',
    lienEspaceRecruteur: 'Lien « Espace recruteur »',
    lienCandidatureSpontanee: 'Lien « Candidature spontanée »',
    seoParDefaut: 'Référencement par défaut',
    bandeauCookies: ['Bandeau de cookies', 'Toujours afficher le bandeau, même sans outil de mesure (écran « Cookies et suivi »).'],
    texteBandeauCookies: 'Texte du bandeau de cookies',
    lienPolitiqueCookies: 'Lien « En savoir plus » du bandeau',
    googleTagManagerId: ['Google Tag Manager', 'Identifiant du conteneur, ex. : GTM-ABC1234'],
    googleAnalyticsId: ['Google Analytics', 'Identifiant de mesure, ex. : G-ABC123XYZ'],
    scripts: ['Scripts personnalisés', 'Code ajouté à toutes les pages du site.'],
  },
  'shared.script': {
    nom: ['Nom', 'Pour vous repérer, ex. : Matomo, chat en ligne.'],
    code: ['Code', 'Collez le code fourni par l’outil, balises <script> comprises.'],
    emplacement: ['Emplacement', 'head : en haut de page (recommandé pour la mesure) ; body : en bas de page.'],
    actif: ['Actif', 'Décochez pour retirer le script du site sans le perdre.'],
    consentement: ['Soumis au consentement', 'Le script attend que le visiteur accepte les cookies (si le bandeau est activé).'],
  },
  'api::navigation.navigation': {
    menuPrincipal: ['Menu principal', 'Les entrées avec un sous-menu s’ouvrent au clic.'],
    liensPiedDePage: 'Liens du pied de page',
    liensLegaux: 'Liens légaux (mentions, accessibilité…)',
  },
  'navigation.sous-lien': { description: ['Description', 'Petite phrase sous le lien.'] },
};

// Colonnes des listes et tri par défaut.
const LISTES: Record<string, { colonnes: string[]; tri?: [string, 'ASC' | 'DESC'] }> = {
  'api::page.page': { colonnes: ['titre', 'slug', 'updatedAt'], tri: ['titre', 'ASC'] },
  'api::article.article': { colonnes: ['titre', 'categorie', 'datePublication', 'miseEnAvant'], tri: ['datePublication', 'DESC'] },
  'api::evenement.evenement': { colonnes: ['titre', 'typeEvenement', 'dateDebut', 'inscriptionActive'], tri: ['dateDebut', 'DESC'] },
  'api::inscription.inscription': { colonnes: ['prenom', 'nom', 'email', 'evenement', 'createdAt'], tri: ['createdAt', 'DESC'] },
  'api::entreprise.entreprise': { colonnes: ['nom', 'secteur', 'ville', 'miseEnAvant'], tri: ['nom', 'ASC'] },
  'api::offre.offre': { colonnes: ['titre', 'nomEntreprise', 'typeContrat', 'lieu', 'dateActivation'], tri: ['dateActivation', 'DESC'] },
  'api::categorie-article.categorie-article': { colonnes: ['nom'], tri: ['nom', 'ASC'] },
  'api::secteur.secteur': { colonnes: ['nom'], tri: ['nom', 'ASC'] },
};

// Champ affiché pour représenter un contenu dans les relations.
const CHAMP_PRINCIPAL: Record<string, string> = {
  'api::inscription.inscription': 'email',
};

// Disposition des formulaires : champs regroupés par thème, sur des lignes de 12 colonnes.
// Les champs absents (ex. relation « inscriptions ») ne sont pas affichés : ils ont leur propre encart.
type Ligne = [champ: string, taille: number][];
const FORMULAIRES: Record<string, Ligne[]> = {
  'api::page-offres.page-offres': [
    [['titre', 12]],
    [['chapo', 12]],
    [['carte', 4], ['affichage', 4], ['colonnes', 4]],
    [['offresParPage', 4], ['afficherLogo', 4], ['afficherSalaire', 4]],
    [['afficherDate', 4]],
    [['imageBandeauOffre', 6]],
    [['sections', 12]],
    [['seo', 12]],
  ],
  'api::evenement.evenement': [
    [['titre', 8], ['typeEvenement', 4]],
    [['dateDebut', 6], ['dateFin', 6]],
    [['enLigne', 4], ['lieu', 4], ['adresse', 4]],
    [['extrait', 12]],
    [['image', 6], ['slug', 6]],
    [['contenu', 12]],
    [['programme', 12]],
    [['inscriptionActive', 4], ['placesMax', 4], ['dateLimiteInscription', 4]],
    [['listeAttente', 12]],
    [['inscriptionExterneUrl', 12]],
    [['seo', 12]],
  ],
  'api::article.article': [
    [['titre', 8], ['categorie', 4]],
    [['datePublication', 6], ['miseEnAvant', 6]],
    [['extrait', 12]],
    [['image', 6], ['slug', 6]],
    [['contenu', 12]],
    [['auteur', 6], ['publierLe', 6]],
    [['seo', 12]],
  ],
  'api::entreprise.entreprise': [
    [['nom', 8], ['secteur', 4]],
    [['ville', 4], ['adresse', 4], ['effectif', 4]],
    [['extrait', 12]],
    [['logo', 6], ['image', 6]],
    [['description', 12]],
    [['siteWeb', 6], ['nomEntiteGestmax', 6]],
    [['miseEnAvant', 6], ['slug', 6]],
    [['seo', 12]],
  ],
  'api::page.page': [
    [['titre', 6], ['slug', 6]],
    [['chapo', 12]],
    [['imageBandeau', 6]],
    [['sections', 12]],
    [['publierLe', 6]],
    [['seo', 12]],
  ],
  'api::inscription.inscription': [
    [['evenement', 6], ['statut', 3], ['present', 3]],
    [['prenom', 6], ['nom', 6]],
    [['email', 6], ['telephone', 6]],
    [['structure', 12]],
    [['consentement', 12]],
  ],
  // Offres : fiche en lecture seule (voir « lectureSeule » plus bas), seuls « à la une » et « masquée » se règlent ici.
  'api::offre.offre': [
    [['aLaUne', 6], ['masquee', 6]],
    [['titre', 12]],
    [['nomEntreprise', 4], ['typeContrat', 4], ['lieu', 4]],
    [['salaire', 4], ['dateActivation', 4], ['dateFinPublication', 4]],
    [['descriptionHtml', 12]],
    [['profilHtml', 12]],
    [['sourceId', 4], ['urlDetailGestmax', 4], ['urlCandidature', 4]],
  ],
};

// Champs d'une offre qui ne se modifient pas dans le BO : tout vient de Gestmax.
const OFFRE_MODIFIABLE = ['aLaUne', 'masquee'];
// Champs techniques jamais affichés dans les formulaires.
const MASQUES: Record<string, string[]> = {
  'api::offre.offre': ['slug', 'entreprise', 'logoUrl', 'latitude', 'longitude', 'departement', 'secteur'],
  'api::inscription.inscription': ['jeton', 'rappelEnvoye'],
  // Modifiés seulement depuis les écrans « Cookies et suivi » (voir garde-parametres) et « Apparence » (template).
  [UID_PARAMETRES]: [...CHAMPS_SUIVI, 'gabarit', 'reglagesGabarits'],
};

// Exemples affichés dans les champs vides.
const EXEMPLES: Record<string, string> = {
  titre: 'Ex. : Le Forum de l’emploi revient en novembre',
  extrait: 'En une ou deux phrases : l’essentiel à retenir.',
  chapo: 'Une ou deux phrases d’introduction.',
  lieu: 'Ex. : Parc des expositions',
  adresse: 'Ex. : 1 avenue du Lac, 00000 Vallée-Verte',
  inscriptionExterneUrl: 'https://…',
  siteWeb: 'https://…',
  nomEntiteGestmax: 'Nom exact dans Gestmax',
  ville: 'Ex. : Vallée-Verte',
  metaTitle: 'Laisser vide pour reprendre le titre',
  metaDescription: 'Laisser vide pour reprendre le résumé',
  url: '/page, https://… ou gestmax:/chemin',
};

const VERSION_LISTES = 5;

/** Contenus dont les droits (et les champs) des rôles des collectivités sont tenus à jour au démarrage. */
const TYPES_EDITORIAUX = [
  'api::accueil.accueil', 'api::page-offres.page-offres', 'api::page.page', 'api::article.article',
  'api::evenement.evenement', 'api::entreprise.entreprise',
];

export async function configurerBackOffice(strapi: Core.Strapi) {
  const cm = strapi.plugin('content-manager');
  const configuration = strapi.store({ type: 'core', name: 'mjc', key: 'back-office' });
  const etat = ((await configuration.get({})) as { versionListes?: number } | null) ?? {};
  const appliquerListes = (etat.versionListes ?? 0) < VERSION_LISTES;

  const traiter = async (service: any, uid: string, modele: any) => {
    if (!modele) return;
    const conf = await service.findConfiguration(modele);
    const libelles = { ...COMMUNS, ...(PAR_TYPE[uid] ?? {}) };
    let modifie = false;

    for (const [champ, meta] of Object.entries<any>(conf.metadatas ?? {})) {
      const entree = libelles[champ];
      if (!entree) continue;
      const [libelle, description] = Array.isArray(entree) ? entree : [entree, undefined];
      if (meta.edit && meta.edit.label === champ) {
        meta.edit.label = libelle;
        if (description && !meta.edit.description) meta.edit.description = description;
        modifie = true;
      }
      if (meta.list && meta.list.label === champ) {
        meta.list.label = libelle;
        modifie = true;
      }
    }

    const liste = LISTES[uid];
    if (appliquerListes && liste) {
      conf.layouts.list = liste.colonnes.filter((c) => c in (conf.metadatas ?? {}));
      if (liste.tri) {
        conf.settings.defaultSortBy = liste.tri[0];
        conf.settings.defaultSortOrder = liste.tri[1];
      }
      modifie = true;
    }
    // Lecture seule des offres (Gestmax est la source) et champs techniques masqués.
    for (const [champ, meta] of Object.entries<any>(conf.metadatas ?? {})) {
      if (!meta.edit) continue;
      const lectureSeule = uid === 'api::offre.offre' && !OFFRE_MODIFIABLE.includes(champ);
      if (lectureSeule && meta.edit.editable !== false) { meta.edit.editable = false; modifie = true; }
      const cache = (MASQUES[uid] ?? []).includes(champ);
      if (cache && meta.edit.visible !== false) { meta.edit.visible = false; modifie = true; }
    }
    const formulaire = FORMULAIRES[uid];
    if (appliquerListes && formulaire) {
      conf.layouts.edit = formulaire
        .map((ligne) => ligne.filter(([champ]) => champ in (conf.metadatas ?? {})).map(([name, size]) => ({ name, size })))
        .filter((ligne) => ligne.length);
      modifie = true;
    }
    for (const [champ, meta] of Object.entries<any>(conf.metadatas ?? {})) {
      if (EXEMPLES[champ] && meta.edit && !meta.edit.placeholder) {
        meta.edit.placeholder = EXEMPLES[champ];
        modifie = true;
      }
    }
    if (CHAMP_PRINCIPAL[uid] && conf.settings.mainField !== CHAMP_PRINCIPAL[uid]) {
      conf.settings.mainField = CHAMP_PRINCIPAL[uid];
      modifie = true;
    }

    // Type unique sans champ texte (« Menus du site » : que des composants) : Strapi y enregistre « documentId » comme
    // champ principal et l'affiche en titre (l21loqmf8…). Avec « id », il retombe sur le nom du type.
    if (modele.kind === 'singleType' && conf.settings.mainField === 'documentId') {
      conf.settings.mainField = 'id';
      modifie = true;
    }

    if (modifie) {
      await service.updateConfiguration(modele, { settings: conf.settings, metadatas: conf.metadatas, layouts: conf.layouts });
    }
  };

  const typesService = cm.service('content-types');
  for (const uid of Object.keys(strapi.contentTypes).filter((u) => u.startsWith('api::'))) {
    await traiter(typesService, uid, typesService.findContentType(uid));
  }
  const composantsService = cm.service('components');
  for (const uid of Object.keys(strapi.components)) {
    await traiter(composantsService, uid, composantsService.findComponent(uid));
  }

  await configuration.set({ value: { ...etat, versionListes: VERSION_LISTES } });
  await assurerRoles(strapi);
  await harmoniserRoles(strapi);
  // Droits des éditeurs, responsables et rédacteurs sur les contenus éditoriaux, nouveaux champs compris (Strapi ne
  // les ajoute pas aux rôles existants). Exclus volontairement : les Informations du site (scripts de suivi réservés
  // aux responsables, via l'écran « Cookies et suivi ») et les offres (lecture seule, voir restreindreOffres).
  for (const uid of TYPES_EDITORIAUX) await assurerDroitsType(strapi, uid);
  await restreindreOffres(strapi);
  await restreindreChampsSuivi(strapi);
  await initialiserCapacites(strapi);
}

/** Les offres viennent de Gestmax : Éditeur et Auteur peuvent les consulter, pas les modifier. */
async function restreindreOffres(strapi: Core.Strapi) {
  const roles = await strapi.db.query('admin::role').findMany({ where: { code: { $in: ['strapi-editor', 'strapi-author', ROLE_RESPONSABLE, ROLE_REDACTEUR] } } });
  if (!roles.length) return;
  await strapi.db.query('admin::permission').deleteMany({
    where: {
      subject: 'api::offre.offre',
      action: { $in: ['plugin::content-manager.explorer.create', 'plugin::content-manager.explorer.update', 'plugin::content-manager.explorer.delete', 'plugin::content-manager.explorer.publish'] },
      role: { id: { $in: roles.map((r: any) => r.id) } },
    },
  });
}
