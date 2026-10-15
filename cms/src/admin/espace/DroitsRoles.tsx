// « Mon équipe » › Droits des rôles : ce que chaque rôle peut faire sur les contenus et dans l'espace.
// Chaque case pilote les vraies permissions de Strapi (contrôlées par le serveur, voir cms/src/utils/droits.ts).
import * as React from 'react';
import { Alert, Box, Button, Checkbox, Flex, Grid, Table, Tbody, Td, Th, Thead, Tr, Typography } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { messageErreur, useDonnees } from './outils';

interface DroitsContenu { voir: boolean; modifier: boolean; publier: boolean; supprimer: boolean; seulementSiens: boolean }
interface Droits { contenus: Record<string, DroitsContenu>; capacites: string[] }
interface Role { code: string; nom: string; description: string; estLeMien: boolean; droits: Droits }
interface Reponse {
  contenus: { uid: string; libelle: string; options: { publier: boolean; supprimer: boolean; seulementSiens: boolean } }[];
  capacites: { cle: string; libelle: string; description: string }[];
  roles: Role[];
}

const COLONNES: { cle: keyof DroitsContenu; libelle: string }[] = [
  { cle: 'voir', libelle: 'Voir' },
  { cle: 'modifier', libelle: 'Créer et modifier' },
  { cle: 'publier', libelle: 'Publier' },
  { cle: 'supprimer', libelle: 'Supprimer' },
  { cle: 'seulementSiens', libelle: 'Seulement ses contenus' },
];
const VIDE: DroitsContenu = { voir: false, modifier: false, publier: false, supprimer: false, seulementSiens: false };

export function DroitsRoles() {
  const { donnees, erreur, recharger } = useDonnees<Reponse>('/espace/equipe/droits');
  const { put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [code, setCode] = React.useState<string | null>(null);
  const [brouillon, setBrouillon] = React.useState<Droits | null>(null);
  const [envoi, setEnvoi] = React.useState(false);

  const role = donnees?.roles.find((r) => r.code === (code ?? donnees.roles[0]?.code)) ?? null;
  // Le brouillon repart des droits enregistrés à chaque changement de rôle ou rechargement.
  React.useEffect(() => { setBrouillon(role ? structuredClone(role.droits) : null); }, [role]);

  if (erreur) return <Alert closeLabel="Fermer" variant="danger" title="Droits des rôles">{erreur}</Alert>;
  if (!donnees || !role || !brouillon) return null;

  const modifie = JSON.stringify(brouillon) !== JSON.stringify(role.droits);
  const cocher = (uid: string, cle: keyof DroitsContenu, valeur: boolean) => {
    const d = { ...VIDE, ...brouillon.contenus[uid], [cle]: valeur };
    // Modifier, publier ou supprimer supposent de voir ; ne plus voir retire tout.
    if (valeur && cle !== 'voir' && cle !== 'seulementSiens') d.voir = true;
    if (!valeur && cle === 'voir') Object.assign(d, VIDE);
    setBrouillon({ ...brouillon, contenus: { ...brouillon.contenus, [uid]: d } });
  };
  const cocherCapacite = (cle: string, valeur: boolean) =>
    setBrouillon({ ...brouillon, capacites: valeur ? [...brouillon.capacites, cle] : brouillon.capacites.filter((c) => c !== cle) });

  const enregistrer = async () => {
    setEnvoi(true);
    try {
      await put(`/espace/equipe/droits/${role.code}`, brouillon);
      toggleNotification({
        type: 'success',
        message: `Droits du rôle « ${role.nom} » enregistrés. Les personnes concernées les verront en rechargeant le back-office.`,
      });
      recharger();
    } catch (e) {
      toggleNotification({ type: 'danger', message: messageErreur(e, 'Les droits n’ont pas pu être enregistrés.') });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Box hasRadius background="neutral0" shadow="tableShadow" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex justifyContent="space-between" alignItems="flex-start" gap={4} wrap="wrap">
          <Flex direction="column" alignItems="flex-start" gap={1}>
            <Typography variant="delta" tag="h2">Droits des rôles</Typography>
            <Typography variant="pi" textColor="neutral600">Choisissez ce que chaque rôle peut faire. Le super administrateur garde tous les droits.</Typography>
          </Flex>
          <Flex gap={2} role="group" aria-label="Rôle à régler">
            {donnees.roles.map((r) => (
              <Button key={r.code} variant={r.code === role.code ? 'default' : 'tertiary'} aria-pressed={r.code === role.code}
                disabled={modifie && r.code !== role.code} onClick={() => setCode(r.code)}>
                {r.nom}
              </Button>
            ))}
          </Flex>
        </Flex>

        {role.description && <Typography variant="omega" textColor="neutral700">{role.description}</Typography>}
        {modifie && <Typography variant="pi" textColor="warning700">Modifications non enregistrées : enregistrez ou annulez avant de changer de rôle.</Typography>}

        <Box>
          <Typography variant="sigma" tag="h3" textColor="neutral600">Contenus</Typography>
          <Box paddingTop={2}>
            <Table colCount={COLONNES.length + 1} rowCount={donnees.contenus.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Contenu</Typography></Th>
                  {COLONNES.map((c) => <Th key={c.cle}><Typography variant="sigma">{c.libelle}</Typography></Th>)}
                </Tr>
              </Thead>
              <Tbody>
                {donnees.contenus.map((c) => {
                  const d = { ...VIDE, ...brouillon.contenus[c.uid] };
                  return (
                    <Tr key={c.uid}>
                      <Td><Typography fontWeight="bold">{c.libelle}</Typography></Td>
                      {COLONNES.map((col) => {
                        const possible = col.cle === 'voir' || col.cle === 'modifier' || c.options[col.cle as 'publier' | 'supprimer' | 'seulementSiens'];
                        return (
                          <Td key={col.cle}>
                            {possible ? (
                              <Checkbox aria-label={`${col.libelle} : ${c.libelle}`} checked={d[col.cle]}
                                disabled={col.cle === 'seulementSiens' && !d.voir}
                                onCheckedChange={(v: boolean) => cocher(c.uid, col.cle, !!v)} />
                            ) : <Typography textColor="neutral500" aria-label="Sans objet">—</Typography>}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          <Box paddingTop={2}>
            <Typography variant="pi" textColor="neutral600">
              « Seulement ses contenus » : la personne ne voit et ne modifie que ce qu’elle a créé. Sans « Publier », elle demande la publication à un responsable.
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant="sigma" tag="h3" textColor="neutral600">Espace de gestion</Typography>
          <Grid.Root gap={3} paddingTop={3}>
            {donnees.capacites.map((c) => {
              const verrou = c.cle === 'equipe' && role.estLeMien;
              return (
                <Grid.Item key={c.cle} col={6} s={12} direction="column" alignItems="flex-start">
                  <Checkbox checked={brouillon.capacites.includes(c.cle)} disabled={verrou} onCheckedChange={(v: boolean) => cocherCapacite(c.cle, !!v)}>
                    {c.libelle}
                  </Checkbox>
                  <Box paddingLeft={6}>
                    <Typography variant="pi" textColor="neutral600">
                      {c.description}{verrou ? ' (votre propre rôle : ne peut pas être retiré)' : ''}
                    </Typography>
                  </Box>
                </Grid.Item>
              );
            })}
          </Grid.Root>
        </Box>

        <Flex gap={2} justifyContent="flex-end">
          <Button variant="tertiary" disabled={!modifie || envoi} onClick={() => setBrouillon(structuredClone(role.droits))}>Annuler</Button>
          <Button onClick={enregistrer} loading={envoi} disabled={!modifie}>Enregistrer les droits</Button>
        </Flex>
      </Flex>
    </Box>
  );
}
