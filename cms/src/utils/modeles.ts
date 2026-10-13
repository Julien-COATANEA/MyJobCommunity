// Modèles de pages : une page prête à remplir (blocs en place, textes d'exemple à adapter) au lieu d'une page vide.
// Les textes entre crochets [ ] sont à compléter. Les blocs respectent le catalogue du site.

const t = (text: string) => ({ type: 'text', text });
const p = (...enfants: (string | object)[]) => ({ type: 'paragraph', children: enfants.map((e) => (typeof e === 'string' ? t(e) : e)) });
const h = (level: number, text: string) => ({ type: 'heading', level, children: [t(text)] });
const ul = (...items: string[]) => ({ type: 'list', format: 'unordered', children: items.map((i) => ({ type: 'list-item', children: [t(i)] })) });

export interface Modele {
  cle: string;
  titre: string;
  description: string;
  /** Titre et chapô proposés pour la nouvelle page. */
  titrePage: string;
  chapo: string;
  /** Noms lisibles des blocs, affichés dans le choix du modèle. */
  blocs: string[];
  sections: Record<string, unknown>[];
  /** Page dont le contenu est juridique : à faire relire. */
  juridique?: boolean;
}

export const MODELES: Modele[] = [
  {
    cle: 'vide',
    titre: 'Page vide',
    description: 'Partir de zéro et ajouter vos blocs un par un.',
    titrePage: 'Nouvelle page',
    chapo: '',
    blocs: [],
    sections: [],
  },
  {
    cle: 'territoire',
    titre: 'Présenter le territoire',
    description: 'Un récit, des chiffres, les filières qui recrutent et les questions fréquentes.',
    titrePage: 'Le territoire',
    chapo: '[Une ou deux phrases qui donnent envie de découvrir le territoire.]',
    blocs: ['Texte et image', 'Chiffres clés', 'Cartes (filières)', 'Questions fréquentes', 'Appel à l’action'],
    sections: [
      {
        __component: 'blocs.texte-image', titre: 'Un territoire qui bouge', positionImage: 'droite',
        contenu: [p('[Présentez en quelques lignes l’identité du territoire : son histoire, ses atouts, son dynamisme économique.]'), p('[Expliquez ce qui rend le territoire attractif pour y travailler et y vivre.]')],
      },
      { __component: 'blocs.chiffres-cles', titre: 'Le territoire en chiffres', chiffres: [{ valeur: '[120 000]', libelle: 'habitants' }, { valeur: '{entreprises}', libelle: 'entreprises qui recrutent' }, { valeur: '{offres}', libelle: 'offres en ligne' }] },
      {
        __component: 'blocs.cartes', titre: 'Les filières qui recrutent',
        cartes: [
          { icone: 'entreprise', titre: '[Filière 1]', texte: '[Quelques mots sur cette filière.]', lien: '/offres', libelleLien: 'Voir les offres' },
          { icone: 'sante', titre: '[Filière 2]', texte: '[Quelques mots sur cette filière.]', lien: '/offres', libelleLien: 'Voir les offres' },
          { icone: 'formation', titre: '[Filière 3]', texte: '[Quelques mots sur cette filière.]', lien: '/offres', libelleLien: 'Voir les offres' },
        ],
      },
      { __component: 'blocs.dernieres-offres', titre: 'Les dernières offres', mode: 'liste', nombre: 3 },
    ],
  },
  {
    cle: 's-installer',
    titre: 'S’installer sur le territoire',
    description: 'Logement, transports, santé, écoles : tout pour les nouveaux arrivants.',
    titrePage: 'S’installer ici',
    chapo: '[Tout ce qu’il faut savoir pour préparer votre arrivée.]',
    blocs: ['Cartes (thèmes)', 'Texte', 'Questions fréquentes', 'Témoignages', 'Appel à l’action'],
    sections: [
      {
        __component: 'blocs.cartes', titre: 'Préparer son arrivée',
        cartes: [
          { icone: 'logement', titre: 'Se loger', texte: '[Aides, dispositifs, contacts utiles.]' },
          { icone: 'transport', titre: 'Se déplacer', texte: '[Transports en commun, covoiturage, vélo.]' },
          { icone: 'sante', titre: 'Se soigner', texte: '[Hôpitaux, médecins, maisons de santé.]' },
          { icone: 'famille', titre: 'Scolariser ses enfants', texte: '[Crèches, écoles, collèges, lycées.]' },
        ],
      },
      { __component: 'blocs.faq', titre: 'Questions fréquentes', questions: [{ question: '[Comment trouver un logement ?]', reponse: [p('[Réponse à compléter.]')] }, { question: '[Mon conjoint peut-il être accompagné dans sa recherche d’emploi ?]', reponse: [p('[Réponse à compléter.]')] }] },
      { __component: 'blocs.temoignages', titre: 'Ils ont choisi le territoire', temoignages: [{ citation: '[Un témoignage d’un nouvel arrivant, en quelques phrases.]', nom: '[Prénom]', role: '[Métier, arrivé(e) en 20XX]' }] },
      { __component: 'blocs.appel-action', titre: 'Un projet d’installation ?', texte: '[Indiquez comment contacter le service qui accompagne les nouveaux arrivants.]', boutons: [{ libelle: 'Nous contacter', url: '/contact', style: 'principal' }] },
    ],
  },
  {
    cle: 'contact',
    titre: 'Contact',
    description: 'Comment joindre la collectivité : e-mail, téléphone, adresse.',
    titrePage: 'Contact',
    chapo: '[Une question sur l’emploi, un événement ou une offre ? Contactez-nous.]',
    blocs: ['Cartes (moyens de contact)', 'Texte'],
    sections: [
      {
        __component: 'blocs.cartes', titre: 'Nous joindre',
        cartes: [
          { icone: 'info', titre: 'Par e-mail', texte: '[adresse@collectivite.fr]' },
          { icone: 'accompagnement', titre: 'Par téléphone', texte: '[01 23 45 67 89, du lundi au vendredi de 9 h à 17 h]' },
          { icone: 'territoire', titre: 'Sur place', texte: '[Adresse du service emploi et horaires d’ouverture]' },
        ],
      },
    ],
  },
  {
    cle: 'mentions-legales',
    titre: 'Mentions légales',
    description: 'Éditeur, hébergeur, propriété intellectuelle : la trame à compléter.',
    titrePage: 'Mentions légales',
    chapo: '',
    juridique: true,
    blocs: ['Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          h(2, 'Éditeur du site'), p('[Nom de la collectivité], [adresse], [téléphone], [e-mail].'), p('Directeur ou directrice de la publication : [nom et fonction].'),
          h(2, 'Hébergement'), p('Ce site est hébergé par [nom de l’hébergeur], [adresse].'),
          h(2, 'Conception et réalisation'), p('[Prestataire].'),
          h(2, 'Propriété intellectuelle'), p('Les contenus de ce site (textes, images, logos) sont protégés. Toute reproduction sans autorisation est interdite.'),
          h(2, 'Données personnelles'), p('Voir la page « Données personnelles » pour connaître les traitements réalisés et vos droits.'),
          h(2, 'Offres d’emploi'), p('Les offres sont publiées par les recruteurs sous leur responsabilité, via la plateforme de recrutement Gestmax.'),
        ],
      },
    ],
  },
  {
    cle: 'donnees-personnelles',
    titre: 'Données personnelles',
    description: 'Politique de confidentialité : inscriptions aux événements, candidatures, droits.',
    titrePage: 'Données personnelles',
    chapo: '',
    juridique: true,
    blocs: ['Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          h(2, 'Responsable du traitement'), p('[Nom de la collectivité], [adresse]. Délégué à la protection des données : [e-mail].'),
          h(2, 'Inscription aux événements'), p('Les données saisies (nom, prénom, e-mail, téléphone, organisme) servent uniquement à organiser l’événement et à vous contacter à son sujet.'), p('Elles sont conservées 12 mois après l’événement, puis supprimées automatiquement.'),
          h(2, 'Candidatures'), p('Les candidatures sont déposées sur la plateforme Gestmax, qui traite vos données selon sa propre politique de confidentialité.'),
          h(2, 'Vos droits'), ul('Accès à vos données', 'Rectification', 'Effacement', 'Opposition et limitation'), p('Pour exercer vos droits, écrivez à [e-mail]. Vous pouvez aussi saisir la CNIL (cnil.fr).'),
          h(2, 'Cookies'), p('Ce site n’utilise pas de cookies de suivi publicitaire.'),
        ],
      },
    ],
  },
  {
    cle: 'accessibilite',
    titre: 'Déclaration d’accessibilité',
    description: 'La trame de la déclaration RGAA, à compléter après l’audit.',
    titrePage: 'Accessibilité',
    chapo: '',
    juridique: true,
    blocs: ['Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          p('[Nom de la collectivité] s’engage à rendre son site accessible conformément à l’article 47 de la loi n° 2005-102 du 11 février 2005.'),
          h(2, 'État de conformité'), p('Le site est [non conforme / partiellement conforme / totalement conforme] avec le référentiel général d’amélioration de l’accessibilité (RGAA), en raison de [préciser].'),
          h(2, 'Contenus non accessibles'), p('[Lister les contenus non accessibles, ou indiquer « aucun ».]'),
          h(2, 'Établissement de cette déclaration'), p('Cette déclaration a été établie le [date]. Technologies utilisées : HTML, CSS, JavaScript. Audit réalisé par [organisme] le [date].'),
          h(2, 'Retour d’information et contact'), p('Si vous n’arrivez pas à accéder à un contenu, contactez-nous : [e-mail], [téléphone].'),
          h(2, 'Voies de recours'), p('Si votre demande reste sans réponse, vous pouvez saisir le Défenseur des droits (defenseurdesdroits.fr).'),
        ],
      },
    ],
  },
];
