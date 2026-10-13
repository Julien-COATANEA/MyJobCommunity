# Image de développement Astro : le code est monté en volume.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

EXPOSE 4321

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
