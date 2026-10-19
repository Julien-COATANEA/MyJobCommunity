# Deux cibles :
#  - dev  (docker-compose.yml)      : code monté en volume, `strapi develop` (rechargement, constructeur de types) ;
#  - prod (docker-compose.prod.yml) : code et admin compilés dans l'image, `strapi start` avec NODE_ENV=production
#    (constructeur de types désactivé : les schémas ne se modifient que par scripts/generer-types.mjs).
FROM node:22-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY package.json package-lock.json* ./

# ---------- Développement ----------
FROM base AS dev

RUN npm install

COPY . .

EXPOSE 1337

CMD ["npm", "run", "develop"]

# ---------- Production ----------
FROM base AS prod

RUN npm ci

COPY . .

# Marque blanche du back-office : lue à la compilation de l'admin (une image par client).
ARG STRAPI_ADMIN_BRAND_NAME="My Job Community"
ARG STRAPI_ADMIN_PRIMARY_COLOR="#1a5f7a"
ARG STRAPI_ADMIN_SUPPORT_EMAIL=""
ENV STRAPI_ADMIN_BRAND_NAME=$STRAPI_ADMIN_BRAND_NAME \
    STRAPI_ADMIN_PRIMARY_COLOR=$STRAPI_ADMIN_PRIMARY_COLOR \
    STRAPI_ADMIN_SUPPORT_EMAIL=$STRAPI_ADMIN_SUPPORT_EMAIL

RUN NODE_ENV=production npm run build && npm prune --omit=dev
# Fichiers téléversés : exclus de l'image (.dockerignore), Strapi exige le dossier (volume en production).
RUN mkdir -p public/uploads

ENV NODE_ENV=production

EXPOSE 1337

CMD ["npm", "run", "start"]
