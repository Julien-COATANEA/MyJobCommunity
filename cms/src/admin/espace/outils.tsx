// Outils partagés par les écrans « espace collectivité » du back-office.
import * as React from 'react';
import { Link } from 'react-router-dom';
import { Box, Flex, Typography } from '@strapi/design-system';
import { getFetchClient } from '@strapi/strapi/admin';

// ---------- Données ----------

const cache = new Map<string, { instant: number; promesse: Promise<any> }>();
const DUREE_CACHE_MS = 5000;

/** Message d'erreur renvoyé par le serveur (ex. droits insuffisants), sinon le message par défaut. */
export const messageErreur = (e: any, defaut: string): string => e?.response?.data?.error?.message || defaut;

/** Charge une route admin (/espace/...). Plusieurs widgets peuvent partager le même appel. */
export function useDonnees<T>(url: string) {
  const [etat, setEtat] = React.useState<{ donnees?: T; erreur?: string; chargement: boolean }>({ chargement: true });
  const monte = React.useRef(true);

  const charger = React.useCallback(
    async (forcer = false) => {
      const enCache = cache.get(url);
      if (forcer || !enCache || Date.now() - enCache.instant > DUREE_CACHE_MS) {
        // Requête partagée entre widgets : surtout pas useFetchClient, qui l'annulerait au démontage du premier
        // widget (remontage du tableau de bord pendant un chargement lent) et ferait échouer tous les autres.
        cache.set(url, { instant: Date.now(), promesse: getFetchClient().get(url).then((r: any) => r.data) });
      }
      setEtat((e) => ({ ...e, chargement: true }));
      let promesse = cache.get(url)!.promesse;
      for (;;) {
        try {
          const donnees = await promesse;
          // Un rechargement plus récent a remplacé cette requête : on attend la sienne plutôt que d'afficher une réponse périmée.
          const actuelle = cache.get(url)?.promesse;
          if (actuelle && actuelle !== promesse) { promesse = actuelle; continue; }
          if (monte.current) setEtat({ donnees, chargement: false });
        } catch (e) {
          const actuelle = cache.get(url)?.promesse;
          if (actuelle && actuelle !== promesse) { promesse = actuelle; continue; }
          if (actuelle) cache.delete(url);
          if (monte.current) setEtat({ erreur: messageErreur(e, 'Les données n’ont pas pu être chargées.'), chargement: false });
        }
        return;
      }
    },
    [url],
  );

  React.useEffect(() => {
    monte.current = true;
    charger();
    return () => {
      monte.current = false;
    };
  }, [charger]);

  return { ...etat, recharger: () => charger(true) };
}

// ---------- Liens vers le gestionnaire de contenu ----------

export const liste = (uid: string) => `/content-manager/collection-types/${uid}`;
export const creation = (uid: string) => `/content-manager/collection-types/${uid}/create`;
export const fiche = (uid: string, documentId: string) => `/content-manager/collection-types/${uid}/${documentId}`;
export const unique = (uid: string) => `/content-manager/single-types/${uid}`;

// ---------- Dates ----------

export const formatDate = (iso: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  new Intl.DateTimeFormat('fr-FR', options).format(new Date(iso));

export function ilYA(iso: string | null | undefined): string {
  if (!iso) return 'jamais';
  const secondes = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  if (secondes < 60) return "à l'instant";
  if (secondes < 3600) return rtf.format(-Math.round(secondes / 60), 'minute');
  if (secondes < 86400) return rtf.format(-Math.round(secondes / 3600), 'hour');
  return rtf.format(-Math.round(secondes / 86400), 'day');
}

export const pluriel = (n: number, singulier: string, plurielTexte = `${singulier}s`) => `${n} ${n > 1 ? plurielTexte : singulier}`;

// ---------- Composants d'affichage ----------

/** Pastille d'icône colorée. */
export function Pastille({ children, couleur = 'primary' }: { children: React.ReactNode; couleur?: 'primary' | 'success' | 'warning' | 'danger' | 'alternative' | 'secondary' }) {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      width="4rem"
      height="4rem"
      hasRadius
      background={`${couleur}100`}
      color={`${couleur}600`}
      shrink={0}
    >
      {children}
    </Flex>
  );
}

/** Tuile cliquable : chiffre clé ou action rapide. */
export function Tuile({
  to,
  href,
  icone,
  titre,
  sousTitre,
  couleur,
}: {
  to?: string;
  href?: string;
  icone: React.ReactNode;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  couleur?: React.ComponentProps<typeof Pastille>['couleur'];
}) {
  const contenu = (
    <Box padding={3} hasRadius borderColor="neutral150" background="neutral0" height="100%" className="mjc-tuile">
      <Flex gap={3} alignItems="center">
        <Pastille couleur={couleur}>{icone}</Pastille>
        <Flex direction="column" alignItems="flex-start" gap={0}>
          <Typography variant="omega" fontWeight="bold" textColor="neutral800">
            {titre}
          </Typography>
          {sousTitre && (
            <Typography variant="pi" textColor="neutral600">
              {sousTitre}
            </Typography>
          )}
        </Flex>
      </Flex>
    </Box>
  );
  const style = { textDecoration: 'none', display: 'block', height: '100%' };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {contenu}
      </a>
    );
  }
  return to ? (
    <Link to={to} style={style}>
      {contenu}
    </Link>
  ) : (
    contenu
  );
}

/** Styles globaux légers des écrans « espace » (survol des tuiles). */
export function StylesEspace() {
  return (
    <style>{`
      .mjc-tuile { transition: border-color .15s, box-shadow .15s, transform .15s; }
      a:hover > .mjc-tuile, a:focus-visible > .mjc-tuile { border-color: var(--mjc-primaire, #4945ff); box-shadow: 0 4px 14px rgba(33,33,52,.08); transform: translateY(-1px); }
    `}</style>
  );
}
