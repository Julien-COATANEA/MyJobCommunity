// Widget « Mise en route » : liste des étapes pour une nouvelle collectivité, avec progression.
import { Box, Flex, ProgressBar, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { Widget } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { useDonnees } from '../outils';

interface Etape { cle: string; libelle: string; fait: boolean; lien: string }

export default function Demarrage() {
  const { donnees, chargement, erreur } = useDonnees<{ demarrage: Etape[] }>('/espace/tableau-de-bord');
  if (chargement && !donnees) return <Widget.Loading />;
  if (erreur || !donnees) return <Widget.Error />;

  const etapes = donnees.demarrage;
  const faites = etapes.filter((e) => e.fait).length;
  const pourcentage = Math.round((faites / etapes.length) * 100);

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Box>
        <Typography variant="omega" fontWeight="bold">
          {pourcentage === 100 ? 'Votre site est prêt, bravo !' : `Votre site est prêt à ${pourcentage} %`}
        </Typography>
        <Box paddingTop={2}>
          <ProgressBar value={pourcentage} size="M" />
        </Box>
      </Box>
      <Flex direction="column" alignItems="stretch" gap={1} tag="ul">
        {etapes.map((e) => (
          <li key={e.cle} style={{ listStyle: 'none' }}>
            <Link to={e.lien} style={{ textDecoration: 'none' }}>
              <Flex gap={2} paddingTop={1} paddingBottom={1} alignItems="center">
                <Flex
                  justifyContent="center"
                  alignItems="center"
                  width="2rem"
                  height="2rem"
                  hasRadius
                  shrink={0}
                  background={e.fait ? 'success500' : 'neutral0'}
                  borderColor={e.fait ? 'success500' : 'neutral300'}
                  borderStyle="solid"
                  borderWidth="1px"
                  style={{ borderRadius: 99 }}
                >
                  {e.fait && <Check fill="neutral0" width="1.2rem" height="1.2rem" />}
                </Flex>
                <Typography variant="omega" textColor={e.fait ? 'neutral500' : 'primary600'} textDecoration={e.fait ? 'line-through' : undefined}>
                  {e.libelle}
                </Typography>
              </Flex>
            </Link>
          </li>
        ))}
      </Flex>
    </Flex>
  );
}
