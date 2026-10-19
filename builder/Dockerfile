# Builder : dépendances et code du site Astro + petit serveur Node qui reçoit le webhook Strapi.
# En développement, docker-compose.yml monte ./site par-dessus /app (modifications prises en compte sans reconstruire).
FROM node:22-bookworm-slim

WORKDIR /app
COPY site/package.json site/package-lock.json* ./
RUN npm ci

COPY site/ ./
COPY builder/server.mjs /builder/server.mjs

EXPOSE 4000
CMD ["node", "/builder/server.mjs"]
