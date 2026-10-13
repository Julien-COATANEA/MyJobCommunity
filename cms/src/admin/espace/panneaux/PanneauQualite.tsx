// Encart « Avant de publier » dans les fiches : contrôle qualité en direct + aperçu Google et réseaux sociaux.
import * as React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { CheckCircle, WarningCircle } from '@strapi/icons';
import { useFetchClient, useForm } from '@strapi/strapi/admin';
import { controler, liensInternes, type Niveau } from '../qualite';

const TYPES_CONTROLES = ['api::page.page', 'api::article.article', 'api::evenement.evenement', 'api::entreprise.entreprise', 'api::accueil.accueil'];

const COULEURS: Record<Niveau, { fond: string; texte: string; puce: string }> = {
  erreur: { fond: '#fcecea', texte: '#b72b1a', puce: '#d02b20' },
  attention: { fond: '#fdf4dc', texte: '#8a5a00', puce: '#d9822b' },
  info: { fond: '#eaf5ff', texte: '#0c4a8a', puce: '#4945ff' },
};

function Contenu({ model }: { model: string }) {
  const { post } = useFetchClient();
  // Valeurs du formulaire en cours de saisie (pas seulement la version enregistrée).
  const valeurs = useForm('PanneauQualite', (etat: any) => etat.values) as any;
  const [casses, setCasses] = React.useState<string[]>([]);
  const [site, setSite] = React.useState<{ nomSite: string; urlSite: string }>({ nomSite: '', urlSite: '' });
  const { get } = useFetchClient();

  React.useEffect(() => {
    get<{ nomSite: string; urlSite: string }>('/espace/liens').then(({ data }) => setSite({ nomSite: data.nomSite, urlSite: data.urlSite })).catch(() => {});
  }, [get]);

  // Les adresses internes sont vérifiées auprès du serveur, une fois la saisie terminée.
  const internes = React.useMemo(() => JSON.stringify(liensInternes(valeurs)), [valeurs]);
  React.useEffect(() => {
    const urls: string[] = JSON.parse(internes);
    if (!urls.length) return setCasses([]);
    const minuteur = setTimeout(() => {
      post<{ inconnues: string[] }>('/espace/liens/verifier', { urls }).then(({ data }) => setCasses(data.inconnues)).catch(() => {});
    }, 800);
    return () => clearTimeout(minuteur);
  }, [internes, post]);

  const points = React.useMemo(() => controler(valeurs, { model, liensCasses: casses }), [valeurs, model, casses]);
  const aCorriger = points.filter((p) => p.niveau !== 'info').length;

  const titre = String(valeurs?.seo?.metaTitle || valeurs?.titre || valeurs?.nom || valeurs?.heroTitre || 'Titre de la page');
  const description = String(valeurs?.seo?.metaDescription || valeurs?.extrait || valeurs?.chapo || valeurs?.heroTexte || '');
  const adresse = `${site.urlSite.replace(/^https?:\/\//, '')}${valeurs?.slug ? `/${valeurs.slug}` : ''}`;

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Flex gap={2} alignItems="center">
        {aCorriger === 0 ? <CheckCircle fill="success600" /> : <WarningCircle fill="warning600" />}
        <Typography variant="omega" fontWeight="bold">
          {aCorriger === 0 ? 'Prêt à publier' : `${aCorriger} point${aCorriger > 1 ? 's' : ''} à vérifier`}
        </Typography>
      </Flex>

      {points.map((p, i) => (
        <Box key={i} padding={2} hasRadius style={{ background: COULEURS[p.niveau].fond }}>
          <Flex gap={2} alignItems="flex-start">
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: COULEURS[p.niveau].puce, marginTop: 6, flex: 'none' }} />
            <Typography variant="pi" style={{ color: COULEURS[p.niveau].texte }}>
              {p.texte}
            </Typography>
          </Flex>
        </Box>
      ))}

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '1.3rem', fontWeight: 600, color: '#4945ff' }}>Aperçu dans Google</summary>
        <Box paddingTop={2}>
          <div style={{ fontFamily: 'Arial, sans-serif', border: '1px solid #eaeaef', borderRadius: 8, padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#4d5156', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adresse}</div>
            <div style={{ fontSize: 18, color: '#1a0dab', lineHeight: 1.3, margin: '2px 0' }}>
              {`${titre.slice(0, 60)}${titre.length > 60 ? '…' : ''}${site.nomSite ? ` | ${site.nomSite}` : ''}`}
            </div>
            <div style={{ fontSize: 13, color: '#4d5156', lineHeight: 1.5 }}>
              {description ? `${description.slice(0, 160)}${description.length > 160 ? '…' : ''}` : 'Aucune description : Google choisira un extrait.'}
            </div>
          </div>
        </Box>
      </details>
    </Flex>
  );
}

export const PanneauQualite = ({ model }: { model: string }) => {
  if (!TYPES_CONTROLES.includes(model)) return null;
  return { title: 'Avant de publier', content: <Contenu model={model} /> };
};
PanneauQualite.type = 'mjc-qualite';
