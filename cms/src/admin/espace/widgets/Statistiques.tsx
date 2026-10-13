// Widget « Fréquentation » : visiteurs, pages vues et clics « Postuler » sur 30 jours (Plausible, sans cookie).
import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Widget } from '@strapi/strapi/admin';
import { useDonnees } from '../outils';

interface Stats {
  configure: boolean; erreur?: string; lien?: string;
  visiteurs?: { valeur: number; evolution: number | null };
  pagesVues?: { valeur: number; evolution: number | null };
  clicsPostuler?: { valeur: number; evolution: number | null } | null;
  dureeMoyenne?: number;
  pagesPopulaires?: { page: string; visiteurs: number }[];
  serie?: { date: string; visiteurs: number }[];
}

const Evolution = ({ v }: { v: number | null | undefined }) =>
  v == null ? null : (
    <Typography variant="pi" style={{ color: v >= 0 ? '#2f9e60' : '#d02b20' }}>
      {v >= 0 ? '▲' : '▼'} {Math.abs(v)} % <span className="sr-only">par rapport aux 30 jours précédents</span>
    </Typography>
  );

function Courbe({ serie }: { serie: { date: string; visiteurs: number }[] }) {
  const max = Math.max(1, ...serie.map((p) => p.visiteurs));
  const points = serie.map((p, i) => `${(i / Math.max(1, serie.length - 1)) * 100},${30 - (p.visiteurs / max) * 28}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" width="100%" height="48" role="img" aria-label="Évolution des visiteurs sur 30 jours">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Statistiques() {
  const { donnees, chargement, erreur } = useDonnees<Stats>('/espace/statistiques');
  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error />;
  if (!donnees.configure) {
    return (
      <Typography variant="omega" textColor="neutral700">
        Les statistiques de visite ne sont pas encore branchées. Demandez à votre administrateur de renseigner PLAUSIBLE_URL, PLAUSIBLE_SITE et PLAUSIBLE_API_KEY.
      </Typography>
    );
  }
  if (donnees.erreur) return <Typography textColor="neutral600">{donnees.erreur}</Typography>;

  const minutes = Math.round((donnees.dureeMoyenne ?? 0) / 60);
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Grid.Root gap={3}>
        {[
          { titre: 'visiteurs', d: donnees.visiteurs },
          { titre: 'pages vues', d: donnees.pagesVues },
          ...(donnees.clicsPostuler ? [{ titre: 'clics « Postuler »', d: donnees.clicsPostuler }] : []),
        ].map((c) => (
          <Grid.Item key={c.titre} col={4} s={12} direction="column" alignItems="flex-start">
            <Typography variant="alpha" textColor="primary700">{c.d?.valeur ?? 0}</Typography>
            <Typography variant="pi" textColor="neutral700">{c.titre} (30 jours)</Typography>
            <Evolution v={c.d?.evolution} />
          </Grid.Item>
        ))}
      </Grid.Root>
      {donnees.serie && donnees.serie.length > 1 && <Box color="primary600"><Courbe serie={donnees.serie} /></Box>}
      {minutes > 0 && <Typography variant="pi" textColor="neutral600">Durée moyenne d'une visite : {minutes} min</Typography>}
      {donnees.pagesPopulaires && donnees.pagesPopulaires.length > 0 && (
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="pi" fontWeight="bold">Pages les plus vues</Typography>
          {donnees.pagesPopulaires.map((p) => (
            <Flex key={p.page} justifyContent="space-between" gap={2}>
              <Typography variant="pi" textColor="neutral800" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</Typography>
              <Typography variant="pi" fontWeight="bold">{p.visiteurs}</Typography>
            </Flex>
          ))}
        </Flex>
      )}
      {donnees.lien && <a href={donnees.lien} target="_blank" rel="noopener noreferrer"><Typography variant="pi" textColor="primary600">Voir le détail dans Plausible ↗</Typography></a>}
    </Flex>
  );
}
