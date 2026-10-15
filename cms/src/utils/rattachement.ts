// Rattachement des offres à l'annuaire : le « Nom dans Gestmax » d'une fiche entreprise (nomEntiteGestmax) liste
// le ou les noms d'entité Gestmax de ses offres, séparés par « ; ». La synchronisation s'en sert à chaque passage,
// le couplage fait depuis « Mes offres d'emploi » survit donc aux synchronisations suivantes.
import type { Core } from '@strapi/strapi';

export const UID_ENTREPRISE = 'api::entreprise.entreprise';
const SEPARATEUR = ';';

export const normaliserNom = (nom: string) => nom.trim().replace(/\s+/g, ' ').toLowerCase();

/** Noms Gestmax d'une fiche (tels que saisis). */
export const nomsGestmax = (valeur: string | null | undefined): string[] =>
  (valeur ?? '').split(SEPARATEUR).map((n) => n.trim()).filter(Boolean);

const joindre = (noms: string[]) => (noms.length ? noms.join(` ${SEPARATEUR} `) : null);

/** Nom Gestmax normalisé → documentId de la fiche entreprise. */
export async function indexEntreprises(strapi: Core.Strapi): Promise<Map<string, string>> {
  const entreprises = await strapi.db.query(UID_ENTREPRISE).findMany({
    select: ['documentId', 'nomEntiteGestmax'],
    where: { nomEntiteGestmax: { $notNull: true } },
  });
  const index = new Map<string, string>();
  for (const e of entreprises as any[]) for (const nom of nomsGestmax(e.nomEntiteGestmax)) index.set(normaliserNom(nom), e.documentId);
  return index;
}

/**
 * Couple (ou découple, si documentId est null) le nom d'entreprise Gestmax d'une offre avec une fiche de l'annuaire :
 * met à jour le « Nom dans Gestmax » des fiches concernées puis le lien de toutes les offres portant ce nom.
 */
export async function rattacher(strapi: Core.Strapi, nomEntreprise: string, documentId: string | null) {
  const cle = normaliserNom(nomEntreprise);
  if (!cle) throw new Error('Nom d’entreprise vide.');

  if (documentId) {
    const cible: any = await strapi.db.query(UID_ENTREPRISE).findOne({ where: { documentId }, select: ['documentId'] });
    if (!cible) throw new Error('Fiche entreprise introuvable.');
  }

  // Une seule fiche par nom Gestmax : on le retire des autres fiches, puis on l'ajoute à la cible.
  const fiches = (await strapi.db.query(UID_ENTREPRISE).findMany({
    select: ['documentId', 'nomEntiteGestmax'],
    where: { $or: [{ nomEntiteGestmax: { $notNull: true } }, ...(documentId ? [{ documentId }] : [])] },
  })) as any[];
  for (const f of fiches) {
    const noms = nomsGestmax(f.nomEntiteGestmax);
    const sans = noms.filter((n) => normaliserNom(n) !== cle);
    const voulus = f.documentId === documentId ? [...sans, nomEntreprise.trim()] : sans;
    if (joindre(voulus) !== joindre(noms)) {
      await strapi.documents(UID_ENTREPRISE).update({ documentId: f.documentId, data: { nomEntiteGestmax: joindre(voulus) } } as any);
    }
  }

  // Offres portant ce nom : sélection en SQL avec la même normalisation que normaliserNom (casse et espaces), en
  // comparaison binaire comme « Mes offres d'emploi » (sinon « Société » et « Societe » seraient confondues), puis
  // mise à jour par lots de la table de liaison, dans une vraie transaction.
  const offres: any[] = await strapi.db.connection('offre').select('id')
    .whereRaw("LOWER(REGEXP_REPLACE(TRIM(nom_entreprise), '[[:space:]]+', ' ')) COLLATE utf8mb4_bin = ?", [cle]);
  if (offres.length) {
    const cibleId = documentId ? ((await strapi.db.query(UID_ENTREPRISE).findOne({ where: { documentId }, select: ['id'] })) as any).id : null;
    const ids = offres.map((o) => o.id);
    await strapi.db.connection.transaction(async (trx: any) => {
      for (let i = 0; i < ids.length; i += 1000) {
        const lot = ids.slice(i, i + 1000);
        await trx('offre_entreprise_lnk').whereIn('offre_id', lot).del();
        if (cibleId) await trx('offre_entreprise_lnk').insert(lot.map((offre_id: number) => ({ offre_id, entreprise_id: cibleId, offre_ord: 1 })));
      }
    });
  }
  // Écriture directe : pas de webhook automatique, on prévient le constructeur du site.
  if (offres.length) await (strapi as any).notifierOffres?.();
  return { offres: offres.length };
}
