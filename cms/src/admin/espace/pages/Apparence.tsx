// Page « Apparence de mon site », en deux étapes :
//  1. Template : allure générale du site (même contenu, autre habillage), vignettes aux couleurs du site ;
//  2. Personnaliser : disposition propre au template, identité, couleurs et polices, avec aperçu en direct et contrôle
//     d'accessibilité (RGAA) pendant la saisie.
// Rien n'est publié avant « Enregistrer ». Chaque template garde ses propres réglages (on peut en essayer un et revenir).
import * as React from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/source-sans-3';
import '@fontsource-variable/atkinson-hyperlegible-next';
import {
  Box, Button, Field, Flex, Grid, LinkButton, SingleSelect, SingleSelectOption, TextInput, Typography,
} from '@strapi/design-system';
import { ArrowLeft, ArrowRight, Check, Eye, Image as IconeImage, Sparkle, WarningCircle } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Link, useLocation } from 'react-router-dom';
import { verifierContrastes } from '../../../utils/contraste';
import {
  GABARIT_PAR_DEFAUT, IDS_GABARITS, normaliserReglages, optionsDe, trouverGabarit, type CleOption, type Reglages,
} from '../../../utils/gabarits';
import { Apercu, type PageApercu } from '../apparence/Apercu';
import { ChoixGabarit } from '../apparence/ChoixGabarit';
import { ChoixPage } from '../apparence/ChoixPage';
import { OptionsGabarit } from '../apparence/OptionsGabarit';
import { ARRONDIS, COULEURS, HEX, PALETTES, POLICES, type Logo, type Theme } from '../apparence/theme';
import { messageErreur, unique } from '../outils';

type Etape = 'template' | 'personnaliser';

const ETAPES: { cle: Etape; libelle: string }[] = [
  { cle: 'template', libelle: 'Template' },
  { cle: 'personnaliser', libelle: 'Personnaliser' },
];

/** Fil des étapes (1 Template — 2 Personnaliser), cliquable. */
function Etapes({ etape, aller }: { etape: Etape; aller: (e: Etape) => void }) {
  return (
    <nav aria-label="Étapes">
      <ol style={{ display: 'flex', alignItems: 'center', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
        {ETAPES.map((e, i) => {
          const active = e.cle === etape;
          return (
            <li key={e.cle} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {i > 0 && <span aria-hidden="true" style={{ width: 48, height: 1, background: '#c0c0cf' }} />}
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => aller(e.cle)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', border: 0, background: 'none', cursor: 'pointer', font: 'inherit' }}
              >
                <span
                  style={{
                    display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 99, fontSize: 13, fontWeight: 700,
                    background: active ? 'var(--mjc-primaire, #4945ff)' : '#fff', color: active ? '#fff' : '#666687',
                    border: active ? 0 : '1px solid #c0c0cf',
                  }}
                >
                  {i + 1}
                </span>
                <Typography variant="omega" fontWeight={active ? 'bold' : 'regular'} textColor={active ? 'neutral800' : 'neutral600'}>{e.libelle}</Typography>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const signature = (theme: Theme | null, logo: Logo | null, gabarit: string, reglages: Reglages) =>
  JSON.stringify({ theme, logo: logo?.id ?? null, gabarit, options: IDS_GABARITS.map((id) => optionsDe(id, reglages)) });

const libelleConseil = (c: { policeTitres: string; policeTexte: string; arrondis: string }) => {
  const titres = POLICES[c.policeTitres]?.nom ?? c.policeTitres;
  const texte = POLICES[c.policeTexte]?.nom ?? c.policeTexte;
  const polices = titres === texte ? `${titres} partout` : `${titres} pour les titres, ${texte} pour le texte`;
  return `${polices}, ${(ARRONDIS[c.arrondis]?.libelle ?? c.arrondis).toLowerCase()}`;
};

// ---------- Page ----------

export default function Apparence() {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { search } = useLocation();
  const [theme, setTheme] = React.useState<Theme | null>(null);
  const [logo, setLogo] = React.useState<Logo | null>(null);
  const [gabarit, setGabarit] = React.useState(GABARIT_PAR_DEFAUT);
  const [reglages, setReglages] = React.useState<Reglages>({});
  const [initial, setInitial] = React.useState('');
  const [enLigne, setEnLigne] = React.useState(GABARIT_PAR_DEFAUT);
  const [etape, setEtape] = React.useState<Etape>('personnaliser');
  const [pageApercu, setPageApercu] = React.useState<PageApercu>('accueil');
  const [urlSite, setUrlSite] = React.useState('');
  const [imageAccueil, setImageAccueil] = React.useState<string | null>(null);
  const [apercuAccueil, setApercuAccueil] = React.useState<string | null>(null);
  const [enregistrement, setEnregistrement] = React.useState(false);
  const [televersement, setTeleversement] = React.useState(false);
  const champFichier = React.useRef<HTMLInputElement>(null);
  const [erreurChargement, setErreurChargement] = React.useState<string | null>(null);

  React.useEffect(() => {
    get('/espace/apparence').then(({ data }: any) => {
      const t: Theme = {
        nomSite: data.nomSite ?? '', baseline: data.baseline ?? '', logoTexte: data.logoTexte ?? '',
        couleurPrimaire: data.couleurPrimaire, couleurSecondaire: data.couleurSecondaire, couleurAccent: data.couleurAccent,
        couleurTexte: data.couleurTexte, couleurFond: data.couleurFond,
        policeTitres: data.policeTitres, policeTexte: data.policeTexte, arrondis: data.arrondis,
      };
      const id = trouverGabarit(data.gabarit).id;
      const r = normaliserReglages(data.reglagesGabarits);
      setTheme(t);
      setLogo(data.logo ?? null);
      setGabarit(id);
      setEnLigne(id);
      setReglages(r);
      setInitial(signature(t, data.logo ?? null, id, r));
      setUrlSite(data.urlSite ?? '');
      setImageAccueil(data.imageAccueil ?? null);
      setApercuAccueil(data.apercuAccueil ?? null);
      // Aucun template encore choisi (ou lien « ?etape=template ») : on commence par le choix du template.
      setEtape(!data.gabarit || new URLSearchParams(search).get('etape') === 'template' ? 'template' : 'personnaliser');
    }).catch((e: unknown) => setErreurChargement(messageErreur(e, 'Les réglages n’ont pas pu être chargés.')));
  }, [get]);

  if (erreurChargement) return <Page.Error content={erreurChargement} />;
  if (!theme) return <Page.Loading />;

  const changer = (cle: keyof Theme, valeur: string) => setTheme({ ...theme, [cle]: valeur });
  const modele = trouverGabarit(gabarit);
  const options = optionsDe(gabarit, reglages);
  const changerOption = (cle: CleOption, valeur: string) =>
    setReglages((r) => ({ ...r, [gabarit]: { ...optionsDe(gabarit, r), [cle]: valeur } }));
  const reglagesModifies = (Object.keys(options) as CleOption[]).some((c) => options[c] !== modele.defauts[c]);
  const reinitialiser = () => setReglages(({ [gabarit]: _retire, ...reste }) => reste);
  const conseilApplique = (Object.keys(modele.conseil) as (keyof typeof modele.conseil)[]).every((c) => theme[c] === modele.conseil[c]);

  const erreurs = verifierContrastes(theme);
  const modifie = signature(theme, logo, gabarit, reglages) !== initial;
  const couleursValides = COULEURS.every((c) => HEX.test(theme[c.cle]));
  // Essai sur la vraie page d'accueil (page d'aperçu du site) : contenus et couleurs enregistrés, template et disposition choisis ici.
  const lienEssai = apercuAccueil
    ? `${apercuAccueil}&${new URLSearchParams({ gabarit, reglages: JSON.stringify(options) })}`
    : null;

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      await put('/espace/apparence', { ...theme, logo: logo?.id ?? null, gabarit, reglagesGabarits: normaliserReglages(reglages) });
      setInitial(signature(theme, logo, gabarit, reglages));
      setEnLigne(gabarit);
      toggleNotification({ type: 'success', message: 'Apparence enregistrée : votre site sera mis à jour dans quelques instants.' });
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "L'enregistrement a échoué.") });
    } finally {
      setEnregistrement(false);
    }
  };

  const televerserLogo = async (fichier: File) => {
    setTeleversement(true);
    try {
      const formulaire = new FormData();
      formulaire.append('files', fichier);
      formulaire.append('fileInfo', JSON.stringify({ name: fichier.name, alternativeText: '' }));
      const { data } = await post<Logo[]>('/upload', formulaire);
      setLogo(data[0]);
    } catch {
      toggleNotification({ type: 'danger', message: 'Le logo n’a pas pu être envoyé (format SVG, PNG, JPG ou WebP).' });
    } finally {
      setTeleversement(false);
    }
  };

  const allerA = (e: Etape) => {
    setEtape(e);
    window.scrollTo({ top: 0 });
  };

  const boutonEssai = lienEssai && (
    <LinkButton variant="tertiary" size="S" startIcon={<Eye />} href={lienEssai} isExternal>
      Essayer sur ma page d’accueil
    </LinkButton>
  );

  return (
    <Page.Main>
      <Page.Title>Apparence de mon site</Page.Title>
      <Layouts.Header
        title="Apparence de mon site"
        subtitle="Template, logo, couleurs et polices : tout est visible en direct dans l'aperçu, puis sur le site après enregistrement."
        primaryAction={
          <Button startIcon={<Check />} onClick={enregistrer} loading={enregistrement} disabled={!modifie || erreurs.length > 0 || !couleursValides}>
            Enregistrer
          </Button>
        }
        secondaryAction={
          urlSite ? (
            <LinkButton variant="tertiary" startIcon={<Eye />} href={urlSite} isExternal>
              Voir mon site
            </LinkButton>
          ) : undefined
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
            <Etapes etape={etape} aller={allerA} />
            {modifie && <Typography variant="pi" fontWeight="bold" textColor="warning700">Modifications non enregistrées</Typography>}
          </Flex>

          {etape === 'template' ? (
            <Flex direction="column" alignItems="stretch" gap={5}>
              <Typography variant="omega" textColor="neutral700">
                Choisissez l’allure générale de votre site. Vos contenus (pages, actualités, événements, offres, blocs) ne changent pas :
                seul leur habillage change. Les aperçus reprennent déjà vos couleurs, votre logo et votre photo d’accueil.
              </Typography>
              <ChoixGabarit
                theme={theme} logo={logo} image={imageAccueil} choix={gabarit} enLigne={enLigne} reglages={reglages} choisir={setGabarit}
                actions={
                  <>
                    {boutonEssai}
                    <Button endIcon={<ArrowRight />} onClick={() => allerA('personnaliser')}>Personnaliser « {modele.nom} »</Button>
                  </>
                }
              />
            </Flex>
          ) : (
            <Grid.Root gap={6}>
              {/* -------- Formulaire -------- */}
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
                    <Flex direction="column" alignItems="stretch" gap={3}>
                      <Flex justifyContent="space-between" alignItems="flex-start" gap={3}>
                        <Flex direction="column" alignItems="flex-start" gap={1}>
                          <Typography variant="sigma" textColor="neutral600">Template</Typography>
                          <Typography variant="delta" tag="h2">{modele.nom}</Typography>
                        </Flex>
                        <Button variant="tertiary" size="S" startIcon={<ArrowLeft />} onClick={() => allerA('template')}>Changer de template</Button>
                      </Flex>
                      <Typography variant="pi" textColor="neutral700">{modele.description}</Typography>
                      {modele.astuce && <Typography variant="pi" textColor="neutral600">Astuce : {modele.astuce}</Typography>}
                      <Box padding={3} hasRadius background="primary100">
                        <Flex justifyContent="space-between" alignItems="center" gap={3} wrap="wrap">
                          <Flex direction="column" alignItems="flex-start" gap={1} style={{ flex: '1 1 18rem' }}>
                            <Typography variant="pi" fontWeight="bold">Style conseillé pour ce template</Typography>
                            <Typography variant="pi" textColor="neutral700">{libelleConseil(modele.conseil)}.</Typography>
                          </Flex>
                          <Button size="S" variant="secondary" startIcon={<Sparkle />} disabled={conseilApplique} onClick={() => setTheme({ ...theme, ...modele.conseil })}>
                            {conseilApplique ? 'Déjà appliqué' : 'Appliquer'}
                          </Button>
                        </Flex>
                      </Box>
                    </Flex>
                  </Box>

                  <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Flex justifyContent="space-between" alignItems="center" gap={3}>
                        <Typography variant="delta" tag="h2">Disposition</Typography>
                        {reglagesModifies && (
                          <Button variant="tertiary" size="S" onClick={reinitialiser}>Revenir aux réglages du template</Button>
                        )}
                      </Flex>
                      <OptionsGabarit options={options} defauts={modele.defauts} changer={changerOption} />
                    </Flex>
                  </Box>

                  <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" tag="h2">Identité</Typography>
                      <Field.Root name="nomSite" required>
                        <Field.Label>Nom du site</Field.Label>
                        <TextInput value={theme.nomSite} onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('nomSite', e.target.value)} />
                      </Field.Root>
                      <Field.Root name="baseline" hint="Affiché sous le nom du site, dans l'en-tête.">
                        <Field.Label>Slogan</Field.Label>
                        <TextInput value={theme.baseline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('baseline', e.target.value)} />
                        <Field.Hint />
                      </Field.Root>
                      <Flex gap={4} alignItems="center">
                        <Flex justifyContent="center" alignItems="center" width="8rem" height="8rem" hasRadius background="neutral100" shrink={0}>
                          {logo ? <img src={logo.url} alt="Logo actuel" style={{ maxWidth: '7rem', maxHeight: '7rem' }} /> : <IconeImage width="3.2rem" height="3.2rem" />}
                        </Flex>
                        <Flex direction="column" alignItems="flex-start" gap={2}>
                          <Typography variant="omega" fontWeight="bold">Logo</Typography>
                          <Typography variant="pi" textColor="neutral600">SVG ou PNG transparent de préférence.</Typography>
                          <Flex gap={2}>
                            <Button size="S" variant="secondary" loading={televersement} onClick={() => champFichier.current?.click()}>
                              {logo ? 'Remplacer' : 'Déposer un logo'}
                            </Button>
                            {logo && (
                              <Button size="S" variant="tertiary" onClick={() => setLogo(null)}>
                                Retirer
                              </Button>
                            )}
                          </Flex>
                          <input
                            ref={champFichier}
                            type="file"
                            accept="image/svg+xml,image/png,image/jpeg,image/webp"
                            hidden
                            onChange={(e) => e.target.files?.[0] && televerserLogo(e.target.files[0])}
                          />
                        </Flex>
                      </Flex>
                      {!logo && (
                        <Field.Root name="logoTexte" hint="Affichées dans une pastille tant qu'aucun logo n'est déposé.">
                          <Field.Label>Initiales</Field.Label>
                          <TextInput maxLength={4} value={theme.logoTexte} onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer('logoTexte', e.target.value)} />
                          <Field.Hint />
                        </Field.Root>
                      )}
                    </Flex>
                  </Box>

                  <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" tag="h2">Couleurs</Typography>
                      <Flex direction="column" alignItems="stretch" gap={2}>
                        <Typography variant="pi" textColor="neutral600">Palettes prêtes à l'emploi :</Typography>
                        <Flex gap={2} wrap="wrap">
                          {PALETTES.map((p) => (
                            <button
                              key={p.nom}
                              type="button"
                              onClick={() => setTheme({ ...theme, ...p.couleurs })}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid #dcdce4', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}
                            >
                              {Object.values(p.couleurs).map((c) => (
                                <span key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} aria-hidden="true" />
                              ))}
                              {p.nom}
                            </button>
                          ))}
                        </Flex>
                      </Flex>
                      {COULEURS.map((c) => (
                        <Flex key={c.cle} gap={3} alignItems="center">
                          <input
                            type="color"
                            aria-label={c.libelle}
                            value={HEX.test(theme[c.cle]) ? theme[c.cle] : '#000000'}
                            onChange={(e) => changer(c.cle, e.target.value)}
                            style={{ width: 44, height: 44, border: '1px solid #dcdce4', borderRadius: 8, padding: 2, background: '#fff', cursor: 'pointer' }}
                          />
                          <Box grow={1}>
                            <Typography variant="omega" fontWeight="bold">{c.libelle}</Typography>
                            <Typography variant="pi" textColor="neutral600" tag="p">{c.aide}</Typography>
                          </Box>
                          <Box width="11rem">
                            <TextInput
                              aria-label={`${c.libelle} (code hexadécimal)`}
                              value={theme[c.cle]}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer(c.cle, e.target.value)}
                              hasError={!HEX.test(theme[c.cle])}
                            />
                          </Box>
                        </Flex>
                      ))}
                      <Box padding={3} hasRadius background={erreurs.length ? 'danger100' : 'success100'}>
                        {erreurs.length ? (
                          <Flex direction="column" alignItems="flex-start" gap={1}>
                            <Flex gap={2}>
                              <WarningCircle fill="danger600" />
                              <Typography fontWeight="bold" textColor="danger700">Lisibilité insuffisante (accessibilité RGAA)</Typography>
                            </Flex>
                            {erreurs.map((e) => (
                              <Typography key={e} variant="pi" textColor="danger700">• {e}</Typography>
                            ))}
                          </Flex>
                        ) : (
                          <Flex gap={2}>
                            <Check fill="success600" />
                            <Typography textColor="success700">Contrastes conformes à l'accessibilité (RGAA)</Typography>
                          </Flex>
                        )}
                      </Box>
                    </Flex>
                  </Box>

                  <Box padding={6} hasRadius background="neutral0" shadow="tableShadow">
                    <Flex direction="column" alignItems="stretch" gap={4}>
                      <Typography variant="delta" tag="h2">Typographie et formes</Typography>
                      {(['policeTitres', 'policeTexte'] as const).map((cle) => (
                        <Field.Root key={cle} name={cle}>
                          <Field.Label>{cle === 'policeTitres' ? 'Police des titres' : 'Police du texte'}</Field.Label>
                          <SingleSelect value={theme[cle]} onChange={(v: string | number) => changer(cle, String(v))}>
                            {Object.entries(POLICES).map(([valeur, p]) => (
                              <SingleSelectOption key={valeur} value={valeur}>{p.libelle}</SingleSelectOption>
                            ))}
                          </SingleSelect>
                          <span style={{ fontFamily: POLICES[theme[cle]]?.famille, fontSize: cle === 'policeTitres' ? 20 : 15, fontWeight: cle === 'policeTitres' ? 800 : 400, marginTop: 4 }}>
                            Le territoire qui recrute, à deux pas de chez vous.
                          </span>
                        </Field.Root>
                      ))}
                      <Field.Root name="arrondis">
                        <Field.Label>Angles des boutons et cartes</Field.Label>
                        <SingleSelect value={theme.arrondis} onChange={(v: string | number) => changer('arrondis', String(v))}>
                          {Object.entries(ARRONDIS).map(([valeur, a]) => (
                            <SingleSelectOption key={valeur} value={valeur}>{a.libelle}</SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Field.Root>
                    </Flex>
                  </Box>

                  <Typography variant="pi" textColor="neutral600">
                    Coordonnées, réseaux sociaux et liens vers Gestmax :{' '}
                    <Link to={unique('api::parametres.parametres')}>informations du site</Link>. Menus :{' '}
                    <Link to={unique('api::navigation.navigation')}>menus du site</Link>.
                  </Typography>
                </Flex>
              </Grid.Item>

              {/* -------- Aperçu -------- */}
              <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                <Box position="sticky" top="2rem">
                  <Flex direction="column" alignItems="stretch" gap={2}>
                    <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={2}>
                      <Typography variant="sigma" textColor="neutral600">Aperçu en direct</Typography>
                      <ChoixPage page={pageApercu} choisir={setPageApercu} />
                    </Flex>
                    <Box hasRadius shadow="tableShadow" overflow="hidden" background="neutral0">
                      <div style={{ background: '#ececf1', padding: '8px 12px', display: 'flex', gap: 6 }} aria-hidden="true">
                        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c }} />)}
                      </div>
                      <Apercu
                        t={theme} logo={logo} image={imageAccueil} gabarit={gabarit} options={options} page={pageApercu}
                        libelle={`Aperçu du site avec le template ${modele.nom} et vos réglages`}
                      />
                    </Box>
                    {boutonEssai && (
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        {boutonEssai}
                        <Typography variant="pi" textColor="neutral600">Vos vrais contenus avec ce template et cette disposition (couleurs et polices déjà enregistrées).</Typography>
                      </Flex>
                    )}
                  </Flex>
                </Box>
              </Grid.Item>
            </Grid.Root>
          )}
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
