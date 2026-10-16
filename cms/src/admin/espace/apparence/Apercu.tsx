// Aperçu du site dans l'écran « Apparence » : maquette réduite qui suit le template choisi, ses options de disposition
// et l'identité saisie (couleurs, polices, arrondis, logo, photo d'accueil). Sert aussi de miniature dans la liste des templates.
// Approximation des feuilles du site (site/src/styles/gabarits/) : à garder cohérente quand un template évolue.
import * as React from 'react';
import type { Options } from '../../../utils/gabarits';
import { ARRONDIS, POLICES, melange, texteSur, type Logo, type Theme } from './theme';

export type PageApercu = 'accueil' | 'offres' | 'page';

/** Ce qui distingue l'habillage des templates (le reste vient des options de disposition). */
interface Habillage {
  /** Boutons en pilule (sinon angles du thème). */
  pilule: boolean;
  /** Boutons en capitales. */
  capitales: boolean;
  /** Titres de section alignés à gauche, éventuellement soulignés d'un trait d'accent. */
  gauche: boolean;
  souligne: boolean;
  poidsTitres: number;
  /** En-tête clair ou sombre ; barre de menu pleine couleur quand le menu a sa propre ligne. */
  entete: 'clair' | 'sombre';
  barreMenu: boolean;
  lisere: boolean;
  menu: 'normal' | 'capitales' | 'leger';
  /** Espaces candidat / recruteur. */
  acces: 'plein' | 'accent' | 'contour';
  /** Fond des pages (gris « application » ou fond du thème). */
  fondPage: 'fond' | 'surface';
  /** Haut de l'accueil « texte et photo » : fond pâle, gris, blanc ou aplat foncé. */
  hero: 'pale' | 'surface' | 'fond' | 'aplat';
  /** Bannière : texte centré ou à gauche, hauteur. */
  banniere: { gauche: boolean; haute: boolean };
  /** Bandeaux de couleur (chiffres clés, appel à l'action) : dégradé, aplat ou encadré clair. */
  fonds: 'degrade' | 'uni' | 'clair';
  pied: 'fonce' | 'secondaire' | 'degrade';
  rayonCarte: number;
  bordOffre: 'gauche' | 'haut' | null;
  surtitre: 'pastille' | 'accent' | 'filet' | 'texte';
  dense: boolean;
}

const BASE: Habillage = {
  pilule: true, capitales: false, gauche: false, souligne: false, poidsTitres: 800, entete: 'clair', barreMenu: false, lisere: false,
  menu: 'normal', acces: 'plein', fondPage: 'fond', hero: 'pale', banniere: { gauche: false, haute: false }, fonds: 'degrade',
  pied: 'fonce', rayonCarte: 1.6, bordOffre: null, surtitre: 'pastille', dense: false,
};

const HABILLAGES: Record<string, Habillage> = {
  communaute: BASE,
  institutionnel: {
    ...BASE, pilule: false, capitales: true, gauche: true, souligne: true, poidsTitres: 700, barreMenu: true, lisere: true,
    hero: 'aplat', fonds: 'uni', pied: 'secondaire', rayonCarte: 1, bordOffre: 'haut', surtitre: 'filet',
  },
  facettes: {
    ...BASE, pilule: false, gauche: true, entete: 'sombre', acces: 'accent', fondPage: 'surface', banniere: { gauche: true, haute: false },
    fonds: 'uni', rayonCarte: 1, bordOffre: 'gauche', surtitre: 'texte', dense: true,
  },
  vitrine: { ...BASE, menu: 'capitales', banniere: { gauche: false, haute: true }, pied: 'degrade', rayonCarte: 2.2, surtitre: 'accent' },
  epure: {
    ...BASE, pilule: false, poidsTitres: 600, menu: 'leger', acces: 'contour', hero: 'fond', fonds: 'clair', rayonCarte: 1.6, surtitre: 'texte',
  },
};

interface Props {
  t: Theme;
  logo: Logo | null;
  gabarit: string;
  options: Options;
  page?: PageApercu;
  /** Photo de « Ma page d'accueil » (sinon un dégradé en tient lieu). */
  image?: string | null;
  /** Hauteur visible ; sans elle, toute la page. */
  hauteur?: number;
  /** Miniature : en-tête et haut de l'accueil seulement (le reste ne serait pas visible). */
  vignette?: boolean;
  /** Texte alternatif ; sans lui, l'aperçu est décoratif (masqué aux lecteurs d'écran). */
  libelle?: string;
}

/** Largeur « virtuelle » de la maquette, mise à l'échelle de la place disponible. */
const LARGEUR = 640;

function useEchelle() {
  const cadre = React.useRef<HTMLDivElement>(null);
  const contenu = React.useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = React.useState(1);
  const [hauteur, setHauteur] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!cadre.current || !contenu.current) return;
    const mesurer = () => {
      if (cadre.current) setEchelle(cadre.current.clientWidth / LARGEUR);
      if (contenu.current) setHauteur(contenu.current.offsetHeight);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(cadre.current);
    observateur.observe(contenu.current);
    return () => observateur.disconnect();
  }, []);
  return { cadre, contenu, echelle, hauteur };
}

export function Apercu({ t, logo, gabarit, options: o, page = 'accueil', image = null, hauteur, vignette = false, libelle }: Props) {
  const { cadre, contenu, echelle, hauteur: hauteurContenu } = useEchelle();
  const h = HABILLAGES[gabarit] ?? HABILLAGES.communaute;
  const rayon = ARRONDIS[t.arrondis]?.rayon ?? 10;
  const epure = gabarit === 'epure';
  const c = {
    primaire: t.couleurPrimaire,
    secondaire: t.couleurSecondaire,
    accent: t.couleurAccent,
    texte: t.couleurTexte,
    fond: t.couleurFond,
    fonce: melange(t.couleurPrimaire, 0.46, '#000000'),
    primaireFonce: melange(t.couleurPrimaire, 0.78, '#000000'),
    pale: melange(t.couleurPrimaire, 0.11, t.couleurFond),
    accentPale: melange(t.couleurAccent, 0.2, t.couleurFond),
    accentTexte: melange(t.couleurAccent, 0.6, '#000000'),
    surface: epure ? melange(t.couleurTexte, 0.03, t.couleurFond) : melange(t.couleurPrimaire, 0.05, melange(t.couleurTexte, 0.03, t.couleurFond)),
    bord: melange(t.couleurTexte, 0.13, t.couleurFond),
    filet: melange(t.couleurTexte, 0.7, t.couleurFond),
    doux: melange(t.couleurTexte, 0.8, t.couleurFond),
  };
  const titres = POLICES[t.policeTitres]?.famille;
  const texte = POLICES[t.policeTexte]?.famille;
  const rCarte = rayon * h.rayonCarte;
  const rBouton = h.pilule ? 99 : rayon;
  const ombre = o.cartes === 'relief' ? `0 8px 20px ${melange(c.fonce, 0.14, '#ffffff')}` : 'none';
  // Style des cartes : encadrées, « magazine » (Vitrine en relief) ou en liste (Épuré à plat).
  const cartes = gabarit === 'vitrine' && o.cartes === 'relief' ? 'magazine' : epure && o.cartes === 'plat' ? 'liste' : 'cadre';
  const pad = h.dense ? 14 : 18;
  const sectionPad = h.dense ? 16 : gabarit === 'vitrine' ? 28 : epure ? 26 : 20;
  const degrade = `linear-gradient(120deg, ${c.primaireFonce}, ${c.secondaire})`;
  const bandeau = `linear-gradient(125deg, ${c.fonce}, ${melange(c.primaire, 0.7, c.fonce)} 55%, ${c.secondaire})`;
  const fondPage = h.fondPage === 'surface' ? c.surface : c.fond;
  const photo = (voile: 'non' | 'sombre' | 'couleur', position = 'center'): React.CSSProperties => ({
    backgroundColor: c.fonce,
    backgroundImage: [
      voile === 'sombre' ? `linear-gradient(180deg, ${c.fonce}b8, ${c.fonce}d6)` : null,
      voile === 'couleur' ? `linear-gradient(100deg, ${c.fonce}f0, ${c.fonce}e0 45%, ${c.primaireFonce}d6)` : null,
      image ? `url("${image}")` : `linear-gradient(160deg, ${melange(c.primaire, 0.55, '#9fc6d8')}, ${melange(c.secondaire, 0.6, '#3d5a40')})`,
    ].filter(Boolean).join(', '),
    backgroundSize: 'cover',
    backgroundPosition: position,
  });

  const bouton = (libelle: string, style: 'plein' | 'accent' | 'clair' | 'contour' = 'plein'): React.ReactNode => (
    <span
      style={{
        display: 'inline-block', padding: h.capitales ? '6px 12px' : '6px 13px', borderRadius: rBouton, whiteSpace: 'nowrap',
        fontWeight: epure ? 600 : 700, fontSize: h.capitales ? 9.5 : 11, letterSpacing: h.capitales ? '0.06em' : 0, textTransform: h.capitales ? 'uppercase' : 'none',
        background: style === 'accent' ? c.accent : style === 'clair' ? '#ffffff' : style === 'contour' ? 'transparent' : c.primaire,
        color: style === 'accent' ? texteSur(c.accent, c.texte) : style === 'clair' ? c.primaireFonce : style === 'contour' ? c.texte : '#ffffff',
        border: style === 'contour' ? `1px solid ${c.texte}` : undefined,
      }}
    >
      {libelle}
    </span>
  );

  const surtitre = (texteSurtitre: string, surFond = false): React.ReactNode => {
    const base: React.CSSProperties = { display: 'inline-block', marginBottom: 6, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' };
    if (surFond) return <span style={{ ...base, color: '#ffffff', opacity: 0.9 }}>{texteSurtitre}</span>;
    if (h.surtitre === 'pastille') return <span style={{ ...base, padding: '3px 8px', borderRadius: 99, background: c.pale, color: c.primaireFonce }}>{texteSurtitre}</span>;
    if (h.surtitre === 'accent') return <span style={{ ...base, padding: '3px 8px', borderRadius: 99, background: c.accentPale, color: c.accentTexte }}>{texteSurtitre}</span>;
    if (h.surtitre === 'filet') return <span style={{ ...base, paddingLeft: 6, borderLeft: `3px solid ${c.accent}`, color: c.primaireFonce }}>{texteSurtitre}</span>;
    return <span style={{ ...base, color: gabarit === 'facettes' ? c.accentTexte : c.doux }}>{texteSurtitre}</span>;
  };

  const titreSection = (sur: string, titre: string): React.ReactNode => (
    <div style={{ textAlign: h.gauche ? 'left' : 'center', marginBottom: 12 }}>
      {surtitre(sur)}
      <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: gabarit === 'vitrine' ? 21 : 17, color: c.fonce, letterSpacing: gabarit === 'vitrine' ? '-0.03em' : '-0.01em' }}>{titre}</div>
      {h.souligne && <span style={{ display: 'block', width: 26, height: 3, marginTop: 5, background: c.accent }} />}
    </div>
  );

  // ---------- En-tête ----------
  const sombre = h.entete === 'sombre';
  const marque = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
      {logo ? (
        <img src={logo.url} alt="" style={{ height: 26, width: 'auto', ...(sombre ? { background: '#fff', padding: '3px 6px', borderRadius: rayon } : {}) }} />
      ) : (
        <span
          style={{
            display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: h.pilule ? 7 : rayon, color: '#fff', fontFamily: titres, fontWeight: 800, fontSize: 9,
            background: gabarit === 'institutionnel' || epure ? c.primaire : `linear-gradient(135deg, ${c.primaire}, ${c.secondaire})`,
          }}
        >
          {(t.logoTexte || t.nomSite.slice(0, 2)).toUpperCase()}
        </span>
      )}
      <span style={{ fontFamily: titres, fontWeight: epure ? 700 : 800, fontSize: 12, color: sombre ? '#fff' : c.fonce, lineHeight: 1.1 }}>
        {t.nomSite || 'Mon site'}
        {t.baseline && (
          <span style={{ display: 'block', fontFamily: texte, fontWeight: 700, fontSize: 6.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: sombre ? melange(c.accent, 0.3, '#ffffff') : gabarit === 'communaute' || gabarit === 'vitrine' ? c.accentTexte : c.doux }}>
            {t.baseline}
          </span>
        )}
      </span>
    </span>
  );
  const barre = h.barreMenu && o.entete !== 'classique';
  const lienMenu = (libelle: string, actif: boolean) => {
    const blanc = sombre || barre;
    const souligne = blanc ? '#fff' : h.menu === 'leger' ? c.texte : gabarit === 'communaute' || gabarit === 'vitrine' ? c.accent : c.primaire;
    return (
      <span key={libelle} style={{ color: blanc ? '#fff' : actif && h.menu !== 'leger' ? c.primaire : c.texte, paddingBottom: 2, boxShadow: actif ? `inset 0 -${h.menu === 'leger' ? 1 : 2}px 0 ${souligne}` : undefined }}>
        {libelle}
      </span>
    );
  };
  const menu = (
    <span
      style={{
        display: 'flex', alignItems: 'center', gap: 13, fontWeight: h.menu === 'capitales' ? 700 : h.menu === 'leger' ? 500 : 600,
        fontSize: h.menu === 'capitales' ? 8.5 : 10.5, letterSpacing: h.menu === 'capitales' ? '0.08em' : 0, textTransform: h.menu === 'capitales' ? 'uppercase' : 'none',
      }}
    >
      {lienMenu('Offres', true)}
      {lienMenu('Le territoire', false)}
      {lienMenu('Actualités', false)}
      {lienMenu('Entreprises', false)}
    </span>
  );
  const acces = (
    <span
      style={{
        padding: '5px 10px', borderRadius: rBouton, fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap',
        ...(barre
          ? { background: '#fff', color: c.primaireFonce }
          : h.acces === 'accent'
            ? { background: c.accent, color: texteSur(c.accent, c.texte) }
            : h.acces === 'contour'
              ? { border: `1px solid ${c.primaire}`, color: c.primaireFonce }
              : { background: c.primaire, color: '#fff' }),
      }}
    >
      Espace candidat
    </span>
  );
  const fondEntete: React.CSSProperties = {
    background: sombre ? c.fonce : c.fond, borderBottom: sombre ? undefined : `1px solid ${c.bord}`,
    boxShadow: h.lisere ? `inset 0 3px 0 ${c.primaire}` : undefined,
  };
  const ligneMenu: React.CSSProperties = barre
    ? { background: c.primaire }
    : { borderTop: o.entete === 'deux-lignes' ? `1px solid ${c.bord}` : undefined };
  const entete =
    o.entete === 'classique' ? (
      <div style={{ ...fondEntete, display: 'flex', alignItems: 'center', gap: 14, padding: `${h.dense ? 10 : epure ? 14 : 12}px ${pad}px` }}>
        {marque}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>{menu}{acces}</span>
      </div>
    ) : o.entete === 'centre' ? (
      <div style={{ ...fondEntete, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
        <div style={{ paddingBottom: 9 }}>{marque}</div>
        <div style={{ ...ligneMenu, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: `7px ${pad}px` }}>{menu}{acces}</div>
      </div>
    ) : (
      <div style={fondEntete}>
        <div style={{ padding: `13px ${pad}px 10px` }}>{marque}</div>
        <div style={{ ...ligneMenu, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `7px ${pad}px` }}>{menu}{acces}</div>
      </div>
    );

  // ---------- Pied de page ----------
  const clair = o.pied === 'clair';
  const pied = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: `12px ${pad}px`, fontSize: 9.5,
        background: clair ? c.surface : h.pied === 'secondaire' ? c.secondaire : h.pied === 'degrade' ? `linear-gradient(135deg, ${c.fonce}, ${melange(c.secondaire, 0.7, '#000000')})` : c.fonce,
        color: clair ? c.doux : h.pied === 'secondaire' ? '#fff' : 'rgba(255,255,255,0.8)',
        borderTop: clair ? `1px solid ${c.bord}` : undefined,
      }}
    >
      <strong style={{ fontFamily: titres, color: clair ? c.fonce : '#fff', fontSize: 11 }}>{t.nomSite || 'Mon site'}</strong>
      <span style={{ marginLeft: 'auto' }}>Mentions légales · Accessibilité · Plan du site</span>
    </div>
  );

  // ---------- Éléments communs ----------
  const cadreCarte = (avecPhoto = false): React.CSSProperties => {
    if (cartes === 'liste') return { borderTop: avecPhoto ? undefined : `1px solid ${c.filet}`, paddingTop: avecPhoto ? 0 : 8 };
    if (cartes === 'magazine' && avecPhoto) return {};
    return {
      background: c.fond, border: `1px solid ${c.bord}`, borderRadius: rCarte, boxShadow: ombre,
      borderTop: h.bordOffre === 'haut' ? `3px solid ${c.primaire}` : undefined,
    };
  };

  const carteOffre = (titre: string, contrat: string, enLigne = false) => (
    <div
      key={titre}
      style={{
        ...cadreCarte(), padding: cartes === 'liste' ? '8px 0 0' : h.dense ? 9 : 11,
        borderLeft: h.bordOffre === 'gauche' ? `3px solid ${c.primaire}` : undefined,
        display: enLigne ? 'flex' : 'block', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: h.pilule ? 5 : Math.min(rayon, 5), background: epure ? c.surface : c.pale, color: c.primaireFonce, fontSize: 7.5, fontWeight: 700 }}>Commercial</span>
        <div style={{ fontFamily: titres, fontWeight: Math.min(h.poidsTitres, 750), color: c.fonce, fontSize: 11.5, marginTop: 5 }}>{titre}</div>
        <div style={{ fontSize: 9, color: c.doux }}>Numérival · Vallée-Verte</div>
        <span style={{ display: 'inline-block', marginTop: 5, padding: '1px 6px', borderRadius: Math.min(rayon, 5), background: '#e3f1f8', color: '#15506e', fontSize: 7.5, fontWeight: 700 }}>{contrat}</span>
      </div>
      <div style={{ marginTop: enLigne ? 0 : 7, paddingTop: enLigne ? 0 : 6, borderTop: enLigne ? undefined : `1px ${epure ? 'dashed' : 'solid'} ${c.bord}`, fontSize: 8.5, fontWeight: 700, color: c.accentTexte, textAlign: 'right' }}>
        Voir l’offre →
      </div>
    </div>
  );

  const carteArticle = (titre: string, position: string) => (
    <div key={titre} style={{ ...cadreCarte(true), overflow: 'hidden' }}>
      <div style={{ ...photo('non', position), height: gabarit === 'vitrine' ? 74 : 58, borderRadius: cartes === 'cadre' ? 0 : cartes === 'magazine' ? rCarte : rayon }} />
      <div style={{ padding: cartes === 'cadre' ? 9 : '7px 2px 0' }}>
        <div style={{ fontSize: 7.5, color: c.doux, fontWeight: 600 }}>12 octobre</div>
        <div style={{ fontFamily: titres, fontWeight: Math.min(h.poidsTitres, 750), color: c.fonce, fontSize: cartes === 'magazine' ? 11.5 : 10.5, lineHeight: 1.2, marginTop: 2 }}>{titre}</div>
        <div style={{ fontSize: 8, fontWeight: 700, color: c.accentTexte, marginTop: 4 }}>Lire l’article →</div>
      </div>
    </div>
  );

  const fondColore = (type: 'chiffres' | 'action'): React.CSSProperties => {
    if (h.fonds === 'clair') return { background: c.surface, border: `1px solid ${c.bord}`, color: c.texte };
    if (h.fonds === 'uni') return { background: type === 'chiffres' ? (gabarit === 'facettes' ? c.fonce : c.secondaire) : c.primaireFonce, color: '#fff' };
    return { background: degrade, color: '#fff' };
  };

  const enTetePage = (titre: string, avecPhoto: boolean) => {
    const immersif = o.bandeaux === 'immersif';
    const ariane = <div style={{ fontSize: 8, fontWeight: 600, marginBottom: 6, color: immersif ? '#fff' : c.doux }}>Accueil › {titre}</div>;
    if (immersif) {
      const fondImmersif = gabarit === 'facettes' ? `linear-gradient(125deg, ${c.fonce}, ${c.fonce} 40%, ${melange(c.primaire, 0.7, c.fonce)})` : bandeau;
      return (
        <div style={{ ...(avecPhoto ? photo('sombre') : { background: fondImmersif }), color: '#fff', padding: `${gabarit === 'vitrine' ? 52 : gabarit === 'facettes' ? 24 : 34}px ${pad}px 18px` }}>
          {ariane}
          <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: gabarit === 'vitrine' ? 26 : 22, lineHeight: 1.1 }}>{titre}</div>
          <div style={{ fontSize: 10, marginTop: 5, opacity: 0.95 }}>Tout ce qui fait bouger l’emploi sur le territoire.</div>
        </div>
      );
    }
    return (
      <div style={{ background: c.surface, borderBottom: `1px solid ${c.bord}` }}>
        {avecPhoto && <div style={{ ...photo('non'), height: 62 }} />}
        <div style={{ padding: `${avecPhoto ? 12 : 20}px ${pad}px 14px` }}>
          {ariane}
          <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: 20, lineHeight: 1.1, color: c.fonce }}>{titre}</div>
          <div style={{ fontSize: 10, marginTop: 5, color: c.doux }}>Tout ce qui fait bouger l’emploi sur le territoire.</div>
        </div>
      </div>
    );
  };

  // ---------- Pages ----------
  const champ = (libelle: string, largeur?: number | string) => (
    <span style={{ flex: largeur ? `0 0 ${largeur}` : 1, display: 'block' }}>
      <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: c.doux, marginBottom: 2, textTransform: gabarit === 'facettes' ? 'uppercase' : 'none', letterSpacing: gabarit === 'facettes' ? '0.06em' : 0 }}>{libelle}</span>
      <span style={{ display: 'block', height: 17, border: `1px solid ${melange(c.texte, 0.3, c.fond)}`, borderRadius: Math.min(rayon, 8), background: c.surface }} />
    </span>
  );

  const accueil = () => {
    const banniere = o.accueil === 'banniere';
    const empile = o.accueil === 'empile';
    const aplat = o.accueil === 'deux-colonnes' && h.hero === 'aplat';
    const blanc = banniere || aplat;
    const centre = (banniere && !h.banniere.gauche) || empile;
    const textes = (
      <>
        {t.baseline && (
          <span style={{ display: 'inline-block', marginBottom: 8, padding: '3px 9px', borderRadius: h.pilule ? 99 : rayon, fontSize: 8, fontWeight: 700, border: `1px solid ${blanc ? 'rgba(255,255,255,0.35)' : c.bord}`, background: blanc ? 'rgba(255,255,255,0.14)' : c.fond, color: blanc ? '#fff' : c.primaireFonce }}>
            {t.baseline}
          </span>
        )}
        <div
          style={{
            fontFamily: titres, fontWeight: h.poidsTitres, lineHeight: 1.06, color: blanc ? '#fff' : c.fonce, letterSpacing: epure ? '-0.035em' : '-0.02em',
            fontSize: banniere ? (h.banniere.haute ? 32 : h.banniere.gauche ? 22 : 24) : empile ? 27 : 22,
          }}
        >
          Trouvez votre emploi sur le territoire
        </div>
        <div style={{ fontSize: 10.5, marginTop: 7, color: blanc ? '#fff' : c.doux }}>Offres, entreprises qui recrutent et événements près de chez vous.</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: centre ? 'center' : 'flex-start', gap: 9, marginTop: 11 }}>
          {bouton('Voir les offres →', aplat ? 'clair' : 'plein')}
          <span style={{ fontSize: 9, fontWeight: 600, color: blanc ? '#fff' : c.doux }}><strong>128</strong> offres en ligne</span>
        </div>
      </>
    );
    const fondHero = aplat ? c.primaireFonce : h.hero === 'pale' ? `linear-gradient(180deg, ${c.pale}, ${c.fond})` : h.hero === 'surface' ? c.surface : c.fond;
    let haut: React.ReactNode;
    if (banniere) {
      haut = (
        <div
          style={{
            ...photo(h.banniere.gauche ? 'couleur' : 'sombre'), color: '#fff', textAlign: centre ? 'center' : 'left',
            padding: h.banniere.haute ? `78px ${pad + 30}px 84px` : h.banniere.gauche ? `34px ${pad}px 46px` : `44px ${pad + 30}px 48px`,
          }}
        >
          <div style={{ maxWidth: h.banniere.gauche ? 330 : undefined }}>{textes}</div>
        </div>
      );
    } else if (empile) {
      haut = (
        <div style={{ padding: `${epure ? 30 : 24}px ${pad}px 30px`, background: fondHero, borderBottom: `1px solid ${c.bord}`, textAlign: 'center' }}>
          <div style={{ maxWidth: 420, margin: '0 auto 16px' }}>{textes}</div>
          <div style={{ ...photo('non'), aspectRatio: '21 / 9', borderRadius: epure ? rayon : rCarte }} />
        </div>
      );
    } else {
      haut = (
        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 16, alignItems: 'center', padding: `${h.dense ? 20 : 26}px ${pad}px 30px`, background: fondHero, borderBottom: h.hero === 'pale' || aplat ? undefined : `1px solid ${c.bord}` }}>
          <div>{textes}</div>
          <div style={{ ...photo('non'), aspectRatio: '4 / 3', borderRadius: aplat || epure ? rayon : rCarte * 1.2, boxShadow: o.cartes === 'relief' && !aplat ? `0 14px 30px ${melange(c.fonce, 0.2, '#ffffff')}` : 'none' }} />
        </div>
      );
    }
    return (
      <>
        {haut}
        {!vignette && (
          <>
            <div style={{ padding: `0 ${pad}px`, marginTop: banniere ? (h.banniere.haute ? -32 : -24) : -14, position: 'relative' }}>
              <div style={{ background: c.fond, border: `1px solid ${c.bord}`, borderTop: gabarit === 'facettes' ? `3px solid ${c.accent}` : gabarit === 'institutionnel' ? `3px solid ${c.primaire}` : undefined, borderRadius: rCarte, boxShadow: epure ? 'none' : `0 12px 28px ${melange(c.fonce, 0.16, '#ffffff')}`, padding: 11 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: c.fonce, marginBottom: 7, textAlign: gabarit === 'vitrine' ? 'center' : 'left' }}>Quel emploi recherchez-vous ?</div>
                <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
                  {champ('Métier, mot-clé')}
                  {champ('Ville')}
                  {bouton('Rechercher', 'accent')}
                </div>
              </div>
            </div>
            <div style={{ padding: `${sectionPad}px ${pad}px` }}>
              {titreSection('Emploi', 'Les dernières offres')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: cartes === 'liste' ? 16 : h.dense ? 8 : 10 }}>
                {carteOffre('Technicien de maintenance', 'CDI')}
                {carteOffre('Infirmier de nuit', 'CDD')}
              </div>
            </div>
            <div style={{ padding: `${sectionPad}px ${pad}px`, background: gabarit === 'vitrine' ? c.pale : h.fondPage === 'surface' ? c.fond : c.surface }}>
              {titreSection('Actualités', 'Toute l’actualité')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: cartes === 'cadre' ? 9 : 14 }}>
                {carteArticle('Le forum de l’emploi revient en novembre', '20% 40%')}
                {carteArticle('Alternance : les formations qui recrutent', '60% 60%')}
                {carteArticle('Pourquoi les familles s’installent ici', '90% 30%')}
              </div>
            </div>
            <div style={{ padding: `${sectionPad}px ${pad}px` }}>
              <div style={{ ...fondColore('action'), borderRadius: gabarit === 'communaute' || gabarit === 'vitrine' ? 16 : rCarte, padding: '16px 14px', textAlign: h.gauche ? 'left' : 'center' }}>
                <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: 15, color: h.fonds === 'clair' ? c.fonce : '#fff' }}>Vous ne trouvez pas l’offre idéale ?</div>
                <div style={{ fontSize: 9.5, margin: '4px 0 9px', opacity: 0.92 }}>Déposez votre candidature spontanée.</div>
                {bouton('Déposer mon CV', h.fonds === 'clair' ? 'plein' : 'clair')}
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  const offres = () => {
    const cote = o.filtres === 'cote';
    const filtres = cote ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: c.fond, border: `1px solid ${c.bord}`, borderRadius: rCarte, alignSelf: 'start' }}>
        {champ('Métier, mot-clé')}
        {champ('Ville')}
        <span style={{ borderTop: `1px solid ${c.bord}` }} />
        {champ('Type de contrat')}
        {champ('Secteur')}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: 10, background: c.fond, border: `1px solid ${c.bord}`, borderRadius: rCarte, boxShadow: o.cartes === 'relief' ? ombre : 'none' }}>
        <div style={{ display: 'flex', gap: 7 }}>{champ('Métier, mot-clé, entreprise')}{champ('Ville', '30%')}</div>
        <div style={{ display: 'flex', gap: 7 }}>{champ('Type de contrat')}{champ('Secteur')}{champ('Trier par')}</div>
      </div>
    );
    const liste = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: cartes === 'liste' ? 12 : 7 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700 }}>128 offres</div>
        {carteOffre('Technicien de maintenance', 'CDI', true)}
        {carteOffre('Comptable fournisseurs', 'CDI', true)}
        {carteOffre('Infirmier de nuit', 'CDD', true)}
      </div>
    );
    return (
      <>
        {enTetePage("Offres d'emploi", false)}
        <div style={{ padding: `14px ${pad}px ${sectionPad}px`, display: cote ? 'grid' : 'flex', gridTemplateColumns: cote ? '150px 1fr' : undefined, flexDirection: 'column', gap: 12 }}>
          {filtres}
          {liste}
        </div>
      </>
    );
  };

  const pageLibre = () => (
    <>
      {enTetePage('Le territoire', true)}
      <div style={{ padding: `${sectionPad}px ${pad}px`, fontSize: 10.5, color: c.texte }}>
        <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: 15, color: c.fonce, marginBottom: 6 }}>Un cadre de vie d’exception</div>
        <div style={{ color: c.doux }}>
          Entre lacs et montagnes, la vallée accueille plus de 2 000 entreprises. <span style={{ color: c.accentTexte, fontWeight: 700, textDecoration: 'underline' }}>Découvrez nos atouts</span>.
        </div>
      </div>
      <div style={{ ...fondColore('chiffres'), padding: `${sectionPad}px ${pad}px`, borderLeft: 0, borderRight: 0, borderRadius: 0 }}>
        <div style={{ textAlign: h.gauche ? 'left' : 'center', marginBottom: 10 }}>
          {h.fonds === 'clair' ? surtitre('En chiffres') : surtitre('En chiffres', true)}
          <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: 16, color: h.fonds === 'clair' ? c.fonce : '#fff' }}>Une vallée qui recrute</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: h.gauche ? 'left' : 'center' }}>
          {[['128', 'offres en ligne'], ['42', 'entreprises'], ['6', 'événements']].map(([n, l]) => (
            <div key={l} style={{ borderLeft: gabarit === 'institutionnel' ? '2px solid rgba(255,255,255,0.4)' : undefined, paddingLeft: gabarit === 'institutionnel' ? 8 : 0 }}>
              <div style={{ fontFamily: titres, fontWeight: h.poidsTitres, fontSize: gabarit === 'vitrine' ? 26 : 22, color: h.fonds === 'clair' ? c.primaire : '#fff' }}>{n}</div>
              <div style={{ fontSize: 9, opacity: h.fonds === 'clair' ? 1 : 0.85, color: h.fonds === 'clair' ? c.doux : undefined }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: `${sectionPad}px ${pad}px` }}>
        {titreSection('Nos atouts', 'Vivre et travailler ici')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: cartes === 'liste' ? 16 : 9 }}>
          {['Se loger', 'Se former', 'Se déplacer'].map((l) => (
            <div key={l} style={{ ...cadreCarte(), padding: cartes === 'liste' ? '10px 0 0' : 10 }}>
              <span style={{ display: 'block', width: 20, height: 20, borderRadius: h.pilule ? 6 : rayon, background: epure ? c.surface : c.pale, marginBottom: 6 }} />
              <div style={{ fontFamily: titres, fontWeight: Math.min(h.poidsTitres, 750), fontSize: 11, color: c.fonce }}>{l}</div>
              <div style={{ fontSize: 8.5, color: c.doux }}>Des solutions près de chez vous.</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div
      ref={cadre}
      style={{ position: 'relative', width: '100%', height: (hauteur ?? hauteurContenu) * echelle, overflow: 'hidden', background: fondPage }}
      {...(libelle ? { role: 'img', 'aria-label': libelle } : { 'aria-hidden': true })}
    >
      <div
        ref={contenu}
        style={{
          position: 'absolute', top: 0, left: 0, width: LARGEUR, transform: `scale(${echelle})`, transformOrigin: '0 0',
          background: fondPage, color: c.texte, fontFamily: texte, fontSize: 11, lineHeight: 1.45,
        }}
      >
        {entete}
        {(vignette || page === 'accueil') && accueil()}
        {!vignette && page === 'offres' && offres()}
        {!vignette && page === 'page' && pageLibre()}
        {!vignette && pied}
      </div>
    </div>
  );
}
