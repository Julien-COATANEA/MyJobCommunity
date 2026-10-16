import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GABARITS, GABARIT_PAR_DEFAUT, OPTIONS, resoudreGabarit, type CleOption } from './gabarits';

const DOSSIER_CSS = new URL('../styles/gabarits/', import.meta.url);
const lire = (fichier: string) => readFileSync(new URL(fichier, DOSSIER_CSS), 'utf8');
const CLES = Object.keys(OPTIONS) as CleOption[];

/** Sépare une liste de sélecteurs « a, b:is(c, d) » en ses éléments (virgules hors parenthèses seulement). */
function separer(liste: string): string[] {
  const parties: string[] = [];
  let profondeur = 0;
  let courant = '';
  for (const c of liste) {
    if (c === '(') profondeur++;
    if (c === ')') profondeur--;
    if (c === ',' && profondeur === 0) {
      parties.push(courant.trim());
      courant = '';
    } else courant += c;
  }
  return [...parties, courant.trim()];
}

/** Sélecteurs de premier niveau d'une feuille (hors @media, @import et blocs imbriqués), un par élément de liste. */
function selecteursRacine(css: string): string[] {
  const texte = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const selecteurs: string[] = [];
  let tampon = '';
  // Blocs ouverts : vrai pour un @media. Une règle est « de premier niveau » si elle n'est dans aucune autre règle.
  const pile: boolean[] = [];
  for (const c of texte) {
    if (c === '{') {
      const tete = tampon.trim();
      const media = tete.startsWith('@media');
      if (!media && pile.every(Boolean)) selecteurs.push(...separer(tete));
      pile.push(media);
      tampon = '';
    } else if (c === '}' || c === ';') {
      if (c === '}') pile.pop();
      tampon = '';
    } else {
      tampon += c;
    }
  }
  return selecteurs;
}

describe('templates du site', () => {
  it('garde le site d’origine sans réglage : Communauté, aucune feuille à charger', () => {
    const g = resoudreGabarit({});
    expect(g.id).toBe(GABARIT_PAR_DEFAUT);
    expect(g.feuille).toBeNull();
    expect(g.options).toEqual(GABARITS[GABARIT_PAR_DEFAUT].defauts);
    expect(resoudreGabarit({ gabarit: null, reglagesGabarits: null }).feuille).toBeNull();
    expect(resoudreGabarit({ gabarit: 'communaute', reglagesGabarits: { communaute: { pied: 'sombre' } } }).feuille).toBeNull();
  });

  it('charge la feuille de Communauté dès qu’une option est modifiée', () => {
    const g = resoudreGabarit({ gabarit: 'communaute', reglagesGabarits: { communaute: { filtres: 'cote' } } });
    expect(g.options.filtres).toBe('cote');
    expect(g.feuille).toBe(GABARITS.communaute.feuille);
    expect(g.attributs['data-mjc-filtres']).toBe('cote');
  });

  it('applique les réglages par défaut du template, puis ceux enregistrés pour lui seul', () => {
    const g = resoudreGabarit({
      gabarit: 'vitrine',
      reglagesGabarits: { vitrine: { entete: 'classique' }, institutionnel: { pied: 'clair' } },
    });
    expect(g.id).toBe('vitrine');
    expect(g.feuille).toBe(GABARITS.vitrine.feuille);
    expect(g.options).toEqual({ ...GABARITS.vitrine.defauts, entete: 'classique' });
    expect(g.attributs).toMatchObject({ 'data-mjc-gabarit': 'vitrine', 'data-mjc-entete': 'classique', 'data-mjc-accueil': 'banniere' });
  });

  it('ignore les valeurs inconnues ou mal formées', () => {
    for (const gabarit of ['inconnu', '__proto__', 'toString', '', 42 as any]) {
      expect(resoudreGabarit({ gabarit }).id).toBe(GABARIT_PAR_DEFAUT);
    }
    for (const reglagesGabarits of ['texte', [1, 2], 3, { facettes: 'cote' }, { facettes: [] }]) {
      expect(resoudreGabarit({ gabarit: 'facettes', reglagesGabarits }).options).toEqual(GABARITS.facettes.defauts);
    }
    const g = resoudreGabarit({ gabarit: 'facettes', reglagesGabarits: { facettes: { pied: 'rose', inconnue: 'x', cartes: 'relief' } } });
    expect(g.options).toEqual({ ...GABARITS.facettes.defauts, cartes: 'relief' });
    expect(Object.keys(g.attributs)).toEqual(['data-mjc-gabarit', ...CLES.map((c) => `data-mjc-${c}`)]);
  });

  it('déclare pour chaque template des réglages par défaut valides et une feuille propre', () => {
    // Sous Vitest, le CSS n'est pas traité (une adresse « ?url » vaut "") : on vérifie le branchement dans la source.
    const source = readFileSync(new URL('./gabarits.ts', import.meta.url), 'utf8');
    for (const [id, g] of Object.entries(GABARITS)) {
      for (const cle of CLES) expect(OPTIONS[cle], `${id}.${cle}`).toContain(g.defauts[cle]);
      expect(source).toMatch(new RegExp(`import (\\w+) from '\\.\\./styles/gabarits/${id}\\.css\\?url';[\\s\\S]*\\n  ${id}: \\{\\n    feuille: \\1,`));
      expect(lire(`${id}.css`)).toContain("@import './options.css';");
    }
  });

  it('confine chaque feuille de template à son template (rien ne fuit vers un autre ni vers le site Gestmax)', () => {
    for (const id of Object.keys(GABARITS)) {
      const portee = new RegExp(`^(:root|\\.mjc-shell)\\[data-mjc-gabarit='${id}'\\]`);
      for (const selecteur of selecteursRacine(lire(`${id}.css`))) expect(selecteur, `${id}.css`).toMatch(portee);
    }
  });

  it('pose des attributs qu’aucun script ni composant n’utilise par ailleurs', () => {
    // Un attribut « data-filtres » sur <html> serait trouvé par document.querySelector('[data-filtres]') avant le formulaire.
    const racine = new URL('../', import.meta.url);
    const fichiers: string[] = [];
    const parcourir = (dossier: URL) => {
      for (const nom of readdirSync(dossier)) {
        const chemin = new URL(nom, dossier);
        if (statSync(chemin).isDirectory()) parcourir(new URL(`${nom}/`, dossier));
        else if (/\.(astro|ts)$/.test(nom) && !nom.startsWith('gabarits.')) fichiers.push(readFileSync(chemin, 'utf8'));
      }
    };
    parcourir(racine);
    const noms = Object.keys(resoudreGabarit({ gabarit: 'vitrine' }).attributs);
    for (const nom of noms) {
      expect(nom).toMatch(/^data-mjc-/);
      for (const source of fichiers) expect(source.includes(nom), nom).toBe(false);
    }
  });

  it('ne vise que des valeurs d’option qui changent le site d’origine', () => {
    const css = lire('options.css');
    for (const selecteur of selecteursRacine(css)) expect(selecteur).toMatch(/^(:root|\.mjc-shell)(\[data-mjc-|:is\(\[data-mjc-)/);
    const origine = GABARITS[GABARIT_PAR_DEFAUT].defauts;
    for (const cle of CLES) expect(css, `${cle}=${origine[cle]}`).not.toContain(`[data-mjc-${cle}='${origine[cle]}']`);
    // Toutes les feuilles sont là, et rien d'autre.
    expect(readdirSync(DOSSIER_CSS).sort()).toEqual([...Object.keys(GABARITS).map((id) => `${id}.css`), 'options.css'].sort());
  });

  it('détecte une règle qui fuit dans une liste de sélecteurs', () => {
    expect(selecteursRacine(":root[data-mjc-gabarit='vitrine'] .carte, .tuile { color: red; }")).toEqual([
      ":root[data-mjc-gabarit='vitrine'] .carte",
      '.tuile',
    ]);
  });
});

// Le registre du CMS (libellés, nettoyage des réglages, énumération du champ « gabarit ») doit rester identique à celui-ci.
// Il est lu depuis le dépôt (dossier cms/ à côté de site/, monté en lecture seule dans le conteneur de développement).
const REGISTRE_CMS = new URL('../../../cms/src/utils/gabarits.ts', import.meta.url);
const SCHEMA_CMS = new URL('../../../cms/src/api/parametres/content-types/parametres/schema.json', import.meta.url);
const APERCU_CMS = new URL('../../../cms/src/admin/espace/apparence/Apercu.tsx', import.meta.url);

describe.skipIf(!existsSync(REGISTRE_CMS))('templates : même registre que le back-office', () => {
  it('a les mêmes templates, options, valeurs et réglages par défaut', async () => {
    const cms = await import(/* @vite-ignore */ REGISTRE_CMS.pathname);
    expect(cms.GABARIT_PAR_DEFAUT).toBe(GABARIT_PAR_DEFAUT);
    expect(cms.GABARITS.map((g: { id: string }) => g.id)).toEqual(Object.keys(GABARITS));
    for (const g of cms.GABARITS) expect(g.defauts, g.id).toEqual(GABARITS[g.id].defauts);
    expect(Object.keys(cms.OPTIONS)).toEqual(CLES);
    for (const cle of CLES) expect(Object.keys(cms.OPTIONS[cle].valeurs), cle).toEqual([...OPTIONS[cle]]);
  });

  it('déclare les mêmes templates dans le schéma Strapi et dans l’aperçu du BO', () => {
    const schema = JSON.parse(readFileSync(SCHEMA_CMS, 'utf8'));
    expect(schema.attributes.gabarit.enum).toEqual(Object.keys(GABARITS));
    const apercu = readFileSync(APERCU_CMS, 'utf8');
    const habillages = apercu.slice(apercu.indexOf('const HABILLAGES'), apercu.indexOf('};', apercu.indexOf('const HABILLAGES')));
    for (const id of Object.keys(GABARITS)) expect(habillages, id).toMatch(new RegExp(`\\n  ${id}: `));
  });
});
