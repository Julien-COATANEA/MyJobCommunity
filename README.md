# My Job Community

Site emploi standardisé pour les territoires (région, agglomération) : actualités, événements avec inscription,
annuaire d'entreprises, offres d'emploi synchronisées depuis Gestmax, pages libres et menus.
La collectivité édite tout dans le back-office (Strapi) ; le site public est **statique** (Astro), régénéré
automatiquement à chaque publication.

| Dossier    | Rôle                                                                       | Techno                     |
|------------|----------------------------------------------------------------------------|----------------------------|
| `cms/`     | Back-office + API de contenu, synchro Gestmax, inscriptions aux événements | Strapi 5 (TypeScript) + MariaDB |
| `site/`    | Site public généré en HTML statique                                         | Astro 7                    |
| `builder/` | Reçoit le webhook Strapi et régénère le site (bascule atomique)             | Node 22                    |
| `web/`     | Configuration Nginx qui sert le site statique                              | Nginx                      |
| `docs/`    | Architecture, choix techniques, pistes à instruire                         |                            |

Voir [docs/architecture.md](docs/architecture.md) pour le fonctionnement détaillé et les points ouverts.

## Démarrage

Prérequis : **Docker Desktop** (ou Docker dans WSL). Node n'est pas nécessaire sur le poste : tout tourne en conteneurs.

```bash
cp .env.example .env      # puis remplacer chaque « change_me » par un secret aléatoire
docker compose up -d --build
```

Le premier démarrage installe les dépendances, crée la base et charge un **territoire de démonstration fictif**
(« Vallée Verte ») avec 10 offres simulées (`GESTMAX_MOCK=true`). Compter quelques minutes.

Deux comptes de test du back-office sont créés (si `SEED_DEMO=true`), avec les identifiants définis dans `.env` :
- `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` : super-administrateur (agence) ;
- `DEMO_EDITEUR_EMAIL` / `DEMO_EDITEUR_PASSWORD` : rôle « Éditeur », pour voir le BO tel qu'une collectivité l'utilisera.

| Service                                  | URL                          |
|------------------------------------------|------------------------------|
| Back-office Strapi (créer le 1er compte)  | http://localhost:1337/admin  |
| Site statique (version « production »)    | http://localhost:8080        |
| Site Astro en développement (rechargement à chaud) | http://localhost:4321 |
| Boîte mail de test (inscriptions)         | http://localhost:8026        |
| État du dernier build                     | `docker compose logs -f builder` |

### Cycle de publication

1. La collectivité publie un contenu dans Strapi.
2. Strapi appelle le webhook « Régénération du site » (créé automatiquement) → `builder`.
3. Le builder attend `BUILD_DEBOUNCE_MS` sans nouvelle modification, lance `astro build`, puis bascule le
   lien `current` servi par Nginx. En cas d'échec, la version en ligne est conservée.
4. Un build quotidien (3 h) met à jour les événements passés et les offres expirées.

Les brouillons et les inscriptions aux événements ne déclenchent pas de build.

## Commandes utiles

```bash
docker compose logs -f strapi                 # logs Strapi
docker compose exec site npm test             # tests unitaires du site (Vitest)
docker compose exec strapi npx tsc --noEmit   # vérification TypeScript du CMS
docker compose down                           # arrêter (données conservées)
docker compose down -v                        # arrêter ET effacer base + builds
```

Modifier le modèle de contenu : éditer `cms/scripts/generer-types.mjs` ou `generer-composants.mjs`, puis
`node scripts/generer-types.mjs` (dans `cms/`). Les schémas JSON générés sont versionnés.

## Brancher une vraie instance Gestmax

Dans `.env` :

```ini
GESTMAX_MOCK=false
GESTMAX_URL=https://emploi.client.fr            # front Gestmax, sans slash final
GESTMAX_REST_USER=...                           # utilisateur REST v2 (table rest_user)
GESTMAX_REST_PASSWORD=...                       # droits OnlineVacancyList + OnlineVacancyDetails
GESTMAX_FIELD_CONTRAT=vac_contract              # noms des champs propres à l'instance (voir ci-dessous)
```

Les noms des champs `vac_*` varient d'une instance à l'autre. Pour les trouver, ouvrir la documentation de l'API
de l'instance (`/rest/apidoc/`) puis la liste « fieldslist/type/vacancy_list ». Les valeurs par défaut correspondent
à l'instance de test Aktor (`aktor.dev.gestmax.fr`) :

| Variable | Champ Gestmax | Exemple de valeur reçue |
|---|---|---|
| `GESTMAX_FIELD_CONTRAT` | `vac_contract` | CDI |
| `GESTMAX_FIELD_LIEU` | `vac_town` | LYON → affiché « Lyon » |
| `GESTMAX_FIELD_DEPARTEMENT` | `vac_localisation` | -- (69) Rhône → affiché « Rhône (69) » |
| `GESTMAX_FIELD_SECTEUR` | `vac_function` | Commercial / Vente |
| `GESTMAX_FIELD_DESCRIPTION` | `vac_tasks` | description de la mission (HTML) |
| `GESTMAX_FIELD_AVANTAGES` | `vac_offer` | « Nous vous proposons », ajouté à la description |
| `GESTMAX_FIELD_PROFIL` | `vac_profil` | profil recherché (HTML) |
| `GESTMAX_FIELD_SALAIRE` | `vac_salaire` | 40-45 K€ |

Un seul appel `GET /rest/v2/onlinevacancy?fields=…&pageItems=100` renvoie toutes les offres en ligne, lien
« Postuler » (`application_link`) compris. Les candidatures spontanées (`is_unsolicited`) sont ignorées.

Puis `docker compose restart strapi`. La synchronisation tourne toutes les 30 minutes (`GESTMAX_SYNC_CRON`)
et peut être déclenchée à la demande : `POST /api/offres/synchroniser` avec un jeton d'API Strapi.
Renseigner aussi « URL du front Gestmax » dans **Paramètres du site** (liens `gestmax:/…`, iframe).

## Nouveau client

Une pile Docker par client (Strapi + MariaDB + build), une seule base de code jamais forkée :
nouveau `.env` (secrets, URLs, Gestmax, `STRAPI_ADMIN_BRAND_NAME` / `STRAPI_ADMIN_PRIMARY_COLOR`),
logo du back-office dans `cms/src/admin/extensions/logo.svg`, puis identité et couleurs du site dans le BO.
Mettre `SEED_DEMO=false` en dehors des démonstrations.
