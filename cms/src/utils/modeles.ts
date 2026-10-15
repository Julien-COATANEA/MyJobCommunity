// Modèles de pages : une page prête à remplir (blocs en place, textes d'exemple à adapter) au lieu d'une page vide.
// Les textes entre crochets [ ] sont à compléter. Les blocs respectent le catalogue du site.
//
// Pages légales (mentions légales, données personnelles, cookies) : le texte est complet et utilise des jetons comme
// {editeur} ou {hebergeur}, remplacés au build par les « Informations légales » des Informations du site
// (voir site/src/lib/jetons-legaux.ts). Elles se mettent donc à jour toutes seules ; un jeton non renseigné s'affiche
// « [à compléter] » : à régler avant de publier (contrôlé par le suivi « Santé du site »).

const t = (text: string) => ({ type: 'text', text });
const p = (...enfants: (string | object)[]) => ({ type: 'paragraph', children: enfants.map((e) => (typeof e === 'string' ? t(e) : e)) });
const a = (url: string, text: string) => ({ type: 'link', url, children: [t(text)] });
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
      { __component: 'blocs.chiffres-cles', titre: 'Le territoire en chiffres', chiffres: [{ valeur: '[120 000]', libelle: 'habitants' }, { valeur: '{recrutent}', libelle: 'entreprises qui recrutent' }, { valeur: '{offres}', libelle: 'offres en ligne' }] },
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
    description: 'Formulaire de contact (messages reçus à l’e-mail de contact du site) et coordonnées de la collectivité.',
    titrePage: 'Contact',
    chapo: '[Une question sur l’emploi, un événement ou une offre ? Contactez-nous.]',
    blocs: ['Formulaire de contact (avec nos coordonnées)', 'Cartes (horaires, accès)'],
    sections: [
      { __component: 'blocs.formulaire-contact', surtitre: 'Nous écrire', titre: 'Écrivez-nous', afficherCoordonnees: true },
      {
        __component: 'blocs.cartes', titre: 'Venir nous voir',
        cartes: [
          { icone: 'evenement', titre: 'Horaires d’accueil', texte: '[Du lundi au vendredi, de 9 h à 17 h]' },
          { icone: 'transport', titre: 'Accès', texte: '[Bus, tram, parking à proximité]' },
          { icone: 'accompagnement', titre: 'Sur rendez-vous', texte: '[Un conseiller vous reçoit pour faire le point sur votre projet]' },
        ],
      },
    ],
  },
  {
    cle: 'mentions-legales',
    titre: 'Mentions légales',
    description: 'Éditeur, hébergeur, propriété intellectuelle : texte complet, rempli avec vos Informations légales.',
    titrePage: 'Mentions légales',
    chapo: '',
    juridique: true,
    blocs: ['Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          p('Conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique, voici les informations légales relatives au site {site}.'),
          h(2, 'Éditeur du site'),
          p('{editeur}'),
          p('Adresse : {adresse}'),
          p('Téléphone : {telephone}'),
          p('E-mail : {email}'),
          p('N° SIRET : {siret}'),
          p('Directeur ou directrice de la publication : {directeur}.'),
          h(2, 'Hébergement'),
          p('Ce site est hébergé par {hebergeur}, {hebergeur-adresse}. Téléphone : {hebergeur-telephone}.'),
          h(2, 'Conception et réalisation'),
          p('Plateforme conçue et maintenue par {prestataire}.'),
          h(2, 'Propriété intellectuelle'),
          p('Les contenus de ce site (textes, images, logos, graphismes) sont, sauf mention contraire, la propriété de {editeur} ou de ses partenaires. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite (articles L.335-2 et suivants du code de la propriété intellectuelle).'),
          h(2, 'Offres d’emploi'),
          p('Les offres d’emploi sont publiées par les recruteurs, sous leur responsabilité, via la plateforme de recrutement Gestmax. {editeur} ne peut être tenu responsable de leur contenu. Les candidatures sont déposées sur la plateforme Gestmax.'),
          h(2, 'Liens hypertextes'),
          p('Ce site peut contenir des liens vers des sites tiers. {editeur} n’exerce aucun contrôle sur leur contenu et décline toute responsabilité à leur égard.'),
          h(2, 'Responsabilité'),
          p('{editeur} s’efforce de fournir des informations exactes et à jour, sans pouvoir garantir l’absence d’erreur ou d’omission. Le site peut être indisponible temporairement pour des raisons de maintenance.'),
          h(2, 'Données personnelles et cookies'),
          p('Consultez la page ', a('/donnees-personnelles/', 'Données personnelles'), ' pour connaître les traitements réalisés et vos droits, et la page ', a('/politique-de-cookies/', 'Politique de cookies'), ' pour les traceurs utilisés.'),
          h(2, 'Accessibilité'),
          p('Les informations sur l’accessibilité du site figurent dans la page ', a('/accessibilite/', 'Accessibilité'), '.'),
          h(2, 'Droit applicable'),
          p('Le présent site est soumis au droit français. En cas de litige, les tribunaux français sont compétents.'),
        ],
      },
    ],
  },
  {
    cle: 'donnees-personnelles',
    titre: 'Données personnelles',
    description: 'Politique de confidentialité (RGPD) : traitements, durées, droits, CNIL. Texte complet.',
    titrePage: 'Données personnelles',
    chapo: '',
    juridique: true,
    blocs: ['Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          p('Cette page explique comment {editeur} traite vos données personnelles lorsque vous utilisez le site {site}, conformément au règlement général sur la protection des données (RGPD) et à la loi « Informatique et Libertés ».'),
          h(2, 'Responsable du traitement'),
          p('{editeur}, {adresse}.'),
          p('Pour toute question sur vos données ou pour exercer vos droits : {contact-donnees}.'),
          h(2, 'Les traitements réalisés'),
          h(3, 'Inscription à un événement'),
          ul(
            'Données : nom, prénom, adresse e-mail, téléphone (facultatif), organisme (facultatif).',
            'Finalités : organiser l’événement, gérer les places et la liste d’attente, vous envoyer la confirmation, un rappel la veille et les informations pratiques.',
            'Base légale : mission d’intérêt public de {editeur} (article 6.1.e du RGPD).',
            'Durée de conservation : 12 mois après l’événement, puis suppression automatique.',
          ),
          h(3, 'Formulaire de contact'),
          ul(
            'Données : nom, adresse e-mail, téléphone (facultatif), sujet et message.',
            'Finalité : répondre à votre demande.',
            'Base légale : mission d’intérêt public de {editeur} (article 6.1.e du RGPD).',
            'Durée de conservation : le temps de traiter votre demande, puis au plus 12 mois après le dernier échange.',
          ),
          h(3, 'Candidatures et offres d’emploi'),
          p('Les candidatures ne passent pas par ce site : elles sont déposées sur la plateforme de recrutement Gestmax, qui traite vos données selon sa propre politique de confidentialité, accessible depuis cette plateforme.'),
          h(3, 'Mesure d’audience et cookies'),
          p('Des outils de mesure d’audience peuvent être utilisés avec votre accord uniquement. Vous trouverez la liste des traceurs, leur durée et la façon de modifier votre choix dans la page ', a('/politique-de-cookies/', 'Politique de cookies'), '.'),
          h(3, 'Journaux techniques'),
          ul(
            'Données : adresse IP, date et heure de connexion, pages consultées.',
            'Finalité : sécurité et bon fonctionnement du site.',
            'Base légale : intérêt légitime (article 6.1.f du RGPD) et obligation légale de l’hébergeur.',
            'Durée de conservation : 12 mois.',
          ),
          h(2, 'Qui reçoit vos données ?'),
          p('Vos données sont destinées aux agents habilités de {editeur}. Elles peuvent être traitées, pour le compte de {editeur} et sur instruction, par ses prestataires techniques : l’hébergeur {hebergeur} et {prestataire}. Elles ne sont ni vendues ni cédées à des tiers à des fins commerciales.'),
          p('Si vous acceptez les cookies de mesure d’audience Google Analytics, certaines données peuvent être transférées hors de l’Union européenne (États-Unis), dans le cadre des garanties prévues par Google ; la page Politique de cookies détaille ces outils.'),
          h(2, 'Vos droits'),
          p('Vous disposez des droits suivants sur vos données :'),
          ul(
            'droit d’accès et de copie ;',
            'droit de rectification ;',
            'droit à l’effacement, dans les cas prévus par la loi ;',
            'droit à la limitation du traitement ;',
            'droit d’opposition, pour des raisons tenant à votre situation particulière ;',
            'droit de définir des directives sur le sort de vos données après votre décès.',
          ),
          p('Pour les exercer, écrivez à {contact-donnees} en joignant, si nécessaire, un justificatif d’identité. Nous répondons dans un délai d’un mois.'),
          p('Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL : Commission nationale de l’informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ', a('https://www.cnil.fr/fr/plaintes', 'cnil.fr/fr/plaintes'), '.'),
          h(2, 'Sécurité'),
          p('{editeur} met en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données (échanges chiffrés, accès restreints, sauvegardes).'),
          h(2, 'Mise à jour'),
          p('Cette page peut évoluer. La version en ligne est la version en vigueur.'),
        ],
      },
    ],
  },
  {
    cle: 'politique-cookies',
    titre: 'Politique de cookies',
    description: 'Explique les cookies du site : la liste se met à jour toute seule d’après l’écran « Cookies et suivi ».',
    titrePage: 'Politique de cookies',
    chapo: '',
    juridique: true,
    blocs: ['Texte', 'Liste des cookies (automatique)', 'Texte'],
    sections: [
      {
        __component: 'blocs.texte',
        contenu: [
          h(2, 'Qu’est-ce qu’un cookie ?'),
          p('Un cookie, ou traceur, est un petit fichier enregistré sur votre appareil lorsque vous consultez un site. Il permet par exemple de mémoriser un choix ou de mesurer la fréquentation. Ce site respecte les règles de la CNIL : seuls les traceurs indispensables sont déposés sans votre accord ; tous les autres demandent votre consentement préalable.'),
          h(2, 'Les traceurs indispensables'),
          p('Ils ne demandent pas de consentement. Sur ce site, il s’agit de la mémorisation de votre choix sur les cookies : elle est enregistrée dans votre navigateur pendant 6 mois, puis le bandeau vous est de nouveau proposé.'),
          h(2, 'Les traceurs soumis à votre accord'),
          p('Les outils de mesure d’audience et les autres services ajoutés au site ne se lancent qu’après votre accord. Refuser ne vous empêche pas d’utiliser le site, et le refus est aussi simple que l’acceptation.'),
        ],
      },
      { __component: 'blocs.cookies-utilises', titre: 'Cookies et traceurs utilisés sur ce site' },
      {
        __component: 'blocs.texte',
        contenu: [
          h(2, 'Modifier votre choix'),
          p('Vous pouvez changer d’avis à tout moment : utilisez le bouton « Gérer mes choix » ci-dessus, ou le lien « Gestion des cookies » en bas de chaque page. Si vous retirez votre accord, les cookies de mesure d’audience déjà déposés sont supprimés.'),
          p('Vous pouvez aussi paramétrer votre navigateur pour bloquer ou supprimer les cookies. La CNIL explique comment faire : ', a('https://www.cnil.fr/fr/cookies-et-autres-traceurs/comment-se-proteger/maitriser-votre-navigateur', 'maîtriser votre navigateur'), '.'),
          h(2, 'En savoir plus'),
          p('Pour connaître l’ensemble des traitements de données réalisés sur le site et vos droits, consultez la page ', a('/donnees-personnelles/', 'Données personnelles'), '. Contact : {contact-donnees}.'),
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
