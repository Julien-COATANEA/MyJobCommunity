// Encart « Sur le site » dans chaque fiche publiable : état de publication et bouton « Voir sur le site ».
import * as React from 'react';
import { Badge, Flex, LinkButton, Typography } from '@strapi/design-system';
import { Eye } from '@strapi/icons';
import { useFetchClient } from '@strapi/strapi/admin';
import { definition } from '../types';

interface Etat { publie: boolean; modifie: boolean; url: string | null }

function Contenu({ model, documentId, maj }: { model: string; documentId?: string; maj?: string }) {
  const { get } = useFetchClient();
  const [etat, setEtat] = React.useState<Etat | null>(null);

  React.useEffect(() => {
    if (!documentId && !definition(model)?.unique) return;
    const params = new URLSearchParams({ uid: model, documentId: documentId ?? '' });
    get<Etat>(`/espace/lien-public?${params}`).then(({ data }) => setEtat(data)).catch(() => setEtat(null));
  }, [get, model, documentId, maj]);

  if (!etat) {
    return <Typography variant="pi" textColor="neutral600">Enregistrez puis publiez pour mettre ce contenu en ligne.</Typography>;
  }
  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Flex gap={2} wrap="wrap">
        {!etat.publie ? (
          <Badge backgroundColor="neutral150" textColor="neutral700">Pas encore en ligne</Badge>
        ) : etat.modifie ? (
          <Badge backgroundColor="warning100" textColor="warning700">Modifications non publiées</Badge>
        ) : (
          <Badge backgroundColor="success100" textColor="success700">En ligne</Badge>
        )}
      </Flex>
      <Typography variant="pi" textColor="neutral600">
        {!etat.publie
          ? '« Enregistrer » garde un brouillon. Cliquez sur « Publier » pour le mettre en ligne.'
          : etat.modifie
            ? 'Vos dernières modifications ne sont visibles qu’après « Publier ».'
            : 'Le site est mis à jour quelques secondes après chaque publication.'}
      </Typography>
      {etat.url && (
        <LinkButton variant="secondary" startIcon={<Eye />} href={etat.url} isExternal>
          Voir sur le site
        </LinkButton>
      )}
    </Flex>
  );
}

export const PanneauSite = ({ model, documentId, document }: { model: string; documentId?: string; document?: any }) => {
  if (!definition(model)) return null;
  return {
    title: 'Sur le site',
    content: <Contenu model={model} documentId={documentId} maj={document?.updatedAt ?? document?.publishedAt} />,
  };
};
PanneauSite.type = 'mjc-site';
