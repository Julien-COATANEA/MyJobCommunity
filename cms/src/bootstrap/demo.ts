// Données de démonstration d'un territoire FICTIF (« Vallée Verte »).
// Exécuté au démarrage si SEED_DEMO=true et si les paramètres du site n'existent pas encore.
import { statSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Core } from '@strapi/strapi';
import { slugifier } from '../utils/gestmax';

// --- Aides de construction du contenu « blocks » de Strapi ---
const t = (text: string, extra: Record<string, unknown> = {}) => ({ type: 'text', text, ...extra });
const p = (...enfants: (string | object)[]) => ({
  type: 'paragraph',
  children: enfants.map((e) => (typeof e === 'string' ? t(e) : e)),
});
const h = (level: number, text: string) => ({ type: 'heading', level, children: [t(text)] });
const ul = (...items: string[]) => ({
  type: 'list',
  format: 'unordered',
  children: items.map((i) => ({ type: 'list-item', children: [t(i)] })),
});
const lien = (url: string, text: string) => ({ type: 'link', url, children: [t(text)] });

const jours = (n: number, heure = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(heure, 0, 0, 0);
  return d.toISOString();
};
const date = (n: number) => jours(n).slice(0, 10);

export const TEMOIGNAGES = [
  { citation: 'J’ai trouvé mon CDI en trois semaines grâce au forum. Et nous avons trouvé une maison avec jardin à 15 minutes du travail.', nom: 'Camille', role: 'Technicienne de maintenance, arrivée en 2025' },
  { citation: 'Recruter ici, c’est miser sur des candidats qui veulent s’installer durablement. Le réseau des entreprises nous aide beaucoup.', nom: 'Karim', role: 'Directeur, Ateliers Mécaniques du Val' },
  { citation: 'Ma conjointe a été accompagnée pour trouver un poste elle aussi. C’est ce qui a fait la différence dans notre décision.', nom: 'Thomas', role: 'Infirmier, Clinique des Tilleuls' },
];

export async function initialiserDonneesDemo(strapi: Core.Strapi) {
  const dejaFait = await strapi.db.query('api::parametres.parametres').count({});
  if (dejaFait) return;
  strapi.log.info('[demo] création des données de démonstration…');

  const dossierImages = join(strapi.dirs.app.root, 'data', 'seed-images');
  const televerser = async (fichier: string, alternativeText: string, caption?: string) => {
    try {
      const filepath = join(dossierImages, fichier);
      const mimetype = { '.jpg': 'image/jpeg', '.png': 'image/png' }[extname(fichier)] ?? 'application/octet-stream';
      const [media] = await strapi.plugin('upload').service('upload').upload({
        data: { fileInfo: { alternativeText, name: fichier, ...(caption ? { caption } : {}) } },
        files: { filepath, originalFilename: fichier, mimetype, size: statSync(filepath).size },
      });
      return media.id;
    } catch (e) {
      strapi.log.warn(`[demo] image ${fichier} non importée : ${(e as Error).message}`);
      return null;
    }
  };
  const doc = (uid: string) => strapi.documents(uid as any);
  const publier = (uid: string, data: Record<string, unknown>) => doc(uid).create({ data, status: 'published' } as any);

  // ---------- Médias ----------
  const img = {
    hero: await televerser('lac-annecy.jpg', ''),
    ville: await televerser('lyon.jpg', 'Vue sur le centre-ville et la rivière', 'Le centre-ville'),
    montagne: await televerser('grenoble.jpg', 'La ville au pied des montagnes', 'Au pied des montagnes'),
    lac: await televerser('annecy.jpg', 'Les bords du lac en été', 'Les bords du lac'),
    campagne: await televerser('paysage-volcan.jpg', 'Paysage de collines verdoyantes', 'Les collines'),
    vallee: await televerser('valence.jpg', 'Les toits de la vieille ville', 'La vieille ville'),
    logoFranceTravail: await televerser('logo-france-travail.jpg', 'France Travail'),
    logoApec: await televerser('logo-apec.jpg', 'Apec'),
    logoMissionLocale: await televerser('logo-mission-locale.png', 'Mission locale'),
  };

  // ---------- Paramètres et menus ----------
  await doc('api::parametres.parametres').create({
    data: {
      nomSite: 'Vallée Verte Emploi',
      baseline: "L'emploi au cœur de la Vallée Verte",
      logoTexte: 'VV',
      couleurPrimaire: '#1a5f7a',
      couleurSecondaire: '#0f3d4c',
      couleurAccent: '#e8833a',
      couleurTexte: '#1c2b33',
      couleurFond: '#ffffff',
      policeTitres: 'sora',
      policeTexte: 'inter',
      arrondis: 'legers',
      adresse: "Communauté d'agglomération de la Vallée Verte\n1 place de la Mairie\n00000 Vallée-Verte",
      telephone: '01 23 45 67 89',
      email: 'emploi@vallee-verte.example',
      emailNotificationInscriptions: 'evenements@vallee-verte.example',
      reseauxSociaux: [
        { reseau: 'linkedin', url: 'https://www.linkedin.com/' },
        { reseau: 'facebook', url: 'https://www.facebook.com/' },
        { reseau: 'instagram', url: 'https://www.instagram.com/' },
      ],
      gestmaxUrlFront: 'https://demo.gestmax.fr',
      lienEspaceCandidat: 'gestmax:/account/login',
      lienCandidatureSpontanee: 'gestmax:/apply/1/1/candidature-spontanee',
      seoParDefaut: {
        metaTitle: 'Vallée Verte Emploi',
        metaDescription: "Offres d'emploi, entreprises qui recrutent, actualités et événements emploi de la Vallée Verte.",
        metaImage: img.hero,
      },
    } as any,
  });

  await doc('api::navigation.navigation').create({
    data: {
      menuPrincipal: [
        {
          libelle: 'Offres',
          url: '/offres',
          sousLiens: [
            { libelle: "Offres d'emploi", url: '/offres', description: 'Toutes les offres du territoire' },
            { libelle: "Offres d'alternance", url: '/offres?contrat=Alternance', description: 'Se former en travaillant' },
            { libelle: 'Candidature spontanée', url: 'gestmax:/apply/1/1/candidature-spontanee', description: 'Déposez votre CV' },
          ],
        },
        {
          libelle: 'Le territoire',
          url: '/le-territoire',
          sousLiens: [
            { libelle: 'Vivre et travailler ici', url: '/le-territoire', description: 'Atouts, filières, qualité de vie' },
            { libelle: 'Offres en iframe (test)', url: '/offres-iframe', description: 'Intégration du front Gestmax' },
          ],
        },
        {
          libelle: 'Actualités',
          url: '/actualites',
          sousLiens: [
            { libelle: 'Articles', url: '/actualites', description: "L'info emploi du territoire" },
            { libelle: 'Événements', url: '/evenements', description: 'Forums, job datings, ateliers' },
          ],
        },
        { libelle: 'Entreprises', url: '/entreprises' },
      ],
      liensPiedDePage: [
        { libelle: 'Offres d’emploi', url: '/offres' },
        { libelle: 'Annuaire des entreprises', url: '/entreprises' },
        { libelle: 'Événements', url: '/evenements' },
        { libelle: 'Plan du site', url: '/plan-du-site' },
      ],
      liensLegaux: [
        { libelle: 'Mentions légales', url: '/mentions-legales' },
        { libelle: 'Données personnelles', url: '/donnees-personnelles' },
        { libelle: 'Accessibilité : partiellement conforme', url: '/accessibilite' },
      ],
    } as any,
  });

  // ---------- Taxonomies ----------
  const categories: Record<string, any> = {};
  for (const nom of ['Recrutement', 'Formation', 'Vie du territoire', 'Témoignage']) {
    categories[nom] = await doc('api::categorie-article.categorie-article').create({ data: { nom, slug: slugifier(nom) } as any });
  }
  const secteurs: Record<string, any> = {};
  for (const nom of ['Industrie', 'Santé', 'Numérique', 'Agroalimentaire', 'Transport et logistique', 'Services']) {
    secteurs[nom] = await doc('api::secteur.secteur').create({ data: { nom, slug: slugifier(nom) } as any });
  }

  // ---------- Entreprises (fictives, rattachées aux offres du mock Gestmax) ----------
  const entreprises = [
    ['Ateliers Mécaniques du Val', 'Industrie', 'Vallée-Verte', 'de 250 à 999 salariés', "Sous-traitant de rang 1 pour l'aéronautique, spécialisé dans l'usinage de précision.", img.vallee, true],
    ['Clinique des Tilleuls', 'Santé', 'Saint-Martin-sur-Verte', 'de 250 à 999 salariés', 'Établissement de santé privé de 180 lits : chirurgie, médecine et soins de suite.', img.ville, true],
    ['Numérival', 'Numérique', 'Vallée-Verte', 'de 50 à 249 salariés', 'Éditeur de logiciels pour les collectivités et ESN régionale.', img.montagne, true],
    ['Fromagerie des Prés', 'Agroalimentaire', 'Les Granges', 'de 50 à 249 salariés', 'Fromagerie familiale depuis 1952, transformation du lait des fermes de la vallée.', img.campagne, false],
    ['Transports Verdier', 'Transport et logistique', 'Port-la-Verte', 'de 250 à 999 salariés', 'Transport routier et logistique régionale, 300 véhicules.', img.lac, false],
  ] as const;
  for (const [nom, secteur, ville, effectif, extrait, image, miseEnAvant] of entreprises) {
    await publier('api::entreprise.entreprise', {
      nom, slug: slugifier(nom), ville, effectif, extrait, image, miseEnAvant,
      secteur: secteurs[secteur].documentId,
      nomEntiteGestmax: nom,
      siteWeb: 'https://example.com',
      description: [
        p(extrait),
        h(2, 'Pourquoi nous rejoindre ?'),
        ul('Des parcours de formation internes', 'Une équipe à taille humaine', 'Un cadre de vie exceptionnel'),
      ],
    });
  }

  // ---------- Articles ----------
  const articles = [
    ['Le Forum de l’emploi revient en novembre', 'Recrutement', -2, "Plus de 60 entreprises du territoire attendent les candidats au parc des expositions.", img.ville, true],
    ['Alternance : les formations qui recrutent en 2027', 'Formation', -6, 'Industrie, santé, numérique : tour d’horizon des cursus en alternance proposés dans la vallée.', img.montagne, false],
    ['Pourquoi tant de familles s’installent dans la Vallée Verte', 'Vie du territoire', -12, 'Logement accessible, écoles, nature : les nouveaux arrivants racontent leur choix.', img.lac, false],
    ['« J’ai trouvé mon CDI en trois semaines »', 'Témoignage', -20, 'Camille, technicienne de maintenance, raconte son arrivée aux Ateliers Mécaniques du Val.', img.campagne, false],
  ] as const;
  for (const [titre, categorie, decalage, extrait, image, miseEnAvant] of articles) {
    await publier('api::article.article', {
      titre, slug: slugifier(titre), extrait, image, miseEnAvant,
      datePublication: date(decalage),
      categorie: categories[categorie].documentId,
      contenu: [
        p(extrait),
        h(2, 'Ce qu’il faut retenir'),
        ul('Des centaines de postes ouverts', 'Un accompagnement personnalisé', 'Des employeurs engagés'),
        p('Pour en savoir plus, consultez ', lien('/offres', 'toutes les offres du territoire'), '.'),
      ],
    });
  }

  // ---------- Événements ----------
  await publier('api::evenement.evenement', {
    titre: 'Forum de l’emploi de la Vallée Verte',
    slug: slugifier('Forum de l’emploi de la Vallée Verte'),
    typeEvenement: 'Forum emploi',
    dateDebut: jours(21, 9), dateFin: jours(21, 17),
    lieu: 'Parc des expositions', adresse: 'Avenue du Lac, 00000 Vallée-Verte',
    extrait: '60 entreprises, 400 postes à pourvoir et des ateliers CV toute la journée.',
    image: img.ville,
    contenu: [p('Venez rencontrer les recruteurs du territoire, munis de plusieurs CV.'), ul('Espace job dating', 'Ateliers CV et entretien', 'Stand création d’entreprise')],
    inscriptionActive: true, placesMax: 300, dateLimiteInscription: jours(20, 18),
  });
  await publier('api::evenement.evenement', {
    titre: 'Job dating santé à la Clinique des Tilleuls',
    slug: slugifier('Job dating santé à la Clinique des Tilleuls'),
    typeEvenement: 'Job dating',
    dateDebut: jours(9, 14), dateFin: jours(9, 17),
    lieu: 'Clinique des Tilleuls', adresse: '12 rue des Tilleuls, 00000 Saint-Martin-sur-Verte',
    extrait: 'Infirmiers, aides-soignants, agents de service : 10 minutes pour convaincre.',
    image: img.montagne,
    contenu: [p('Des entretiens courts avec les responsables de service. Places limitées.')],
    inscriptionActive: true, placesMax: 12,
  });
  await publier('api::evenement.evenement', {
    titre: 'Webinaire : réussir son entretien d’embauche',
    slug: slugifier('Webinaire : réussir son entretien d’embauche'),
    typeEvenement: 'Webinaire',
    dateDebut: jours(35, 12), dateFin: jours(35, 13),
    enLigne: true,
    extrait: 'Une heure de conseils pratiques avec une conseillère en insertion professionnelle.',
    image: img.lac,
    inscriptionActive: true,
    inscriptionExterneUrl: 'https://example.com/inscription-webinaire',
  });

  // ---------- Blocs réutilisés ----------
  const blocsOffresActus = [
    { __component: 'blocs.dernieres-offres', surtitre: 'Fraîchement publiées', titre: 'Les dernières offres', introduction: 'Les opportunités à pourvoir dans toute la vallée.', mode: 'liste', nombre: 6 },
    { __component: 'blocs.dernieres-actualites', surtitre: 'Actualités', titre: 'L’emploi bouge dans la Vallée Verte', nombre: 3 },
    { __component: 'blocs.prochains-evenements', surtitre: 'Événements à venir', titre: 'Forums, ateliers, job datings', nombre: 3 },
  ];

  // ---------- Accueil ----------
  await publier('api::accueil.accueil', {
    heroTitre: 'Trouvez votre emploi dans la Vallée Verte',
    heroTexte: "Offres d'emploi, entreprises qui recrutent et événements : tout l'emploi du territoire au même endroit.",
    heroImage: img.hero,
    heroRecherche: true,
    sections: [
      {
        __component: 'blocs.chiffres-cles',
        surtitre: 'Le territoire en chiffres',
        titre: 'Une vallée qui recrute',
        chiffres: [
          { valeur: '{offres}', libelle: 'offres en ligne' },
          { valeur: '{recrutent}', libelle: 'entreprises qui recrutent' },
          { valeur: '{evenements}', libelle: 'événements à venir' },
        ],
      },
      {
        __component: 'blocs.espaces',
        surtitre: 'Votre espace personnel',
        titre: 'Candidats et recruteurs, votre tableau de bord',
        introduction: 'Gérez vos candidatures, vos offres et vos alertes en quelques clics.',
        espaces: [
          {
            titre: 'Espace candidat', icone: 'utilisateur', couleur: 'principale',
            texte: 'Déposez votre CV, créez vos alertes emploi personnalisées et suivez vos candidatures en temps réel.',
            bouton: { libelle: 'Je me connecte', url: 'gestmax:/account/login', style: 'principal' },
          },
          {
            titre: 'Espace recruteur', icone: 'entreprise', couleur: 'secondaire',
            texte: 'Publiez vos offres, présentez votre entreprise dans l’annuaire et trouvez les talents du territoire.',
            // Espace recruteur = back-office (même destination que le bouton de l'en-tête).
            bouton: { libelle: 'Accéder à mon espace', url: `${(process.env.PUBLIC_STRAPI_URL ?? 'http://localhost:1337').replace(/\/+$/, '')}/admin`, style: 'principal' },
          },
        ],
      },
      blocsOffresActus[0],
      {
        __component: 'blocs.cartes',
        surtitre: 'Vivre et travailler ici',
        titre: 'La Vallée Verte vous accompagne',
        cartes: [
          { icone: 'emploi', titre: 'Trouver un emploi', texte: 'Des milliers d’offres et des conseillers à votre écoute.', lien: '/offres', libelleLien: 'Voir les offres' },
          { icone: 'entreprise', titre: 'Recruter', texte: 'Publiez vos offres et rejoignez l’annuaire des entreprises.', lien: '/entreprises', libelleLien: 'Découvrir l’annuaire' },
          { icone: 'logement', titre: 'S’installer', texte: 'Logement, écoles, transports : préparez votre arrivée.', lien: '/le-territoire', libelleLien: 'Découvrir le territoire' },
          { icone: 'formation', titre: 'Se former', texte: 'Alternance, reconversion : trouvez la formation qui vous correspond.', lien: '/actualites', libelleLien: 'Lire les actualités' },
        ],
      },
      blocsOffresActus[1],
      blocsOffresActus[2],
      { __component: 'blocs.entreprises', surtitre: 'Les employeurs', titre: 'Ils recrutent sur le territoire', nombre: 3 },
      {
        __component: 'blocs.temoignages',
        surtitre: 'Témoignages',
        titre: 'Ils ont choisi la Vallée Verte',
        temoignages: TEMOIGNAGES,
      },
      {
        __component: 'blocs.logos',
        surtitre: 'Nos partenaires',
        titre: 'Ils font vivre l’emploi local',
        introduction: 'Collectivités, institutions et réseaux engagés aux côtés des candidats et des recruteurs.',
        logos: [
          { nom: 'France Travail', image: img.logoFranceTravail, url: 'https://www.francetravail.fr' },
          { nom: 'Apec', image: img.logoApec, url: 'https://www.apec.fr' },
          { nom: 'Mission locale', image: img.logoMissionLocale },
        ].filter((l) => l.image),
      },
      {
        __component: 'blocs.appel-action',
        titre: 'Vous ne trouvez pas l’offre idéale ?',
        texte: 'Déposez votre candidature spontanée : les entreprises du territoire vous contacteront.',
        boutons: [
          { libelle: 'Déposer mon CV', url: 'gestmax:/apply/1/1/candidature-spontanee', style: 'principal' },
          { libelle: 'Créer une alerte', url: 'gestmax:/alert', style: 'secondaire' },
        ],
      },
    ],
    seo: { metaTitle: 'Vallée Verte Emploi : offres d’emploi et entreprises qui recrutent' },
  });

  // ---------- Pages ----------
  await publier('api::page.page', {
    titre: 'Le territoire',
    slug: 'le-territoire',
    chapo: 'Entre lac et montagnes, la Vallée Verte conjugue dynamisme économique et qualité de vie.',
    imageBandeau: img.lac,
    sections: [
      {
        __component: 'blocs.texte-image',
        surtitre: 'Vivre et travailler ici',
        titre: 'Un territoire qui bouge',
        contenu: [p('42 communes, 120 000 habitants et un tissu économique diversifié : industrie de précision, santé, agroalimentaire et numérique.'), p('Le territoire investit dans les transports, le logement et la formation pour accueillir les talents de demain.')],
        image: img.vallee,
        imagesComplementaires: [img.lac, img.montagne].filter(Boolean),
        atouts: [
          { icone: 'loisirs', titre: 'Cadre de vie', texte: 'Lac, montagne et nature à 20 minutes' },
          { icone: 'transport', titre: 'Bien reliée', texte: 'Gare TGV, autoroute, aéroport à 1 h' },
          { icone: 'entreprise', titre: 'Pôles d’excellence', texte: 'Industrie de précision, santé, numérique' },
          { icone: 'logement', titre: 'Coût de la vie', texte: 'Accès à la propriété facilité' },
        ],
        positionImage: 'gauche',
        bouton: { libelle: 'Voir les entreprises', url: '/entreprises', style: 'principal' },
      },
      {
        __component: 'blocs.cartes-photo',
        surtitre: 'Les communes',
        titre: 'Quatre pôles, une même vallée',
        cartes: [
          { image: img.ville, etiquette: 'PÔLE 1', titre: 'Vallée-Verte', sousTitre: 'Ville centre' },
          { image: img.lac, etiquette: 'PÔLE 2', titre: 'Les Rives', sousTitre: 'Bords du lac' },
          { image: img.montagne, etiquette: 'PÔLE 3', titre: 'Saint-Martin', sousTitre: 'Porte des montagnes' },
          { image: img.campagne, etiquette: 'PÔLE 4', titre: 'Les Collines', sousTitre: 'Bourgs et campagne' },
        ].filter((c) => c.image),
      },
      { __component: 'blocs.chiffres-cles', titre: 'Le territoire en chiffres', chiffres: [{ valeur: '120 000', libelle: 'habitants' }, { valeur: '8 %', libelle: 'de chômage' }, { valeur: '30 min', libelle: 'de la grande ville' }, { valeur: '15', libelle: 'lycées et campus' }] },
      {
        __component: 'blocs.cartes',
        titre: 'Les filières qui recrutent',
        cartes: [
          { icone: 'entreprise', titre: 'Industrie', texte: 'Usinage, maintenance, qualité.' },
          { icone: 'sante', titre: 'Santé', texte: 'Soignants, aides à domicile.' },
          { icone: 'info', titre: 'Numérique', texte: 'Développeurs, techniciens réseau.' },
          { icone: 'transport', titre: 'Logistique', texte: 'Conducteurs, préparateurs.' },
        ],
      },
      {
        __component: 'blocs.galerie',
        surtitre: 'En images',
        titre: 'La Vallée Verte comme si vous y étiez',
        photos: [img.lac, img.ville, img.montagne, img.campagne, img.vallee].filter(Boolean),
      },
      {
        __component: 'blocs.faq',
        titre: 'Questions fréquentes',
        questions: [
          { question: 'Comment trouver un logement ?', reponse: [p('Le service habitat de l’agglomération vous accompagne gratuitement dans vos recherches.')] },
          { question: 'Mon conjoint peut-il être accompagné ?', reponse: [p('Oui : le dispositif « double carrière » aide les conjoints des nouveaux salariés à trouver un emploi.')] },
        ],
      },
    ],
  });

  await publier('api::page.page', {
    titre: 'Offres en iframe (test)',
    slug: 'offres-iframe',
    chapo: 'Page de test : intégration directe du front Gestmax par iframe, avec redimensionnement automatique.',
    sections: [
      { __component: 'blocs.dernieres-offres', titre: 'Dernières offres (iframe Gestmax)', mode: 'iframe-gestmax', cheminIframe: '/search/last', nombre: 5 },
      { __component: 'blocs.texte', titre: 'Comparaison', contenu: [p('La même liste, alimentée par la synchronisation Strapi (HTML statique, indexable, données structurées JobPosting) :')] },
      { __component: 'blocs.dernieres-offres', titre: 'Dernières offres (synchronisées)', mode: 'liste', nombre: 5 },
    ],
    seo: { noIndex: true },
  });

  const pageLegale = (titre: string, slug: string, contenu: object[]) =>
    publier('api::page.page', { titre, slug, sections: [{ __component: 'blocs.texte', contenu }] });

  await pageLegale('Mentions légales', 'mentions-legales', [
    h(2, 'Éditeur du site'),
    p("Communauté d'agglomération de la Vallée Verte (territoire fictif de démonstration)."),
    h(2, 'Hébergement'),
    p('À compléter.'),
  ]);
  await pageLegale('Données personnelles', 'donnees-personnelles', [
    p('Les données saisies lors de l’inscription à un événement servent uniquement à l’organisation de cet événement.'),
    p('Elles sont conservées un an au maximum. Vous pouvez exercer vos droits en écrivant à emploi@vallee-verte.example.'),
  ]);
  await pageLegale('Accessibilité', 'accessibilite', [
    p('La Vallée Verte s’engage à rendre ses services numériques accessibles conformément à l’article 47 de la loi n° 2005-102 du 11 février 2005.'),
    h(2, 'État de conformité'),
    p('Le site est partiellement conforme avec le référentiel général d’amélioration de l’accessibilité (RGAA) version 4.1.2. Un audit reste à réaliser.'),
    h(2, 'Retour d’information et contact'),
    p('Si vous n’arrivez pas à accéder à un contenu ou à un service, contactez-nous à emploi@vallee-verte.example.'),
  ]);

  strapi.log.info('[demo] données de démonstration créées.');
}
