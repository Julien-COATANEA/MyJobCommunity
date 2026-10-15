// Encart « Inscriptions » dans la fiche d'un événement : remplissage, liste d'attente, écrire aux inscrits,
// export Excel et liste d'émargement imprimable.
import * as React from 'react';
import { Box, Button, Checkbox, Field, Flex, Modal, ProgressBar, TextInput, Textarea, Typography } from '@strapi/design-system';
import { Download, File as Fichier, Mail } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { messageErreur } from '../outils';

interface Inscrit {
  documentId: string; nom: string; prenom: string; nomFamille: string; email: string; telephone: string | null;
  structure: string | null; statut: 'confirmee' | 'attente' | 'annulee'; present: boolean; createdAt: string;
}
interface Inscriptions {
  titre: string; dateDebut: string; lieu: string;
  inscriptionActive: boolean; inscriptionExterneUrl: string | null; placesMax: number | null;
  nombre: number; attente: number; presents: number; liste: Inscrit[];
}

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Page imprimable : une ligne par personne, une case de signature, les inscrits sur liste d'attente à part. */
function ouvrirEmargement(d: Inscriptions) {
  const confirmes = d.liste.filter((i) => i.statut === 'confirmee').sort((a, b) => a.nomFamille.localeCompare(b.nomFamille, 'fr'));
  const quand = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(d.dateDebut));
  const lignes = confirmes
    .map((i, n) => `<tr><td>${n + 1}</td><td>${echapper(i.nomFamille.toUpperCase())} ${echapper(i.prenom)}</td><td>${echapper(i.structure ?? '')}</td><td>${echapper(i.telephone ?? '')}</td><td class="sig"></td></tr>`)
    .join('');
  const fenetre = window.open('', '_blank');
  if (!fenetre) return false;
  fenetre.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Liste d'émargement : ${echapper(d.titre)}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h1{font-size:20px;margin:0 0 4px}p{margin:2px 0 16px;color:#444}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #888;padding:8px;font-size:13px;text-align:left}th{background:#eee}.sig{width:28%;height:34px}
@media print{button{display:none}}</style></head><body>
<h1>Liste d'émargement : ${echapper(d.titre)}</h1><p>${echapper(quand)}${d.lieu ? ` · ${echapper(d.lieu)}` : ''} · ${confirmes.length} inscrit(s)</p>
<button onclick="window.print()">Imprimer</button>
<table><thead><tr><th>N°</th><th>Nom et prénom</th><th>Organisme</th><th>Téléphone</th><th>Signature</th></tr></thead><tbody>${lignes}</tbody></table>
</body></html>`);
  fenetre.document.close();
  return true;
}

function Contenu({ documentId }: { documentId: string }) {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [donnees, setDonnees] = React.useState<Inscriptions | null>(null);
  const [export_, setExport] = React.useState(false);
  const [ouvert, setOuvert] = React.useState(false);
  const [sujet, setSujet] = React.useState('');
  const [corps, setCorps] = React.useState('');
  const [aussiAttente, setAussiAttente] = React.useState(false);
  const [envoi, setEnvoi] = React.useState(false);
  const [erreur, setErreur] = React.useState<string | null>(null);

  const charger = React.useCallback(() => {
    setErreur(null);
    return get<Inscriptions>(`/espace/evenements/${documentId}/inscriptions`)
      .then(({ data }) => setDonnees(data))
      .catch((e) => setErreur(messageErreur(e, "Les inscriptions n'ont pas pu être chargées.")));
  }, [get, documentId]);
  React.useEffect(() => { charger(); }, [charger]);

  if (erreur) {
    return (
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Typography variant="pi" textColor="danger600">{erreur}</Typography>
        <Button variant="tertiary" onClick={charger} fullWidth>Réessayer</Button>
      </Flex>
    );
  }
  if (!donnees) return null;
  if (!donnees.inscriptionActive || donnees.inscriptionExterneUrl) {
    return (
      <Typography variant="pi" textColor="neutral600">
        {donnees.inscriptionExterneUrl
          ? "Les inscriptions se font sur le site de l'organisateur."
          : 'Activez « Inscription en ligne sur le site » pour recevoir des inscriptions.'}
      </Typography>
    );
  }

  const confirmes = donnees.liste.filter((i) => i.statut === 'confirmee');
  const attente = donnees.liste.filter((i) => i.statut === 'attente');

  const exporter = async () => {
    setExport(true);
    try {
      const { data } = await get<Blob>(`/espace/evenements/${documentId}/inscriptions.csv`, { responseType: 'blob' } as any);
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data as any], { type: 'text/csv' }));
      lien.download = `inscrits-${donnees.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
      lien.click();
      URL.revokeObjectURL(lien.href);
    } catch (e: any) {
      // Réponse attendue en fichier : le message d'erreur du serveur arrive lui aussi sous forme de fichier.
      let message = messageErreur(e, "L'export n'a pas pu être généré.");
      if (e?.response?.data instanceof Blob) {
        message = await e.response.data.text().then((t: string) => JSON.parse(t)?.error?.message || message).catch(() => message);
      }
      toggleNotification({ type: 'danger', message });
    } finally {
      setExport(false);
    }
  };

  const envoyer = async () => {
    setEnvoi(true);
    try {
      const { data } = await post<{ envoyes: number; echecs: number }>(`/espace/evenements/${documentId}/message`, { sujet, corps, aussiAttente });
      toggleNotification({
        type: data.echecs ? 'warning' : 'success',
        message: `Message envoyé à ${data.envoyes} personne${data.envoyes > 1 ? 's' : ''}${data.echecs ? ` (${data.echecs} échec${data.echecs > 1 ? 's' : ''})` : ''}.`,
      });
      setOuvert(false);
      setSujet('');
      setCorps('');
    } catch (e: any) {
      toggleNotification({ type: 'danger', message: messageErreur(e, "Le message n'a pas pu être envoyé.") });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Box>
        <Typography variant="beta" tag="p">
          {donnees.nombre}
          {donnees.placesMax ? ` / ${donnees.placesMax}` : ''}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          inscrit{donnees.nombre > 1 ? 's' : ''}
          {donnees.attente > 0 ? ` · ${donnees.attente} en attente` : ''}
          {donnees.presents > 0 ? ` · ${donnees.presents} présent${donnees.presents > 1 ? 's' : ''}` : ''}
        </Typography>
      </Box>
      {donnees.placesMax && <ProgressBar value={Math.min(100, Math.round((donnees.nombre / donnees.placesMax) * 100))} size="S" />}
      {confirmes.slice(0, 4).map((i) => (
        <Box key={i.documentId}>
          <Typography variant="omega" fontWeight="semiBold" tag="p">{i.nom}</Typography>
          <Typography variant="pi" textColor="neutral600" tag="p">{i.email}</Typography>
        </Box>
      ))}
      {confirmes.length > 4 && <Typography variant="pi" textColor="neutral600">et {confirmes.length - 4} autre(s)…</Typography>}
      {attente.length > 0 && (
        <Typography variant="pi" textColor="warning700">
          Liste d'attente : {attente.slice(0, 2).map((i) => i.nom).join(', ')}{attente.length > 2 ? '…' : ''}
        </Typography>
      )}

      <Button variant="secondary" startIcon={<Mail />} onClick={() => setOuvert(true)} disabled={!confirmes.length} fullWidth>
        Écrire aux inscrits
      </Button>
      <Button variant="secondary" startIcon={<Fichier />} onClick={() => ouvrirEmargement(donnees)} disabled={!confirmes.length} fullWidth>
        Liste d'émargement
      </Button>
      <Button variant="tertiary" startIcon={<Download />} onClick={exporter} loading={export_} disabled={!donnees.liste.length} fullWidth>
        Exporter (Excel)
      </Button>

      <Modal.Root open={ouvert} onOpenChange={setOuvert}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Écrire aux inscrits</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" alignItems="stretch" gap={4}>
              <Typography variant="pi" textColor="neutral600">
                Le message part à {confirmes.length} personne{confirmes.length > 1 ? 's' : ''}, une par une : personne ne voit l'adresse des autres.
              </Typography>
              <Field.Root name="sujet" required>
                <Field.Label>Objet</Field.Label>
                <TextInput value={sujet} placeholder="Ex. : Changement de salle" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSujet(e.target.value)} />
              </Field.Root>
              <Field.Root name="corps" required>
                <Field.Label>Message</Field.Label>
                <Textarea value={corps} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCorps(e.target.value)} />
              </Field.Root>
              {attente.length > 0 && (
                <Checkbox checked={aussiAttente} onCheckedChange={(v: boolean) => setAussiAttente(!!v)}>
                  Écrire aussi aux {attente.length} personne{attente.length > 1 ? 's' : ''} en liste d'attente
                </Checkbox>
              )}
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onClick={() => setOuvert(false)}>Annuler</Button>
            <Button onClick={envoyer} loading={envoi} disabled={!sujet.trim() || !corps.trim()}>Envoyer</Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Flex>
  );
}

export const PanneauInscriptions = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (model !== 'api::evenement.evenement' || !documentId) return null;
  return { title: 'Inscriptions', content: <Contenu documentId={documentId} /> };
};
PanneauInscriptions.type = 'mjc-inscriptions';
