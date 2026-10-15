// Page « Mon équipe » : inviter un collègue, choisir son rôle (Responsable / Rédacteur), le désactiver ou le retirer,
// et régler les droits de chaque rôle.
import * as React from 'react';
import {
  Box, Button, Field, Flex, Modal, SingleSelect, SingleSelectOption, Table, Tbody, Td, TextInput, Th, Thead, Tr, Typography,
} from '@strapi/design-system';
import { Mail, Pencil, Plus } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { messageErreur, useDonnees } from '../outils';
import { DroitsRoles } from '../DroitsRoles';

interface Membre {
  id: number; email: string; prenom: string; nom: string; actif: boolean; invitationEnAttente: boolean;
  roleCode: string | null; roleNom: string; modifiable: boolean;
}
interface Equipe { moi: number; peutModifierIdentite: boolean; roles: { code: string; nom: string; description: string }[]; membres: Membre[] }

export default function EquipePage() {
  const { donnees, chargement, erreur, recharger } = useDonnees<Equipe>('/espace/equipe');
  const { post, put, del } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [ouvert, setOuvert] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [prenom, setPrenom] = React.useState('');
  const [nom, setNom] = React.useState('');
  const [role, setRole] = React.useState('');
  const [envoi, setEnvoi] = React.useState(false);
  const [lien, setLien] = React.useState<string | null>(null);
  // Modification du nom et de l'e-mail (super administrateur)
  const [edite, setEdite] = React.useState<Membre | null>(null);
  const [edition, setEdition] = React.useState({ prenom: '', nom: '', email: '' });
  const [enregistrement, setEnregistrement] = React.useState(false);
  const ouvrirEdition = (m: Membre) => {
    setEdite(m);
    setEdition({ prenom: m.prenom ?? '', nom: m.nom === '-' ? '' : m.nom ?? '', email: m.email });
  };

  if (chargement && !donnees) return <Page.Loading />;
  if (erreur || !donnees) {
    return (
      <Page.Main>
        <Layouts.Header title="Mon équipe" />
        <Layouts.Content><Typography>{erreur ?? 'Votre rôle ne permet pas de gérer l’équipe.'}</Typography></Layouts.Content>
      </Page.Main>
    );
  }

  const erreurApi = (e: unknown, defaut: string) => toggleNotification({ type: 'danger', message: messageErreur(e, defaut) });

  const inviter = async () => {
    setEnvoi(true);
    try {
      const { data } = await post<{ lien: string }>('/espace/equipe/inviter', { email, prenom, nom, role: role || donnees.roles[donnees.roles.length - 1]?.code });
      setLien(data.lien);
      setEmail(''); setPrenom(''); setNom('');
      toggleNotification({ type: 'success', message: 'Invitation envoyée.' });
      recharger();
    } catch (e) { erreurApi(e, "L'invitation n'a pas pu être envoyée."); } finally { setEnvoi(false); }
  };

  const changerRole = async (m: Membre, code: string) => {
    try { await put(`/espace/equipe/${m.id}`, { role: code }); recharger(); } catch (e) { erreurApi(e, 'Changement impossible.'); }
  };
  const basculer = async (m: Membre) => {
    try { await put(`/espace/equipe/${m.id}`, { actif: !m.actif }); recharger(); } catch (e) { erreurApi(e, 'Changement impossible.'); }
  };
  const renvoyer = async (m: Membre) => {
    try {
      const { data } = await post<{ lien: string }>(`/espace/equipe/${m.id}/renvoyer`, {});
      setLien(data.lien);
      setOuvert(true);
      toggleNotification({ type: 'success', message: `Invitation renvoyée à ${m.email}.` });
    } catch (e) { erreurApi(e, "L'invitation n'a pas pu être renvoyée."); }
  };
  const enregistrerEdition = async () => {
    if (!edite) return;
    setEnregistrement(true);
    try {
      await put(`/espace/equipe/${edite.id}`, edition);
      toggleNotification({ type: 'success', message: 'Modifications enregistrées.' });
      setEdite(null);
      recharger();
    } catch (e) { erreurApi(e, 'Modification impossible.'); } finally { setEnregistrement(false); }
  };
  const retirer = async (m: Membre) => {
    if (!window.confirm(`Retirer ${m.prenom} ${m.nom} de l'équipe ? Son compte sera supprimé.`)) return;
    try { await del(`/espace/equipe/${m.id}`); recharger(); } catch (e) { erreurApi(e, 'Suppression impossible.'); }
  };

  return (
    <Page.Main>
      <Page.Title>Mon équipe</Page.Title>
      <Layouts.Header
        title="Mon équipe"
        subtitle="Les personnes qui gèrent le site et ce que chaque rôle peut faire."
        primaryAction={<Button startIcon={<Plus />} onClick={() => { setLien(null); setOuvert(true); }}>Inviter un collègue</Button>}
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          <Box hasRadius background="neutral0" shadow="tableShadow">
            <Table colCount={4} rowCount={donnees.membres.length + 1}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">Personne</Typography></Th>
                  <Th><Typography variant="sigma">Rôle</Typography></Th>
                  <Th><Typography variant="sigma">État</Typography></Th>
                  <Th><Typography variant="sigma">Actions</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {donnees.membres.map((m) => (
                  <Tr key={m.id}>
                    <Td>
                      <Flex direction="column" alignItems="flex-start">
                        <Typography fontWeight="bold">{m.prenom} {m.nom !== '-' ? m.nom : ''}{m.id === donnees.moi ? ' (vous)' : ''}</Typography>
                        <Typography variant="pi" textColor="neutral600">{m.email}</Typography>
                      </Flex>
                    </Td>
                    <Td>
                      {m.modifiable ? (
                        <SingleSelect
                          aria-label={`Rôle de ${m.prenom}`}
                          placeholder={m.roleNom || 'Choisir un rôle'}
                          value={donnees.roles.some((r) => r.code === m.roleCode) ? m.roleCode! : undefined}
                          onChange={(v: string | number) => changerRole(m, String(v))}
                        >
                          {donnees.roles.map((r) => <SingleSelectOption key={r.code} value={r.code}>{r.nom}</SingleSelectOption>)}
                        </SingleSelect>
                      ) : <Typography>{m.roleNom}</Typography>}
                    </Td>
                    <Td>
                      <Typography
                        variant="omega"
                        fontWeight="bold"
                        textColor={m.invitationEnAttente ? 'warning700' : m.actif ? 'success700' : 'neutral600'}
                      >
                        {m.invitationEnAttente ? 'Invitation en attente' : m.actif ? 'Actif' : 'Désactivé'}
                      </Typography>
                    </Td>
                    <Td>
                      {(m.modifiable || donnees.peutModifierIdentite) && (
                        <Flex gap={2} wrap="wrap">
                          {donnees.peutModifierIdentite && (
                            <Button size="S" variant="tertiary" startIcon={<Pencil />} onClick={() => ouvrirEdition(m)}>Modifier</Button>
                          )}
                          {!m.modifiable ? null : m.invitationEnAttente ? (
                            <Button size="S" variant="tertiary" startIcon={<Mail />} onClick={() => renvoyer(m)}>Renvoyer</Button>
                          ) : (
                            <Button size="S" variant="tertiary" onClick={() => basculer(m)}>{m.actif ? 'Désactiver' : 'Réactiver'}</Button>
                          )}
                          {m.modifiable && <Button size="S" variant="danger-light" onClick={() => retirer(m)}>Retirer</Button>}
                        </Flex>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          <Box padding={4} hasRadius background="neutral100">
            <Flex direction="column" alignItems="flex-start" gap={2}>
              {donnees.roles.map((r) => (
                <Typography key={r.code} variant="pi" textColor="neutral700"><strong>{r.nom}</strong> : {r.description}</Typography>
              ))}
            </Flex>
          </Box>

          <DroitsRoles />
        </Flex>

        <Modal.Root open={ouvert} onOpenChange={setOuvert}>
          <Modal.Content>
            <Modal.Header><Modal.Title>Inviter un collègue</Modal.Title></Modal.Header>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                {lien ? (
                  <Box padding={3} hasRadius background="success100">
                    <Typography variant="omega" tag="p">Invitation envoyée par e-mail. Si le message n'arrive pas, transmettez ce lien personnel :</Typography>
                    <Typography variant="pi" tag="p" style={{ wordBreak: 'break-all', userSelect: 'all' }}>{lien}</Typography>
                  </Box>
                ) : (
                  <>
                    <Field.Root name="email" required>
                      <Field.Label>Adresse e-mail</Field.Label>
                      <TextInput type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
                    </Field.Root>
                    <Flex gap={3}>
                      <Field.Root name="prenom" style={{ flex: 1 }}><Field.Label>Prénom</Field.Label><TextInput value={prenom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrenom(e.target.value)} /></Field.Root>
                      <Field.Root name="nom" style={{ flex: 1 }}><Field.Label>Nom</Field.Label><TextInput value={nom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNom(e.target.value)} /></Field.Root>
                    </Flex>
                    <Field.Root name="role" required>
                      <Field.Label>Rôle</Field.Label>
                      <SingleSelect value={role || donnees.roles[donnees.roles.length - 1]?.code} onChange={(v: string | number) => setRole(String(v))}>
                        {donnees.roles.map((r) => <SingleSelectOption key={r.code} value={r.code}>{r.nom}</SingleSelectOption>)}
                      </SingleSelect>
                    </Field.Root>
                  </>
                )}
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onClick={() => setOuvert(false)}>{lien ? 'Fermer' : 'Annuler'}</Button>
              {!lien && <Button onClick={inviter} loading={envoi} disabled={!email.includes('@')}>Envoyer l'invitation</Button>}
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>

        <Modal.Root open={!!edite} onOpenChange={(o: boolean) => { if (!o) setEdite(null); }}>
          <Modal.Content>
            <Modal.Header><Modal.Title>Modifier {edite?.prenom}</Modal.Title></Modal.Header>
            <Modal.Body>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Flex gap={3}>
                  <Field.Root name="edition-prenom" required style={{ flex: 1 }}>
                    <Field.Label>Prénom</Field.Label>
                    <TextInput value={edition.prenom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdition({ ...edition, prenom: e.target.value })} />
                  </Field.Root>
                  <Field.Root name="edition-nom" style={{ flex: 1 }}>
                    <Field.Label>Nom</Field.Label>
                    <TextInput value={edition.nom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdition({ ...edition, nom: e.target.value })} />
                  </Field.Root>
                </Flex>
                <Field.Root
                  name="edition-email"
                  required
                  hint={edite?.id === donnees.moi ? 'C’est votre adresse de connexion : utilisez la nouvelle à la prochaine connexion.' : 'La personne se connectera désormais avec cette adresse.'}
                >
                  <Field.Label>Adresse e-mail</Field.Label>
                  <TextInput type="email" value={edition.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdition({ ...edition, email: e.target.value })} />
                  <Field.Hint />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onClick={() => setEdite(null)}>Annuler</Button>
              <Button onClick={enregistrerEdition} loading={enregistrement} disabled={!edition.prenom.trim() || !edition.email.includes('@')}>Enregistrer</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      </Layouts.Content>
    </Page.Main>
  );
}
