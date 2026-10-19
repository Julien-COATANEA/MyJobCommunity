#!/usr/bin/env bash
# Sauvegarde d'une instance : base MariaDB (dump SQL compressé) + fichiers téléversés dans le back-office.
# Le site statique n'est pas sauvegardé : il se régénère depuis Strapi.
#
#   scripts/sauvegarder.sh [dossier]                         # pile de production (docker-compose.prod.yml)
#   COMPOSE_FILE=docker-compose.yml scripts/sauvegarder.sh   # pile de développement
#
# À lancer chaque nuit (cron) et à copier hors du serveur. Les N dernières sauvegardes sont gardées (GARDER, 14 par défaut).
# Restauration :
#   gunzip -c base.sql.gz | docker compose -f docker-compose.prod.yml exec -T mariadb sh -c 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"'
#   docker compose -f docker-compose.prod.yml exec -T strapi tar -xzf - -C /opt/app/public < uploads.tar.gz
# pipefail : un mariadb-dump qui échoue en cours de route fait échouer la sauvegarde (sinon gzip la validerait).
set -euo pipefail

DESTINATION="${1:-$(dirname "$0")/../sauvegardes}"
mkdir -p "$DESTINATION"
# Chemin absolu avant le « cd » : un dossier relatif se lit depuis l'endroit où le script est lancé.
DESTINATION="$(cd "$DESTINATION" && pwd)"
cd "$(dirname "$0")/.."
export COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
GARDER="${GARDER:-14}"
DOSSIER="$DESTINATION/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$DOSSIER"
# Sauvegarde ratée : son dossier est supprimé, il ne compte pas parmi les GARDER conservées.
trap 'echo "Échec de la sauvegarde, $DOSSIER supprimé." >&2; rm -rf "$DOSSIER"' ERR

echo "Base de données…"
# --single-transaction : copie cohérente sans bloquer Strapi (tables InnoDB).
docker compose exec -T mariadb sh -c 'mariadb-dump --single-transaction --routines -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' \
  | gzip > "$DOSSIER/base.sql.gz"

echo "Fichiers téléversés…"
docker compose exec -T strapi tar -czf - -C /opt/app/public uploads > "$DOSSIER/uploads.tar.gz"

# Une sauvegarde vide (service arrêté, erreur silencieuse) ne doit pas passer pour réussie.
for f in base.sql.gz uploads.tar.gz; do
  if [ "$(wc -c < "$DOSSIER/$f")" -lt 100 ]; then echo "$DOSSIER/$f est vide." >&2; false; fi
done
gunzip -t "$DOSSIER/base.sql.gz"
# Un dump complet se termine par cette ligne : son absence signale un dump tronqué.
gunzip -c "$DOSSIER/base.sql.gz" | tail -n 1 | grep -q -- '-- Dump completed'
trap - ERR

# Ménage : les plus anciennes au-delà de GARDER, parmi les seuls dossiers créés par ce script (nom horodaté) : le
# dossier de destination peut contenir autre chose. awk plutôt que « head -n -N », propre à GNU.
find "$DESTINATION" -mindepth 1 -maxdepth 1 -type d -name '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]' |
  sort | awk -v garder="$GARDER" '{ l[NR] = $0 } END { for (i = 1; i <= NR - garder; i++) print l[i] }' |
  while read -r ancienne; do rm -rf "$ancienne"; done

echo "Sauvegarde terminée : $DOSSIER ($(du -sh "$DOSSIER" | cut -f1))"
