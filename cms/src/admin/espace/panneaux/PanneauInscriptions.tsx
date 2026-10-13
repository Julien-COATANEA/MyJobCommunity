// Encart « Inscriptions » dans la fiche d'un événement : remplissage, derniers inscrits, export CSV.
import * as React from 'react';
import { Box, Button, Flex, ProgressBar, Typography } from '@strapi/design-system';
import { Download } from '@strapi/icons';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';

interface Inscriptions {
  titre: string;
  inscriptionActive: boolean;
  inscriptionExterneUrl: string | null;
  placesMax: number | null;
  nombre: number;
  liste: { documentId: string; nom: string; email: string; statut: string; createdAt: string }[];
}

function Contenu({ documentId }: { documentId: string }) {
  const { get } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [donnees, setDonnees] = React.useState<Inscriptions | null>(null);
  const [export_, setExport] = React.useState(false);

  React.useEffect(() => {
    get<Inscriptions>(`/espace/evenements/${documentId}/inscriptions`).then(({ data }) => setDonnees(data)).catch(() => {});
  }, [get, documentId]);

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

  const exporter = async () => {
    setExport(true);
    try {
      // Téléchargement authentifié : on récupère le fichier puis on le propose à l'enregistrement.
      const { data } = await get<Blob>(`/espace/evenements/${documentId}/inscriptions.csv`, { responseType: 'blob' } as any);
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data as any], { type: 'text/csv' }));
      lien.download = `inscrits-${donnees.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
      lien.click();
      URL.revokeObjectURL(lien.href);
    } catch {
      toggleNotification({ type: 'danger', message: "L'export n'a pas pu être généré." });
    } finally {
      setExport(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Box>
        <Typography variant="beta" tag="p">
          {donnees.nombre}
          {donnees.placesMax ? ` / ${donnees.placesMax}` : ''}
        </Typography>
        <Typography variant="pi" textColor="neutral600">inscrit{donnees.nombre > 1 ? 's' : ''}</Typography>
      </Box>
      {donnees.placesMax && <ProgressBar value={Math.min(100, Math.round((donnees.nombre / donnees.placesMax) * 100))} size="S" />}
      {donnees.liste.slice(0, 5).map((i) => (
        <Box key={i.documentId}>
          <Typography variant="omega" fontWeight="semiBold" tag="p" textDecoration={i.statut === 'annulee' ? 'line-through' : undefined}>
            {i.nom}
          </Typography>
          <Typography variant="pi" textColor="neutral600" tag="p">{i.email}</Typography>
        </Box>
      ))}
      {donnees.liste.length > 5 && (
        <Typography variant="pi" textColor="neutral600">et {donnees.liste.length - 5} autre(s)…</Typography>
      )}
      <Button variant="secondary" startIcon={<Download />} onClick={exporter} loading={export_} disabled={!donnees.liste.length} fullWidth>
        Exporter la liste (Excel)
      </Button>
    </Flex>
  );
}

export const PanneauInscriptions = ({ model, documentId }: { model: string; documentId?: string }) => {
  if (model !== 'api::evenement.evenement' || !documentId) return null;
  return { title: 'Inscriptions', content: <Contenu documentId={documentId} /> };
};
PanneauInscriptions.type = 'mjc-inscriptions';
