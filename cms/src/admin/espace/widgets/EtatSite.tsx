// Widget « Mon site » : dernière mise en ligne et dernière synchronisation des offres Gestmax.
import * as React from 'react';
import { Badge, Button, Divider, Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise, Briefcase, Earth } from '@strapi/icons';
import { Widget, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { Pastille, ilYA, messageErreur, pluriel, useDonnees } from '../outils';

interface Donnees {
  urlSite: string;
  compteurs: { offres: number };
  site: { enCours: boolean; dernierBuild: string | null; derniereErreur: string | null } | null;
  gestmax: { date: string | null; statut: string | null; erreur?: string; mock: boolean };
}

export default function EtatSite() {
  const { donnees, chargement, erreur, recharger } = useDonnees<Donnees>('/espace/tableau-de-bord');
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [envoi, setEnvoi] = React.useState(false);

  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error>{erreur}</Widget.Error>;
  const { site, gestmax } = donnees;

  const mettreAJour = async () => {
    setEnvoi(true);
    try {
      await post('/espace/site/regenerer', {});
      toggleNotification({ type: 'success', message: 'Mise à jour du site lancée : elle sera en ligne dans quelques instants.' });
      setTimeout(recharger, 4000);
    } catch (e) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "La mise à jour du site n'a pas pu être lancée.") });
    } finally {
      setEnvoi(false);
    }
  };

  const badgeSite = !site ? (
    <Badge>État inconnu</Badge>
  ) : site.enCours ? (
    <Badge backgroundColor="warning100" textColor="warning700">Mise à jour en cours</Badge>
  ) : site.derniereErreur ? (
    <Badge backgroundColor="danger100" textColor="danger700">Dernière mise à jour en échec</Badge>
  ) : (
    <Badge backgroundColor="success100" textColor="success700">En ligne</Badge>
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex gap={3} alignItems="flex-start">
        <Pastille couleur="success">
          <Earth />
        </Pastille>
        <Flex direction="column" alignItems="flex-start" gap={1} grow={1}>
          <Flex gap={2} wrap="wrap">
            <Typography variant="omega" fontWeight="bold">Site public</Typography>
            {badgeSite}
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            Mis à jour {ilYA(site?.dernierBuild)}. Chaque publication met le site à jour automatiquement.
          </Typography>
          <Flex gap={2} paddingTop={1} wrap="wrap">
            <Button size="S" variant="secondary" startIcon={<ArrowClockwise />} loading={envoi} onClick={mettreAJour}>
              Mettre à jour maintenant
            </Button>
            {donnees.urlSite && (
              <Button size="S" variant="tertiary" tag="a" href={donnees.urlSite} target="_blank" rel="noopener noreferrer">
                Voir le site
              </Button>
            )}
          </Flex>
        </Flex>
      </Flex>

      <Divider />

      <Flex gap={3} alignItems="flex-start">
        <Pastille couleur="warning">
          <Briefcase />
        </Pastille>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Flex gap={2} wrap="wrap">
            <Typography variant="omega" fontWeight="bold">Offres Gestmax</Typography>
            {gestmax.statut === 'erreur' ? (
              <Badge backgroundColor="danger100" textColor="danger700">Synchronisation en échec</Badge>
            ) : (
              <Badge backgroundColor="success100" textColor="success700">{pluriel(donnees.compteurs.offres, 'offre')}</Badge>
            )}
            {gestmax.mock && <Badge>Données de démonstration</Badge>}
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            Dernière synchronisation {ilYA(gestmax.date)}.
          </Typography>
          <Link to="/mes-offres">
            <Typography variant="pi" textColor="primary600">Gérer mes offres</Typography>
          </Link>
        </Flex>
      </Flex>
    </Flex>
  );
}
