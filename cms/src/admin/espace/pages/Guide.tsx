// Page « Aide » : guide d'utilisation du back-office pour les collectivités.
import * as React from 'react';
import { Box, Flex, Grid, Typography } from '@strapi/design-system';
import { Layouts, Page } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import { rouvrirBienvenue } from '../Bienvenue';

const support = process.env.STRAPI_ADMIN_SUPPORT_EMAIL || '';

function Fiche({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <Box padding={6} hasRadius background="neutral0" shadow="tableShadow" height="100%">
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Typography variant="delta" tag="h2">{titre}</Typography>
        <Box className="mjc-guide">{children}</Box>
      </Flex>
    </Box>
  );
}

const BLOCS: [string, string][] = [
  ['Texte', 'Un ou plusieurs paragraphes, avec intertitres et listes.'],
  ['Texte et image côte à côte', 'Présenter un sujet avec une photo ; l’image peut être à gauche ou à droite.'],
  ['Chiffres clés', 'Trois à six chiffres marquants. {offres}, {entreprises}, {recrutent} (entreprises qui ont des offres) et {evenements} se mettent à jour tout seuls.'],
  ['Cartes avec icônes', 'Quatre à huit thèmes courts (« S’installer », « Se former »…), avec un lien chacun.'],
  ['Témoignages', 'Paroles de salariés ou de nouveaux arrivants : très efficace pour l’attractivité.'],
  ['Questions fréquentes', 'Questions/réponses repliables.'],
  ['Appel à l’action', 'Un bandeau coloré avec un ou deux boutons (« Déposer mon CV »…).'],
  ['Dernières offres, actualités, événements, entreprises', 'Listes alimentées automatiquement : rien à mettre à jour.'],
  ['Logos des partenaires', 'Logos cliquables (nommez chaque partenaire).'],
];

export default function Guide() {
  return (
    <Page.Main>
      <Page.Title>Aide</Page.Title>
      <style>{`.mjc-guide p, .mjc-guide li { font-size: 1.4rem; line-height: 1.6; color: #32324d; } .mjc-guide ul, .mjc-guide ol { padding-left: 2rem; margin: .4rem 0; } .mjc-guide li + li { margin-top: .4rem; } .mjc-guide p + p { margin-top: .6rem; } .mjc-guide a { color: #4945ff; font-weight: 600; }`}</style>
      <Layouts.Header title="Aide" subtitle="L’essentiel pour faire vivre votre site, en quelques minutes." />
      <Layouts.Content>
        <Grid.Root gap={5}>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="1. Enregistrer, prévisualiser, publier">
              <ol>
                <li><strong>Enregistrer et publier</strong> met en ligne : le site est à jour quelques secondes plus tard.</li>
                <li><strong>Enregistrer</strong> (pages et articles) garde un brouillon : rien ne change sur le site. Vous pouvez aussi programmer une date de mise en ligne.</li>
                <li><strong>Aperçu</strong> (en haut de la fiche) montre la page telle qu’elle sera, avant publication.</li>
                <li>L’encart <strong>Avant de publier</strong> signale les oublis : image sans description, lien cassé, titre trop long…</li>
                <li>Un rédacteur n’a pas le bouton de publication : il <strong>demande la publication</strong> et un responsable la valide.</li>
              </ol>
              <p>L’indicateur en bas du menu affiche l’état du site. Astuce : <strong>Ctrl + K</strong> retrouve n’importe quel contenu.</p>
              <p><a href="#" onClick={(e) => { e.preventDefault(); rouvrirBienvenue(); }}>Revoir la fenêtre de bienvenue</a></p>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="2. Les images">
              <ul>
                <li>Photos au format paysage, 1 600 pixels de large suffisent : le site les optimise automatiquement.</li>
                <li>
                  Remplissez le <strong>texte alternatif</strong> dans la <Link to="/plugins/upload">médiathèque</Link> : il décrit l’image
                  aux personnes aveugles (« Vue du lac au coucher du soleil »). Laissez-le vide si l’image est purement décorative.
                </li>
                <li>Pas de texte important écrit dans une image : il ne serait ni lisible par tous, ni trouvé par Google.</li>
              </ul>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={12} direction="column" alignItems="stretch">
            <Fiche titre="3. Composer une page avec des blocs">
              <p>
                Dans <Link to="/content-manager/collection-types/api::page.page">Mes pages</Link> ou{' '}
                <Link to="/content-manager/single-types/api::accueil.accueil">Ma page d’accueil</Link>, ajoutez des blocs dans « Contenu
                de la page », puis réordonnez-les par glisser-déposer. Chaque bloc a une mise en forme déjà prévue : vous n’avez qu’à
                remplir le texte. Pour gagner du temps, le bouton « À partir d’un modèle » de Mes pages crée une page déjà composée.
              </p>
              <ul>
                {BLOCS.map(([nom, usage]) => (
                  <li key={nom}><strong>{nom}</strong> : {usage}</li>
                ))}
              </ul>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="4. Événements et inscriptions">
              <ul>
                <li>Cochez <strong>Inscription en ligne sur le site</strong> pour afficher le formulaire ; indiquez si besoin un nombre de places et une date limite.</li>
                <li>Les inscrits apparaissent dans l’encart <strong>Inscriptions</strong> de la fiche : export Excel, liste d’émargement à imprimer, message à tous les inscrits.</li>
                <li>Quand l’événement est complet, une <strong>liste d’attente</strong> prend le relais : si quelqu’un annule (lien dans son e-mail), le suivant est prévenu.</li>
                <li>Chaque inscrit reçoit une confirmation puis un rappel la veille ; vous recevez une notification (adresse dans Informations du site).</li>
                <li>Les inscriptions sont supprimées automatiquement 12 mois après l’événement (RGPD).</li>
              </ul>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="5. Offres d’emploi">
              <ul>
                <li>Les offres se créent dans <strong>Gestmax</strong> et arrivent seules sur le site (toutes les 30 minutes).</li>
                <li>Pour relier les offres d’une entreprise à sa fiche de l’annuaire, utilisez « Coupler les entreprises » dans Mes offres d’emploi.</li>
                <li>Elles ne se créent ni ne se modifient ici. Dans <Link to="/mes-offres">Mes offres d’emploi</Link>, vous pouvez seulement en mettre à la une ou en masquer.</li>
              </ul>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="6. Écrire pour tous (accessibilité)">
              <ul>
                <li>Utilisez les intertitres dans l’ordre (Titre 2, puis Titre 3), sans sauter de niveau.</li>
                <li>Des liens explicites : « Consulter le programme du forum » plutôt que « cliquez ici ».</li>
                <li>Préférez une page web à un PDF ; si un PDF est indispensable, indiquez son poids.</li>
              </ul>
            </Fiche>
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <Fiche titre="7. Besoin d’aide ?">
              <p>
                Logo, couleurs : <Link to="/apparence">Apparence</Link>. Menus : <Link to="/content-manager/single-types/api::navigation.navigation">Menus du site</Link>.
                Candidatures : <Link to="/site-carriere">Site carrière</Link>. Collègues : <Link to="/equipe">Mon équipe</Link>.
                Points à corriger : <Link to="/sante">Santé du site</Link>. Bandeau de cookies et outils de mesure : <Link to="/cookies">Cookies et suivi</Link>.
              </p>
              {support && (
                <p>
                  Une question ? Écrivez-nous : <a href={`mailto:${support}`}>{support}</a>
                </p>
              )}
            </Fiche>
          </Grid.Item>
        </Grid.Root>
      </Layouts.Content>
    </Page.Main>
  );
}
