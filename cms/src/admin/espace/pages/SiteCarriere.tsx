// Page « Site carrière » : adresses du site Gestmax, configuration à transmettre à l'équipe Gestmax
// pour qu'il reprenne l'en-tête et le pied de page du site, et vérifications de bout en bout.
import * as React from 'react';
import {
  Alert, Badge, Box, Button, Field, Flex, Grid, LinkButton, Loader, TextInput, Typography,
} from '@strapi/design-system';
import { ArrowRight, Check, Earth, Eye, File, Mail, Briefcase } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Pastille, formatDate } from '../outils';

interface Donnees {
  nomSite: string;
  urlSite: string;
  urlHeaderFooter: string;
  jetonConfigure: boolean;
  siteLocal: boolean;
  ttlMinutes: number;
  configuration: string;
  gestmaxUrlFront: string;
  lienEspaceCandidat: string;
  lienEspaceRecruteur: string;
  lienCandidatureSpontanee: string;
}
type Liens = Pick<Donnees, 'gestmaxUrlFront' | 'lienEspaceCandidat' | 'lienEspaceRecruteur' | 'lienCandidatureSpontanee'>;
interface Verification { cle: string; libelle: string; statut: 'ok' | 'attention' | 'erreur'; detail: string }

const CHAMPS_LIENS: { cle: keyof Liens; libelle: string; aide: string }[] = [
  { cle: 'lienEspaceCandidat', libelle: 'Espace candidat', aide: 'Connexion, suivi des candidatures, alertes' },
  { cle: 'lienEspaceRecruteur', libelle: 'Espace recruteur', aide: 'Accès des entreprises' },
  { cle: 'lienCandidatureSpontanee', libelle: 'Candidature spontanée', aide: 'Dépôt de CV sans offre précise' },
];

const resoudre = (url: string, front: string) =>
  url.startsWith('gestmax:') ? `${front.replace(/\/+$/, '')}${url.slice(8).startsWith('/') ? '' : '/'}${url.slice(8)}` : url;

function Carte({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: React.ReactNode }) {
  return (
    <Box padding={6} hasRadius background="neutral0" shadow="tableShadow" height="100%">
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Box>
          <Typography variant="delta" tag="h2">{titre}</Typography>
          {sousTitre && <Typography variant="pi" textColor="neutral600" tag="p">{sousTitre}</Typography>}
        </Box>
        {children}
      </Flex>
    </Box>
  );
}

function Etape({ icone, couleur, titre, texte }: { icone: React.ReactNode; couleur: 'primary' | 'success' | 'warning'; titre: string; texte: string }) {
  return (
    <Flex gap={3} alignItems="flex-start" grow={1} basis="0">
      <Pastille couleur={couleur}>{icone}</Pastille>
      <Box>
        <Typography variant="omega" fontWeight="bold">{titre}</Typography>
        <Typography variant="pi" textColor="neutral600" tag="p">{texte}</Typography>
      </Box>
    </Flex>
  );
}

const BADGES = {
  ok: { libelle: 'OK', fond: 'success100', texte: 'success700' },
  attention: { libelle: 'À vérifier', fond: 'warning100', texte: 'warning700' },
  erreur: { libelle: 'Problème', fond: 'danger100', texte: 'danger700' },
} as const;

export default function SiteCarriere() {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [donnees, setDonnees] = React.useState<Donnees | null>(null);
  const [liens, setLiens] = React.useState<Liens | null>(null);
  const [enregistrement, setEnregistrement] = React.useState(false);
  const [verification, setVerification] = React.useState<{ date: string; resultats: Verification[] } | null>(null);
  const [verificationEnCours, setVerificationEnCours] = React.useState(false);

  const charger = React.useCallback(async () => {
    const { data } = await get<Donnees>('/espace/site-carriere');
    setDonnees(data);
    setLiens({
      gestmaxUrlFront: data.gestmaxUrlFront,
      lienEspaceCandidat: data.lienEspaceCandidat,
      lienEspaceRecruteur: data.lienEspaceRecruteur,
      lienCandidatureSpontanee: data.lienCandidatureSpontanee,
    });
  }, [get]);

  const verifier = React.useCallback(async () => {
    setVerificationEnCours(true);
    try {
      const { data } = await post<{ date: string; resultats: Verification[] }>('/espace/site-carriere/verifier', {});
      setVerification(data);
    } finally {
      setVerificationEnCours(false);
    }
  }, [post]);

  React.useEffect(() => {
    charger().then(verifier);
  }, [charger, verifier]);

  if (!donnees || !liens) return <Page.Loading />;

  const modifie = (Object.keys(liens) as (keyof Liens)[]).some((k) => (liens[k] ?? '') !== (donnees[k] ?? ''));

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      await put('/espace/site-carriere', liens);
      toggleNotification({ type: 'success', message: 'Adresses enregistrées : les liens du site seront mis à jour dans quelques instants.' });
      await charger();
      verifier();
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? "L'enregistrement a échoué." });
    } finally {
      setEnregistrement(false);
    }
  };

  const copier = async () => {
    await navigator.clipboard.writeText(donnees.configuration);
    toggleNotification({ type: 'success', message: 'Configuration copiée.' });
  };

  const courriel = `mailto:?subject=${encodeURIComponent(`Site carrière ${donnees.nomSite} : habillage avec l'en-tête du site`)}&body=${encodeURIComponent(
    [
      'Bonjour,',
      '',
      `Merci d'activer sur le site carrière ${liens.gestmaxUrlFront || '(adresse à préciser)'} la reprise de l'en-tête et du pied de page de ${donnees.urlSite}.`,
      '',
      'Configuration à ajouter dans gestmax.ini :',
      '',
      donnees.configuration,
      '',
      "Dans le thème du client, ajouter les marqueurs $strWpHead, $strWpHeader et $strWpFooter (voir le README du plugin HeaderFooterWp).",
      'Le lien « Aller au contenu » de l’en-tête vise l’identifiant #contenu : merci de le placer sur la zone principale des pages.',
      '',
      'Merci !',
    ].join('\n'),
  )}`;

  const front = liens.gestmaxUrlFront.replace(/\/+$/, '');

  return (
    <Page.Main>
      <Page.Title>Site carrière</Page.Title>
      <Layouts.Header
        title="Site carrière"
        subtitle="Les candidats postulent, créent leur compte et gèrent leurs alertes sur votre site carrière Gestmax, habillé automatiquement avec l'en-tête et le pied de page de votre site."
        primaryAction={
          <Button startIcon={<Check />} onClick={verifier} loading={verificationEnCours} variant="secondary">
            Lancer les vérifications
          </Button>
        }
        secondaryAction={
          front ? (
            <LinkButton variant="tertiary" startIcon={<Eye />} href={front} isExternal>
              Ouvrir le site carrière
            </LinkButton>
          ) : undefined
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          {/* Comment ça marche */}
          <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
            <Flex gap={6} alignItems="flex-start" wrap="wrap">
              <Etape couleur="primary" icone={<Earth />} titre="Votre site" texte="Offres, entreprises, actualités, événements. Le bouton « Postuler » mène au site carrière." />
              <ArrowRight />
              <Etape couleur="warning" icone={<Briefcase />} titre="Le site carrière Gestmax" texte="Formulaire de candidature, compte candidat, alertes, candidature spontanée. Les candidatures arrivent directement dans Gestmax." />
              <ArrowRight />
              <Etape couleur="success" icone={<File />} titre="Un seul en-tête, un seul pied de page" texte={`Vos menus et vos couleurs s'appliquent aussi au site carrière, ${donnees.ttlMinutes} minutes au plus après chaque modification.`} />
            </Flex>
          </Box>

          <Grid.Root gap={6}>
            {/* Adresses */}
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Carte titre="Adresses" sousTitre="Les liens « gestmax:/chemin » sont complétés automatiquement avec l'adresse du site carrière.">
                <Field.Root name="gestmaxUrlFront" hint="Ex. : https://emploi.ma-collectivite.fr" required>
                  <Field.Label>Adresse du site carrière Gestmax</Field.Label>
                  <TextInput
                    value={liens.gestmaxUrlFront}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiens({ ...liens, gestmaxUrlFront: e.target.value })}
                  />
                  <Field.Hint />
                </Field.Root>
                {CHAMPS_LIENS.map((c) => {
                  const url = liens[c.cle] ? resoudre(liens[c.cle], front) : '';
                  return (
                    <Field.Root key={c.cle} name={c.cle} hint={c.aide}>
                      <Field.Label>{`Lien « ${c.libelle} »`}</Field.Label>
                      <Flex gap={2}>
                        <Box grow={1}>
                          <TextInput
                            value={liens[c.cle]}
                            placeholder="gestmax:/chemin ou https://…"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLiens({ ...liens, [c.cle]: e.target.value })}
                          />
                        </Box>
                        {url && (
                          <LinkButton variant="tertiary" href={url} isExternal aria-label={`Tester le lien ${c.libelle}`}>
                            Tester
                          </LinkButton>
                        )}
                      </Flex>
                      <Field.Hint />
                    </Field.Root>
                  );
                })}
                <Flex justifyContent="flex-end">
                  <Button onClick={enregistrer} loading={enregistrement} disabled={!modifie} startIcon={<Check />}>
                    Enregistrer
                  </Button>
                </Flex>
              </Carte>
            </Grid.Item>

            {/* Configuration Gestmax */}
            <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
              <Carte titre="À transmettre à l'équipe Gestmax" sousTitre="Une seule fois, lors de la mise en place du site carrière.">
                {donnees.siteLocal && (
                  <Alert variant="warning" title="Site pas encore en ligne" closeLabel="Fermer">
                    {`L'adresse ${donnees.urlSite} n'est accessible que depuis ce poste : Gestmax pourra lire l'en-tête une fois le site publié sur son adresse définitive.`}
                  </Alert>
                )}
                {!donnees.jetonConfigure && (
                  <Alert variant="danger" title="Jeton manquant" closeLabel="Fermer">
                    Définissez HEADER_FOOTER_TOKEN dans la configuration du serveur.
                  </Alert>
                )}
                <Box padding={4} hasRadius background="neutral100" style={{ overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre' }}>
                    {donnees.configuration}
                  </pre>
                </Box>
                <Flex gap={2} wrap="wrap">
                  <Button variant="secondary" onClick={copier}>Copier la configuration</Button>
                  <LinkButton variant="tertiary" startIcon={<Mail />} href={courriel}>Préparer un e-mail</LinkButton>
                  <LinkButton variant="tertiary" startIcon={<Eye />} href={donnees.urlHeaderFooter} isExternal>
                    Voir l'en-tête et le pied de page
                  </LinkButton>
                </Flex>
                <Typography variant="pi" textColor="neutral600">
                  L'adresse contient un jeton secret : ne la publiez pas. Côté Gestmax, le thème du client doit afficher
                  les éléments importés (marqueurs $strWpHead, $strWpHeader et $strWpFooter du plugin HeaderFooterWp).
                </Typography>
              </Carte>
            </Grid.Item>
          </Grid.Root>

          {/* Vérifications */}
          <Carte
            titre="Vérifications"
            sousTitre={verification ? `Dernière vérification le ${formatDate(verification.date, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : undefined}
          >
            {!verification ? (
              <Loader small>Vérification en cours…</Loader>
            ) : (
              <Flex direction="column" alignItems="stretch" gap={0}>
                {verification.resultats.map((v, i) => (
                  <Flex
                    key={v.cle}
                    gap={4}
                    paddingTop={3}
                    paddingBottom={3}
                    alignItems="flex-start"
                    style={i ? { borderTop: '1px solid #eaeaef' } : undefined}
                  >
                    <Box width="9rem" shrink={0}>
                      <Badge backgroundColor={BADGES[v.statut].fond} textColor={BADGES[v.statut].texte}>
                        {BADGES[v.statut].libelle}
                      </Badge>
                    </Box>
                    <Box>
                      <Typography variant="omega" fontWeight="bold">{v.libelle}</Typography>
                      <Typography variant="pi" textColor="neutral600" tag="p" style={{ wordBreak: 'break-word' }}>{v.detail}</Typography>
                    </Box>
                  </Flex>
                ))}
              </Flex>
            )}
          </Carte>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
