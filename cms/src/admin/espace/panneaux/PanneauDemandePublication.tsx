// Encart « Demander la publication » : pour les rédacteurs, qui n'ont pas le bouton « Publier ».
import * as React from 'react';
import { Box, Button, Flex, Textarea, Typography } from '@strapi/design-system';
import { Mail } from '@strapi/icons';
import { useAuth, useFetchClient, useNotification } from '@strapi/strapi/admin';

const TYPES = ['api::page.page', 'api::article.article', 'api::accueil.accueil'];
const ACTION_PUBLIER = 'plugin::content-manager.explorer.publish';

function Contenu({ model, documentId }: { model: string; documentId?: string }) {
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [message, setMessage] = React.useState('');
  const [envoi, setEnvoi] = React.useState(false);
  const [envoye, setEnvoye] = React.useState(false);

  const demander = async () => {
    setEnvoi(true);
    try {
      const { data } = await post<{ destinataires: number }>('/espace/demande-publication', { uid: model, documentId, message });
      setEnvoye(true);
      toggleNotification({ type: 'success', message: `Demande envoyée à ${data.destinataires} responsable${data.destinataires > 1 ? 's' : ''}.` });
    } catch {
      toggleNotification({ type: 'danger', message: "La demande n'a pas pu être envoyée." });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography variant="pi" textColor="neutral600">
        Vous préparez ce contenu : un responsable le relira et le publiera.
      </Typography>
      {envoye ? (
        <Typography variant="pi" textColor="success700">Demande envoyée. Un responsable va relire et publier votre contenu.</Typography>
      ) : (
        <>
          <Box>
            <Textarea
              aria-label="Message au responsable (facultatif)"
              placeholder="Un mot pour le responsable (facultatif)"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            />
          </Box>
          <Button startIcon={<Mail />} onClick={demander} loading={envoi} fullWidth>
            Demander la publication
          </Button>
        </>
      )}
    </Flex>
  );
}

export const PanneauDemandePublication = ({ model, documentId }: { model: string; documentId?: string }) => {
  const permissions = useAuth('PanneauDemandePublication', (s) => s.permissions);
  if (!TYPES.includes(model) || (!documentId && model !== 'api::accueil.accueil')) return null;
  // Les personnes qui peuvent publier n'ont pas besoin de cet encart.
  if (permissions.some((p) => p.action === ACTION_PUBLIER && p.subject === model)) return null;
  return { title: 'Publication', content: <Contenu model={model} documentId={documentId} /> };
};
PanneauDemandePublication.type = 'mjc-demande-publication';
