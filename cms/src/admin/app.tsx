// Back-office en marque blanche et organisé « à la WordPress » pour les collectivités :
//  - menu : Tableau de bord, Mes pages, Mes articles, Mes événements, Mes offres, Apparence… ;
//  - tableau de bord (page d'accueil) composé de widgets métier ;
//  - écrans dédiés « Mes offres d'emploi » et « Apparence de mon site ».
// Les variables STRAPI_ADMIN_* sont lues au build de l'admin : chaque client a son nom, sa couleur, son logo.
import type { StrapiApp } from '@strapi/strapi/admin';
import {
  Book, Briefcase, Calendar, ChartPie, CheckCircle, Earth, File, Information, Layout, List, PaintBrush, Pencil, Search, Shield, Store, User, WarningCircle,
} from '@strapi/icons';
import logo from './extensions/logo.svg';
import './espace/menu.css';
import { PanneauSite } from './espace/panneaux/PanneauSite';
import { PanneauInscriptions } from './espace/panneaux/PanneauInscriptions';
import { PanneauQualite } from './espace/panneaux/PanneauQualite';
import { PanneauDemandePublication } from './espace/panneaux/PanneauDemandePublication';
import { LienInput } from './espace/LienInput';
import { BoutonModele } from './espace/BoutonModele';
import { monterIndicateur } from './espace/IndicateurSite';
import { monterRecherche } from './espace/Recherche';
import { monterBienvenue } from './espace/Bienvenue';
import { monterNavigation } from './espace/navigation';

const marque = process.env.STRAPI_ADMIN_BRAND_NAME || 'My Job Community';
const primaire = process.env.STRAPI_ADMIN_PRIMARY_COLOR || '#1a5f7a';

/** Mélange une couleur hexadécimale avec du blanc (ratio > 0) ou du noir (ratio < 0). */
function nuance(hex: string, ratio: number): string {
  const cible = ratio > 0 ? 255 : 0;
  const r = Math.abs(ratio);
  return (
    '#' +
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16))
      .map((c) => Math.round(c + (cible - c) * r).toString(16).padStart(2, '0'))
      .join('')
  );
}

// Les nuances claires (100, 200) ne valent que pour le thème clair : en sombre, elles serviraient de fond.
const couleursMarque = {
  primary500: nuance(primaire, 0.25),
  primary600: primaire,
  primary700: nuance(primaire, -0.2),
  buttonPrimary500: nuance(primaire, 0.25),
  buttonPrimary600: primaire,
};
const couleursMarqueClair = {
  ...couleursMarque,
  primary100: nuance(primaire, 0.9),
  primary200: nuance(primaire, 0.75),
};

const textes: Record<string, string> = {
  'Auth.form.welcome.title': `Bienvenue sur ${marque}`,
  'Auth.form.welcome.subtitle': 'Connectez-vous à votre espace de gestion',
  'app.components.LeftMenu.navbrand.title': marque,
  'app.components.LeftMenu.navbrand.workplace': 'Espace de gestion',
  'global.home': 'Tableau de bord',
  'content-manager.plugin.name': 'Tous les contenus',
  'upload.plugin.name': 'Médiathèque',
  'HomePage.header.title': 'Bonjour {name}',
  'HomePage.header.subtitle': 'Voici ce qui se passe sur votre site aujourd’hui.',
  // Aperçu des brouillons (non traduit par Strapi)
  'content-manager.preview.panel.title': 'Aperçu',
  'content-manager.preview.panel.button': 'Voir l’aperçu avant publication',
  'content-manager.preview.panel.button-disabled-tooltip': 'Enregistrez d’abord pour voir l’aperçu',
  'content-manager.preview.page-title': 'Aperçu : {contentType}',
  'content-manager.preview.header.close': 'Fermer l’aperçu',
  'content-manager.preview.copy.label': 'Copier le lien de l’aperçu',
  'content-manager.preview.copy.success': 'Lien de l’aperçu copié',
  'content-manager.preview.tabs.label': 'Version affichée',
  'content-manager.preview.device.select': "Type d'écran",
  'content-manager.preview.device.desktop': 'Ordinateur',
  'content-manager.preview.device.mobile': 'Mobile',
  'HomePage.addWidget.button': 'Ajouter un widget',
  // Colonne du gestionnaire de contenu : vocabulaire de tous les jours au lieu des termes techniques de Strapi.
  'content-manager.header.name': 'Tous les contenus',
  'content-manager.components.LeftMenu.collection-types': 'Listes de contenus',
  'content-manager.components.LeftMenu.single-types': 'Pages et réglages uniques',
  'search.placeholder': 'Rechercher',
  'global.back': 'Retour',
  // Un seul geste pour mettre en ligne : « Enregistrer et publier » (le mode brouillon reste réservé aux pages et articles).
  'app.utils.publish': 'Enregistrer et publier',
  'app.utils.published': 'Publié',
  'app.utils.unpublish': 'Retirer du site',
  'app.utils.draft': 'Brouillon',
  'content-manager.containers.edit.information.last-published.label': 'Publié',
  'content-manager.containers.edit.information.last-draft.label': 'Brouillon enregistré',
};

/** Lien de menu vers une liste du gestionnaire de contenu, visible si l'utilisateur peut la lire. */
const lienContenu = (to: string, uid: string, id: string, libelle: string, icon: any, position: number) => ({
  to,
  icon,
  intlLabel: { id: `mjc.menu.${id}`, defaultMessage: libelle },
  permissions: [{ action: 'plugin::content-manager.explorer.read', subject: uid }],
  position,
});

// Widgets Strapi conservés sur le tableau de bord (les autres sont masqués pour simplifier).
const WIDGETS_STRAPI_CONSERVES = ['last-edited-entries', 'last-published-entries'];

export default {
  config: {
    locales: ['fr'],
    translations: { fr: textes, en: textes },
    auth: { logo },
    menu: { logo },
    head: { favicon: logo },
    tutorials: false,
    notifications: { releases: false },
    theme: {
      light: { colors: couleursMarqueClair },
      dark: { colors: couleursMarque },
    },
  },

  register(app: StrapiApp) {
    // Couleur de la marque disponible pour les feuilles de style (menu, tuiles, boutons de la fenêtre d'accueil).
    document.documentElement.style.setProperty('--mjc-primaire', primaire);
    // La visite guidée de Strapi s'adresse aux développeurs (schémas, jetons d'API, Strapi Cloud) : désactivée.
    try {
      const cle = 'STRAPI_GUIDED_TOUR';
      localStorage.setItem(cle, JSON.stringify({ ...JSON.parse(localStorage.getItem(cle) ?? '{}'), enabled: false }));
    } catch {
      // Stockage indisponible : la visite reste affichée, sans conséquence.
    }
    // Interface en français par défaut, dès l'écran de connexion (sinon : langue du navigateur).
    try {
      if (!localStorage.getItem('strapi-admin-language')) localStorage.setItem('strapi-admin-language', 'fr');
    } catch {
      // idem
    }

    // Champ « Lien » : liste des pages du site au lieu d'une adresse à taper (voir LienInput).
    (app as any).customFields.register({
      name: 'lien',
      type: 'string',
      intlLabel: { id: 'mjc.champ.lien', defaultMessage: 'Lien' },
      intlDescription: { id: 'mjc.champ.lien.description', defaultMessage: 'Choisir une page du site ou saisir une adresse' },
      components: { Input: async () => ({ default: LienInput }) },
    });

    const c = 'content-manager/collection-types';
    const s = 'content-manager/single-types';
    [
      lienContenu(`${s}/api::accueil.accueil`, 'api::accueil.accueil', 'accueil', "Ma page d'accueil", Layout, 0.1),
      lienContenu(`${c}/api::page.page`, 'api::page.page', 'pages', 'Mes pages', File, 0.2),
      lienContenu(`${c}/api::article.article`, 'api::article.article', 'articles', 'Mes articles', Pencil, 0.3),
      lienContenu(`${c}/api::evenement.evenement`, 'api::evenement.evenement', 'evenements', 'Mes événements', Calendar, 0.4),
      lienContenu(`${s}/api::page-offres.page-offres`, 'api::page-offres.page-offres', 'page-offres', "Ma page d'offres", Search, 0.61),
      lienContenu(`${c}/api::entreprise.entreprise`, 'api::entreprise.entreprise', 'entreprises', 'Annuaire des entreprises', Store, 0.5),
      lienContenu(`${s}/api::navigation.navigation`, 'api::navigation.navigation', 'menus', 'Menus du site', List, 0.8),
      lienContenu(`${s}/api::parametres.parametres`, 'api::parametres.parametres', 'informations', 'Informations du site', Information, 0.9),
    ].forEach((lien) => app.addMenuLink(lien));

    app.addMenuLink({
      to: 'mes-offres',
      icon: Briefcase,
      intlLabel: { id: 'mjc.menu.offres', defaultMessage: "Mes offres d'emploi" },
      permissions: [{ action: 'plugin::content-manager.explorer.read', subject: 'api::offre.offre' }],
      position: 0.6,
      Component: () => import('./espace/pages/MesOffres'),
    } as any);
    app.addMenuLink({
      to: 'site-carriere',
      icon: Earth,
      intlLabel: { id: 'mjc.menu.site-carriere', defaultMessage: 'Site carrière' },
      permissions: [{ action: 'plugin::content-manager.explorer.update', subject: 'api::parametres.parametres' }],
      position: 0.65,
      Component: () => import('./espace/pages/SiteCarriere'),
    } as any);
    app.addMenuLink({
      to: 'apparence',
      icon: PaintBrush,
      intlLabel: { id: 'mjc.menu.apparence', defaultMessage: 'Apparence' },
      permissions: [{ action: 'plugin::content-manager.explorer.update', subject: 'api::parametres.parametres' }],
      position: 0.7,
      Component: () => import('./espace/pages/Apparence'),
    } as any);
    const responsable = [{ action: 'plugin::content-manager.explorer.publish', subject: 'api::page.page' }];
    app.addMenuLink({
      to: 'cookies',
      icon: Shield,
      intlLabel: { id: 'mjc.menu.cookies', defaultMessage: 'Cookies et suivi' },
      permissions: [{ action: 'plugin::content-manager.explorer.update', subject: 'api::parametres.parametres' }],
      position: 0.71,
      Component: () => import('./espace/pages/Cookies'),
    } as any);
    app.addMenuLink({
      to: 'sante',
      icon: WarningCircle,
      intlLabel: { id: 'mjc.menu.sante', defaultMessage: 'Santé du site' },
      permissions: [],
      position: 0.72,
      Component: () => import('./espace/pages/Sante'),
    } as any);
    app.addMenuLink({
      to: 'equipe',
      icon: User,
      intlLabel: { id: 'mjc.menu.equipe', defaultMessage: 'Mon équipe' },
      permissions: responsable,
      position: 0.8,
      Component: () => import('./espace/pages/Equipe'),
    } as any);
    app.addMenuLink({
      to: 'aide',
      icon: Book,
      intlLabel: { id: 'mjc.menu.aide', defaultMessage: 'Aide' },
      permissions: [],
      position: 0.95,
      Component: () => import('./espace/pages/Guide'),
    } as any);

    // Widgets du tableau de bord : enregistrés ici, après ceux des plugins, pour pouvoir les réordonner.
    const widget = (id: string, titre: string, icon: any, charger: () => Promise<any>, link?: { libelle: string; href: string }) => ({
      id,
      icon,
      title: { id: `mjc.widget.${id}`, defaultMessage: titre },
      component: async () => (await charger()).default,
      ...(link ? { link: { label: { id: `mjc.widget.${id}.lien`, defaultMessage: link.libelle }, href: link.href } } : {}),
    });

    const nosWidgets = [
      widget('a-traiter', 'À traiter', WarningCircle, () => import('./espace/widgets/ATraiter'), { libelle: 'Santé du site', href: '/sante' }),
      widget('demarrage', 'Mise en route', CheckCircle, () => import('./espace/widgets/Demarrage')),
      widget('raccourcis', 'Actions rapides', Pencil, () => import('./espace/widgets/Raccourcis')),
      widget('chiffres', 'Mon site en chiffres', ChartPie, () => import('./espace/widgets/Chiffres')),
      widget('statistiques', 'Fréquentation du site', ChartPie, () => import('./espace/widgets/Statistiques')),
      widget('evenements', 'Prochains événements', Calendar, () => import('./espace/widgets/ProchainsEvenements'), {
        libelle: 'Tous les événements',
        href: '/content-manager/collection-types/api::evenement.evenement',
      }),
      widget('etat-site', 'Mon site et mes offres', Earth, () => import('./espace/widgets/EtatSite')),
    ];

    (app as any).widgets.register((existants: any[]) => [
      ...nosWidgets,
      ...existants.filter((w) => WIDGETS_STRAPI_CONSERVES.includes(w.id)),
    ]);
  },

  bootstrap(app: StrapiApp) {
    // « User » = comptes publics du plugin Utilisateurs de Strapi : inutilisés par le site, retirés de la liste.
    app.registerHook('Admin/CM/pages/App/mutate-collection-types-links', ({ ctLinks, models }: any) => ({
      ctLinks: ctLinks.filter((lien: any) => lien.uid !== 'plugin::users-permissions.user'),
      models,
    }));
    // Encarts des fiches : « Sur le site » (état + Voir sur le site) et « Inscriptions » (événements).
    (app.getPlugin('content-manager').apis as any).addEditViewSidePanel([PanneauSite, PanneauQualite, PanneauDemandePublication, PanneauInscriptions]);
    // « Mes pages » : bouton « À partir d'un modèle » sous « Créer une nouvelle entrée ».
    (app.getPlugin('content-manager') as any).injectComponent('listView', 'actions', { name: 'mjc-modele-page', Component: BoutonModele });
    // Indicateur permanent « Site à jour / brouillons non publiés », recherche Ctrl + K, fenêtre d'accueil.
    monterIndicateur();
    monterRecherche();
    monterBienvenue();
    monterNavigation();
  },
};
