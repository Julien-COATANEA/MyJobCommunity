// Import de fiches « annuaire des entreprises » depuis un fichier CSV (Excel : « Enregistrer sous → CSV »).
import * as React from 'react';
import { Alert, Box, Button, Flex, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { Download, Upload } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { liste } from '../outils';

const COLONNES = ['nom', 'ville', 'secteur', 'extrait', 'description', 'effectif', 'adresse', 'siteWeb', 'nomEntiteGestmax'] as const;
const ENTETES: Record<string, (typeof COLONNES)[number]> = {
  nom: 'nom', entreprise: 'nom', 'raison sociale': 'nom', ville: 'ville', commune: 'ville', secteur: 'secteur', 'secteur d\'activité': 'secteur',
  extrait: 'extrait', résumé: 'extrait', resume: 'extrait', description: 'description', effectif: 'effectif', salariés: 'effectif', salaries: 'effectif',
  adresse: 'adresse', 'site web': 'siteWeb', siteweb: 'siteWeb', site: 'siteWeb', url: 'siteWeb',
  'nom dans gestmax': 'nomEntiteGestmax', nomentitegestmax: 'nomEntiteGestmax', gestmax: 'nomEntiteGestmax',
};

/** Lecteur CSV (séparateur « ; » ou « , » détecté, guillemets et sauts de ligne dans les cellules gérés). */
export function lireCsv(texte: string): string[][] {
  const contenu = texte.replace(/^﻿/, '');
  const premiere = contenu.split(/\r?\n/, 1)[0] ?? '';
  const sep = (premiere.match(/;/g)?.length ?? 0) >= (premiere.match(/,/g)?.length ?? 0) ? ';' : ',';
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = '';
  let guillemets = false;
  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (guillemets) {
      if (c === '"' && contenu[i + 1] === '"') { cellule += '"'; i++; }
      else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(cellule); cellule = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && contenu[i + 1] === '\n') i++;
      ligne.push(cellule); cellule = '';
      if (ligne.some((x) => x.trim())) lignes.push(ligne);
      ligne = [];
    } else cellule += c;
  }
  ligne.push(cellule);
  if (ligne.some((x) => x.trim())) lignes.push(ligne);
  return lignes;
}

interface Rapport {
  simulation: boolean; crees: number; ignorees: number; invalides: number;
  rapport: { ligne: number; nom: string; statut: 'cree' | 'existe' | 'invalide'; erreurs: string[] }[];
}

const MODELE_CSV = `nom;ville;secteur;extrait;description;effectif;adresse;siteWeb;nomEntiteGestmax\n"Exemple SAS";"Lyon";"Industrie";"Fabricant de pièces mécaniques";"Présentation de l'entreprise.";"120";"12 rue de la Paix";"https://exemple.fr";"Exemple SAS"\n`;

export default function ImportEntreprises() {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [lignes, setLignes] = React.useState<Record<string, string>[]>([]);
  const [nomFichier, setNomFichier] = React.useState('');
  const [rapport, setRapport] = React.useState<Rapport | null>(null);
  const [colonnesInconnues, setColonnesInconnues] = React.useState<string[]>([]);
  const [envoi, setEnvoi] = React.useState(false);

  const choisir = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setRapport(null);
    const brut = lireCsv(await fichier.text());
    if (brut.length < 2) { toggleNotification({ type: 'warning', message: 'Le fichier est vide ou sans ligne de données.' }); return; }
    const entetes = brut[0].map((h) => ENTETES[h.trim().toLowerCase()] ?? null);
    setColonnesInconnues(brut[0].filter((_, i) => !entetes[i]).map((h) => h.trim()).filter(Boolean));
    const donnees = brut.slice(1).map((cellules) => Object.fromEntries(entetes.map((cle, i) => [cle, cellules[i] ?? '']).filter(([cle]) => cle)));
    setLignes(donnees);
    setNomFichier(fichier.name);
    await verifier(donnees);
  };

  const verifier = async (donnees: Record<string, string>[]) => {
    try {
      const { data } = await post<Rapport>('/espace/import-entreprises', { lignes: donnees, simulation: true });
      setRapport(data);
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? 'Le fichier n’a pas pu être vérifié.' });
    }
  };

  const importer = async () => {
    setEnvoi(true);
    try {
      const { data } = await post<Rapport>('/espace/import-entreprises', { lignes, simulation: false });
      setRapport(data);
      setLignes([]);
      toggleNotification({ type: 'success', message: `${data.crees} fiche${data.crees > 1 ? 's' : ''} importée${data.crees > 1 ? 's' : ''}.` });
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: e?.response?.data?.error?.message ?? "L'import a échoué." });
    } finally {
      setEnvoi(false);
    }
  };

  const telechargerModele = () => {
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(new Blob(['﻿' + MODELE_CSV], { type: 'text/csv;charset=utf-8' }));
    lien.download = 'modele-import-entreprises.csv';
    lien.click();
    URL.revokeObjectURL(lien.href);
  };

  const apercu = rapport?.simulation;
  return (
    <Page.Main>
      <Page.Title>Importer des entreprises</Page.Title>
      <Layouts.Header
        title="Importer des entreprises"
        subtitle="Ajoutez d'un coup toutes les fiches de votre annuaire à partir d'un fichier Excel enregistré au format CSV."
        secondaryAction={<Button variant="tertiary" startIcon={<Download />} onClick={telechargerModele}>Télécharger le modèle</Button>}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Box padding={5} hasRadius background="neutral0" shadow="tableShadow">
            <Flex direction="column" alignItems="flex-start" gap={3}>
              <Typography variant="delta" tag="h2">1. Choisissez votre fichier</Typography>
              <Typography variant="omega" textColor="neutral700">
                Colonnes attendues : <strong>nom, ville, extrait</strong> (obligatoires), puis secteur, description, effectif, adresse, siteWeb, nomEntiteGestmax.
                Les fiches existantes (même nom) ne sont jamais modifiées. Les nouvelles fiches sont publiées immédiatement.
              </Typography>
              <label>
                <Typography variant="omega" fontWeight="bold" tag="span">Fichier CSV : </Typography>
                <input type="file" accept=".csv,text/csv" onChange={choisir} />
              </label>
              {nomFichier && <Typography variant="pi" textColor="neutral600">{nomFichier} : {lignes.length || rapport?.rapport.length || 0} ligne(s) lue(s)</Typography>}
              {colonnesInconnues.length > 0 && (
                <Alert variant="warning" closeLabel="Fermer" title="Colonnes ignorées">{colonnesInconnues.join(', ')} : ces colonnes ne correspondent à aucun champ.</Alert>
              )}
            </Flex>
          </Box>

          {rapport && (
            <Box padding={5} hasRadius background="neutral0" shadow="tableShadow">
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Typography variant="delta" tag="h2">{apercu ? '2. Vérifiez avant d’importer' : 'Résultat de l’import'}</Typography>
                <Flex gap={6} wrap="wrap">
                  <Typography><strong>{rapport.crees}</strong> {apercu ? 'à créer' : 'créée(s)'}</Typography>
                  <Typography><strong>{rapport.ignorees}</strong> déjà présente(s)</Typography>
                  <Typography textColor={rapport.invalides ? 'danger600' : undefined}><strong>{rapport.invalides}</strong> à corriger</Typography>
                </Flex>
                {rapport.rapport.some((r) => r.statut !== 'cree') && (
                  <Table colCount={3} rowCount={rapport.rapport.length + 1}>
                    <Thead><Tr><Th><Typography variant="sigma">Ligne</Typography></Th><Th><Typography variant="sigma">Entreprise</Typography></Th><Th><Typography variant="sigma">Problème</Typography></Th></Tr></Thead>
                    <Tbody>
                      {rapport.rapport.filter((r) => r.statut !== 'cree').slice(0, 50).map((r) => (
                        <Tr key={r.ligne}><Td><Typography>{r.ligne + 1}</Typography></Td><Td><Typography>{r.nom || '-'}</Typography></Td><Td><Typography>{r.erreurs.join(', ')}</Typography></Td></Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
                {apercu ? (
                  <Box>
                    <Button startIcon={<Upload />} onClick={importer} loading={envoi} disabled={!rapport.crees}>
                      Importer {rapport.crees} entreprise{rapport.crees > 1 ? 's' : ''}
                    </Button>
                    {rapport.invalides > 0 && <Typography variant="pi" textColor="neutral600"> Les lignes à corriger seront ignorées.</Typography>}
                  </Box>
                ) : (
                  <Link to={liste('api::entreprise.entreprise')}><Typography textColor="primary600" fontWeight="bold">Voir l'annuaire →</Typography></Link>
                )}
              </Flex>
            </Box>
          )}
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
}
