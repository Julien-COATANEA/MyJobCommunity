# Image de développement : le code est monté en volume, seuls les node_modules vivent dans l'image.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 1337

CMD ["npm", "run", "develop"]
