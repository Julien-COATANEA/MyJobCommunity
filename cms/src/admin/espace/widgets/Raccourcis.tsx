// Widget « Actions rapides » du tableau de bord.
import { Grid } from '@strapi/design-system';
import { Briefcase, Calendar, File, PaintBrush, Pencil, Store } from '@strapi/icons';
import { StylesEspace, Tuile, creation } from '../outils';

export default function Raccourcis() {
  const actions = [
    { to: creation('api::article.article'), icone: <Pencil />, titre: 'Rédiger un article', sousTitre: 'Actualité, témoignage…', couleur: 'primary' as const },
    { to: creation('api::evenement.evenement'), icone: <Calendar />, titre: 'Créer un événement', sousTitre: 'Forum, job dating, atelier', couleur: 'success' as const },
    { to: creation('api::page.page'), icone: <File />, titre: 'Ajouter une page', sousTitre: 'Composée de blocs', couleur: 'secondary' as const },
    { to: creation('api::entreprise.entreprise'), icone: <Store />, titre: 'Ajouter une entreprise', sousTitre: "À l'annuaire", couleur: 'alternative' as const },
    { to: '/mes-offres', icone: <Briefcase />, titre: 'Suivre mes offres', sousTitre: 'Importées de Gestmax', couleur: 'warning' as const },
    { to: '/apparence', icone: <PaintBrush />, titre: "Changer l'apparence", sousTitre: 'Logo, couleurs, polices', couleur: 'danger' as const },
  ];

  return (
    <>
      <StylesEspace />
      {/* Marge intérieure : le contenu du widget défile (overflow), il rognerait l'ombre et le soulèvement au survol. */}
      <Grid.Root gap={3} paddingTop={1} paddingLeft={2} paddingRight={2} paddingBottom={3}>
        {actions.map((a) => (
          <Grid.Item key={a.titre} col={6} xs={12} direction="column" alignItems="stretch">
            <Tuile {...a} />
          </Grid.Item>
        ))}
      </Grid.Root>
    </>
  );
}
