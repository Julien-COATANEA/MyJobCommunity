// Champ « Lien » : on choisit une page du site (ou un raccourci Gestmax) dans une liste au lieu de taper une adresse.
// La valeur enregistrée reste une simple chaîne : « /page », « https://… » ou « gestmax:/chemin » (voir site/src/lib/liens.ts).
import * as React from 'react';
import { Box, Field, Flex, TextInput, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface Groupe { libelle: string; options: { libelle: string; valeur: string }[] }
interface Donnees { groupes: Groupe[]; nomSite?: string; urlSite?: string }

const AUTRE = '__autre__';
let cache: { instant: number; promesse: Promise<Donnees> } | null = null;

/** Liste partagée par tous les champs de la page (une seule requête, valable 20 secondes). */
function useLiens(): Donnees | null {
  const { get } = useFetchClient();
  const [donnees, setDonnees] = React.useState<Donnees | null>(null);
  React.useEffect(() => {
    if (!cache || Date.now() - cache.instant > 20_000) {
      cache = { instant: Date.now(), promesse: get<Donnees>('/espace/liens').then((r) => r.data) };
    }
    cache.promesse.then(setDonnees).catch(() => setDonnees({ groupes: [] }));
  }, [get]);
  return donnees;
}

const styleSelect: React.CSSProperties = {
  width: '100%', minHeight: '4rem', padding: '0 1.2rem', borderRadius: 4, border: '1px solid #dcdce4',
  background: '#fff', color: '#32324d', font: 'inherit', cursor: 'pointer',
};

export function LienInput({ name, value, onChange, label, hint, error, required, disabled, attribute }: any) {
  const liens = useLiens();
  const valeur: string = typeof value === 'string' ? value : '';
  const [modeAutre, setModeAutre] = React.useState(false);

  const options = React.useMemo(() => new Map((liens?.groupes ?? []).flatMap((g) => g.options.map((o) => [o.valeur, o.libelle] as const))), [liens]);
  const connue = options.has(valeur);
  const interneInconnue = !!valeur && /^\/(?!\/)/.test(valeur) && !connue && !!liens && liens.groupes.length > 0;
  const personnalise = !!valeur && !connue;
  const afficheSaisie = modeAutre || personnalise;

  const changer = (v: string) => onChange({ target: { name, type: attribute?.type ?? 'string', value: v } });
  const choisir = (v: string) => {
    if (v === AUTRE) {
      setModeAutre(true);
      return;
    }
    setModeAutre(false);
    changer(v);
  };

  const titre: string = label ?? name;
  const selection = afficheSaisie ? AUTRE : valeur;

  return (
    <Field.Root name={name} error={error} hint={hint} required={required}>
      <Field.Label>{titre}</Field.Label>
      <select
        aria-label={titre}
        value={selection}
        disabled={disabled || !liens}
        onChange={(e) => choisir(e.target.value)}
        style={styleSelect}
      >
        <option value="">{liens ? '— Choisir une page ou un lien —' : 'Chargement…'}</option>
        {(liens?.groupes ?? []).map((g) => (
          <optgroup key={g.libelle} label={g.libelle}>
            {g.options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
          </optgroup>
        ))}
        <optgroup label="Autre">
          <option value={AUTRE}>Autre adresse (autre site, page à saisir)…</option>
        </optgroup>
      </select>

      {afficheSaisie && (
        <Box paddingTop={2} width="100%">
          <TextInput
            aria-label="Adresse du lien"
            value={valeur}
            placeholder="https://… ou /page"
            disabled={disabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => changer(e.target.value)}
          />
        </Box>
      )}

      {interneInconnue && (
        <Flex paddingTop={2} gap={1}>
          <Typography variant="pi" textColor="danger600">
            Cette page n’existe pas (ou plus) sur le site : {valeur}. Choisissez-en une dans la liste.
          </Typography>
        </Flex>
      )}
      {connue && liens?.urlSite && valeur.startsWith('/') && (
        <Box paddingTop={1}>
          <a href={`${liens.urlSite}${valeur}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.2rem', color: '#4945ff' }}>
            Voir cette page ↗
          </a>
        </Box>
      )}
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
}
