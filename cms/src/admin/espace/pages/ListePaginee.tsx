// Briques des listes paginées de « Mes offres d'emploi » : chargement par section, recherche avec délai, barre de pagination.
import * as React from 'react';
import { Box, Button, Field, Flex, SingleSelect, SingleSelectOption, TextInput, Typography } from '@strapi/design-system';
import { Search } from '@strapi/icons';
import { getFetchClient } from '@strapi/strapi/admin';
import { messageErreur } from '../outils';

export interface Paginee<T> {
  liste: T[];
  total: number;
  page: number;
  pageCount: number;
}

const DELAI_FRAPPE_MS = 300;
export const TAILLES_PAGE = [10, 25, 50, 100];

/**
 * Charge une section de /espace/offres (« offres » ou « entreprises »). Les données précédentes restent affichées
 * pendant le chargement d'une autre page ; une réponse périmée est ignorée.
 */
export function useListe<T>(section: 'offres' | 'entreprises', cle: 'offres' | 'entreprisesOffres', parametres: Record<string, string | number | boolean>) {
  const [etat, setEtat] = React.useState<{ donnees?: Paginee<T>; erreur?: string; chargement: boolean; servie?: string }>({ chargement: true });
  const derniere = React.useRef(0);
  const requete = new URLSearchParams({
    sections: section,
    ...Object.fromEntries(Object.entries(parametres).filter(([, v]) => v !== '' && v !== false).map(([k, v]) => [k, String(v)])),
  }).toString();

  const charger = React.useCallback(async () => {
    const numero = ++derniere.current;
    setEtat((e) => ({ ...e, chargement: true }));
    try {
      const { data } = await getFetchClient().get<Record<string, Paginee<T>>>(`/espace/offres?${requete}`);
      if (numero === derniere.current) setEtat({ donnees: data[cle], chargement: false, servie: requete });
    } catch (e) {
      if (numero === derniere.current) setEtat((ancien) => ({ donnees: ancien.donnees, erreur: messageErreur(e, 'La liste n’a pas pu être chargée.'), chargement: false }));
    }
  }, [requete, cle]);

  React.useEffect(() => {
    charger();
    return () => {
      derniere.current++;
    };
  }, [charger]);

  /** Modifie une ligne affichée sans recharger la liste (la ligne reste à sa place, le focus aussi). */
  const modifier = (correspond: (ligne: T) => boolean, changement: (ligne: T) => T) =>
    setEtat((e) => (e.donnees ? { ...e, donnees: { ...e.donnees, liste: e.donnees.liste.map((l) => (correspond(l) ? changement(l) : l)) } } : e));

  // aJour : les données affichées répondent aux paramètres actuels (pas à ceux d'avant un changement de page).
  return { ...etat, aJour: !etat.chargement && etat.servie === requete, recharger: charger, modifier };
}

/** Champ de recherche : la valeur n'est transmise qu'après une courte pause de frappe (ou à la touche Entrée). */
export function ChampRecherche({ libelle, placeholder, valeur, onChange }: { libelle: string; placeholder: string; valeur: string; onChange: (v: string) => void }) {
  const [saisie, setSaisie] = React.useState(valeur);
  const surChangement = React.useRef(onChange);
  surChangement.current = onChange;

  React.useEffect(() => {
    if (saisie.trim() === valeur) return;
    const minuteur = setTimeout(() => surChangement.current(saisie.trim()), DELAI_FRAPPE_MS);
    return () => clearTimeout(minuteur);
  }, [saisie, valeur]);

  return (
    <Box width="100%" maxWidth="36rem">
      <TextInput
        aria-label={libelle}
        placeholder={placeholder}
        startAction={<Search />}
        value={saisie}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaisie(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') onChange(saisie.trim()); }}
      />
    </Box>
  );
}

export function BarrePagination({
  page, pageCount, total, taille, chargement, nom, noms, onPage, onTaille,
}: {
  page: number; pageCount: number; total: number; taille: number; chargement: boolean;
  nom: string; noms: string; onPage: (p: number) => void; onTaille: (t: number) => void;
}) {
  const zone = React.useRef<HTMLDivElement>(null);
  const premier = React.useRef(true);

  // Un bouton « Précédent » / « Suivant » qui se désactive ferait perdre le focus : on le ramène sur la barre.
  React.useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    if (document.activeElement === document.body) zone.current?.focus();
  }, [page]);

  if (total === 0) return null;
  return (
    <Flex ref={zone} tabIndex={-1} padding={4} gap={4} justifyContent="space-between" wrap="wrap" style={{ outline: 'none' }}>
      <Typography variant="pi" textColor="neutral600" aria-live="polite">
        {chargement ? 'Chargement…' : `${total.toLocaleString('fr-FR')} ${total > 1 ? noms : nom}`}
      </Typography>
      <Flex gap={3} wrap="wrap" alignItems="flex-end">
        <Field.Root name={`taille-${noms}`}>
          <Field.Label>Par page</Field.Label>
          <SingleSelect size="S" value={String(taille)} onChange={(v: string | number) => onTaille(Number(v))}>
            {TAILLES_PAGE.map((t) => <SingleSelectOption key={t} value={String(t)}>{t}</SingleSelectOption>)}
          </SingleSelect>
        </Field.Root>
        <Button variant="tertiary" size="S" disabled={page <= 1} onClick={() => onPage(page - 1)}>Précédent</Button>
        <Typography variant="omega" aria-live="polite">Page {page} sur {pageCount}</Typography>
        <Button variant="tertiary" size="S" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Suivant</Button>
      </Flex>
    </Flex>
  );
}
