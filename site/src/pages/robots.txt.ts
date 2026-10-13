import type { APIRoute } from 'astro';

// Indexation uniquement en production : préprod et recette restent invisibles des moteurs.
export const GET: APIRoute = ({ site }) => {
  const production = process.env.SITE_ENV === 'production';
  const contenu = production
    ? `User-agent: *\nAllow: /\nDisallow: /header-footer/\n\nSitemap: ${new URL('/sitemap-index.xml', site)}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(contenu, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
