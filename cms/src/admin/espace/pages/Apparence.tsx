// Page « Apparence de mon site » : identité, couleurs, polices, avec aperçu en direct
// et contrôle d'accessibilité (RGAA) pendant la saisie.
import * as React from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/sora';
import '@fontsource-variable/source-sans-3';
import '@fontsource-variable/atkinson-hyperlegible-next';
import {
  Box, Button, Field, Flex, Grid, LinkButton, SingleSelect, SingleSelectOption, TextInput, Typography,
} from '@strapi/design-system';
import { Check, Eye, Image as IconeImage, WarningCircle } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { ratioContraste, verifierContrastes } from '../../../utils/contraste';
import { unique } from '../outils';

interface Theme {
  nomSite: string;
  baseline: string;
  logoTexte: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurTexte: string;
  couleurFond: string;
  policeTitres: string;
  policeTexte: string;
  arrondis: string;
}
interface Logo { id: number; url: string; name: string }

const POLICES: Record<string, { libelle: string; famille: string }> = {
  sora: { libelle: 'Sora (géométrique, moderne)', famille: "'Sora Variable', system-ui, sans-serif" },
  inter: { libelle: 'Inter (neutre, très lisible)', famille: "'Inter Variable', system-ui, sans-serif" },
  'source-sans-3': { libelle: 'Source Sans 3 (institutionnelle)', famille: "'Source Sans 3 Variable', system-ui, sans-serif" },
  'atkinson-hyperlegible': { libelle: 'Atkinson Hyperlegible (accessibilité renforcée)', famille: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif" },
  systeme: { libelle: 'Police du système (la plus légère)', famille: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
};
const ARRONDIS: Record<string, { libelle: string; rayon: number }> = {
  carres: { libelle: 'Angles droits', rayon: 2 },
  legers: { libelle: 'Légèrement arrondis', rayon: 10 },
  prononces: { libelle: 'Très arrondis', rayon: 20 },
};
const PALETTES: { nom: string; couleurs: Pick<Theme, 'couleurPrimaire' | 'couleurSecondaire' | 'couleurAccent'> }[] = [
  // Palette de la maquette MyJobCommunity (vert, bleu, orange).
  { nom: 'MyJobCommunity', couleurs: { couleurPrimaire: '#1a7460', couleurSecondaire: '#15506e', couleurAccent: '#f08a3c' } },
  { nom: 'Océan', couleurs: { couleurPrimaire: '#1a5f7a', couleurSecondaire: '#0f3d4c', couleurAccent: '#e8833a' } },
  { nom: 'Forêt', couleurs: { couleurPrimaire: '#2d6a4f', couleurSecondaire: '#1b4332', couleurAccent: '#f4a261' } },
  { nom: 'Ardoise', couleurs: { couleurPrimaire: '#3d5a80', couleurSecondaire: '#293241', couleurAccent: '#ee6c4d' } },
  { nom: 'Bordeaux', couleurs: { couleurPrimaire: '#8d2f45', couleurSecondaire: '#4a1a2a', couleurAccent: '#e9a23b' } },
  { nom: 'Terre', couleurs: { couleurPrimaire: '#8a4b2a', couleurSecondaire: '#3e2a1e', couleurAccent: '#d8a031' } },
  { nom: 'Violet', couleurs: { couleurPrimaire: '#5b3f8c', couleurSecondaire: '#2e1f4d', couleurAccent: '#3fb7a5' } },
];
const COULEURS: { cle: keyof Theme; libelle: string; aide: string }[] = [
  { cle: 'couleurPrimaire', libelle: 'Couleur principale', aide: 'Boutons, liens, éléments actifs' },
  { cle: 'couleurSecondaire', libelle: 'Couleur secondaire', aide: 'Espace recruteur, dates d’événements, dégradés des bandeaux' },
  { cle: 'couleurAccent', libelle: "Couleur d'accent", aide: 'Soulignés, étiquettes, bouton de recherche' },
  { cle: 'couleurTexte', libelle: 'Couleur du texte', aide: 'Texte courant et titres' },
  { cle: 'couleurFond', libelle: 'Couleur de fond', aide: 'Fond des pages' },
];

const HEX = /^#[0-9A-Fa-f]{6}$/;
const texteSur = (fond: string, sombre: string) =>
  HEX.test(fond) && ratioContraste('#ffffff', fond) >= ratioContraste(sombre, fond) ? '#ffffff' : sombre;
const melange = (hex: string, ratio: number, avec = '#ffffff') => {
  if (!HEX.test(hex)) return hex;
  const c = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(c(hex, i) * ratio + c(avec, i) * (1 - ratio)).toString(16).padStart(2, '0')).join('')}`;
};

// ---------- Aperçu du site ----------

function Apercu({ t, logo }: { t: Theme; logo: Logo | null }) {
  const rayon = ARRONDIS[t.arrondis]?.rayon ?? 10;
  const titres = POLICES[t.policeTitres]?.famille;
  const texte = POLICES[t.policeTexte]?.famille;
  const pale = melange(t.couleurPrimaire, 0.08, t.couleurFond);
  const accentPale = melange(t.couleurAccent, 0.15, t.couleurFond);
  const bord = melange(t.couleurTexte, 0.14, t.couleurFond);

  return (
    <Box hasRadius shadow="tableShadow" overflow="hidden" background="neutral0" aria-label="Aperçu du site" role="img">
      <div style={{ background: '#ececf1', padding: '8px 12px', display: 'flex', gap: 6 }} aria-hidden="true">
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 99, background: c }} />)}
      </div>
      <div style={{ background: t.couleurFond, color: t.couleurTexte, fontFamily: texte, fontSize: 13, lineHeight: 1.5 }} aria-hidden="true">
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${bord}` }}>
          {logo ? (
            <img src={logo.url} alt="" style={{ height: 32, width: 'auto' }} />
          ) : (
            <span style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: rayon * 0.6, color: '#fff', fontFamily: titres, fontWeight: 800, fontSize: 12, background: `linear-gradient(135deg, ${t.couleurPrimaire}, ${t.couleurSecondaire})` }}>
              {(t.logoTexte || t.nomSite.slice(0, 2)).toUpperCase()}
            </span>
          )}
          <span style={{ fontFamily: titres, fontWeight: 800, color: t.couleurSecondaire, lineHeight: 1.1 }}>
            {t.nomSite || 'Mon site'}
            <span style={{ display: 'block', fontFamily: texte, fontWeight: 400, fontSize: 10, opacity: 0.75 }}>{t.baseline}</span>
          </span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontWeight: 600, fontSize: 12 }}>
            <span style={{ color: t.couleurPrimaire, boxShadow: `inset 0 -2px 0 ${t.couleurAccent}` }}>Offres</span>
            <span>Le territoire</span>
            <span>Actualités</span>
          </span>
        </div>
        {/* Bandeau */}
        <div style={{ padding: '28px 16px', background: `linear-gradient(110deg, ${t.couleurSecondaire}, ${melange(t.couleurSecondaire, 0.75, t.couleurPrimaire)})`, color: '#fff' }}>
          <div style={{ fontFamily: titres, fontWeight: 800, fontSize: 22, lineHeight: 1.15, maxWidth: 320 }}>Trouvez votre emploi sur le territoire</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, background: '#fff', padding: 8, borderRadius: rayon * 1.4 }}>
            <span style={{ flex: 1, border: `1px solid ${bord}`, borderRadius: rayon, padding: '6px 8px', color: '#777' }}>Métier, mot-clé…</span>
            <span style={{ background: t.couleurAccent, color: texteSur(t.couleurAccent, t.couleurTexte), borderRadius: 99, padding: '6px 14px', fontWeight: 700 }}>Rechercher</span>
          </div>
        </div>
        {/* Cartes */}
        <div style={{ padding: '18px 16px' }}>
          <div style={{ fontFamily: titres, fontWeight: 750, fontSize: 16, color: t.couleurSecondaire, textAlign: 'center' }}>Les dernières offres</div>
          <div style={{ width: 36, height: 3, background: t.couleurAccent, borderRadius: 3, margin: '6px auto 12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['Technicien de maintenance', 'Infirmier de nuit'].map((titre, i) => (
              <div key={titre} style={{ border: `1px solid ${bord}`, borderLeft: `4px solid ${t.couleurPrimaire}`, borderRadius: rayon * 1.4, padding: 10 }}>
                <span style={{ background: accentPale, color: t.couleurSecondaire, borderRadius: 99, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>{i ? 'CDD' : 'CDI'}</span>
                <div style={{ fontFamily: titres, fontWeight: 700, color: t.couleurSecondaire, marginTop: 6 }}>{titre}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Publiée le 12 octobre</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 14, borderRadius: rayon * 1.4, background: pale, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>Un texte avec <span style={{ color: t.couleurPrimaire, textDecoration: 'underline' }}>un lien</span>.</span>
            <span style={{ background: t.couleurPrimaire, color: '#fff', borderRadius: 99, padding: '6px 14px', fontWeight: 700 }}>Voir les offres</span>
          </div>
        </div>
        {/* Pied de page */}
        <div style={{ background: t.couleurSecondaire, color: '#fff', padding: '12px 16px', fontSize: 11 }}>
          <strong style={{ fontFamily: titres }}>{t.nomSite || 'Mon site'}</strong> · Mentions légales · Accessibilité
        </div>
      </div>
    </Box>
  );
}

// ---------- Page ----------

export default function Apparence() {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [theme, setTheme] = React.useState<Theme | null>(null);
  const [initial, setInitial] = React.useState<string>('');
  const [logo, setLogo] = React.useState<Logo | null>(null);
  const [logoInitial, setLogoInitial] = React.useState<number | null>(null);
  const [urlSite, setUrlSite] = React.useState('');
  const [enregistrement, setEnregistrement] = React.useState(false);
  const [televersement, setTeleversement] = React.useState(false);
  const champFichier = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    get('/espace/apparence').then(({ data }: any) => {
      const t: Theme = {
        nomSite: data.nomSite ?? '', baseline: data.baseline ?? '', logoTexte: data.logoTexte ?? '',
        couleurPrimaire: data.couleurPrimaire, couleurSecondaire: data.couleurSecondaire, couleurAccent: data.couleurAccent,
        couleurTexte: data.couleurTexte, couleurFond: data.couleurFond,
        policeTitres: data.policeTitres, policeTexte: data.policeTexte, arrondis: data.arrondis,
      };
      setTheme(t);
      setInitial(JSON.stringify(t));
      setLogo(data.logo ?? null);
      setLogoInitial(data.logo?.id ?? null);
      setUrlSite(data.urlSite ?? '');
    });
  }, [get]);

  if (!theme) return <Page.Loading />;

  const changer = (cle: keyof Theme, valeur: string) => setTheme({ ...theme, [cle]: valeur });
  const erreurs = verifierContrastes(theme);
  const modifie = JSON.stringify(theme) !== initial || (logo?.id ?? null) !== logoInitial;
  const couleursValides = COULEURS.every((c) => HEX.test(theme[c.cle]));

  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      await put('/espace/apparence', { ...theme, logo: logo?.id ?? null });
      setInitial(JSON.stringify(theme));
      setLogoInitial(logo?.id ?? null);
      toggleNotification({ type: 'success', message: 'Apparence enregistrée : votre site sera mis à jour dans quelques instants.' });
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? "L'enregistrement a échoué." });
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

  return (
    <Page.Main>
      <Page.Title>Apparence de mon site</Page.Title>
      <Layouts.Header
        title="Apparence de mon site"
        subtitle="Logo, couleurs et polices : les modifications sont visibles en direct dans l'aperçu, puis sur le site après enregistrement."
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
        <Grid.Root gap={6}>
          {/* -------- Formulaire -------- */}
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Flex direction="column" alignItems="stretch" gap={4}>
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
                <Typography variant="sigma" textColor="neutral600">Aperçu en direct</Typography>
                <Apercu t={theme} logo={logo} />
                {modifie && (
                  <Typography variant="pi" textColor="warning700">Modifications non enregistrées.</Typography>
                )}
              </Flex>
            </Box>
          </Grid.Item>
        </Grid.Root>
      </Layouts.Content>
    </Page.Main>
  );
}
