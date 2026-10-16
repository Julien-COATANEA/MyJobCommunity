// Boutons « Accueil / Offres / Page » au-dessus des aperçus de l'écran Apparence.
import { Button, Flex } from '@strapi/design-system';
import type { PageApercu } from './Apercu';

export const PAGES_APERCU: { cle: PageApercu; libelle: string }[] = [
  { cle: 'accueil', libelle: 'Accueil' },
  { cle: 'offres', libelle: 'Offres' },
  { cle: 'page', libelle: 'Page' },
];

export function ChoixPage({ page, choisir }: { page: PageApercu; choisir: (p: PageApercu) => void }) {
  return (
    <Flex gap={1} role="group" aria-label="Page affichée dans l'aperçu">
      {PAGES_APERCU.map((p) => (
        <Button key={p.cle} size="S" variant={p.cle === page ? 'secondary' : 'ghost'} aria-pressed={p.cle === page} onClick={() => choisir(p.cle)}>
          {p.libelle}
        </Button>
      ))}
    </Flex>
  );
}
