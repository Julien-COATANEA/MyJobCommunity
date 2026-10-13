// Import en masse de fiches de l'annuaire (CSV/Excel lu par le navigateur, envoyé ici en lignes JSON).
import type { Core } from '@strapi/strapi';
import { slugifier } from '../../../utils/gestmax';

const ENTREPRISE = 'api::entreprise.entreprise';
const SECTEUR = 'api::secteur.secteur';
const MAX_LIGNES = 500;

const TRANCHES = ['moins de 10 salariés', 'de 10 à 49 salariés', 'de 50 à 249 salariés', 'de 250 à 999 salariés', 'plus de 1000 salariés'];

/** « 120 », « 50-249 », « de 10 à 49 salariés »… → la tranche d'effectif correspondante. */
export function normaliserEffectif(valeur: unknown): string | null {
  const texte = String(valeur ?? '').trim().toLowerCase();
  if (!texte) return null;
  const exacte = TRANCHES.find((t) => t === texte);
  if (exacte) return exacte;
  const nombres = (texte.match(/\d[\d\s]*/g) ?? []).map((n) => parseInt(n.replace(/\s/g, ''), 10)).filter((n) => !Number.isNaN(n));
  if (!nombres.length) return null;
  // Plusieurs nombres (« 50 à 249 ») : on retient le plus petit, borne basse de la tranche.
  const n = Math.min(...nombres);
  return n < 10 ? TRANCHES[0] : n < 50 ? TRANCHES[1] : n < 250 ? TRANCHES[2] : n < 1000 ? TRANCHES[3] : TRANCHES[4];
}

const nettoyer = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
const urlValide = (u: string) => !u || /^https?:\/\/[^\s]+\.[^\s]+/.test(u);

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Entrée : { lignes: [{ nom, ville, secteur, extrait, description, effectif, adresse, siteWeb, nomEntiteGestmax }], simulation?: boolean }
   * La simulation valide sans rien écrire (aperçu avant import).
   */
  async importer(ctx: any) {
    const lignes: Record<string, unknown>[] = Array.isArray(ctx.request.body?.lignes) ? ctx.request.body.lignes : [];
    const simulation = !!ctx.request.body?.simulation;
    if (!lignes.length) return ctx.badRequest('Le fichier ne contient aucune ligne.');
    if (lignes.length > MAX_LIGNES) return ctx.badRequest(`Un import est limité à ${MAX_LIGNES} entreprises à la fois.`);

    const existantes: any[] = await strapi.db.query(ENTREPRISE).findMany({ select: ['nom', 'slug'] });
    const noms = new Set(existantes.map((e) => e.nom.trim().toLowerCase()));
    const slugs = new Set(existantes.map((e) => e.slug));
    const secteurs: any[] = await strapi.db.query(SECTEUR).findMany({ select: ['documentId', 'nom'] });
    const secteurParNom = new Map(secteurs.map((s) => [s.nom.trim().toLowerCase(), s.documentId]));

    const rapport: { ligne: number; nom: string; statut: 'cree' | 'existe' | 'invalide'; erreurs: string[] }[] = [];
    const vusDansFichier = new Set<string>();

    for (const [index, brute] of lignes.entries()) {
      const nom = nettoyer(brute.nom, 150);
      const ville = nettoyer(brute.ville, 100);
      const extrait = nettoyer(brute.extrait, 300);
      const description = nettoyer(brute.description, 5000);
      const siteWeb = nettoyer(brute.siteWeb, 200);
      const erreurs: string[] = [];

      if (!nom) erreurs.push('nom manquant');
      if (!ville) erreurs.push('ville manquante');
      if (!extrait) erreurs.push('résumé manquant');
      if (!urlValide(siteWeb)) erreurs.push('site web invalide (commencer par https://)');
      const effectif = normaliserEffectif(brute.effectif);
      if (nettoyer(brute.effectif) && !effectif) erreurs.push('effectif non reconnu');

      const cle = nom.toLowerCase();
      const ligne = index + 1;
      if (erreurs.length) { rapport.push({ ligne, nom, statut: 'invalide', erreurs }); continue; }
      if (noms.has(cle) || vusDansFichier.has(cle)) { rapport.push({ ligne, nom, statut: 'existe', erreurs: ['une fiche porte déjà ce nom : ignorée'] }); continue; }
      vusDansFichier.add(cle);

      if (!simulation) {
        // Secteur retrouvé par son nom, créé s'il n'existe pas encore.
        const nomSecteur = nettoyer(brute.secteur, 100);
        let secteur: string | undefined;
        if (nomSecteur) {
          secteur = secteurParNom.get(nomSecteur.toLowerCase());
          if (!secteur) {
            const cree: any = await strapi.documents(SECTEUR).create({ data: { nom: nomSecteur, slug: slugifier(nomSecteur) } as any });
            secteur = cree.documentId;
            secteurParNom.set(nomSecteur.toLowerCase(), secteur!);
          }
        }
        let slug = slugifier(nom) || 'entreprise';
        for (let n = 2; slugs.has(slug); n++) slug = `${slugifier(nom)}-${n}`;
        slugs.add(slug);

        await strapi.documents(ENTREPRISE).create({
          data: {
            nom, slug, ville, extrait,
            adresse: nettoyer(brute.adresse, 200) || null,
            effectif,
            siteWeb: siteWeb || null,
            nomEntiteGestmax: nettoyer(brute.nomEntiteGestmax, 150) || nom,
            description: description ? description.split(/\n{2,}/).map((p) => ({ type: 'paragraph', children: [{ type: 'text', text: p.trim() }] })) : null,
            ...(secteur ? { secteur } : {}),
          } as any,
        });
      }
      rapport.push({ ligne, nom, statut: 'cree', erreurs: [] });
    }

    ctx.body = {
      simulation,
      crees: rapport.filter((r) => r.statut === 'cree').length,
      ignorees: rapport.filter((r) => r.statut === 'existe').length,
      invalides: rapport.filter((r) => r.statut === 'invalide').length,
      rapport,
    };
  },
});
