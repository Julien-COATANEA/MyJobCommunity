// Page « Mes offres d'emploi » : suivi des offres importées de Gestmax.
import * as React from 'react';
import {
  Alert, Badge, Box, Button, Checkbox, Combobox, ComboboxOption, Dialog, Field, Flex, Grid, LinkButton, SingleSelect, SingleSelectOption, Table, Tbody, Td, Th, Thead, Tr, Typography,
} from '@strapi/design-system';
import { ArrowClockwise, Eye, Pencil } from '@strapi/icons';
import { Layouts, Page, useAuth, useFetchClient, useNotification, useRBAC } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { StylesEspace, fiche, formatDate, ilYA, messageErreur, pluriel, useDonnees } from '../outils';
import { BarrePagination, ChampRecherche, useListe } from './ListePaginee';

const ENTREPRISE = 'api::entreprise.entreprise';
const PERMISSIONS_COUPLAGE = [{ action: 'plugin::content-manager.explorer.update', subject: ENTREPRISE }] as any;
// Capacité « Offres d'emploi » (réglée par rôle dans « Mon équipe ») : à la une, masquer, coupler, synchroniser.
const CAPACITE_OFFRES = 'api::espace.offres';
const NOM_INVALIDE = 'Ce nom contient un « ; » : il ne peut pas être couplé. Corrigez le nom de l’entreprise dans Gestmax.';

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

interface EntrepriseOffres {
  nom: string;
  nombre: number;
  entreprise: { documentId: string; nom: string } | null;
}

// Synthèse (section « synthese » de /espace/offres) : les listes paginées se chargent à part (voir ListePaginee).
interface Donnees {
  total: number;
  masquees: number;
  alaUne: number;
  parContrat: { libelle: string; nombre: number }[];
  parEntreprise: { libelle: string; nombre: number }[];
  nonRattachees: number;
  annuaire: { documentId: string; nom: string }[];
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
  const { donnees, chargement, erreur, recharger: rechargerSynthese } = useDonnees<Donnees>('/espace/offres?sections=synthese');
  // Offres importées : recherche, tri, pagination côté serveur.
  const [recherche, setRecherche] = React.useState('');
  const [tri, setTri] = React.useState('recentes');
  const [page, setPage] = React.useState(1);
  const [taille, setTaille] = React.useState(25);
  const offres = useListe<Offre>('offres', 'offres', { q: recherche, tri, page, pageSize: taille });
  // Entreprises des offres et couplage avec l'annuaire.
  const [rechercheEntreprise, setRechercheEntreprise] = React.useState('');
  const [seulementNonCouplees, setSeulementNonCouplees] = React.useState(false);
  const [pageEntreprises, setPageEntreprises] = React.useState(1);
  const [tailleEntreprises, setTailleEntreprises] = React.useState(25);
  const entreprises = useListe<EntrepriseOffres>('entreprises', 'entreprisesOffres', {
    qEntreprise: rechercheEntreprise, seulementNonCouplees, pageEntreprises, pageSizeEntreprises: tailleEntreprises,
  });
  const { post, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [synchro, setSynchro] = React.useState(false);
  const { allowedActions, isLoading: droitsEnCours } = useRBAC(PERMISSIONS_COUPLAGE);
  const permissions = useAuth('MesOffres', (s) => s.permissions);
  const peutGerer = !!permissions?.some((p) => p.action === CAPACITE_OFFRES);
  const peutCoupler = !droitsEnCours && allowedActions.canUpdate && peutGerer;
  // Choix en cours d'enregistrement, par nom d'entreprise Gestmax : la liste affiche toujours ce qui est réellement enregistré.
  const [couplages, setCouplages] = React.useState<Record<string, string | null>>({});
  const oublierCouplage = (nom: string) => setCouplages(({ [nom]: _, ...reste }) => reste);
  // Une page demandée au-delà de la dernière (liste devenue plus courte) est ramenée à celle que le serveur a servie.
  React.useEffect(() => {
    if (offres.donnees && offres.aJour && offres.donnees.page !== page) setPage(offres.donnees.page);
  }, [offres.donnees, offres.aJour, page]);
  React.useEffect(() => {
    if (entreprises.donnees && entreprises.aJour && entreprises.donnees.page !== pageEntreprises) setPageEntreprises(entreprises.donnees.page);
  }, [entreprises.donnees, entreprises.aJour, pageEntreprises]);
  // Annuaire : mêmes options pour toutes les lignes (évite de les recréer à chaque rendu).
  const optionsAnnuaire = React.useMemo(
    () => (donnees?.annuaire ?? []).map((a) => <ComboboxOption key={a.documentId} value={a.documentId}>{a.nom}</ComboboxOption>),
    [donnees?.annuaire],
  );
  const rechargerTout = () => Promise.all([rechargerSynthese(), offres.recharger(), entreprises.recharger()]);

  const synchroniser = async (forcer = false) => {
    setSynchro(true);
    try {
      const { data } = await post<{ creees?: number; modifiees?: number; supprimees?: number }>('/espace/offres/synchroniser', forcer ? { forcer: true } : {});
      toggleNotification({
        type: 'success',
        message: `Synchronisation terminée : ${data.creees ?? 0} nouvelle(s), ${data.modifiees ?? 0} modifiée(s), ${data.supprimees ?? 0} retirée(s).`,
      });
      rechargerTout();
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: `Synchronisation impossible : ${messageErreur(e, e?.response?.data?.message ?? e?.message)}` });
    } finally {
      setSynchro(false);
    }
  };

  const regler = async (o: Offre, reglage: { aLaUne?: boolean; masquee?: boolean }) => {
    try {
      await put(`/espace/offres/${o.documentId}`, reglage);
      toggleNotification({ type: 'success', message: 'Enregistré : le site sera à jour dans quelques secondes.' });
      // La ligne reste à sa place (et le focus avec elle) : on ne recharge que les compteurs.
      offres.modifier((l) => l.documentId === o.documentId, (l) => ({ ...l, ...reglage, ...(reglage.masquee ? { aLaUne: false } : {}) }));
      rechargerSynthese();
    } catch (e) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "Le réglage n'a pas pu être enregistré.") });
      offres.recharger();
    }
  };

  const coupler = async (nomEntreprise: string, entreprise: string | null) => {
    if (nomEntreprise.includes(';')) {
      toggleNotification({ type: 'danger', message: NOM_INVALIDE });
      return;
    }
    setCouplages((c) => ({ ...c, [nomEntreprise]: entreprise }));
    try {
      const { data } = await post<{ offres: number }>('/espace/offres/rattacher', { nomEntreprise, entreprise });
      toggleNotification({
        type: 'success',
        message: entreprise
          ? `${pluriel(data.offres, 'offre')} de « ${nomEntreprise} » ${data.offres > 1 ? 'sont' : 'est'} maintenant ${data.offres > 1 ? 'liées' : 'liée'} à la fiche. Les prochaines le seront aussi.`
          : `« ${nomEntreprise} » n’est plus lié à l’annuaire.`,
      });
      await rechargerTout();
    } catch (e) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "Le couplage n'a pas pu être enregistré.") });
      // Rien n'a été enregistré : on revient au couplage réel.
      await entreprises.recharger();
    } finally {
      oublierCouplage(nomEntreprise);
    }
  };

  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) return <Page.Error content={erreur} />;

  return (
    <Page.Main>
      <Page.Title>Mes offres d'emploi</Page.Title>
      <StylesEspace />
      <Layouts.Header
        title="Mes offres d'emploi"
        subtitle={`${pluriel(donnees.total, 'offre')} en ligne sur votre site${donnees.masquees ? ` (${donnees.masquees} masquée${donnees.masquees > 1 ? 's' : ''})` : ''}, importées automatiquement depuis Gestmax.`}
        primaryAction={
          <Button startIcon={<ArrowClockwise />} loading={synchro} disabled={!peutGerer} onClick={() => synchroniser()}>
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
              <Box paddingTop={3}>
                <Dialog.Root>
                  <Dialog.Trigger>
                    <Button variant="secondary" startIcon={<ArrowClockwise />} loading={synchro}>Forcer la synchronisation</Button>
                  </Dialog.Trigger>
                  <Dialog.Content>
                    <Dialog.Header>Forcer la synchronisation ?</Dialog.Header>
                    <Dialog.Body>
                      <Typography textAlign="center">
                        Le site reprendra exactement les offres actuellement publiées dans Gestmax : les offres absentes de Gestmax seront
                        supprimées du site. À faire seulement si cette baisse est normale (offres clôturées, fin de campagne…).
                      </Typography>
                    </Dialog.Body>
                    <Dialog.Footer>
                      <Dialog.Cancel>
                        <Button variant="tertiary" fullWidth>Annuler</Button>
                      </Dialog.Cancel>
                      <Dialog.Action>
                        <Button variant="danger-light" fullWidth disabled={!peutGerer} onClick={() => synchroniser(true)}>Forcer la synchronisation</Button>
                      </Dialog.Action>
                    </Dialog.Footer>
                  </Dialog.Content>
                </Dialog.Root>
              </Box>
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

          {(entreprises.chargement && !entreprises.donnees) || entreprises.erreur || entreprises.donnees?.total || rechercheEntreprise || seulementNonCouplees ? (
            <Box hasRadius background="neutral0" shadow="tableShadow">
              <Box padding={5} paddingBottom={3}>
                <Typography variant="delta" tag="h2">Coupler les entreprises avec l'annuaire</Typography>
                <Typography variant="pi" textColor="neutral600" tag="p">
                  {peutCoupler
                    ? "Choisissez la fiche de l'annuaire qui correspond à chaque entreprise des offres : ses offres apparaîtront sur sa fiche, y compris les prochaines publiées dans Gestmax."
                    : "Vous pouvez consulter les couplages ; votre rôle ne permet pas de les changer (droits réglés dans « Mon équipe »)."}
                </Typography>
              </Box>
              <Flex paddingLeft={5} paddingRight={5} paddingBottom={3} gap={4} wrap="wrap" alignItems="center">
                <ChampRecherche
                  libelle="Rechercher une entreprise des offres"
                  placeholder="Rechercher une entreprise"
                  valeur={rechercheEntreprise}
                  onChange={(v) => { setRechercheEntreprise(v); setPageEntreprises(1); }}
                />
                <Checkbox checked={seulementNonCouplees} onCheckedChange={(v: boolean) => { setSeulementNonCouplees(!!v); setPageEntreprises(1); }}>
                  Seulement les entreprises non couplées
                </Checkbox>
              </Flex>
              {entreprises.erreur && <Box paddingLeft={5} paddingBottom={3}><Typography textColor="danger600" role="alert">{entreprises.erreur}</Typography></Box>}
              <div aria-busy={entreprises.chargement} style={{ opacity: entreprises.chargement && entreprises.donnees ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                {entreprises.donnees && entreprises.donnees.liste.length === 0 ? (
                  <Box padding={5}>
                    <Typography textColor="neutral600">
                      {rechercheEntreprise || seulementNonCouplees ? 'Aucune entreprise ne correspond à ces critères.' : 'Aucune entreprise renseignée dans les offres.'}
                    </Typography>
                  </Box>
                ) : (
                  <Table colCount={3} rowCount={(entreprises.donnees?.liste.length ?? 0) + 1}>
                    <Thead>
                      <Tr>
                        <Th><Typography variant="sigma">Entreprise dans Gestmax</Typography></Th>
                        <Th><Typography variant="sigma">Offres</Typography></Th>
                        <Th><Typography variant="sigma">Fiche de l'annuaire</Typography></Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(entreprises.donnees?.liste ?? []).map((e) => (
                        <Tr key={e.nom}>
                          <Td>
                            <Flex gap={2}>
                              <Typography fontWeight="bold" textColor="neutral800">{e.nom}</Typography>
                              {!e.entreprise && <Badge backgroundColor="warning100" textColor="warning700">Non couplée</Badge>}
                            </Flex>
                          </Td>
                          <Td><Typography>{e.nombre}</Typography></Td>
                          <Td>
                            {!peutCoupler ? (
                              <Typography textColor={e.entreprise ? 'neutral800' : 'neutral600'}>{e.entreprise?.nom ?? '-'}</Typography>
                            ) : e.nom.includes(';') ? (
                              <Typography variant="pi" textColor="danger600">{NOM_INVALIDE}</Typography>
                            ) : (
                              <Box maxWidth="32rem">
                                <Combobox
                                  aria-label={`Fiche de l'annuaire pour « ${e.nom} »`}
                                  placeholder="Choisir une fiche…"
                                  value={(e.nom in couplages ? couplages[e.nom] : e.entreprise?.documentId) ?? ''}
                                  disabled={e.nom in couplages}
                                  onChange={(v?: string) => { if (v && v !== e.entreprise?.documentId) coupler(e.nom, v); }}
                                  onClear={e.entreprise ? () => coupler(e.nom, null) : undefined}
                                  noOptionsMessage={() => 'Aucune fiche : créez-la dans l’annuaire'}
                                >
                                  {optionsAnnuaire}
                                </Combobox>
                              </Box>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </div>
              {entreprises.donnees && (
                <BarrePagination
                  page={entreprises.donnees.page} pageCount={entreprises.donnees.pageCount} total={entreprises.donnees.total}
                  taille={tailleEntreprises} chargement={entreprises.chargement} nom="entreprise" noms="entreprises"
                  onPage={setPageEntreprises} onTaille={(t) => { setTailleEntreprises(t); setPageEntreprises(1); }}
                />
              )}
            </Box>
          ) : null}

          <Box hasRadius background="neutral0" shadow="tableShadow">
            <Box padding={5} paddingBottom={3}>
              <Typography variant="delta" tag="h2">Offres importées</Typography>
            </Box>
            <Flex paddingLeft={5} paddingRight={5} paddingBottom={3} gap={4} wrap="wrap" alignItems="flex-end">
              <ChampRecherche
                libelle="Rechercher une offre"
                placeholder="Rechercher par titre, entreprise ou lieu"
                valeur={recherche}
                onChange={(v) => { setRecherche(v); setPage(1); }}
              />
              <Field.Root name="tri-offres">
                <Field.Label>Trier par</Field.Label>
                <SingleSelect size="S" value={tri} onChange={(v: string | number) => { setTri(String(v)); setPage(1); }}>
                  <SingleSelectOption value="recentes">Récentes (à la une d'abord)</SingleSelectOption>
                  <SingleSelectOption value="anciennes">Plus anciennes</SingleSelectOption>
                  <SingleSelectOption value="titre">Titre (A à Z)</SingleSelectOption>
                </SingleSelect>
              </Field.Root>
            </Flex>
            {offres.erreur && <Box paddingLeft={5} paddingBottom={3}><Typography textColor="danger600" role="alert">{offres.erreur}</Typography></Box>}
            <div aria-busy={offres.chargement} style={{ opacity: offres.chargement && offres.donnees ? 0.5 : 1, transition: 'opacity 0.15s' }}>
            {offres.donnees && offres.donnees.liste.length === 0 ? (
              <Box padding={5}>
                <Typography textColor="neutral600">{recherche ? `Aucune offre ne correspond à « ${recherche} ».` : 'Aucune offre importée pour le moment.'}</Typography>
              </Box>
            ) : (
            <Table colCount={6} rowCount={(offres.donnees?.liste.length ?? 0) + 1}>
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
                {(offres.donnees?.liste ?? []).map((o) => (
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
                      <Checkbox aria-label={`Mettre « ${o.titre} » à la une`} checked={o.aLaUne} disabled={o.masquee || !peutGerer} onCheckedChange={(v: boolean) => regler(o, { aLaUne: !!v })} />
                    </Td>
                    <Td>
                      <Checkbox aria-label={`Masquer « ${o.titre} » du site`} checked={o.masquee} disabled={!peutGerer} onCheckedChange={(v: boolean) => regler(o, { masquee: !!v })} />
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
            )}
            </div>
            {offres.donnees && (
              <BarrePagination
                page={offres.donnees.page} pageCount={offres.donnees.pageCount} total={offres.donnees.total}
                taille={taille} chargement={offres.chargement} nom="offre" noms="offres"
                onPage={setPage} onTaille={(t) => { setTaille(t); setPage(1); }}
              />
            )}
          </Box>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
