// Contrôle qualité d'un contenu avant publication : texte alternatif, titres, liens, longueurs, dates.
// Fonctions pures (aucune dépendance à React) : elles lisent les valeurs du formulaire en cours de saisie.
import { definition } from './types';

export type Niveau = 'erreur' | 'attention' | 'info';
export interface Point { niveau: Niveau; texte: string }

const LIENS_PEU_EXPLICITES = ['ici', 'cliquez ici', 'cliquer ici', 'en savoir plus', 'lien', 'voir', 'plus'];

const texteDe = (n: any): string => (n?.type === 'text' ? n.text ?? '' : (n?.children ?? []).map(texteDe).join(''));

/** Parcourt récursivement les valeurs et appelle `visiteur(valeur, chemin)` sur chaque nœud. */
function parcourir(valeur: unknown, visiteur: (v: any, chemin: string) => void, chemin = '') {
  if (Array.isArray(valeur)) return valeur.forEach((v, i) => parcourir(v, visiteur, `${chemin}[${i}]`));
  if (!valeur || typeof valeur !== 'object') return;
  visiteur(valeur, chemin);
  for (const [cle, v] of Object.entries(valeur)) if (v && typeof v === 'object') parcourir(v, visiteur, chemin ? `${chemin}.${cle}` : cle);
}

const estImage = (v: any) => v && typeof v === 'object' && typeof v.url === 'string' && typeof v.mime === 'string' && v.mime.startsWith('image/');
// Images décoratives ou nommées par le site : pas de texte alternatif à exiger.
const DECORATIVE = /(^|\.)(logo|favicon|metaImage|logos\[\d+\]\.image|heroImage|imageBandeau)$/;

export function imagesSansAlt(valeurs: unknown): string[] {
  const noms: string[] = [];
  parcourir(valeurs, (v, chemin) => {
    // Les déclinaisons générées (« formats.thumbnail »…) héritent du texte alternatif de l'image d'origine.
    if (estImage(v) && !/(^|\.)formats\./.test(chemin) && !String(v.alternativeText ?? '').trim() && !DECORATIVE.test(chemin)) noms.push(v.name ?? chemin);
  });
  return [...new Set(noms)];
}

export function sautsDeTitres(valeurs: unknown): string[] {
  const sauts: string[] = [];
  parcourir(valeurs, (v) => {
    if (!Array.isArray(v?.contenu ?? v?.description ?? v?.reponse)) return;
    let precedent = 1; // le titre de la page est le niveau 1
    for (const noeud of (v.contenu ?? v.description ?? v.reponse) as any[]) {
      if (noeud?.type !== 'heading') continue;
      const niveau = Math.max(noeud.level, 2); // un « Titre 1 » saisi est affiché en niveau 2
      if (niveau > precedent + 1) sauts.push(`« ${texteDe(noeud).slice(0, 40)} » (Titre ${noeud.level} après un Titre ${precedent})`);
      precedent = niveau;
    }
  });
  return sauts;
}

export function liensPeuExplicites(valeurs: unknown): string[] {
  const trouves: string[] = [];
  parcourir(valeurs, (v) => {
    if (v?.type === 'link' && LIENS_PEU_EXPLICITES.includes(texteDe(v).trim().toLowerCase())) trouves.push(texteDe(v).trim());
  });
  return [...new Set(trouves)];
}

/** Adresses internes (« /page ») utilisées dans les champs de lien et dans les textes. */
export function liensInternes(valeurs: unknown): string[] {
  const urls = new Set<string>();
  const page = (u: unknown): u is string => typeof u === 'string' && /^\/(?!\/)/.test(u) && !u.startsWith('/uploads/');
  parcourir(valeurs, (v) => {
    if (v?.type === 'link' && page(v.url)) urls.add(v.url);
    for (const cle of ['url', 'lien']) if (page(v?.[cle])) urls.add(v[cle]);
  });
  return [...urls];
}

export interface OptionsControle {
  model: string;
  /** Adresses internes qui n'existent pas (retour du serveur). */
  liensCasses?: string[];
}

/** Liste des points à vérifier pour le contenu en cours d'édition. */
export function controler(valeurs: any, { model, liensCasses = [] }: OptionsControle): Point[] {
  const points: Point[] = [];
  if (!valeurs) return points;
  const titre = String(valeurs.titre ?? valeurs.nom ?? valeurs.heroTitre ?? '').trim();
  const resume = String(valeurs.extrait ?? valeurs.chapo ?? valeurs.heroTexte ?? '').trim();
  const seo = valeurs.seo ?? {};

  if (titre.length > 70) points.push({ niveau: 'attention', texte: `Le titre fait ${titre.length} caractères : Google le coupe au-delà d’environ 60. Un titre plus court sera lu en entier.` });
  if (!seo.metaDescription && !resume && !definition(model)?.descriptionAutomatique) points.push({ niveau: 'attention', texte: 'Aucune description : Google choisira lui-même un extrait de la page. Ajoutez un résumé.' });
  if (!seo.metaDescription && resume.length > 160) points.push({ niveau: 'info', texte: `Le résumé fait ${resume.length} caractères : Google n’affichera que les 160 premiers. Vous pouvez saisir une description plus courte dans « Référencement ».` });

  const sansAlt = imagesSansAlt(valeurs);
  if (sansAlt.length) points.push({ niveau: 'attention', texte: `${sansAlt.length} image${sansAlt.length > 1 ? 's' : ''} sans texte alternatif (${sansAlt.slice(0, 2).join(', ')}${sansAlt.length > 2 ? '…' : ''}) : les personnes aveugles ne sauront pas ce qu’elle${sansAlt.length > 1 ? 's' : ''} montre${sansAlt.length > 1 ? 'nt' : ''}. À renseigner dans la médiathèque.` });
  const sauts = sautsDeTitres(valeurs);
  if (sauts.length) points.push({ niveau: 'attention', texte: `Intertitres mal ordonnés : ${sauts[0]}. Passez par chaque niveau (Titre 2, puis Titre 3…) pour que la page reste lisible avec un lecteur d’écran.` });
  const peuExplicites = liensPeuExplicites(valeurs);
  if (peuExplicites.length) points.push({ niveau: 'attention', texte: `Lien peu explicite : « ${peuExplicites[0]} ». Décrivez la destination (« Consulter le programme du forum »).` });
  for (const url of liensCasses) points.push({ niveau: 'erreur', texte: `Le lien ${url} mène à une page qui n’existe pas : les visiteurs verraient une erreur 404.` });

  if (model === 'api::article.article' && !valeurs.image) points.push({ niveau: 'info', texte: 'Pas d’image : le partage sur les réseaux sociaux sera moins attractif.' });
  if (model === 'api::evenement.evenement') {
    if (valeurs.dateFin && valeurs.dateDebut && new Date(valeurs.dateFin) < new Date(valeurs.dateDebut)) points.push({ niveau: 'erreur', texte: 'La fin de l’événement est avant son début.' });
    if (valeurs.dateDebut && new Date(valeurs.dateDebut) < new Date()) points.push({ niveau: 'info', texte: 'La date de début est passée : l’événement apparaît dans « Événements passés ».' });
    if (valeurs.inscriptionActive && !valeurs.inscriptionExterneUrl && !valeurs.placesMax) points.push({ niveau: 'info', texte: 'Aucun nombre de places : les inscriptions ne sont pas limitées.' });
  }
  if (valeurs.publierLe && new Date(valeurs.publierLe) < new Date()) points.push({ niveau: 'attention', texte: 'La date de publication automatique est passée : le brouillon sera publié dans la minute qui suit.' });
  return points;
}
