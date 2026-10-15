// Widget « À traiter » : ce qui demande l'attention de la collectivité (issu de « Santé du site »).
import { Flex, Typography } from '@strapi/design-system';
import { CheckCircle, WarningCircle } from '@strapi/icons';
import { Widget } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { useDonnees } from '../outils';

interface Controle { cle: string; libelle: string; statut: 'ok' | 'attention' | 'erreur'; detail: string; lien?: string }

export default function ATraiter() {
  const { donnees, chargement, erreur } = useDonnees<{ controles: Controle[]; aTraiter: number }>('/espace/sante');
  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error>{erreur}</Widget.Error>;

  const points = donnees.controles.filter((c) => c.statut !== 'ok').sort((a, b) => Number(b.statut === 'erreur') - Number(a.statut === 'erreur'));
  if (!points.length) {
    return (
      <Flex gap={2} alignItems="center">
        <CheckCircle fill="success600" />
        <Typography variant="omega">Rien à traiter : votre site est en ordre.</Typography>
      </Flex>
    );
  }
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {points.slice(0, 4).map((p) => (
        <Link key={p.cle} to={p.lien ?? '/sante'} style={{ textDecoration: 'none' }}>
          <Flex gap={2} alignItems="flex-start">
            <WarningCircle fill={p.statut === 'erreur' ? 'danger600' : 'warning600'} style={{ flex: 'none', marginTop: 2 }} />
            <Flex direction="column" alignItems="flex-start">
              <Typography variant="omega" fontWeight="bold" textColor="neutral800">{p.libelle}</Typography>
              <Typography variant="pi" textColor="neutral600">{p.detail}</Typography>
            </Flex>
          </Flex>
        </Link>
      ))}
      {points.length > 4 && <Typography variant="pi" textColor="neutral600">et {points.length - 4} autre(s) point(s)…</Typography>}
    </Flex>
  );
}
