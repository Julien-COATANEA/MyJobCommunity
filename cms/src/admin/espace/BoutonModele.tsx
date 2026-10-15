// Bouton « À partir d'un modèle » de la liste « Mes pages », juste sous « Créer une nouvelle entrée » :
// on choisit un modèle (page prête à remplir) dans une fenêtre au lieu de partir d'une page vide.
// Affiché sur l'écran « Mes pages » et injecté dans la zone « listView.actions » du gestionnaire de contenu (voir app.tsx).
import * as React from 'react';
import { Box, Button, Field, Flex, Grid, Loader, Modal, TextInput, Typography } from '@strapi/design-system';
import { Layout } from '@strapi/icons';
import { getFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import { useLocation, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';
import { fiche, messageErreur } from './outils';

const PAGE = 'api::page.page';
const PERMISSIONS = [{ action: 'plugin::content-manager.explorer.create', subject: PAGE }] as any;

// Carte cliquable : on neutralise l'apparence du bouton sans perdre l'anneau de focus clavier.
const CarteModele = styled.button`
  display: block;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--mjc-primaire, #4945ff);
    outline-offset: 2px;
  }
`;

interface Modele { cle: string; titre: string; description: string; blocs: string[]; juridique: boolean; titrePage: string }

function FenetreModeles({ fermer }: { fermer: () => void }) {
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const [modeles, setModeles] = React.useState<Modele[] | null>(null);
  const [choix, setChoix] = React.useState('vide');
  const [titre, setTitre] = React.useState('');
  const [envoi, setEnvoi] = React.useState(false);

  React.useEffect(() => {
    getFetchClient()
      .get<{ modeles: Modele[] }>('/espace/modeles')
      .then(({ data }) => setModeles(data.modeles))
      .catch((e) => {
        toggleNotification({ type: 'danger', message: messageErreur(e, 'Les modèles n’ont pas pu être chargés.') });
        fermer();
      });
  }, []);

  const modele = modeles?.find((m) => m.cle === choix);

  // Groupe de boutons radio : les flèches passent d'un modèle à l'autre (une seule tabulation pour tout le groupe).
  const deplacer = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!modeles?.length) return;
    const sens = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!sens) return;
    e.preventDefault();
    const i = (modeles.findIndex((m) => m.cle === choix) + sens + modeles.length) % modeles.length;
    setChoix(modeles[i].cle);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-cle="${modeles[i].cle}"]`)?.focus();
  };

  const creer = async () => {
    if (!modele) return;
    setEnvoi(true);
    try {
      const { data } = await getFetchClient().post<{ documentId: string }>('/espace/modeles/creer', { modele: choix, titre: titre.trim() || modele.titrePage });
      fermer();
      navigate(fiche(PAGE, data.documentId));
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: messageErreur(e, 'La page n’a pas pu être créée.') });
      setEnvoi(false);
    }
  };

  return (
    <Modal.Content style={{ width: 'min(92vw, 96rem)' }}>
      <Modal.Header>
        <Modal.Title>Nouvelle page à partir d’un modèle</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!modeles ? (
          <Flex justifyContent="center" padding={8}><Loader small>Chargement des modèles</Loader></Flex>
        ) : (
          <Flex direction="column" alignItems="stretch" gap={5}>
            <Typography variant="omega" textColor="neutral700">
              Choisissez un point de départ : vous n’aurez plus qu’à remplacer les textes entre crochets.
            </Typography>
            <div role="radiogroup" aria-label="Modèle de page" onKeyDown={deplacer}>
              <Grid.Root gap={3}>
                {modeles.map((m) => (
                  <Grid.Item key={m.cle} col={4} s={12} direction="column" alignItems="stretch">
                    <CarteModele
                      type="button"
                      role="radio"
                      aria-checked={choix === m.cle}
                      tabIndex={m.cle === (modele ?? modeles[0]).cle ? 0 : -1}
                      data-cle={m.cle}
                      onClick={() => setChoix(m.cle)}
                    >
                      <Box
                        padding={4} hasRadius height="100%"
                        background={choix === m.cle ? 'primary100' : 'neutral0'}
                        borderColor={choix === m.cle ? 'primary600' : 'neutral200'}
                      >
                        <Flex direction="column" alignItems="flex-start" gap={2}>
                          <Typography variant="delta" tag="span">{m.titre}</Typography>
                          <Typography variant="pi" textColor="neutral700">{m.description}</Typography>
                          {m.blocs.length > 0 && <Typography variant="pi" textColor="neutral600">Contient : {m.blocs.join(' · ')}</Typography>}
                          {m.juridique && <Typography variant="pi" textColor="warning700">Contenu juridique : à faire relire.</Typography>}
                        </Flex>
                      </Box>
                    </CarteModele>
                  </Grid.Item>
                ))}
              </Grid.Root>
            </div>
            <Field.Root name="titre" hint="Vous pourrez le modifier ensuite. La page reste un brouillon jusqu'à « Enregistrer et publier ».">
              <Field.Label>Titre de la page</Field.Label>
              <TextInput value={titre} placeholder={modele?.titrePage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitre(e.target.value)} />
              <Field.Hint />
            </Field.Root>
          </Flex>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>
          <Button variant="tertiary">Annuler</Button>
        </Modal.Close>
        <Button onClick={creer} loading={envoi} disabled={!modele}>Créer la page</Button>
      </Modal.Footer>
    </Modal.Content>
  );
}

/** Bouton seul, pour l'écran « Mes pages » (masqué sans le droit de créer une page). */
export function BoutonModeleSeul() {
  const { allowedActions } = useRBAC(PERMISSIONS);
  const [ouvert, setOuvert] = React.useState(false);

  if (!allowedActions.canCreate) return null;

  return (
    <Modal.Root open={ouvert} onOpenChange={setOuvert}>
      <Modal.Trigger>
        <Button variant="secondary" startIcon={<Layout />}>À partir d’un modèle</Button>
      </Modal.Trigger>
      {ouvert && <FenetreModeles fermer={() => setOuvert(false)} />}
    </Modal.Root>
  );
}

/** Version injectée dans le gestionnaire de contenu : seulement sur sa liste des pages. */
export function BoutonModele() {
  const { pathname } = useLocation();
  const surMesPages = /\/content-manager\/collection-types\/api::page\.page\/?$/.test(pathname);
  return surMesPages ? <BoutonModeleSeul /> : null;
}
