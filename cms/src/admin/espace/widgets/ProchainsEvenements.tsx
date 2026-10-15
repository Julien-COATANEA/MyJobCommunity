// Widget « Prochains événements » : remplissage des jauges et dernières inscriptions.
import { Box, Divider, Flex, ProgressBar, Typography } from '@strapi/design-system';
import { Widget } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { creation, fiche, formatDate, ilYA, pluriel, useDonnees } from '../outils';

interface Donnees {
  prochainsEvenements: {
    documentId: string;
    titre: string;
    dateDebut: string;
    placesMax: number | null;
    inscriptionActive: boolean;
    inscriptionExterneUrl: string | null;
    inscrits: number;
  }[];
  inscriptionsRecentes: { documentId: string; nom: string; evenement: string | null; createdAt: string }[];
}

const EVENEMENT = 'api::evenement.evenement';

export default function ProchainsEvenements() {
  const { donnees, chargement, erreur } = useDonnees<Donnees>('/espace/tableau-de-bord');
  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error>{erreur}</Widget.Error>;

  if (!donnees.prochainsEvenements.length) {
    return (
      <Flex direction="column" gap={2}>
        <Widget.NoData>Aucun événement à venir.</Widget.NoData>
        <Link to={creation(EVENEMENT)}>
          <Typography textColor="primary600">Créer un événement</Typography>
        </Link>
      </Flex>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      {donnees.prochainsEvenements.map((e) => {
        const jour = new Date(e.dateDebut);
        return (
          <Link key={e.documentId} to={fiche(EVENEMENT, e.documentId)} style={{ textDecoration: 'none' }}>
            <Flex gap={3} alignItems="center">
              <Flex direction="column" width="4.4rem" shrink={0} padding={1} hasRadius background="primary600" alignItems="center">
                <Typography variant="beta" textColor="neutral0" tag="span">
                  {jour.getDate()}
                </Typography>
                <Typography variant="pi" textColor="neutral0" tag="span">
                  {formatDate(e.dateDebut, { month: 'short' })}
                </Typography>
              </Flex>
              <Flex direction="column" alignItems="stretch" gap={1} grow={1}>
                <Typography variant="omega" fontWeight="bold" textColor="neutral800" ellipsis>
                  {e.titre}
                </Typography>
                {e.inscriptionExterneUrl ? (
                  <Typography variant="pi" textColor="neutral600">Inscription sur un site externe</Typography>
                ) : !e.inscriptionActive ? (
                  <Typography variant="pi" textColor="neutral600">Sans inscription en ligne</Typography>
                ) : e.placesMax ? (
                  <Flex gap={2} alignItems="center">
                    <Box grow={1}>
                      <ProgressBar value={Math.min(100, Math.round((e.inscrits / e.placesMax) * 100))} size="S" />
                    </Box>
                    <Typography variant="pi" textColor="neutral600">
                      {e.inscrits} / {e.placesMax}
                    </Typography>
                  </Flex>
                ) : (
                  <Typography variant="pi" textColor="neutral600">{pluriel(e.inscrits, 'inscrit')}</Typography>
                )}
              </Flex>
            </Flex>
          </Link>
        );
      })}

      {donnees.inscriptionsRecentes.length > 0 && (
        <>
          <Divider />
          <Typography variant="sigma" textColor="neutral600">
            Dernières inscriptions
          </Typography>
          {donnees.inscriptionsRecentes.map((i) => (
            <Flex key={i.documentId} justifyContent="space-between" gap={2}>
              <Typography variant="pi" textColor="neutral800" ellipsis>
                <strong>{i.nom}</strong> · {i.evenement ?? 'événement supprimé'}
              </Typography>
              <Typography variant="pi" textColor="neutral500" style={{ whiteSpace: 'nowrap' }}>
                {ilYA(i.createdAt)}
              </Typography>
            </Flex>
          ))}
        </>
      )}
    </Flex>
  );
}
