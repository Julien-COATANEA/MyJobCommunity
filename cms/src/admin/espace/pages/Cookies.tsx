// Page « Cookies et suivi » : bandeau de consentement aux cookies, Google Tag Manager / Analytics et scripts
// personnalisés (mesure d'audience, chat…) ajoutés à toutes les pages du site public.
import * as React from 'react';
import {
  Alert, Box, Button, Checkbox, Field, Flex, Grid, IconButton, SingleSelect, SingleSelectOption, Textarea, TextInput, Toggle, Typography,
} from '@strapi/design-system';
import { Plus, Trash } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { messageErreur } from '../outils';

interface Script { nom: string; code: string; emplacement: 'head' | 'body'; actif: boolean; consentement: boolean }
interface Reglages {
  bandeauCookies: boolean;
  texteBandeauCookies: string;
  lienPolitiqueCookies: string;
  googleTagManagerId: string;
  googleAnalyticsId: string;
  scripts: Script[];
}

// Même texte par défaut que le site (site/src/lib/suivi.ts).
const TEXTE_PAR_DEFAUT =
  'Nous utilisons des cookies pour mesurer la fréquentation du site et améliorer nos services. Vous pouvez les accepter ou les refuser : votre choix est conservé 6 mois.';
const NOUVEAU: Script = { nom: '', code: '', emplacement: 'head', actif: true, consentement: true };

// Lien « En savoir plus » : adresse web complète ou chemin du site (« /… »), rien d'autre (javascript:, mailto:…).
const lienValide = (lien: string) => !lien.trim() || /^\/(?!\/)/.test(lien.trim()) || /^https?:\/\/[^\s/]+/i.test(lien.trim());

type Erreurs = { lien?: string; scripts: { nom?: string; code?: string }[] };

function verifier(r: Reglages): Erreurs | null {
  const erreurs: Erreurs = {
    lien: lienValide(r.lienPolitiqueCookies) ? undefined : 'Indiquez une adresse commençant par https:// ou un chemin du site commençant par « / ».',
    scripts: r.scripts.map((s) => ({
      nom: s.nom.trim() ? undefined : 'Donnez un nom à ce script.',
      code: s.code.trim() ? undefined : 'Collez le code du script, ou supprimez-le.',
    })),
  };
  return erreurs.lien || erreurs.scripts.some((e) => e.nom || e.code) ? erreurs : null;
}

function Carte({ titre, sousTitre, children }: { titre: string; sousTitre?: string; children: React.ReactNode }) {
  return (
    <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
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

export default function Cookies() {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [initial, setInitial] = React.useState<(Reglages & { modifiable: boolean }) | null>(null);
  const [r, setR] = React.useState<Reglages | null>(null);
  const [enregistrement, setEnregistrement] = React.useState(false);
  const [erreurChargement, setErreurChargement] = React.useState<string | null>(null);
  const [erreurs, setErreurs] = React.useState<Erreurs | null>(null);

  const charger = React.useCallback(async () => {
    const { data } = await get<Reglages & { modifiable: boolean }>('/espace/cookies');
    setInitial(data);
    const { modifiable, ...reglages } = data;
    setR(reglages);
  }, [get]);

  React.useEffect(() => {
    charger().catch((e) => setErreurChargement(messageErreur(e, 'Les réglages n’ont pas pu être chargés.')));
  }, [charger]);

  if (erreurChargement) return <Page.Error content={erreurChargement} />;
  if (!r || !initial) return <Page.Loading />;

  const lectureSeule = !initial.modifiable;
  const changer = <K extends keyof Reglages>(cle: K, valeur: Reglages[K]) => {
    const suivant = { ...r, [cle]: valeur };
    setR(suivant);
    // Une fois les erreurs affichées, elles disparaissent au fur et à mesure des corrections.
    if (erreurs) setErreurs(verifier(suivant));
  };
  const changerScript = (i: number, modif: Partial<Script>) => changer('scripts', r.scripts.map((s, j) => (j === i ? { ...s, ...modif } : s)));
  const { modifiable, ...reglagesInitiaux } = initial;
  const modifie = JSON.stringify(r) !== JSON.stringify(reglagesInitiaux);

  // Le site affiche le bandeau dès qu'un outil attend l'accord du visiteur (site/src/lib/suivi.ts).
  const bandeauAutomatique = !!(r.googleTagManagerId || r.googleAnalyticsId || r.scripts.some((s) => s.actif && s.consentement));

  const enregistrer = async () => {
    const aCorriger = verifier(r);
    setErreurs(aCorriger);
    if (aCorriger) {
      toggleNotification({ type: 'warning', message: 'Certains champs sont à compléter avant d’enregistrer.' });
      return;
    }
    setEnregistrement(true);
    try {
      await put('/espace/cookies', r);
      toggleNotification({ type: 'success', message: 'Enregistré : le site sera à jour dans quelques instants.' });
      await charger();
    } catch (e) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "L'enregistrement a échoué.") });
    } finally {
      setEnregistrement(false);
    }
  };

  return (
    <Page.Main>
      <Page.Title>Cookies et suivi</Page.Title>
      <Layouts.Header
        title="Cookies et suivi"
        subtitle="Bandeau de consentement et outils de mesure d'audience ajoutés à toutes les pages du site."
        primaryAction={
          lectureSeule ? undefined : (
            <Button onClick={enregistrer} loading={enregistrement} disabled={!modifie}>Enregistrer</Button>
          )
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          {lectureSeule && (
            <Alert variant="default" title="Consultation seule" closeLabel="Fermer">
              Ces réglages ajoutent du code à toutes les pages du site : votre rôle ne permet pas de les modifier (droits réglés dans « Mon équipe »).
            </Alert>
          )}

          <Carte titre="Bandeau de cookies" sousTitre="Le visiteur accepte ou refuse les cookies ; les outils soumis au consentement ne se lancent qu'après son accord.">
            <Field.Root
              name="bandeauCookies"
              hint={bandeauAutomatique
                ? 'Le bandeau est affiché : un outil de mesure ou un script attend l’accord des visiteurs.'
                : 'Aucun outil ne demande l’accord des visiteurs : le bandeau n’est affiché que si vous activez cette option.'}
            >
              <Field.Label>Toujours afficher le bandeau</Field.Label>
              <Toggle
                onLabel="Oui" offLabel="Non" checked={bandeauAutomatique || r.bandeauCookies} disabled={lectureSeule || bandeauAutomatique}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('bandeauCookies', e.target.checked)}
              />
              <Field.Hint />
            </Field.Root>
            <Field.Root name="texteBandeauCookies" hint="Laisser vide pour utiliser le texte proposé.">
              <Field.Label>Texte du bandeau</Field.Label>
              <Textarea
                value={r.texteBandeauCookies} placeholder={TEXTE_PAR_DEFAUT} maxLength={600} disabled={lectureSeule}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => changer('texteBandeauCookies', e.target.value)}
              />
              <Field.Hint />
            </Field.Root>
            <Field.Root name="lienPolitiqueCookies" hint="Page qui détaille les cookies utilisés, ex. : /donnees-personnelles" error={erreurs?.lien}>
              <Field.Label>Lien « En savoir plus »</Field.Label>
              <TextInput
                value={r.lienPolitiqueCookies} placeholder="/donnees-personnelles" disabled={lectureSeule}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('lienPolitiqueCookies', e.target.value)}
              />
              <Field.Hint />
              <Field.Error />
            </Field.Root>
          </Carte>

          <Carte titre="Google" sousTitre="Il suffit de coller l'identifiant : le code de Google est ajouté automatiquement et ne se lance qu'après l'accord du visiteur.">
            <Grid.Root gap={4}>
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Field.Root name="googleTagManagerId" hint="Format : GTM-ABC1234">
                  <Field.Label>Google Tag Manager</Field.Label>
                  <TextInput
                    value={r.googleTagManagerId} placeholder="GTM-…" disabled={lectureSeule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('googleTagManagerId', e.target.value.trim())}
                  />
                  <Field.Hint />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Field.Root name="googleAnalyticsId" hint="Format : G-ABC123XYZ. Inutile si Google Analytics est déjà configuré dans Tag Manager.">
                  <Field.Label>Google Analytics 4</Field.Label>
                  <TextInput
                    value={r.googleAnalyticsId} placeholder="G-…" disabled={lectureSeule}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('googleAnalyticsId', e.target.value.trim())}
                  />
                  <Field.Hint />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          </Carte>

          <Carte
            titre="Scripts personnalisés"
            sousTitre="Code fourni par un autre outil (Matomo, Hotjar, chat en ligne…), à coller tel quel, balises <script> comprises."
          >
            {r.scripts.length === 0 && <Typography variant="omega" textColor="neutral600">Aucun script.</Typography>}
            {r.scripts.map((s, i) => (
              <Box key={i} padding={4} hasRadius borderColor="neutral200" background={s.actif ? 'neutral0' : 'neutral100'}>
                <Flex direction="column" alignItems="stretch" gap={3}>
                  <Grid.Root gap={4}>
                    <Grid.Item col={5} s={12} direction="column" alignItems="stretch">
                      <Field.Root name={`nom-${i}`} required error={erreurs?.scripts[i]?.nom}>
                        <Field.Label>Nom</Field.Label>
                        <TextInput
                          value={s.nom} placeholder="Ex. : Matomo" maxLength={80} disabled={lectureSeule}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => changerScript(i, { nom: e.target.value })}
                        />
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={4} s={12} direction="column" alignItems="stretch">
                      <Field.Root name={`emplacement-${i}`}>
                        <Field.Label>Emplacement</Field.Label>
                        <SingleSelect value={s.emplacement} disabled={lectureSeule} onChange={(v: string | number) => changerScript(i, { emplacement: v === 'body' ? 'body' : 'head' })}>
                          <SingleSelectOption value="head">En haut de page (head)</SingleSelectOption>
                          <SingleSelectOption value="body">En bas de page (body)</SingleSelectOption>
                        </SingleSelect>
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={3} s={12} direction="column" alignItems="stretch">
                      <Field.Root name={`actif-${i}`}>
                        <Field.Label>Actif</Field.Label>
                        <Toggle
                          onLabel="Oui" offLabel="Non" checked={s.actif} disabled={lectureSeule}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => changerScript(i, { actif: e.target.checked })}
                        />
                      </Field.Root>
                    </Grid.Item>
                  </Grid.Root>
                  <Field.Root name={`code-${i}`} required error={erreurs?.scripts[i]?.code}>
                    <Field.Label>Code</Field.Label>
                    <Textarea
                      value={s.code} placeholder={'<script>…</script>'} disabled={lectureSeule}
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '1.2rem', minHeight: '12rem' }}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => changerScript(i, { code: e.target.value })}
                    />
                    <Field.Error />
                  </Field.Root>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Checkbox checked={s.consentement} disabled={lectureSeule} onCheckedChange={(v: boolean) => changerScript(i, { consentement: !!v })}>
                      Attendre l'accord du visiteur (cookies, mesure d'audience)
                    </Checkbox>
                    {!lectureSeule && (
                      <IconButton label="Supprimer ce script" variant="ghost" onClick={() => changer('scripts', r.scripts.filter((_, j) => j !== i))}>
                        <Trash />
                      </IconButton>
                    )}
                  </Flex>
                </Flex>
              </Box>
            ))}
            {!lectureSeule && r.scripts.length < 10 && (
              <Box>
                <Button variant="secondary" startIcon={<Plus />} onClick={() => changer('scripts', [...r.scripts, { ...NOUVEAU }])}>
                  Ajouter un script
                </Button>
              </Box>
            )}
          </Carte>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
