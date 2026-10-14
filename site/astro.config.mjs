import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const strapi = new URL(STRAPI_URL);

// Pages exclues du plan de site XML (techniques ou marquées « noIndex » dans le BO).
const EXCLUSIONS = ['/header-footer', '/evenements/inscription-', '/evenements/annuler', '/message-envoye', '/message-impossible', '/404', '/apercu'];
let pagesNoIndex = [];
try {
  const reponse = await fetch(`${STRAPI_URL}/api/pages?fields[0]=slug&filters[seo][noIndex][$eq]=true&pagination[pageSize]=100`);
  pagesNoIndex = (await reponse.json()).data?.map((p) => `/${p.slug}`) ?? [];
} catch {
  // Strapi indisponible : le build échouera plus loin avec un message explicite.
}

export default defineConfig({
  site: process.env.SITE_URL ?? 'http://localhost:8080',
  outDir: process.env.OUT_DIR ?? './dist',
  trailingSlash: 'ignore',
  // Tout le site est statique ; seule la page /apercu (brouillons du BO) est rendue à la demande par Node.
  adapter: node({ mode: 'standalone' }),
  build: { format: 'directory' },
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
      filter: (page) => {
        const chemin = new URL(page).pathname.replace(/\/$/, '');
        return !EXCLUSIONS.some((e) => chemin.startsWith(e)) && !pagesNoIndex.includes(chemin);
      },
    }),
  ],
});
