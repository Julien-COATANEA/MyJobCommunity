// Rendu HTML du champ « blocks » (éditeur de texte riche de Strapi 5).
// Rendu au build : aucun JavaScript côté navigateur.

export interface NoeudTexte {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}
export interface NoeudLien { type: 'link'; url: string; children: NoeudTexte[] }
export type Enfant = NoeudTexte | NoeudLien | { type: 'list-item'; children: Enfant[] } | Bloc;
export type Bloc =
  | { type: 'paragraph'; children: Enfant[] }
  | { type: 'heading'; level: number; children: Enfant[] }
  | { type: 'list'; format: 'ordered' | 'unordered'; children: Enfant[] }
  | { type: 'quote'; children: Enfant[] }
  | { type: 'code'; children: Enfant[] }
  | { type: 'image'; image: { url: string; alternativeText?: string | null; width?: number; height?: number } };

export function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const URL_AUTORISEE = /^(https?:|mailto:|tel:|\/|#)/i;

function texte(n: NoeudTexte): string {
  // Retours à la ligne dans un paragraphe : <br>
  let html = echapper(n.text).replace(/\n/g, '<br>');
  if (n.code) html = `<code>${html}</code>`;
  if (n.bold) html = `<strong>${html}</strong>`;
  if (n.italic) html = `<em>${html}</em>`;
  if (n.underline) html = `<span class="souligne">${html}</span>`;
  if (n.strikethrough) html = `<s>${html}</s>`;
  return html;
}

function enfants(liste: Enfant[] = [], options: Options): string {
  return liste.map((n) => noeud(n, options)).join('');
}

interface Options {
  /** Niveau minimum des titres (2 : le h1 est réservé au titre de la page). */
  niveauMin: number;
  /** Préfixe des URL d'images relatives (Strapi public). */
  baseMedias: string;
}

function noeud(n: any, o: Options): string {
  switch (n.type) {
    case 'text':
      return texte(n);
    case 'link': {
      const url = URL_AUTORISEE.test(n.url) ? n.url : '#';
      return `<a href="${echapper(url)}">${enfants(n.children, o)}</a>`;
    }
    case 'paragraph': {
      const contenu = enfants(n.children, o);
      return contenu.trim() ? `<p>${contenu}</p>` : '';
    }
    case 'heading': {
      const niveau = Math.min(Math.max(n.level, o.niveauMin), 6);
      return `<h${niveau}>${enfants(n.children, o)}</h${niveau}>`;
    }
    case 'list': {
      const balise = n.format === 'ordered' ? 'ol' : 'ul';
      return `<${balise}>${enfants(n.children, o)}</${balise}>`;
    }
    case 'list-item':
      return `<li>${enfants(n.children, o)}</li>`;
    case 'quote':
      return `<blockquote><p>${enfants(n.children, o)}</p></blockquote>`;
    case 'code':
      return `<pre><code>${enfants(n.children, o)}</code></pre>`;
    case 'image': {
      const img = n.image ?? {};
      const src = /^https?:/.test(img.url) ? img.url : `${o.baseMedias}${img.url}`;
      const dims = img.width && img.height ? ` width="${img.width}" height="${img.height}"` : '';
      return `<img src="${echapper(src)}" alt="${echapper(img.alternativeText ?? '')}"${dims} loading="lazy" decoding="async">`;
    }
    default:
      return '';
  }
}

export function rendreBlocks(blocs: Bloc[] | null | undefined, options: Partial<Options> = {}): string {
  if (!Array.isArray(blocs)) return '';
  const o: Options = { niveauMin: 2, baseMedias: '', ...options };
  return blocs.map((b) => noeud(b, o)).join('\n');
}

/** Texte brut (pour les meta descriptions). */
export function texteBrut(blocs: Bloc[] | null | undefined, max = 160): string {
  const extraire = (n: any): string => (n.type === 'text' ? n.text : (n.children ?? []).map(extraire).join(' '));
  const brut = (blocs ?? []).map(extraire).join(' ').replace(/\s+/g, ' ').trim();
  return brut.length > max ? `${brut.slice(0, max - 1).trimEnd()}…` : brut;
}

/** Temps de lecture estimé, en minutes (200 mots par minute, 1 minute au moins). */
export function tempsLecture(blocs: Bloc[] | null | undefined, ...autres: (string | null | undefined)[]): number {
  const texte = [texteBrut(blocs, Number.POSITIVE_INFINITY), ...autres].filter(Boolean).join(' ');
  const mots = texte.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(mots / 200));
}
