// Recherche globale du back-office : Ctrl + K (ou ⌘ K) depuis n'importe quel écran.
// Montée hors de l'arbre React de Strapi (comme l'indicateur du site) : styles en ligne, navigation par l'historique du navigateur.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { getFetchClient } from '@strapi/strapi/admin';
import { allerVers } from './navigation';

interface Groupe { libelle: string; resultats: { titre: string; detail?: string; lien: string }[] }

const aller = allerVers;

function Recherche() {
  const [ouvert, setOuvert] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [groupes, setGroupes] = React.useState<Groupe[]>([]);
  const [actif, setActif] = React.useState(0);
  const champ = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !location.pathname.includes('/auth/')) {
        e.preventDefault();
        setOuvert((o) => !o);
      } else if (e.key === 'Escape') setOuvert(false);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, []);

  React.useEffect(() => {
    if (ouvert) setTimeout(() => champ.current?.focus(), 30);
    else { setQ(''); setGroupes([]); }
  }, [ouvert]);

  React.useEffect(() => {
    if (q.trim().length < 2) { setGroupes([]); return; }
    const minuteur = setTimeout(async () => {
      try {
        const { data } = await getFetchClient().get<{ groupes: Groupe[] }>(`/espace/recherche?q=${encodeURIComponent(q.trim())}`);
        setGroupes(data.groupes);
        setActif(0);
      } catch { setGroupes([]); }
    }, 250);
    return () => clearTimeout(minuteur);
  }, [q]);

  const plat = groupes.flatMap((g) => g.resultats);
  const choisir = (lien: string) => { setOuvert(false); aller(lien); };

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActif((a) => Math.min(plat.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActif((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && plat[actif]) choisir(plat[actif].lien);
  };

  if (!ouvert) return null;
  let index = -1;
  return (
    <div
      role="dialog" aria-modal="true" aria-label="Recherche dans mon espace"
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOuvert(false); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,.45)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh' }}
    >
      <div style={{ width: 'min(620px, 92vw)', background: '#fff', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,.3)', overflow: 'hidden', fontFamily: 'inherit', color: '#32324d' }}>
        <input
          ref={champ} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={clavier}
          placeholder="Rechercher une page, un article, un événement, une entreprise, un inscrit…"
          aria-label="Rechercher"
          style={{ width: '100%', boxSizing: 'border-box', border: 0, borderBottom: '1px solid #eaeaef', padding: '16px 20px', fontSize: 16, outline: 'none', color: '#32324d', background: '#fff' }}
        />
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }} role="listbox">
          {q.trim().length >= 2 && groupes.length === 0 && <p style={{ margin: 0, padding: '16px 20px', color: '#666687' }}>Aucun résultat pour « {q} ».</p>}
          {groupes.map((g) => (
            <div key={g.libelle}>
              <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666687', letterSpacing: '.04em' }}>{g.libelle}</div>
              {g.resultats.map((r) => {
                index += 1;
                const moi = index;
                return (
                  <div
                    key={r.lien + r.titre} role="option" aria-selected={moi === actif}
                    onMouseEnter={() => setActif(moi)} onClick={() => choisir(r.lien)}
                    style={{ padding: '8px 20px', cursor: 'pointer', background: moi === actif ? '#f0f0ff' : 'transparent' }}
                  >
                    <div style={{ fontWeight: 600 }}>{r.titre}</div>
                    {r.detail && <div style={{ fontSize: 12, color: '#666687' }}>{r.detail}</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 20px', fontSize: 12, color: '#666687', borderTop: '1px solid #eaeaef' }}>↑ ↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer</div>
      </div>
    </div>
  );
}

export function monterRecherche() {
  if (document.getElementById('mjc-recherche')) return;
  const racine = document.createElement('div');
  racine.id = 'mjc-recherche';
  document.body.appendChild(racine);
  createRoot(racine).render(<Recherche />);
}
