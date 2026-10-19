import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const strapi = new URL(STRAPI_URL);

// Pages exclues du plan de site XML : techniques, ou marquées « noIndex » dans le BO (pages, actualités, événements,
// entreprises). Les mêmes contenus donnent la date de dernière modification (lastmod) de leur adresse.
const EXCLUSIONS = ['/header-footer', '/evenements/inscription-', '/evenements/annuler', '/message-envoye', '/message-impossible', '/404', '/apercu'];
const CONTENUS = [
  { type: 'pages', prefixe: '' },
  { type: 'articles', prefixe: '/actualites' },
  { type: 'evenements', prefixe: '/evenements' },
  { type: 'entreprises', prefixe: '/entreprises' },
];
const pagesNoIndex = new Set();
const dernieresModifs = new Map();

async function lireContenus({ type, prefixe }) {
  for (let page = 1, pages = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      'fields[0]': 'slug',
      'fields[1]': 'updatedAt',
      'populate[seo][fields][0]': 'noIndex',
      'pagination[pageSize]': '100',
      'pagination[page]': String(page),
    });
    const reponse = await fetch(`${STRAPI_URL}/api/${type}?${params}`);
    if (!reponse.ok) throw new Error(`plan du site : /api/${type} a répondu ${reponse.status}`);
    const json = await reponse.json();
    pages = json.meta?.pagination?.pageCount ?? 1;
    for (const doc of json.data ?? []) {
      const chemin = `${prefixe}/${doc.slug}`;
      if (doc.seo?.noIndex) pagesNoIndex.add(chemin);
      if (doc.updatedAt) dernieresModifs.set(chemin, doc.updatedAt);
    }
  }
}

// Seulement au build : le plan de site n'est produit qu'à ce moment-là (inutile au démarrage de `astro dev` et de
// l'aperçu). Une erreur arrête le build : une page « noIndex » ne doit pas se retrouver dans le plan de site (le
// builder garde alors la version en ligne).
if (process.env.MJC_BUILD_STATIQUE === '1' || process.argv.includes('build')) {
  await Promise.all(CONTENUS.map(lireContenus));
}

// Serveur d'aperçu des brouillons (astro dev, service « apercu » en production) : Vite refuse les requêtes dont l'hôte
// n'est pas localhost. On autorise celui d'APERCU_URL, l'adresse publique derrière le reverse proxy.
const hoteApercu = (() => {
  try {
    return process.env.APERCU_URL ? new URL(process.env.APERCU_URL).hostname : null;
  } catch {
    return null;
  }
})();

export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:8080',
  server: { allowedHosts: hoteApercu && hoteApercu !== 'localhost' ? [hoteApercu] : [] },
  outDir: process.env.OUT_DIR ?? './dist',
  trailingSlash: 'ignore',
  // Tout le site est statique ; seule la page /apercu (brouillons du BO) est rendue à la demande par Node.
  adapter: node({ mode: 'standalone' }),
  // Pages générées en parallèle (BUILD_CONCURRENCE, 1 par défaut = une page à la fois).
  build: { format: 'directory', concurrency: Math.max(1, Number(process.env.BUILD_CONCURRENCE) || 1) },
  vite: {
    // Les polices restent des fichiers (cache navigateur) au lieu d'être inlinées en base64.
    build: { assetsInlineLimit: 0 },
    // Montage de fichiers Windows dans Docker : pas d'événements inotify, on scrute.
    server: { watch: process.env.WATCH_POLLING === 'true' ? { usePolling: true, interval: 500 } : undefined },
  },
  image: {
    remotePatterns: [{ protocol: strapi.protocol.replace(':', ''), hostname: strapi.hostname, port: strapi.port || undefined }],
  },
  integrations: [
    sitemap({
      // Le plan est découpé en fichiers de 45 000 adresses au plus (sitemap-0.xml, sitemap-1.xml…) listés dans
      // sitemap-index.xml. Le filtre s'exécute pour chaque adresse (90 000 offres) : aucun appel réseau ici.
      entryLimit: 45_000,
      filter: (page) => {
        const chemin = new URL(page).pathname.replace(/\/$/, '');
        return !EXCLUSIONS.some((e) => chemin.startsWith(e)) && !pagesNoIndex.has(chemin);
      },
      serialize: (element) => {
        const lastmod = dernieresModifs.get(new URL(element.url).pathname.replace(/\/$/, ''));
        return lastmod ? { ...element, lastmod } : element;
      },
    }),
  ],
});
