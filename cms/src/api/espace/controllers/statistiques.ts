// Statistiques de visite pour le tableau de bord, via l'API d'une instance Plausible (sans cookie, conforme RGPD).
// Variables : PLAUSIBLE_URL (ex. https://stats.exemple.fr), PLAUSIBLE_SITE (domaine suivi), PLAUSIBLE_API_KEY.
// Sans configuration, le widget invite simplement à la mettre en place.
import type { Core } from '@strapi/strapi';

const config = () => ({
  url: (process.env.PLAUSIBLE_URL ?? '').replace(/\/+$/, ''),
  site: process.env.PLAUSIBLE_SITE ?? '',
  cle: process.env.PLAUSIBLE_API_KEY ?? '',
});

async function appeler(chemin: string, params: Record<string, string>) {
  const { url, site, cle } = config();
  const requete = new URL(`${url}/api/v1/stats/${chemin}`);
  requete.searchParams.set('site_id', site);
  for (const [k, v] of Object.entries(params)) requete.searchParams.set(k, v);
  const reponse = await fetch(requete, { headers: { Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(8000) });
  if (!reponse.ok) throw new Error(`Plausible a répondu ${reponse.status}`);
  return (await reponse.json()) as any;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async statistiques(ctx: any) {
    const { url, site, cle } = config();
    if (!url || !site || !cle) {
      ctx.body = { configure: false };
      return;
    }
    const periode = '30d';
    try {
      const [global, pages, pointsPostuler, serie] = await Promise.all([
        appeler('aggregate', { period: periode, metrics: 'visitors,pageviews,visit_duration', compare: 'previous_period' }),
        appeler('breakdown', { period: periode, property: 'event:page', metrics: 'visitors', limit: '6' }),
        appeler('aggregate', { period: periode, metrics: 'events,visitors', filters: 'event:goal==Postuler', compare: 'previous_period' }).catch(() => null),
        appeler('timeseries', { period: periode, metrics: 'visitors' }),
      ]);
      const r = global.results ?? {};
      ctx.set('Cache-Control', 'private, max-age=300');
      ctx.body = {
        configure: true,
        periode: 30,
        visiteurs: { valeur: r.visitors?.value ?? 0, evolution: r.visitors?.change ?? null },
        pagesVues: { valeur: r.pageviews?.value ?? 0, evolution: r.pageviews?.change ?? null },
        dureeMoyenne: r.visit_duration?.value ?? 0,
        clicsPostuler: pointsPostuler ? { valeur: pointsPostuler.results?.events?.value ?? 0, evolution: pointsPostuler.results?.events?.change ?? null } : null,
        pagesPopulaires: (pages.results ?? []).map((p: any) => ({ page: p.page, visiteurs: p.visitors })),
        serie: (serie.results ?? []).map((p: any) => ({ date: p.date, visiteurs: p.visitors })),
        lien: `${url}/${encodeURIComponent(site)}`,
      };
    } catch (e) {
      strapi.log.warn(`[statistiques] ${(e as Error).message}`);
      ctx.body = { configure: true, erreur: 'Les statistiques sont momentanément indisponibles.' };
    }
  },
});
