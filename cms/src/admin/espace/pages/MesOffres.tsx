// Page « Mes offres d'emploi » : suivi des offres importées de Gestmax.
import * as React from 'react';
import {
  Alert, Badge, Box, Button, Checkbox, Combobox, ComboboxOption, Flex, Grid, LinkButton, Table, Tbody, Td, Th, Thead, Tr, Typography,
} from '@strapi/design-system';
import { ArrowClockwise, Eye, Pencil } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { StylesEspace, fiche, formatDate, ilYA, pluriel, useDonnees } from '../outils';

interface Offre {
  documentId: string;
  titre: string;
  slug: string;
  typeContrat: string | null;
  lieu: string | null;
  nomEntreprise: string | null;
  dateActivation: string | null;
  urlDetailGestmax: string | null;
  aLaUne: boolean;
  masquee: boolean;
  entreprise: { documentId: string; nom: string } | null;
}

interface Donnees {
  total: number;
  masquees: number;
  alaUne: number;
  parContrat: { libelle: string; nombre: number }[];
  parEntreprise: { libelle: string; nombre: number }[];
  nonRattachees: number;
  entreprisesOffres: { nom: string; nombre: number; entreprise: { documentId: string; nom: string } | null }[];
  annuaire: { documentId: string; nom: string }[];
  dernieres: Offre[];
  synchro: { date: string | null; statut: string | null; erreur?: string; bilan?: { creees: number; modifiees: number; supprimees: number } };
  mock: boolean;
  frequence: string;
  urlFront: string | null;
  urlSite: string;
}

function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Box padding={5} hasRadius background="neutral0" shadow="tableShadow" height="100%">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" tag="h2">
          {titre}
        </Typography>
        {children}
      </Flex>
    </Box>
  );
}

function Barres({ lignes, total }: { lignes: { libelle: string; nombre: number }[]; total: number }) {
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      {lignes.map((l) => (
        <Flex key={l.libelle} direction="column" alignItems="stretch" gap={1}>
          <Flex justifyContent="space-between">
            <Typography variant="pi" textColor="neutral800">{l.libelle}</Typography>
            <Typography variant="pi" fontWeight="bold">{l.nombre}</Typography>
          </Flex>
          <Box background="neutral150" hasRadius height="0.6rem">
            <Box background="primary600" hasRadius height="100%" style={{ width: `${total ? (l.nombre / total) * 100 : 0}%` }} />
          </Box>
        </Flex>
      ))}
    </Flex>
  );
}

const frequenceLisible = (cron: string) => {
  const minutes = cron.match(/^\*\/(\d+) \* \* \* \*$/);
  return minutes ? `toutes les ${minutes[1]} minutes` : `selon la règle « ${cron} »`;
};

export default function MesOffres() {
  const { donnees, chargement, erreur, recharger } = useDonnees<Donnees>('/espace/offres');
  const { post, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [synchro, setSynchro] = React.useState(false);

  const synchroniser = async () => {
    setSynchro(true);
    try {
      const { data } = await post<{ creees?: number; modifiees?: number; supprimees?: number }>('/espace/offres/synchroniser', {});
      toggleNotification({
        type: 'success',
        message: `Synchronisation terminée : ${data.creees ?? 0} nouvelle(s), ${data.modifiees ?? 0} modifiée(s), ${data.supprimees ?? 0} retirée(s).`,
      });
      recharger();
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: `Synchronisation impossible : ${e?.response?.data?.message ?? e.message}` });
    } finally {
      setSynchro(false);
    }
  };

  const regler = async (o: Offre, reglage: { aLaUne?: boolean; masquee?: boolean }) => {
    try {
      await put(`/espace/offres/${o.documentId}`, reglage);
      toggleNotification({ type: 'success', message: 'Enregistré : le site sera à jour dans quelques secondes.' });
      recharger();
    } catch {
      toggleNotification({ type: 'danger', message: "Le réglage n'a pas pu être enregistré." });
    }
  };

  const coupler = async (nomEntreprise: string, entreprise: string | null) => {
    try {
      const { data } = await post<{ offres: number }>('/espace/offres/rattacher', { nomEntreprise, entreprise });
      toggleNotification({
        type: 'success',
        message: entreprise
          ? `${pluriel(data.offres, 'offre')} de « ${nomEntreprise} » ${data.offres > 1 ? 'sont' : 'est'} maintenant ${data.offres > 1 ? 'liées' : 'liée'} à la fiche. Les prochaines le seront aussi.`
          : `« ${nomEntreprise} » n’est plus lié à l’annuaire.`,
      });
      recharger();
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? "Le couplage n'a pas pu être enregistré." });
    }
  };

  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) return <Page.Error />;

  return (
    <Page.Main>
      <Page.Title>Mes offres d'emploi</Page.Title>
      <StylesEspace />
      <Layouts.Header
        title="Mes offres d'emploi"
        subtitle={`${pluriel(donnees.total, 'offre')} en ligne sur votre site${donnees.masquees ? ` (${donnees.masquees} masquée${donnees.masquees > 1 ? 's' : ''})` : ''}, importées automatiquement depuis Gestmax.`}
        primaryAction={
          <Button startIcon={<ArrowClockwise />} loading={synchro} onClick={synchroniser}>
            Synchroniser maintenant
          </Button>
        }
        secondaryAction={
          donnees.urlFront ? (
            <LinkButton variant="tertiary" href={donnees.urlFront} isExternal>
              Ouvrir Gestmax
            </LinkButton>
          ) : undefined
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Alert variant="default" title="Où modifier une offre ?" closeLabel="Fermer">
            Les offres se créent et se modifient dans Gestmax. Elles apparaissent sur votre site {frequenceLisible(donnees.frequence)},
            sans action de votre part. Ici, vous choisissez lesquelles mettre « à la une » ou masquer du site, et vous couplez
            leurs entreprises avec les fiches de l'annuaire.
          </Alert>

          {donnees.synchro.statut === 'erreur' && (
            <Alert variant="danger" title="La dernière synchronisation a échoué" closeLabel="Fermer">
              {donnees.synchro.erreur}. Les offres déjà importées restent en ligne.
            </Alert>
          )}

          <Grid.Root gap={4}>
            <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
              <Carte titre="Offres en ligne">
                <Typography variant="alpha" textColor="primary700">{donnees.total}</Typography>
                {donnees.mock && <Badge>Données de démonstration</Badge>}
              </Carte>
            </Grid.Item>
            <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
              <Carte titre="Dernière synchronisation">
                <Typography variant="beta">{ilYA(donnees.synchro.date)}</Typography>
                {donnees.synchro.bilan && (
                  <Typography variant="pi" textColor="neutral600">
                    {donnees.synchro.bilan.creees} nouvelle(s) · {donnees.synchro.bilan.modifiees} modifiée(s) · {donnees.synchro.bilan.supprimees} retirée(s)
                  </Typography>
                )}
              </Carte>
            </Grid.Item>
            <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
              <Carte titre="Rattachement à l'annuaire">
                <Typography variant="beta">{pluriel(donnees.total - donnees.nonRattachees, 'offre rattachée', 'offres rattachées')}</Typography>
                <Typography variant="pi" textColor="neutral600">
                  {donnees.nonRattachees > 0
                    ? `${pluriel(donnees.nonRattachees, 'offre')} sans fiche entreprise : couplez-les ci-dessous avec l'annuaire.`
                    : 'Toutes les offres sont liées à une fiche entreprise.'}
                </Typography>
              </Carte>
            </Grid.Item>

            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Carte titre="Par type de contrat">
                <Barres lignes={donnees.parContrat} total={donnees.total} />
              </Carte>
            </Grid.Item>
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Carte titre="Entreprises qui recrutent le plus">
                <Barres lignes={donnees.parEntreprise} total={donnees.total} />
              </Carte>
            </Grid.Item>
          </Grid.Root>

          {donnees.entreprisesOffres.length > 0 && (
            <Box hasRadius background="neutral0" shadow="tableShadow">
              <Box padding={5} paddingBottom={3}>
                <Typography variant="delta" tag="h2">Coupler les entreprises avec l'annuaire</Typography>
                <Typography variant="pi" textColor="neutral600" tag="p">
                  Choisissez la fiche de l'annuaire qui correspond à chaque entreprise des offres : ses offres apparaîtront sur sa fiche,
                  y compris les prochaines publiées dans Gestmax.
                </Typography>
              </Box>
              <Table colCount={3} rowCount={donnees.entreprisesOffres.length + 1}>
                <Thead>
                  <Tr>
                    <Th><Typography variant="sigma">Entreprise dans Gestmax</Typography></Th>
                    <Th><Typography variant="sigma">Offres</Typography></Th>
                    <Th><Typography variant="sigma">Fiche de l'annuaire</Typography></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {donnees.entreprisesOffres.map((e) => (
                    <Tr key={e.nom}>
                      <Td>
                        <Flex gap={2}>
                          <Typography fontWeight="bold" textColor="neutral800">{e.nom}</Typography>
                          {!e.entreprise && <Badge backgroundColor="warning100" textColor="warning700">Non couplée</Badge>}
                        </Flex>
                      </Td>
                      <Td><Typography>{e.nombre}</Typography></Td>
                      <Td>
                        <Box maxWidth="32rem">
                          <Combobox
                            aria-label={`Fiche de l'annuaire pour « ${e.nom} »`}
                            placeholder="Choisir une fiche…"
                            value={e.entreprise?.documentId ?? ''}
                            onChange={(v?: string) => { if (v && v !== e.entreprise?.documentId) coupler(e.nom, v); }}
                            onClear={e.entreprise ? () => coupler(e.nom, null) : undefined}
                            noOptionsMessage={() => 'Aucune fiche : créez-la dans l’annuaire'}
                          >
                            {donnees.annuaire.map((a) => <ComboboxOption key={a.documentId} value={a.documentId}>{a.nom}</ComboboxOption>)}
                          </Combobox>
                        </Box>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}

          <Box hasRadius background="neutral0" shadow="tableShadow">
            <Box padding={5} paddingBottom={3}>
              <Typography variant="delta" tag="h2">Offres importées</Typography>
            </Box>
            <Table colCount={6} rowCount={donnees.dernieres.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Offre</Typography></Th>
                  <Th><Typography variant="sigma">Entreprise</Typography></Th>
                  <Th><Typography variant="sigma">Contrat</Typography></Th>
                  <Th><Typography variant="sigma">À la une</Typography></Th>
                  <Th><Typography variant="sigma">Masquée</Typography></Th>
                  <Th><Typography variant="sigma">Voir</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {donnees.dernieres.map((o) => (
                  <Tr key={o.documentId}>
                    <Td>
                      <Flex direction="column" alignItems="flex-start">
                        <Typography fontWeight="bold" textColor="neutral800">{o.titre}</Typography>
                        <Typography variant="pi" textColor="neutral600">{[o.lieu, o.dateActivation ? `publiée le ${formatDate(o.dateActivation)}` : null].filter(Boolean).join(" · ")}</Typography>
                      </Flex>
                    </Td>
                    <Td>
                      {o.entreprise ? (
                        <Link to={fiche('api::entreprise.entreprise', o.entreprise.documentId)}>
                          <Typography textColor="primary600">{o.entreprise.nom}</Typography>
                        </Link>
                      ) : (
                        <Typography textColor="neutral600">{o.nomEntreprise ?? '-'}</Typography>
                      )}
                    </Td>
                    <Td>{o.typeContrat && <Badge>{o.typeContrat}</Badge>}</Td>
                    <Td>
                      <Checkbox aria-label={`Mettre « ${o.titre} » à la une`} checked={o.aLaUne} disabled={o.masquee} onCheckedChange={(v: boolean) => regler(o, { aLaUne: !!v })} />
                    </Td>
                    <Td>
                      <Checkbox aria-label={`Masquer « ${o.titre} » du site`} checked={o.masquee} onCheckedChange={(v: boolean) => regler(o, { masquee: !!v })} />
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        {donnees.urlSite && (
                          <LinkButton size="S" variant="tertiary" startIcon={<Eye />} href={`${donnees.urlSite}/offres/${o.slug}/`} isExternal>
                            Sur le site
                          </LinkButton>
                        )}
                        {o.urlDetailGestmax && (
                          <LinkButton size="S" variant="tertiary" startIcon={<Pencil />} href={o.urlDetailGestmax} isExternal>
                            Gestmax
                          </LinkButton>
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
