// Fenêtre d'accueil à la première connexion : 4 repères pour se lancer. Rouvrable depuis la page Aide.
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { getFetchClient } from '@strapi/strapi/admin';

const CLE = 'mjc-bienvenue-vue';
const ETAPES = [
  { titre: 'Mes pages, Mes articles, Mes événements', texte: 'Le menu de gauche réunit tout ce que vous publiez. Cliquez sur « Créer » pour ajouter un contenu.' },
  { titre: 'Enregistrer et publier', texte: 'Le bouton « Enregistrer et publier » met le contenu en ligne : le site se met à jour en quelques secondes. L’indicateur en bas à droite vous le confirme.' },
  { titre: 'Apparence', texte: 'Logo, couleurs et polices de votre site se règlent dans « Apparence », sans toucher au reste.' },
  { titre: 'Rechercher partout', texte: 'Appuyez sur Ctrl + K pour retrouver en un instant une page, un article, une entreprise ou un inscrit.' },
];

export const rouvrirBienvenue = () => window.dispatchEvent(new Event('mjc-bienvenue'));

function Bienvenue() {
  const [ouvert, setOuvert] = React.useState(false);

  React.useEffect(() => {
    const rouvrir = () => setOuvert(true);
    window.addEventListener('mjc-bienvenue', rouvrir);
    // Première visite : on attend d'être connecté (la route d'état répond 200) et hors écrans d'authentification.
    const verifier = async () => {
      try {
        if (location.pathname.includes('/auth/') || localStorage.getItem(CLE)) return;
        await getFetchClient().get('/espace/etat-site');
        setOuvert(true);
      } catch {
        // Non connecté ou stockage indisponible : pas de fenêtre.
      }
    };
    const minuteur = setTimeout(verifier, 1500);
    return () => { clearTimeout(minuteur); window.removeEventListener('mjc-bienvenue', rouvrir); };
  }, []);

  const fermer = () => {
    setOuvert(false);
    try { localStorage.setItem(CLE, '1'); } catch { /* sans conséquence */ }
  };

  React.useEffect(() => {
    if (!ouvert) return;
    const echap = (e: KeyboardEvent) => e.key === 'Escape' && fermer();
    window.addEventListener('keydown', echap);
    return () => window.removeEventListener('keydown', echap);
  }, [ouvert]);

  if (!ouvert) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mjc-bienvenue-titre" style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,.5)', zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 'min(520px, 92vw)', background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,.3)', color: '#32324d' }}>
        <h2 id="mjc-bienvenue-titre" style={{ margin: '0 0 6px', fontSize: 22 }}>Bienvenue sur votre espace de gestion</h2>
        <p style={{ margin: '0 0 16px', color: '#666687' }}>Quatre repères pour bien démarrer :</p>
        <ol style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: 12 }}>
          {ETAPES.map((e) => (
            <li key={e.titre}><strong>{e.titre}</strong><br /><span style={{ color: '#666687' }}>{e.texte}</span></li>
          ))}
        </ol>
        <div style={{ textAlign: 'right', marginTop: 22 }}>
          <button type="button" onClick={fermer} autoFocus style={{ background: 'var(--mjc-primaire, #1a5f7a)', color: '#fff', border: 0, borderRadius: 6, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            C’est parti
          </button>
        </div>
      </div>
    </div>
  );
}

export function monterBienvenue() {
  if (document.getElementById('mjc-bienvenue')) return;
  const racine = document.createElement('div');
  racine.id = 'mjc-bienvenue';
  document.body.appendChild(racine);
  createRoot(racine).render(<Bienvenue />);
}
