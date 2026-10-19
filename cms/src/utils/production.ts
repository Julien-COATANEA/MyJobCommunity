// Refuse de démarrer en production avec un secret absent ou resté à sa valeur d'exemple (« change_me » de .env.example) :
// mot de passe de démo connu, jetons du builder ou de l'en-tête Gestmax devinables, sessions du BO falsifiables.

const SECRETS = [
  'APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'JWT_SECRET', 'ENCRYPTION_KEY',
  'DATABASE_PASSWORD', 'DATABASE_ROOT_PASSWORD', 'BUILD_TOKEN', 'APERCU_SECRET', 'HEADER_FOOTER_TOKEN',
];
// Jetons comparés à une valeur reçue d'un tiers : assez longs pour ne pas se deviner.
const LONGUEUR_MIN_JETON = 16;
const JETONS = ['BUILD_TOKEN', 'APERCU_SECRET', 'HEADER_FOOTER_TOKEN'];

const exemple = (valeur: string) => /change_me/i.test(valeur);

/** Problèmes de configuration bloquants en production (liste vide : tout va bien). */
export function problemesConfiguration(env: NodeJS.ProcessEnv = process.env): string[] {
  const problemes: string[] = [];
  for (const nom of SECRETS) {
    const valeur = env[nom]?.trim() ?? '';
    if (!valeur) problemes.push(`${nom} est vide`);
    else if (exemple(valeur)) problemes.push(`${nom} a encore la valeur d'exemple « change_me »`);
    else if (JETONS.includes(nom) && valeur.length < LONGUEUR_MIN_JETON) problemes.push(`${nom} doit faire au moins ${LONGUEUR_MIN_JETON} caractères`);
  }
  // Comptes de démonstration : créés avec ces mots de passe, ils ouvriraient le BO à qui lit .env.example.
  if (env.SEED_DEMO === 'true') {
    for (const nom of ['DEMO_ADMIN_PASSWORD', 'DEMO_EDITEUR_PASSWORD']) {
      if (env[nom] && exemple(env[nom]!)) problemes.push(`${nom} a encore la valeur d'exemple « change_me »`);
    }
  }
  return problemes;
}

export function verifierConfigurationProduction() {
  if (process.env.NODE_ENV !== 'production') return;
  const problemes = problemesConfiguration();
  if (problemes.length) {
    throw new Error(`Configuration de production incomplète (.env) :\n - ${problemes.join('\n - ')}`);
  }
  // Pas bloquant : une recette tourne aussi avec docker-compose.prod.yml, volontairement non indexée.
  if (process.env.SITE_ENV !== 'production') {
    console.warn(`[production] SITE_ENV=${process.env.SITE_ENV ?? ''} : le site public est en « noindex » et son robots.txt interdit tout. Mettre SITE_ENV=production pour le site en ligne.`);
  }
}
