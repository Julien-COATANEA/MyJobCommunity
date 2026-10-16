// Étape « Template » de l'écran Apparence : liste compacte des templates à gauche, grand aperçu du template sélectionné
// à droite (accueil, offres ou page), et comparaison côte à côte avec le template en ligne.
// La liste est un groupe de boutons radio : les flèches passent d'un template à l'autre et l'aperçu suit aussitôt.
import * as React from 'react';
import { Box, Button, Flex, Grid, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { styled } from 'styled-components';
import { GABARITS, optionsDe, trouverGabarit, type Gabarit, type Reglages } from '../../../utils/gabarits';
import { Apercu, type PageApercu } from './Apercu';
import { ChoixPage } from './ChoixPage';
import type { Logo, Theme } from './theme';

// Ligne cliquable : on neutralise l'apparence du bouton sans perdre l'anneau de focus clavier.
const Ligne = styled.button<{ $coche: boolean }>`
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  border: ${({ $coche }) => ($coche ? '2px solid var(--mjc-primaire, #4945ff)' : '1px solid #dcdce4')};
  background: ${({ $coche }) => ($coche ? 'color-mix(in srgb, var(--mjc-primaire, #4945ff) 7%, #fff)' : '#fff')};
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
  &:hover {
    border-color: var(--mjc-primaire, #4945ff);
  }
  &:focus-visible {
    outline: 2px solid var(--mjc-primaire, #4945ff);
    outline-offset: 2px;
  }
`;

/** Libellé collé en haut d'une colonne de la comparaison. */
const EnTeteColonne = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'sticky', top: 0, zIndex: 1, padding: '6px 10px', background: '#f6f6f9', borderBottom: '1px solid #dcdce4' }}>
    <Typography variant="pi" fontWeight="bold" textColor="neutral700">{children}</Typography>
  </div>
);

interface Props {
  theme: Theme;
  logo: Logo | null;
  image: string | null;
  choix: string;
  /** Template actuellement en ligne. */
  enLigne: string;
  reglages: Reglages;
  choisir: (id: string) => void;
  /** Boutons d'action sous l'aperçu (essai réel, passage à l'étape « Personnaliser »). */
  actions: React.ReactNode;
}

export function ChoixGabarit({ theme, logo, image, choix, enLigne, reglages, choisir, actions }: Props) {
  const [page, setPage] = React.useState<PageApercu>('accueil');
  const [comparer, setComparer] = React.useState(false);
  const modele = trouverGabarit(choix);
  const actuel = trouverGabarit(enLigne);
  const comparaison = comparer && choix !== enLigne;

  const deplacer = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const sens = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!sens) return;
    e.preventDefault();
    const i = (GABARITS.findIndex((g) => g.id === choix) + sens + GABARITS.length) % GABARITS.length;
    choisir(GABARITS[i].id);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-gabarit="${GABARITS[i].id}"]`)?.focus();
  };

  const apercu = (g: Gabarit) => (
    <Apercu
      t={theme} logo={logo} image={image} gabarit={g.id} options={optionsDe(g.id, reglages)} page={page}
      libelle={`Aperçu du site avec le template ${g.nom}`}
    />
  );

  return (
    <Grid.Root gap={6}>
      {/* -------- Liste des templates -------- */}
      <Grid.Item col={4} m={5} s={12} direction="column" alignItems="stretch">
        <Flex direction="column" alignItems="stretch" gap={3}>
          <Flex direction="column" alignItems="stretch" gap={2} role="radiogroup" aria-label="Template du site" onKeyDown={deplacer}>
            {GABARITS.map((g) => {
              const coche = g.id === choix;
              return (
                <Ligne key={g.id} type="button" role="radio" aria-checked={coche} tabIndex={coche ? 0 : -1} data-gabarit={g.id} $coche={coche} onClick={() => choisir(g.id)}>
                  <span style={{ flex: 'none', width: 132, overflow: 'hidden', borderRadius: 4, border: '1px solid #eaeaef' }}>
                    <Apercu t={theme} logo={logo} image={image} gabarit={g.id} options={optionsDe(g.id, reglages)} vignette hauteur={330} />
                  </span>
                  <Flex direction="column" alignItems="flex-start" gap={1} style={{ minWidth: 0, flex: 1 }}>
                    <Flex gap={2} wrap="wrap">
                      <Typography variant="omega" fontWeight="bold">{g.nom}</Typography>
                      {g.id === enLigne && (
                        <Box paddingLeft={2} paddingRight={2} hasRadius background="success100">
                          <Typography variant="pi" fontWeight="bold" textColor="success700">En ligne</Typography>
                        </Box>
                      )}
                    </Flex>
                    <Typography variant="pi" textColor="neutral600">{g.points.join(' · ')}</Typography>
                  </Flex>
                  {coche && <Check fill="primary600" width="1.6rem" height="1.6rem" aria-hidden />}
                </Ligne>
              );
            })}
          </Flex>
          <Typography variant="pi" textColor="neutral600">
            Chaque template garde ses propres réglages : vous pouvez en essayer un autre et revenir, rien n’est perdu.
            Rien ne change sur votre site avant « Enregistrer ».
          </Typography>
        </Flex>
      </Grid.Item>

      {/* -------- Grand aperçu -------- */}
      <Grid.Item col={8} m={7} s={12} direction="column" alignItems="stretch">
        <Box position="sticky" top="2rem">
          <Flex direction="column" alignItems="stretch" gap={3}>
            <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
              <Typography variant="sigma" textColor="neutral600">{comparaison ? 'Comparaison' : `Aperçu : ${modele.nom}`}</Typography>
              <Flex gap={2} wrap="wrap">
                {choix !== enLigne && (
                  <Button size="S" variant={comparaison ? 'secondary' : 'tertiary'} aria-pressed={comparaison} onClick={() => setComparer(!comparer)}>
                    {comparaison ? 'Fermer la comparaison' : `Comparer avec « ${actuel.nom} »`}
                  </Button>
                )}
                <ChoixPage page={page} choisir={setPage} />
              </Flex>
            </Flex>
            <Box hasRadius shadow="tableShadow" overflow="hidden" background="neutral0">
              <div style={{ background: '#ececf1', padding: '8px 12px', display: 'flex', gap: 6 }} aria-hidden="true">
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c }} />)}
              </div>
              {/* Une seule zone de défilement : en comparaison, les deux colonnes défilent ensemble. */}
              <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                {comparaison ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#dcdce4' }}>
                    <div style={{ background: '#fff', minWidth: 0 }}>
                      <EnTeteColonne>En ligne : {actuel.nom}</EnTeteColonne>
                      {apercu(actuel)}
                    </div>
                    <div style={{ background: '#fff', minWidth: 0 }}>
                      <EnTeteColonne>Sélectionné : {modele.nom}</EnTeteColonne>
                      {apercu(modele)}
                    </div>
                  </div>
                ) : (
                  apercu(modele)
                )}
              </div>
            </Box>
            <Box padding={5} hasRadius background="neutral0" shadow="tableShadow">
              <Flex direction="column" alignItems="stretch" gap={3}>
                <Flex direction="column" alignItems="flex-start" gap={1}>
                  <Typography variant="delta" tag="h2">{modele.nom}</Typography>
                  <Typography variant="omega" textColor="neutral700">{modele.description}</Typography>
                  {modele.astuce && <Typography variant="pi" textColor="neutral600">Astuce : {modele.astuce}</Typography>}
                </Flex>
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
                  <Typography variant="pi" fontWeight="bold" textColor={choix === enLigne ? 'success700' : 'warning700'}>
                    {choix === enLigne ? `« ${modele.nom} » est le template de votre site.` : `« ${modele.nom} » remplacera « ${actuel.nom} » quand vous enregistrerez.`}
                  </Typography>
                  <Flex gap={2} wrap="wrap">{actions}</Flex>
                </Flex>
              </Flex>
            </Box>
          </Flex>
        </Box>
      </Grid.Item>
    </Grid.Root>
  );
}
