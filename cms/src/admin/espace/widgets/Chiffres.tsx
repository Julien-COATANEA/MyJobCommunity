// Widget « Mon site en chiffres ».
import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Widget } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { liste, useDonnees } from '../outils';

interface Compteurs {
  pages: number;
  articles: number;
  entreprises: number;
  offres: number;
  evenementsAVenir: number;
  inscriptions30j: number;
}

export default function Chiffres() {
  const { donnees, chargement, erreur } = useDonnees<{ compteurs: Compteurs }>('/espace/tableau-de-bord');
  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error>{erreur}</Widget.Error>;
  const c = donnees.compteurs;

  const chiffres = [
    { valeur: c.offres, libelle: "offres d'emploi en ligne", to: '/mes-offres' },
    { valeur: c.evenementsAVenir, libelle: 'événements à venir', to: liste('api::evenement.evenement') },
    { valeur: c.inscriptions30j, libelle: 'inscriptions (30 jours)', to: liste('api::inscription.inscription') },
    { valeur: c.articles, libelle: 'articles publiés', to: liste('api::article.article') },
    { valeur: c.entreprises, libelle: "entreprises dans l'annuaire", to: liste('api::entreprise.entreprise') },
    { valeur: c.pages, libelle: 'pages publiées', to: '/mes-pages' },
  ];

  return (
    // Marge intérieure : le contenu du widget défile (overflow), il rognerait l'ombre et le soulèvement au survol.
    <Grid.Root gap={3} paddingTop={1} paddingLeft={2} paddingRight={2} paddingBottom={3}>
      {chiffres.map((ch) => (
        <Grid.Item key={ch.libelle} col={4} s={6} direction="column" alignItems="stretch">
          <Link to={ch.to} style={{ textDecoration: 'none', height: '100%' }}>
            <Box padding={3} hasRadius background="primary100" height="100%" className="mjc-tuile">
              <Flex direction="column" alignItems="flex-start" gap={1}>
                <Typography variant="alpha" textColor="primary700" tag="span">
                  {ch.valeur}
                </Typography>
                <Typography variant="pi" textColor="neutral700">
                  {ch.libelle}
                </Typography>
              </Flex>
            </Box>
          </Link>
        </Grid.Item>
      ))}
    </Grid.Root>
  );
}
