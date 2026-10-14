// Écran « Mes pages » : la page d'accueil et la page des offres (contenus uniques) en tête, puis toutes les pages.
// La liste du gestionnaire de contenu ne montre que les pages ordinaires : on y accède encore par « Liste détaillée ».
import * as React from 'react';
import {
  Badge, Box, Button, EmptyStateLayout, Flex, IconButton, Table, Tbody, Td, TextInput, Th, Thead, Tr, Typography,
} from '@strapi/design-system';
import { Briefcase, Eye, House, Pencil, Plus, Search } from '@strapi/icons';
import { Layouts, Page } from '@strapi/strapi/admin';
import { Link, useNavigate } from 'react-router-dom';
import { BoutonModeleSeul } from '../BoutonModele';
import { StylesEspace, creation, formatDate, ilYA, liste, pluriel, useDonnees } from '../outils';

type Etat = 'publie' | 'modifie' | 'brouillon' | 'programme';

interface Ligne {
  cle: string;
  titre: string;
  sousTitre?: string | null;
  adresse: string | null;
  etat: Etat;
  publierLe?: string | null;
  modifieLe: string | null;
  url: string | null;
  lien: string;
  principale: boolean;
}

interface Donnees {
  principales: { uid: string; titre: string; sousTitre: string | null; etat: Etat; modifieLe: string | null; adresse: string; url: string | null; lien: string }[];
  pages: { documentId: string; titre: string; adresse: string | null; etat: Etat; publierLe: string | null; modifieLe: string | null; url: string | null; lien: string }[];
  peutCreer: boolean;
  peutListerPages: boolean;
}

function PastilleEtat({ etat, publierLe }: { etat: Etat; publierLe?: string | null }) {
  if (etat === 'publie') return <Badge backgroundColor="success100" textColor="success700">En ligne</Badge>;
  if (etat === 'modifie') return <Badge backgroundColor="warning100" textColor="warning700">Modifications non publiées</Badge>;
  if (etat === 'programme' && publierLe) {
    return <Badge backgroundColor="secondary100" textColor="secondary700">Publication le {formatDate(publierLe, { day: 'numeric', month: 'short' })}</Badge>;
  }
  return <Badge>Brouillon</Badge>;
}

/** Ignore accents et majuscules : « evenements » trouve « Événements ». */
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function MesPages() {
  const { donnees, chargement, erreur } = useDonnees<Donnees>('/espace/pages');
  const navigate = useNavigate();
  const [recherche, setRecherche] = React.useState('');

  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) return <Page.Error />;

  const lignes: Ligne[] = [
    ...donnees.principales.map((p) => ({ ...p, cle: p.uid, principale: true })),
    ...donnees.pages.map((p) => ({ ...p, cle: p.documentId, principale: false })),
  ];
  const terme = normaliser(recherche.trim());
  const affichees = terme
    ? lignes.filter((l) => normaliser(`${l.titre} ${l.sousTitre ?? ''} ${l.adresse ?? ''}`).includes(terme))
    : lignes;
  const enLigne = lignes.filter((l) => l.etat === 'publie' || l.etat === 'modifie').length;

  return (
    <Page.Main>
      <Page.Title>Mes pages</Page.Title>
      <StylesEspace />
      <Layouts.Header
        title="Mes pages"
        subtitle={`${pluriel(lignes.length, 'page')}, ${enLigne === lignes.length ? (lignes.length > 1 ? 'toutes en ligne' : 'en ligne') : `dont ${enLigne} en ligne`}.${donnees.principales.length ? " La page d'accueil et la page des offres sont toujours en tête de liste." : ''}`}
        primaryAction={
          donnees.peutCreer ? (
            <Button startIcon={<Plus />} onClick={() => navigate(creation('api::page.page'))}>
              Créer une page
            </Button>
          ) : undefined
        }
        secondaryAction={<BoutonModeleSeul />}
      />
      <Layouts.Content>
        <Box hasRadius background="neutral0" shadow="tableShadow">
          <Flex padding={4} gap={4} justifyContent="space-between" wrap="wrap">
            <Box width="100%" maxWidth="36rem">
              <TextInput
                aria-label="Rechercher une page"
                placeholder="Rechercher par titre ou adresse"
                startAction={<Search />}
                value={recherche}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecherche(e.target.value)}
              />
            </Box>
            {donnees.peutListerPages && (
              <Link to={liste('api::page.page')}>
                <Typography variant="pi" textColor="primary600">Liste détaillée (filtres, actions groupées)</Typography>
              </Link>
            )}
          </Flex>

          {affichees.length === 0 ? (
            <Box padding={6}>
              <EmptyStateLayout
                content={terme ? `Aucune page ne correspond à « ${recherche.trim()} ».` : 'Aucune page pour le moment.'}
                action={
                  terme ? (
                    <Button variant="secondary" onClick={() => setRecherche('')}>Effacer la recherche</Button>
                  ) : undefined
                }
              />
            </Box>
          ) : (
            <Table colCount={5} rowCount={affichees.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Page</Typography></Th>
                  <Th><Typography variant="sigma">Adresse</Typography></Th>
                  <Th><Typography variant="sigma">État</Typography></Th>
                  <Th><Typography variant="sigma">Modifiée</Typography></Th>
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {affichees.map((l) => (
                  <Tr key={l.cle} onClick={() => navigate(l.lien)} style={{ cursor: 'pointer' }}>
                    <Td>
                      <Flex gap={2} alignItems="center">
                        {l.principale && (l.cle === 'api::accueil.accueil' ? <House aria-hidden fill="primary600" /> : <Briefcase aria-hidden fill="primary600" />)}
                        <Flex direction="column" alignItems="flex-start">
                          <Link to={l.lien} onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>
                            <Typography fontWeight="bold" textColor="neutral800">{l.titre}</Typography>
                          </Link>
                          {l.principale && (
                            <Typography variant="pi" textColor="neutral600">
                              {l.sousTitre ? `« ${l.sousTitre} » · ` : ''}Page principale du site
                            </Typography>
                          )}
                        </Flex>
                      </Flex>
                    </Td>
                    <Td><Typography textColor="neutral600">{l.adresse ?? '-'}</Typography></Td>
                    <Td><PastilleEtat etat={l.etat} publierLe={l.publierLe} /></Td>
                    <Td>
                      <Typography textColor="neutral600" title={l.modifieLe ? formatDate(l.modifieLe) : undefined}>{l.modifieLe ? ilYA(l.modifieLe) : '-'}</Typography>
                    </Td>
                    <Td onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <Flex gap={1}>
                        <IconButton tag={Link} to={l.lien} label={`Modifier « ${l.titre} »`} variant="ghost">
                          <Pencil />
                        </IconButton>
                        {l.url && (
                          // Un lien (et non un bouton) : il mène à une autre page, dans un nouvel onglet.
                          <IconButton
                            tag="a"
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            label={`Voir « ${l.titre} » sur le site (nouvel onglet)`}
                            variant="ghost"
                          >
                            <Eye />
                          </IconButton>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
}
