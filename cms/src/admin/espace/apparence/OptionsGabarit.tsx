// Options de disposition du template choisi (étape « Personnaliser » de l'écran Apparence) : pour chaque option, des
// choix illustrés d'un petit schéma. Chaque option est un groupe de boutons radio natifs (clavier et lecteurs d'écran).
import * as React from 'react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { styled } from 'styled-components';
import { CLES_OPTIONS, OPTIONS, type CleOption, type Options, type Valeur } from '../../../utils/gabarits';

const Choix = styled.label<{ $coche: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 0;
  min-width: 11rem;
  padding: 10px;
  border-radius: 6px;
  border: ${({ $coche }) => ($coche ? '2px solid var(--mjc-primaire, #4945ff)' : '1px solid #dcdce4')};
  background: ${({ $coche }) => ($coche ? 'color-mix(in srgb, var(--mjc-primaire, #4945ff) 6%, #fff)' : '#fff')};
  cursor: pointer;
  &:has(input:focus-visible) {
    outline: 2px solid var(--mjc-primaire, #4945ff);
    outline-offset: 2px;
  }
  & input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
`;

const G = '#c0c0cf'; // gris des schémas
const P = 'var(--mjc-primaire, #4945ff)';

/** Petit schéma de chaque valeur d'option (64 × 40). */
function Schema({ cle, valeur }: { cle: CleOption; valeur: string }) {
  const r = (x: number, y: number, w: number, h: number, fill = G, rx = 1.5) => <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} />;
  const formes: Record<string, React.ReactNode> = {
    'entete:classique': <>{r(4, 6, 10, 8, P)}{r(30, 9, 8, 2)}{r(40, 9, 8, 2)}{r(50, 9, 10, 2)}{r(4, 20, 56, 16, '#eeeef3')}</>,
    'entete:centre': <>{r(27, 4, 10, 8, P)}{r(14, 16, 8, 2)}{r(25, 16, 8, 2)}{r(36, 16, 8, 2)}{r(47, 16, 6, 2)}{r(4, 23, 56, 13, '#eeeef3')}</>,
    'entete:deux-lignes': <>{r(4, 4, 10, 8, P)}{r(0, 14, 64, 0.8)}{r(4, 17, 8, 2)}{r(15, 17, 8, 2)}{r(26, 17, 8, 2)}{r(50, 16, 10, 4, P)}{r(4, 24, 56, 12, '#eeeef3')}</>,
    'accueil:deux-colonnes': <>{r(4, 8, 24, 4, '#6b6b85')}{r(4, 15, 20, 2)}{r(4, 19, 18, 2)}{r(4, 25, 12, 5, P, 2.5)}{r(34, 6, 26, 28, '#9fb5c7', 3)}</>,
    'accueil:empile': <>{r(18, 3, 28, 4, '#6b6b85')}{r(22, 9, 20, 2)}{r(26, 13, 12, 4, P, 2)}{r(4, 20, 56, 18, '#9fb5c7', 2)}</>,
    'accueil:banniere': <>{r(0, 2, 64, 36, '#4d6577', 2)}{r(16, 12, 32, 4, '#fff')}{r(20, 19, 24, 2, '#dfe6ec')}{r(26, 25, 12, 5, P, 2.5)}</>,
    'bandeaux:immersif': <>{r(0, 4, 64, 20, '#3c5a6e', 2)}{r(6, 10, 26, 4, '#fff')}{r(6, 17, 18, 2, '#cfdbe3')}{r(6, 28, 52, 2)}{r(6, 32, 40, 2)}</>,
    'bandeaux:clair': <>{r(0, 4, 64, 20, '#f0f0f5', 2)}{r(6, 10, 26, 4, '#6b6b85')}{r(6, 17, 18, 2)}{r(6, 28, 52, 2)}{r(6, 32, 40, 2)}</>,
    'filtres:haut': <>{r(4, 4, 56, 9, '#fff')}<rect x={4} y={4} width={56} height={9} rx={1.5} fill="none" stroke={G} />{r(4, 16, 56, 6, '#eeeef3')}{r(4, 24, 56, 6, '#eeeef3')}{r(4, 32, 56, 6, '#eeeef3')}</>,
    'filtres:cote': <><rect x={4} y={4} width={16} height={34} rx={1.5} fill="#fff" stroke={G} />{r(7, 8, 10, 2)}{r(7, 13, 10, 2)}{r(7, 18, 10, 2)}{r(24, 4, 36, 9, '#eeeef3')}{r(24, 16, 36, 9, '#eeeef3')}{r(24, 28, 36, 9, '#eeeef3')}</>,
    'cartes:relief': <><rect x={9} y={10} width={46} height={26} rx={4} fill="#dcdce8" />{r(7, 6, 46, 26, '#fff', 4)}<rect x={7} y={6} width={46} height={26} rx={4} fill="none" stroke="#e3e3ec" />{r(12, 12, 24, 3, '#6b6b85')}{r(12, 18, 30, 2)}</>,
    'cartes:plat': <><rect x={9} y={8} width={46} height={26} rx={2} fill="#fff" stroke={G} />{r(14, 14, 24, 3, '#6b6b85')}{r(14, 20, 30, 2)}</>,
    'pied:sombre': <>{r(4, 4, 56, 4)}{r(4, 11, 40, 2)}{r(0, 22, 64, 16, '#3a3a52', 1)}{r(6, 27, 16, 3, '#fff')}{r(36, 28, 20, 2, '#8f8fa8')}</>,
    'pied:clair': <>{r(4, 4, 56, 4)}{r(4, 11, 40, 2)}{r(0, 22, 64, 16, '#f0f0f5', 1)}{r(0, 22, 64, 0.8)}{r(6, 27, 16, 3, '#6b6b85')}{r(36, 28, 20, 2)}</>,
  };
  return (
    <svg viewBox="0 0 64 40" width="64" height="40" aria-hidden="true" focusable="false" style={{ display: 'block', background: '#fafafc', borderRadius: 4 }}>
      {formes[`${cle}:${valeur}`]}
    </svg>
  );
}

interface Props {
  options: Options;
  /** Réglages par défaut du template (signalés « conseillé »). */
  defauts: Options;
  changer: (cle: CleOption, valeur: string) => void;
}

export function OptionsGabarit({ options, defauts, changer }: Props) {
  return (
    <Flex direction="column" alignItems="stretch" gap={5}>
      {CLES_OPTIONS.map((cle) => {
        const option = OPTIONS[cle];
        return (
          <Box key={cle} tag="fieldset" style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
            <Typography variant="omega" fontWeight="bold" tag="legend">{option.libelle}</Typography>
            <Typography variant="pi" textColor="neutral600" tag="p">{option.aide}</Typography>
            <Flex gap={2} wrap="wrap" paddingTop={2} alignItems="stretch">
              {Object.entries<Valeur>(option.valeurs).map(([valeur, v]) => {
                const coche = options[cle] === valeur;
                return (
                  <Choix key={valeur} $coche={coche}>
                    <input type="radio" name={`option-${cle}`} value={valeur} checked={coche} onChange={() => changer(cle, valeur)} />
                    <Schema cle={cle} valeur={valeur} />
                    <Typography variant="omega" fontWeight={coche ? 'bold' : 'regular'}>{v.libelle}</Typography>
                    {v.aide && <Typography variant="pi" textColor="neutral600">{v.aide}</Typography>}
                    {defauts[cle] === valeur && <Typography variant="pi" textColor="primary600">Réglage du template</Typography>}
                  </Choix>
                );
              })}
            </Flex>
          </Box>
        );
      })}
    </Flex>
  );
}
