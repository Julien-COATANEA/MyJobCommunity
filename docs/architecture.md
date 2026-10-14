# Architecture et choix techniques

État au 13/10/2026 : première version fonctionnelle de bout en bout en local (Strapi 5.57, Astro 7.3, MariaDB 11).

## 1. Vue d'ensemble

```
                    ┌──────────── Pile Docker d'UN client ─────────────┐
 Collectivité ──▶   │  Strapi (BO + API)  ◀──▶  MariaDB                 │
 (back-office)      │     │  ▲      │                                    │
                    │     │  │      └─ webhook « publication » ─▶ builder │── astro build ──▶ releases/<date>
                    │     │  │                                        │         (lien « current » basculé)
                    │     │  └── cron 30 min : REST v2 Gestmax (offres) │                 │
                    └─────┼──────────────────────────────────────────┘                 ▼
                          │ API publique (filtres d'offres, inscriptions)          Nginx : site statique
 Internaute ──────────────┴──────────────────────────────────────────────────▶  HTML/CSS, très peu de JS
                          └── « Postuler », candidature spontanée, espaces candidat/recruteur ──▶ front Gestmax
```

- **Une pile par client** (isolation des données, incident sans effet sur les autres), **une seule base de code**.
- **Site 100 % statique** : aucun runtime Node côté public. Les seuls appels dynamiques partent du navigateur
  vers l'API Strapi : filtres d'offres, places restantes et inscription aux événements.
- Le builder construit dans un dossier neuf puis bascule un lien symbolique : pas de coupure, retour arrière
  possible (3 versions conservées). Les images optimisées sont mises en cache d'un build à l'autre.

## 2. Modèle de contenu (Strapi)

| Type | Nature | Rôle |
|---|---|---|
| Paramètres du site | single | Identité, **tokens de thème** (5 couleurs, 2 polices, arrondis), coordonnées, réseaux, URL du front Gestmax, SEO par défaut |
| Menus | single | Menu principal (2 niveaux), liens de pied de page, liens légaux |
| Accueil | single | Hero + zone de blocs |
| Page | collection | Pages libres : titre, chapô, bandeau + **zone de blocs** |
| Article, Catégorie d'article | collection | Actualités |
| Événement, Inscription | collection | Événements, inscription en ligne (jauge, date limite) ou lien externe |
| Entreprise, Secteur | collection | Annuaire ; `nomEntiteGestmax` (un ou plusieurs noms séparés par « ; ») rattache les offres synchronisées, couplage depuis « Mes offres d'emploi » |
| Offre | collection | **Synchronisée** depuis Gestmax, jamais saisie à la main |

**Catalogue fermé de 13 blocs** (texte, texte + image, chiffres clés, cartes, appel à l'action, FAQ, logos,
recherche d'offres, dernières offres, dernières actualités, prochains événements, entreprises, iframe) :
la collectivité compose ses pages sans pouvoir sortir du gabarit. C'est la réponse au problème « WordPress
trop dur à garder fidèle au gabarit ». Ajouter un bloc = un schéma dans `generer-composants.mjs` + un
composant dans `site/src/components/blocs/`, disponible pour tous les clients.

Les liens saisis acceptent trois formes : `/chemin` (interne), `https://…` (externe), `gestmax:/chemin`
(résolu vers le front Gestmax du client).

`?populate=deep` (middleware `cms/src/middlewares/deep-populate.ts`) peuple automatiquement composants, zones
dynamiques, médias et relations directes, sans jamais exposer les inscriptions.

## 3. Marque blanche et thème

- **Site** : les tokens saisis dans « Paramètres du site » deviennent des variables CSS au build
  (`site/src/lib/theme.ts`). Les nuances (pâle, foncé, bordures) sont dérivées en CSS avec `color-mix()` :
  une couleur saisie suffit. La couleur de texte sur l'accent est calculée automatiquement (blanc ou sombre).
- **Polices** auto-hébergées (Inter, Sora, Source Sans 3, Atkinson Hyperlegible, ou police système),
  sous-ensemble latin seul, préchargées : aucun appel à Google Fonts (RGPD, RGESN).
- **Contrôle RGAA à la saisie** : Strapi refuse d'enregistrer des couleurs dont le contraste est insuffisant
  (texte/fond, blanc sur primaire et secondaire, liens) avec un message explicite dans le BO.
- **Back-office** : nom, couleur principale (`STRAPI_ADMIN_*`) et logo propres à chaque client, interface en
  français, promotions et tutoriels Strapi masqués (`cms/src/admin/app.tsx`).

## 3 bis. Back-office pensé pour les collectivités

Objectif : un BO aussi simple à prendre en main que WordPress (`cms/src/admin/`).

- **Menu à rubriques avec libellés** : Tableau de bord ; *Contenus* (Ma page d'accueil, Mes pages, Mes articles,
  Mes événements, Inscriptions, Annuaire des entreprises) ; *Emploi* (Mes offres d'emploi) ; *Mon site* (Apparence,
  Menus du site, Informations du site) ; *Avancé* (Tous les contenus, Médiathèque, Paramètres). Strapi n'affiche
  que des icônes : `espace/menu.css` révèle les libellés au-delà de 1100 px. Chaque entrée n'apparaît que si le rôle
  de l'utilisateur y a accès.
- **Tableau de bord** (page d'accueil du BO) en widgets : actions rapides, chiffres clés, prochains événements avec
  remplissage des jauges et dernières inscriptions, état du site (dernière mise en ligne, bouton « Mettre à jour
  maintenant ») et des offres Gestmax. Les widgets Strapi destinés aux développeurs et la visite guidée sont masqués.
- **Mes offres d'emploi** : synchronisation à la demande, répartition par contrat et par entreprise, offres non
  rattachées à l'annuaire, liens vers le site et vers Gestmax. Les offres sont en lecture seule pour les rôles Éditeur et Auteur.
- **Apparence** : façon « Personnaliser » de WordPress, avec aperçu en direct du site, palettes prêtes à l'emploi,
  dépôt du logo et contrôle RGAA des contrastes pendant la saisie (l'enregistrement est bloqué si illisible).
- **Formulaires en français** : chaque champ a un libellé et une aide compréhensibles (`cms/src/bootstrap/back-office.ts`),
  les listes ont des colonnes et un tri adaptés. Une personnalisation faite à la main dans le BO n'est pas écrasée.
- Routes dédiées `/espace/*`, authentifiées par la session du BO (`cms/src/api/espace/`).

Limite : le menu à libellés repose sur la structure HTML du BO Strapi ; à revérifier à chaque montée de version de Strapi.

## 3 ter. Expérience utilisateur (13/10/2026)

**Site public**
- Cartes d'offres avec logo de l'entreprise (fourni par Gestmax), badge de contrat coloré, badge « Nouveau » (moins de 7 jours),
  salaire et date relative. Le modèle est unique (`site/src/lib/carte-offre.ts`) : pages statiques et recherche dans le navigateur.
- Recherche d'offres en direct : filtres appliqués à la saisie, pastilles retirables, nombre d'offres par contrat,
  secteur, tri, **recherche autour d'une ville** (géocodage IGN Géoplateforme au moment de la synchronisation pour les
  offres, dans le navigateur pour la ville saisie) et état « aucun résultat » qui propose de créer une alerte Gestmax.
- Fiche offre : barre « Postuler » fixe sur mobile, « Retour aux résultats » qui conserve les filtres, encart entreprise,
  offres similaires, message avant le passage sur le site carrière.
- Accueil : compteur réel d'offres, recherche réduite à un champ sur mobile, chiffres clés automatiques
  (`{offres}`, `{entreprises}`, `{evenements}`), bloc **Témoignages**, en-têtes « Tout voir » pour les blocs de liste.
- Événements : places restantes sur les cartes (en direct), filtre par type, fichier « Ajouter à mon agenda » (.ics).
- Annuaire : recherche par nom, filtres secteur et « qui recrutent », logos, lien « Voir ses offres ».

**Back-office**
- Indicateur permanent « Site à jour / Mise à jour en cours / N brouillons non publiés » (bas du menu), avec le détail des
  contenus à publier.
- Encarts dans les fiches : « Sur le site » (état de publication + « Voir sur le site ») et, pour les événements,
  « Inscriptions » (jauge, derniers inscrits, export Excel). Le menu « Inscriptions » est supprimé.
- **Aperçu des brouillons** (fonction Preview de Strapi) : la page `/apercu/<type>/<id>` du site, rendue à la demande et
  protégée par `APERCU_SECRET`, affiche la version brouillon avec un bandeau.
- Formulaires regroupés par thème, champs conditionnels (lieu masqué si l'événement est en ligne, jauge et date limite
  seulement si l'inscription est active), exemples dans les champs vides.
- Widget « Mise en route » (« Votre site est prêt à X % »), page **Aide**, back-office en français dès la connexion.
- Rôles Éditeur et Auteur : interface simplifiée (ni colonne technique du gestionnaire de contenu, ni « Tous les contenus »,
  ni paramètres, ni constructeur de types).

**Sécurité** : l'API publique de Strapi renvoyait les brouillons avec `?status=draft`. Le middleware `global::brouillons`
les réserve désormais à l'aperçu.

## 3 quater. Confort d'administration (13/10/2026)

**Principe intangible : les offres ne se créent ni ne se modifient dans le BO.** Elles viennent de Gestmax. Le garde
`cms/src/utils/garde-offres.ts` (middleware des documents) refuse toute création, suppression, publication ou
modification venant d'ailleurs que de la synchronisation ; seuls deux réglages éditoriaux passent : `aLaUne` et
`masquee` (écran « Mes offres d'emploi »). Une offre masquée disparaît de l'API publique (`OFFRES_VISIBLES`) et donc du
site. Un échec de synchronisation prévient la collectivité par e-mail (une seule fois par série d'échecs).

| Besoin | Mise en œuvre |
|---|---|
| Publication simple | Brouillon supprimé pour événements et entreprises (`draftAndPublish: false`) ; bouton « Enregistrer et publier » ; publication programmée (`publierLe`, cron à la minute) pour pages et articles |
| Liens sans taper d'URL | Champ personnalisé `global::lien` (`LienInput.tsx`) alimenté par `GET /espace/liens` (pages, articles, événements, entreprises, filtres d'offres, raccourcis Gestmax) |
| Avant de publier | Encart `PanneauQualite` : texte alternatif, ordre des titres, liens peu explicites ou cassés, longueurs, dates, aperçu Google (`admin/espace/qualite.ts`, fonctions pures) |
| Santé du site | Page + widget « À traiter » : synchro, entreprises sans fiche, offres bientôt expirées, événements peu remplis, images sans alt, liens cassés, brouillons oubliés, adresse de notification (`controllers/sante.ts`) |
| Inscriptions | Liste d'attente automatique, lien d'annulation personnel (jeton) avec promotion du suivant, message groupé (envois individuels), émargement imprimable, rappel J-1 (cron 8 h), purge RGPD à 12 mois (cron 3 h 30) |
| Équipe | Rôles « Responsable » (publie, gère l'équipe) et « Rédacteur » (prépare, demande la publication par e-mail), créés au démarrage à partir du rôle Éditeur ; page « Mon équipe » avec invitation par e-mail |
| Gagner du temps | Modèles de pages (`utils/modeles.ts`, bouton « À partir d'un modèle » de Mes pages, page créée en brouillon), recherche globale Ctrl + K, fenêtre de bienvenue |
| Cookies et suivi | Bandeau de consentement (choix conservé 6 mois), Google Tag Manager / Analytics par identifiant, scripts personnalisés head/body ; les scripts soumis au consentement attendent « Tout accepter » (`site/src/lib/suivi.ts`) |
| Fréquentation | Widget lisant l'API Plausible (`PLAUSIBLE_URL`, `PLAUSIBLE_SITE`, `PLAUSIBLE_API_KEY`) ; sans configuration, le widget explique quoi renseigner |

Toutes les routes `/espace/*` sont des routes d'admin (`strapi.server.routes({ type: 'admin' })`) protégées par
`admin::isAuthenticatedAdmin`. La gestion d'équipe est réservée aux rôles Responsable, Éditeur et super administrateur.

## 4. Offres d'emploi

### Synchronisation (choix retenu par défaut)
Une tâche cron Strapi (`cms/src/api/offre/services/offre.ts`) interroge l'API REST v2 Gestmax
`GET /rest/v2/onlinevacancy` (authentification Basic, utilisateur `rest_user`), page par page, puis crée,
met à jour ou supprime les offres. Une empreinte évite de réécrire une offre inchangée, ce qui évite aussi
un rebuild inutile. Les champs `vac_*` diffèrent selon l'instance : ils sont mappés par variables d'environnement.

Côté site :
- une **page statique par offre** avec données structurées `JobPosting`, pour Google for Jobs ;
- la **liste** contient les 24 offres les plus récentes en HTML, puis le JavaScript interroge l'API Strapi
  (filtres mot-clé, ville, contrat, « afficher plus ») : les filtres ne nécessitent pas de rebuild ;
- **« Postuler »** renvoie vers Gestmax (`/apply/{id}/{media}/{slug}`) : la candidature ne passe jamais par Strapi.

### Iframe (test demandé)
Page de démonstration `/offres-iframe` : le bloc « Dernières offres » en mode `iframe-gestmax` intègre
`/search/last` du front Gestmax, à côté de la même liste synchronisée. Le composant
`site/src/components/GestmaxIframe.astro` écoute les messages `smartIframe` de Gestmax (`gmxHeight`, `gmxScroll`)
pour redimensionner l'iframe (en vérifiant l'origine), lui donne un titre accessible et propose un lien de repli.
À tester avec une instance réelle (`gestmaxUrlFront`) où `smartIframe.enabled` est actif.

| | Synchronisation Strapi | Iframe Gestmax |
|---|---|---|
| SEO / Google for Jobs | ✅ pages indexables, JobPosting | ❌ contenu de l'iframe attribué à Gestmax |
| Rendu / gabarit | ✅ identique au reste du site | ⚠️ dépend du thème Gestmax |
| Accessibilité | ✅ maîtrisée | ⚠️ dépend de Gestmax, iframe à titrer |
| Fraîcheur | ⚠️ 30 min max + rebuild | ✅ temps réel |
| Effort | Mapping des champs par instance | Quasi nul |

## 5. Inscription aux événements

Le site étant statique, le formulaire poste directement sur une route publique de Strapi
(`POST /api/inscriptions-evenements`) :
- **sans JavaScript** : envoi classique, Strapi redirige (303) vers `/evenements/inscription-confirmee/` ou
  `-impossible/` ;
- **avec JavaScript** : envoi JSON, erreurs affichées sur place avec un récapitulatif focalisé, `aria-invalid`
  et `aria-describedby`, et les places restantes affichées en direct ;
- contrôles côté serveur : événement publié et ouvert, date limite, jauge, doublon d'e-mail, consentement, champ piège anti-robots ;
- e-mail de confirmation au participant et notification à la collectivité (adresse privée, non exposée par l'API).

Les inscriptions sont consultables dans le BO (collection « Inscription à un événement »).

## 6. Menus et Gestmax

L'analyse du code Gestmax montre qu'**il n'existe pas d'API de menu dans Gestmax** : le menu du front est
codé en dur dans les templates Smarty. Le mécanisme existant va dans l'autre sens : le plugin
`HeaderFooterWp` **récupère l'en-tête et le pied de page d'un site externe** (avec un cache Redis de 36 h).

Choix retenu : **le menu est géré une seule fois dans Strapi** et le site publie `/header-footer/` au format
attendu par ce plugin (en-tête, marqueur `<!--COUPURE-->`, pied de page, liens absolus, menu fonctionnel sans
JS puisque Gestmax retire les scripts). Le front Gestmax du client prend ainsi exactement le même habillage que le
site. Configuration Gestmax : `headerFooterWp.url = <SITE_URL>/header-footer/?token=…`, `headerFooterWp.base_url = <SITE_URL>`.

### Site carrière (décision du 13/10/2026)

Le parcours candidat (candidature, compte candidat `/account/login`, alertes `/alert`, candidature spontanée) reste
sur **un second site : le front Gestmax**, habillé avec l'en-tête et le pied de page du site. Pas d'iframe.

- **Espace BO « Site carrière »** (rubrique Emploi) : adresses du site carrière et des liens candidats, configuration
  `gestmax.ini` prête à copier ou à envoyer par e-mail, lien vers l'en-tête et le pied de page, vérifications de bout en bout
  (format de la page, protection par jeton, site carrière joignable, habillage effectivement visible, liens candidats).
- **Page `/header-footer/` protégée par jeton** (`HEADER_FOOTER_TOKEN`, contrôlé par Nginx) et non indexée, comme
  l'exige le plugin.
- **Styles isolés** : l'en-tête et le pied de page ont leur propre feuille (`site/src/styles/shell.css`), confinée sous
  `.mjc-shell`, en unités relatives à une taille fixe. Le `<head>` importé par Gestmax ne modifie donc pas ses formulaires.
- **Cache Gestmax** : `headerFooterWp.ttl = 900` (15 min) au lieu de 36 h par défaut.
- À faire côté Gestmax : fusionner le plugin `HeaderFooterWp` (branche Plaine Vallée r35700) dans develop/master, puis
  ajouter ses marqueurs (`$strWpHead`, `$strWpHeader`, `$strWpFooter`) dans le thème MJC. Le lien d'évitement
  « Aller au contenu » vise `#contenu` : l'identifiant doit exister sur la zone principale des pages Gestmax.
- Pas d'« espace recruteur » Gestmax pour les entreprises extérieures : le lien reste vide, donc le bouton est masqué.

## 7. CV Catcher

Il n'existe **aucun « CV Catcher » dans Gestmax** aujourd'hui. Les sites de référence (Roanne, Laval…) tournent
sur SmartForum (groupe Hellowork). Leur widget « Charger mon CV » analyse le CV et propose des offres.
L'équivalent le plus proche dans Gestmax est la **candidature spontanée**, une offre spéciale postulée via `/apply/...`.

**Pour Strapi, ce n'est pas bloquant** : quelle que soit la solution, le CV va du navigateur vers Gestmax,
jamais vers Strapi. Options :
1. *(en place)* lien ou bouton « Déposer mon CV » vers la candidature spontanée Gestmax (`lienCandidatureSpontanee`) ;
2. widget CV Catcher développé **dans Gestmax** (dépôt + analyse + suggestion d'offres), intégré au site par
   iframe ou script : c'est un chantier côté Gestmax, pas côté Strapi ;
3. API de dépôt sur le modèle de l'intégration Koopt (`/kooptapply/applywith/...`), si un formulaire natif
   sur le site est vraiment souhaité.

## 8. Accessibilité (RGAA) : mesures en place

Liens d'évitement ; titre de page « Page | Site » ; `lang="fr"` ; repères `header`, `nav` (libellés), `main`,
`footer` ; menu « disclosure » au clavier (Échap, `aria-expanded`), qui fonctionne aussi sans JS ; fil d'Ariane avec
`aria-current` ; **plan du site** (deux systèmes de navigation) ; h1 unique (les h1 saisis dans l'éditeur deviennent
des h2) ; focus visible contrasté ; alternatives d'images issues du BO (images de cartes décoratives, logos-liens
nommés) ; iframes titrées ; formulaires étiquetés avec `autocomplete`, aide au format, erreurs explicites ;
messages dynamiques en `aria-live` ; FAQ en `<details>` natif ; `prefers-reduced-motion` ; cibles d'au moins 44 px ;
**contrastes vérifiés à la saisie dans le BO** ; page « Accessibilité » prévue dans les menus légaux.

Reste à faire : audit RGAA complet, test avec lecteurs d'écran (NVDA, VoiceOver), accompagnement des contributeurs
(alternatives d'images, hiérarchie des titres) et déclaration d'accessibilité réelle par client.

## 9. SEO

Balises title et description éditables (composant SEO sur chaque contenu, avec repli automatique) ; URL canonique ;
Open Graph ; `noindex` hors production et par page ; `robots.txt` selon `SITE_ENV` ; **sitemap XML** généré à
chaque build (pages techniques et `noindex` exclues) ; données structurées `WebSite`, `Organization`,
`NewsArticle`, `Event`, `JobPosting`, `BreadcrumbList` ; URL lisibles par slug ; 404 utile.

## 10. Écoconception (RGESN), argument commercial

HTML statique pré-rendu (aucun serveur applicatif sollicité pour l'affichage) ; JavaScript limité à quelques
scripts de quelques Ko (menu, filtres, formulaire) ; images converties en WebP, redimensionnées, `srcset` et
chargement différé ; polices auto-hébergées en sous-ensemble latin ; aucun traceur ni CDN tiers ; cache HTTP
long sur les ressources versionnées ; builds déclenchés uniquement par une publication réelle (brouillons et
inscriptions ignorés) ; build quotidien unique pour l'expiration des contenus.
Mesures sur la démo : accueil = 35 Ko de HTML ; régénération complète du site = 3 s une fois les images en cache.

## 11. Strapi ou back-office Laravel ?

Premier bilan de ce montage :
- **Pour Strapi** : modèle de contenu, BO, médias, rôles, brouillons/publication et webhooks disponibles
  immédiatement ; la marque blanche du BO et les règles métier (contrastes, inscriptions, synchro) s'ajoutent
  proprement en TypeScript.
- **Points de vigilance** : Strapi évolue vite (montées de version à suivre) ; personnaliser l'interface du BO
  au-delà du thème et du logo demande des plugins React ; il n'y a pas d'export CSV natif des inscriptions ;
  avec MariaDB, Strapi affiche des avertissements bruyants mais sans conséquence (« Transaction was implicitly committed »).
- Le site Astro ne dépend que d'une API JSON : passer plus tard à un BO Laravel ne remettrait en cause ni le
  site ni le modèle de contenu. Il faudrait seulement réécrire `site/src/lib/strapi.ts`.

## 12. Limites connues et prochaines étapes

- **Aperçu en production** : en local, c'est le serveur de développement Astro (port 4321) qui sert `/apercu`. En
  production, il faudra un petit service Node qui exécute `site/dist/server/entry.mjs` (construit par le même build) et
  renseigner `APERCU_URL` avec son adresse.
- **Recherche autour d'une ville** : jusqu'à 100 offres dans la zone (au-delà, il faudra paginer côté serveur).
- Édition visuelle directement dans l'aperçu (clic sur un texte de la page) : non faite, l'aperçu actuel est en lecture seule.
- Statistiques de visite : le suivi Plausible côté site (script et objectif « Postuler ») reste à brancher avec l'instance du client.
- Jauge d'inscription : deux inscriptions simultanées sur la dernière place peuvent passer (verrou à ajouter si nécessaire).
- Liste des offres sans JS limitée aux 24 plus récentes (les autres restent accessibles par le sitemap et les fiches entreprises) ; une pagination statique est possible.
- Déploiement de production : image Strapi `build` + `start`, reverse proxy HTTPS (Traefik), sauvegardes MariaDB et `uploads`, supervision du builder.
- Logo du BO par variable d'environnement plutôt que par fichier.
- Recherche plein texte sur le site (par exemple Pagefind, statique) si le volume de contenu le justifie.
