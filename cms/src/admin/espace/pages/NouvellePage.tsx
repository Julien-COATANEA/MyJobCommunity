// « Nouvelle page » : on choisit un modèle (page prête à remplir) au lieu de partir d'une page vide.
import * as React from 'react';
import { Box, Button, Field, Flex, Grid, TextInput, Typography } from '@strapi/design-system';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useNavigate } from 'react-router-dom';
import { StylesEspace, fiche, useDonnees } from '../outils';

interface Modele { cle: string; titre: string; description: string; blocs: string[]; juridique: boolean; titrePage: string }

export default function NouvellePage() {
  const { donnees, chargement, erreur } = useDonnees<{ modeles: Modele[] }>('/espace/modeles');
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const [choix, setChoix] = React.useState('vide');
  const [titre, setTitre] = React.useState('');
  const [envoi, setEnvoi] = React.useState(false);

  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) return <Page.Error />;
  const modele = donnees.modeles.find((m) => m.cle === choix)!;

  const creer = async () => {
    setEnvoi(true);
    try {
      const { data } = await post<{ documentId: string }>('/espace/modeles/creer', { modele: choix, titre: titre.trim() || modele.titrePage });
      navigate(fiche('api::page.page', data.documentId));
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? 'La page n’a pas pu être créée.' });
      setEnvoi(false);
    }
  };

  return (
    <Page.Main>
      <Page.Title>Nouvelle page</Page.Title>
      <StylesEspace />
      <Layouts.Header title="Nouvelle page" subtitle="Choisissez un point de départ : vous n'aurez plus qu'à remplacer les textes entre crochets." />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Grid.Root gap={4}>
            {donnees.modeles.map((m) => (
              <Grid.Item key={m.cle} col={4} s={12} direction="column" alignItems="stretch">
                <button
                  type="button"
                  onClick={() => { setChoix(m.cle); if (!titre) setTitre(''); }}
                  aria-pressed={choix === m.cle}
                  style={{ all: 'unset', cursor: 'pointer', height: '100%', display: 'block' }}
                >
                  <Box
                    padding={4} hasRadius background={choix === m.cle ? 'primary100' : 'neutral0'} height="100%"
                    borderColor={choix === m.cle ? 'primary600' : 'neutral200'} shadow="tableShadow"
                  >
                    <Flex direction="column" alignItems="flex-start" gap={2}>
                      <Typography variant="delta" tag="h2">{m.titre}</Typography>
                      <Typography variant="pi" textColor="neutral700">{m.description}</Typography>
                      {m.blocs.length > 0 && <Typography variant="pi" textColor="neutral600">Contient : {m.blocs.join(' · ')}</Typography>}
                      {m.juridique && <Typography variant="pi" textColor="warning700">Contenu juridique : à faire relire.</Typography>}
                    </Flex>
                  </Box>
                </button>
              </Grid.Item>
            ))}
          </Grid.Root>

          <Box padding={5} hasRadius background="neutral0" shadow="tableShadow">
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Field.Root name="titre" hint="Vous pourrez le modifier ensuite. La page reste un brouillon jusqu'à « Enregistrer et publier ».">
                <Field.Label>Titre de la page</Field.Label>
                <TextInput value={titre} placeholder={modele.titrePage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitre(e.target.value)} />
                <Field.Hint />
              </Field.Root>
              <Box><Button onClick={creer} loading={envoi}>Créer la page</Button></Box>
            </Flex>
          </Box>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
