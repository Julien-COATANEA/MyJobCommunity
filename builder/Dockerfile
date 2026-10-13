# Builder : dépendances du site Astro + petit serveur Node qui reçoit le webhook Strapi.
FROM node:22-bookworm-slim

WORKDIR /app
COPY site/package.json site/package-lock.json* ./
RUN npm install

COPY builder/server.mjs /builder/server.mjs

EXPOSE 4000
CMD ["node", "/builder/server.mjs"]
