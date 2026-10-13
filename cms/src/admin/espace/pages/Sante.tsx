// Page « Santé du site » : tout ce qui demande l'attention de la collectivité, avec le lien pour le corriger.
import * as React from 'react';
import { Box, Button, Flex, Typography } from '@strapi/design-system';
import { ArrowClockwise, CheckCircle, WarningCircle } from '@strapi/icons';
import { Layouts, Page } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { ilYA, useDonnees } from '../outils';

interface Controle {
  cle: string; libelle: string; statut: 'ok' | 'attention' | 'erreur'; detail: string;
  elements?: { titre: string; precision?: string; lien?: string }[]; lien?: string; libelleLien?: string;
}
interface Sante { date: string; controles: Controle[]; aTraiter: number; erreurs: number }

const COULEUR = { ok: '#2f9e60', attention: '#d9822b', erreur: '#d02b20' };
const MOT = { ok: 'Tout va bien', attention: 'À surveiller', erreur: 'À corriger' };

export default function SantePage() {
  const { donnees, chargement, erreur, recharger } = useDonnees<Sante>('/espace/sante');
  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) return <Page.Error />;

  const tries = [...donnees.controles].sort((a, b) => ['erreur', 'attention', 'ok'].indexOf(a.statut) - ['erreur', 'attention', 'ok'].indexOf(b.statut));

  return (
    <Page.Main>
      <Page.Title>Santé du site</Page.Title>
      <Layouts.Header
        title="Santé du site"
        subtitle={donnees.aTraiter ? `${donnees.aTraiter} point${donnees.aTraiter > 1 ? 's' : ''} à regarder · vérifié ${ilYA(donnees.date)}` : `Tout est en ordre · vérifié ${ilYA(donnees.date)}`}
        primaryAction={<Button variant="secondary" startIcon={<ArrowClockwise />} onClick={recharger}>Revérifier</Button>}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {tries.map((c) => (
            <Box key={c.cle} padding={5} hasRadius background="neutral0" shadow="tableShadow" style={{ borderLeft: `4px solid ${COULEUR[c.statut]}` }}>
              <Flex gap={3} alignItems="flex-start">
                {c.statut === 'ok' ? <CheckCircle fill="success600" /> : <WarningCircle fill={c.statut === 'erreur' ? 'danger600' : 'warning600'} />}
                <Flex direction="column" alignItems="stretch" gap={2} style={{ flex: 1 }}>
                  <Flex justifyContent="space-between" gap={2} wrap="wrap">
                    <Typography variant="delta" tag="h2">{c.libelle}</Typography>
                    <Typography variant="pi" fontWeight="bold" style={{ color: COULEUR[c.statut] }}>{MOT[c.statut]}</Typography>
                  </Flex>
                  <Typography variant="omega" textColor="neutral700">{c.detail}</Typography>
                  {c.elements && c.elements.length > 0 && (
                    <Flex direction="column" alignItems="stretch" gap={1} tag="ul" paddingTop={1}>
                      {c.elements.map((e, i) => (
                        <li key={i} style={{ listStyle: 'disc', marginLeft: 18 }}>
                          {e.lien ? <Link to={e.lien}><Typography textColor="primary600" fontWeight="bold">{e.titre}</Typography></Link> : <Typography>{e.titre}</Typography>}
                          {e.precision && <Typography variant="pi" textColor="neutral600"> · {e.precision}</Typography>}
                        </li>
                      ))}
                    </Flex>
                  )}
                  {c.lien && c.statut !== 'ok' && (
                    <Box paddingTop={1}>
                      <Link to={c.lien}><Typography textColor="primary600" fontWeight="bold">{c.libelleLien ?? 'Corriger'} →</Typography></Link>
                    </Box>
                  )}
                </Flex>
              </Flex>
            </Box>
          ))}
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
