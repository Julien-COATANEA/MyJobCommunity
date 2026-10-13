// Indicateur permanent du back-office : « Site à jour », « Mise à jour en cours… », « N brouillons non publiés ».
// Monté hors de l'arbre React de Strapi (aucun emplacement prévu dans le menu) : styles en ligne, requêtes via getFetchClient.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { getFetchClient } from '@strapi/strapi/admin';

interface Etat {
  urlSite: string;
  site: { enCours: boolean; dernierBuild: string | null; derniereErreur: string | null } | null;
  brouillons: { total: number; details: { uid: string; libelle: string; jamaisPublies: number; modifies: number; lien: string }[] };
}

const ilYA = (iso: string | null) => {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
};

const COULEURS = { ok: '#2f9e60', encours: '#d9822b', erreur: '#d02b20', brouillon: '#d9822b' };

function Indicateur() {
  const [etat, setEtat] = React.useState<Etat | null>(null);
  const [ouvert, setOuvert] = React.useState(false);
  const [vientDeFinir, setVientDeFinir] = React.useState(false);
  // Masqué sur l'écran de connexion et en aperçu plein écran.
  const masque = () => location.pathname.includes('/auth/') || location.pathname.endsWith('/preview');
  const [visible, setVisible] = React.useState(!masque());
  const precedent = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout>;
    let actif = true;
    const charger = async () => {
      setVisible(!masque());
      if (!location.pathname.includes('/auth/')) {
        try {
          const { data } = await getFetchClient().get<Etat>('/espace/etat-site');
          if (!actif) return;
          const enCours = !!data.site?.enCours;
          if (precedent.current === true && !enCours && !data.site?.derniereErreur) {
            setVientDeFinir(true);
            setTimeout(() => setVientDeFinir(false), 8000);
          }
          precedent.current = enCours;
          setEtat(data);
        } catch {
          setEtat(null);
        }
      }
      // Rythme rapide pendant une mise à jour, lent sinon.
      minuteur = setTimeout(charger, precedent.current ? 3000 : 15000);
    };
    charger();
    const reprendre = () => {
      clearTimeout(minuteur);
      charger();
    };
    // Une publication déclenche une mise à jour : on réinterroge aussitôt après chaque clic.
    const apresClic = () => {
      setTimeout(() => setVisible(!masque()), 300);
      setTimeout(reprendre, 1500);
    };
    document.addEventListener('visibilitychange', reprendre);
    document.addEventListener('click', apresClic);
    return () => {
      actif = false;
      clearTimeout(minuteur);
      document.removeEventListener('visibilitychange', reprendre);
      document.removeEventListener('click', apresClic);
    };
  }, []);

  if (!visible || !etat) return null;

  const site = etat.site;
  const statut = !site ? 'ok' : site.enCours ? 'encours' : site.derniereErreur ? 'erreur' : 'ok';
  const texteSite =
    statut === 'encours' ? 'Mise à jour du site en cours…'
      : statut === 'erreur' ? 'Échec de la dernière mise à jour'
        : vientDeFinir ? 'Site mis à jour ✓'
          : `Site à jour${site?.dernierBuild ? ` · ${ilYA(site.dernierBuild)}` : ''}`;
  const n = etat.brouillons.total;

  return (
    <div className="mjc-indicateur" style={{ fontFamily: 'inherit', fontSize: 13 }}>
      {ouvert && (
        <div
          role="dialog"
          aria-label="État du site"
          className="mjc-indicateur__panneau"
          style={{
            position: 'absolute', width: 320, padding: 16, borderRadius: 8,
            background: 'var(--mjc-fond, #fff)', color: '#32324d', boxShadow: '0 8px 30px rgba(33,33,52,.2)', border: '1px solid #eaeaef',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{texteSite}</p>
          <p style={{ margin: '0 0 12px', color: '#666687', lineHeight: 1.5 }}>
            Le site est mis à jour automatiquement quelques secondes après chaque <strong>publication</strong>. Un simple
            « Enregistrer » garde un brouillon, invisible sur le site.
          </p>
          {n > 0 && (
            <>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>À publier</p>
              <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none' }}>
                {etat.brouillons.details.map((d) => (
                  <li key={d.uid} style={{ padding: '4px 0' }}>
                    <a href={`/admin${d.lien}`} style={{ color: '#4945ff', fontWeight: 600 }}>{d.libelle}</a>
                    <span style={{ color: '#666687' }}>
                      {' '}: {[d.jamaisPublies && `${d.jamaisPublies} jamais publié${d.jamaisPublies > 1 ? 's' : ''}`, d.modifies && `${d.modifies} modifié${d.modifies > 1 ? 's' : ''}`].filter(Boolean).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {site?.derniereErreur && <p style={{ margin: '0 0 12px', color: COULEURS.erreur }}>La version précédente du site reste en ligne. Une nouvelle tentative est faite automatiquement.</p>}
          {etat.urlSite && (
            <a href={etat.urlSite} target="_blank" rel="noopener noreferrer" style={{ color: '#4945ff', fontWeight: 700 }}>
              Voir le site ↗
            </a>
          )}
        </div>
      )}
      <button
        type="button"
        aria-expanded={ouvert}
        aria-label={`${texteSite}${n > 0 ? `, ${n} brouillon${n > 1 ? 's' : ''} non publié${n > 1 ? 's' : ''}` : ''}`}
        className="mjc-indicateur__bouton"
        onClick={() => setOuvert(!ouvert)}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
          border: '1px solid #dcdce4', background: '#fff', color: '#32324d', boxShadow: '0 2px 10px rgba(33,33,52,.12)', font: 'inherit', fontWeight: 600,
        }}
      >
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 99, background: COULEURS[statut], boxShadow: statut === 'encours' ? `0 0 0 4px ${COULEURS.encours}33` : undefined }} />
        <span className="mjc-indicateur__texte" aria-live="polite">{texteSite}</span>
        {n > 0 && (
          <span className="mjc-indicateur__brouillons" style={{ padding: '2px 8px', borderRadius: 99, background: '#fdf4dc', color: '#8a5a00' }}>
            {n} brouillon{n > 1 ? 's' : ''} non publié{n > 1 ? 's' : ''}
          </span>
        )}
      </button>
    </div>
  );
}

/** Ajoute aussi la classe « mjc-editeur » au <body> pour simplifier l'interface des rôles non administrateurs. */
async function marquerRole() {
  try {
    const { data } = await getFetchClient().get<{ data: { roles: { code: string }[] } }>('/admin/users/me');
    const superAdmin = data.data.roles.some((r) => r.code === 'strapi-super-admin');
    document.body.classList.toggle('mjc-editeur', !superAdmin);
  } catch {
    // Non connecté : rien à faire, on réessaiera au prochain chargement.
  }
}

export function monterIndicateur() {
  if (document.getElementById('mjc-indicateur')) return;
  const conteneur = document.createElement('div');
  conteneur.id = 'mjc-indicateur';
  document.body.appendChild(conteneur);
  createRoot(conteneur).render(<Indicateur />);
  marquerRole();
  // Après la connexion, l'adresse change sans rechargement : on revérifie le rôle.
  let chemin = location.pathname;
  setInterval(() => {
    if (location.pathname !== chemin) {
      if (chemin.includes('/auth/')) marquerRole();
      chemin = location.pathname;
    }
  }, 1000);
}
