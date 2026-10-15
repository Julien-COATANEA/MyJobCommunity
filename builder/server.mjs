// Service de régénération du site statique.
//  - POST /build (webhook Strapi, jeton Bearer) : relance `astro build` après un délai d'inactivité ;
//  - GET  /status : état du dernier build.
// Chaque build part dans un nouveau dossier releases/<horodatage>, puis le lien « current » (servi par Nginx)
// est basculé atomiquement : aucune coupure, et retour arrière possible.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const PORT = 4000;
const SITE_DIR = process.env.SITE_DIR ?? '/app';
const RELEASES_DIR = process.env.RELEASES_DIR ?? '/srv/site';
const TOKEN = process.env.BUILD_TOKEN ?? '';
const DEBOUNCE_MS = Number(process.env.BUILD_DEBOUNCE_MS ?? 8000);
const STRAPI_URL = process.env.STRAPI_URL ?? 'http://strapi:1337';
const VERSIONS_CONSERVEES = 3;
const TRAVAIL = '/tmp/site-build';

// Contenus qui n'apparaissent pas sur le site : inutile de reconstruire.
const MODELES_IGNORES = new Set(['inscription']);

const etat = { enCours: false, enAttente: false, dernierBuild: null, dureeMs: null, derniereErreur: null, declencheur: null };
let minuteur = null;
let tentatives = 0;
const TENTATIVES_MAX = 5;
const DELAI_NOUVELLE_TENTATIVE_MS = 20_000;

const log = (...args) => console.log(new Date().toISOString(), ...args);

// Sous Docker Desktop / WSL, le conteneur peut démarrer avant que le dossier du site soit monté : il resterait vide
// et chaque build échouerait. On s'arrête pour que Docker relance le conteneur (restart: unless-stopped).
if (!existsSync(join(SITE_DIR, 'package.json'))) {
  log(`${SITE_DIR}/package.json introuvable (dossier du site pas encore monté ?) : arrêt, Docker relancera le builder`);
  process.exit(1);
}

function planifier(raison) {
  etat.declencheur = raison;
  clearTimeout(minuteur);
  minuteur = setTimeout(lancer, DEBOUNCE_MS);
  log(`build planifié dans ${DEBOUNCE_MS} ms (${raison})`);
}

async function lancer() {
  if (etat.enCours) {
    etat.enAttente = true;
    return;
  }
  if (!existsSync(join(SITE_DIR, 'package.json'))) {
    log(`${SITE_DIR}/package.json introuvable (montage perdu ?) : arrêt, Docker relancera le builder`);
    process.exit(1);
  }
  etat.enCours = true;
  const version = new Date().toISOString().replace(/[:.]/g, '-');
  const sortie = join(RELEASES_DIR, 'releases', version);
  const debut = Date.now();
  log(`build ${version} démarré`);

  try {
    // Strapi peut être en train de redémarrer (sa synchronisation au démarrage déclenche des webhooks).
    await attendreStrapi(120_000);
    // Astro déplace ses fichiers par rename() : source et sortie doivent être sur le même système de fichiers.
    // On construit donc dans une copie locale au conteneur, puis on copie le résultat dans le volume publié.
    rmSync(TRAVAIL, { recursive: true, force: true });
    cpSync(SITE_DIR, TRAVAIL, { recursive: true, filter: (chemin) => !/[/\\](node_modules|dist|\.astro)$/.test(chemin) });
    symlinkSync(join(SITE_DIR, 'node_modules'), join(TRAVAIL, 'node_modules'));
    await executer('npm', ['run', 'build'], { ...process.env, OUT_DIR: join(TRAVAIL, 'dist') });
    // Avec l'adaptateur Node, Astro range les pages statiques dans dist/client (dist/server = aperçu à la demande).
    const statique = existsSync(join(TRAVAIL, 'dist', 'client')) ? join(TRAVAIL, 'dist', 'client') : join(TRAVAIL, 'dist');
    cpSync(statique, sortie, { recursive: true });
    basculer(version);
    nettoyer();
    etat.dernierBuild = new Date().toISOString();
    etat.derniereErreur = null;
    etat.dureeMs = Date.now() - debut;
    tentatives = 0;
    log(`build ${version} publié en ${etat.dureeMs} ms`);
  } catch (e) {
    etat.derniereErreur = e.message;
    rmSync(sortie, { recursive: true, force: true });
    log(`build ${version} en échec : ${e.message} (la version en ligne est conservée)`);
    // Nouvelle tentative automatique : une erreur passagère ne doit pas laisser le site en retard.
    if (++tentatives <= TENTATIVES_MAX) {
      log(`nouvelle tentative ${tentatives}/${TENTATIVES_MAX} dans ${DELAI_NOUVELLE_TENTATIVE_MS / 1000} s`);
      setTimeout(() => planifier('nouvelle tentative après échec'), DELAI_NOUVELLE_TENTATIVE_MS);
    } else {
      tentatives = 0;
    }
  } finally {
    etat.enCours = false;
    if (etat.enAttente) {
      etat.enAttente = false;
      planifier('modifications reçues pendant le build');
    }
  }
}

/** Attend que l'API Strapi réponde (au plus `delaiMax` ms). */
async function attendreStrapi(delaiMax) {
  const limite = Date.now() + delaiMax;
  while (Date.now() < limite) {
    try {
      const r = await fetch(`${STRAPI_URL}/api/parametres`, { signal: AbortSignal.timeout(5000) });
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Strapi ne répond pas');
}

function executer(commande, args, env) {
  return new Promise((resolve, reject) => {
    const processus = spawn(commande, args, { cwd: TRAVAIL, env, stdio: 'inherit' });
    processus.on('error', reject);
    processus.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${commande} a terminé avec le code ${code}`))));
  });
}

/** Remplace le lien « current » de façon atomique (rename d'un lien temporaire). */
function basculer(version) {
  const temporaire = join(RELEASES_DIR, `current-${version}`);
  symlinkSync(join('releases', version), temporaire);
  renameSync(temporaire, join(RELEASES_DIR, 'current'));
}

function nettoyer() {
  const dossier = join(RELEASES_DIR, 'releases');
  const versions = readdirSync(dossier).sort();
  for (const ancienne of versions.slice(0, -VERSIONS_CONSERVEES)) rmSync(join(dossier, ancienne), { recursive: true, force: true });
}

function lireCorps(requete) {
  return new Promise((resolve) => {
    let corps = '';
    requete.on('data', (morceau) => (corps += morceau));
    requete.on('end', () => {
      try {
        resolve(JSON.parse(corps || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

/** Un brouillon modifié ou une inscription ne changent rien au site public. */
function estPertinent(evenement) {
  if (MODELES_IGNORES.has(evenement.model)) return false;
  if (['entry.create', 'entry.update'].includes(evenement.event) && evenement.entry && evenement.entry.publishedAt === null) return false;
  return true;
}

createServer(async (requete, reponse) => {
  const repondre = (code, json) => {
    reponse.writeHead(code, { 'Content-Type': 'application/json' });
    reponse.end(JSON.stringify(json));
  };

  if (requete.method === 'GET' && requete.url === '/status') return repondre(200, etat);

  if (requete.method === 'POST' && requete.url === '/build') {
    if (TOKEN && requete.headers.authorization !== `Bearer ${TOKEN}`) return repondre(401, { erreur: 'jeton invalide' });
    const evenement = await lireCorps(requete);
    if (!estPertinent(evenement)) return repondre(202, { planifie: false });
    planifier(`${evenement.event ?? 'manuel'} ${evenement.model ?? ''}`.trim());
    return repondre(202, { planifie: true });
  }

  repondre(404, { erreur: 'introuvable' });
}).listen(PORT, () => log(`builder à l'écoute sur :${PORT}`));

// Build initial dès que Strapi répond, puis un build quotidien (événements passés, offres expirées).
mkdirSync(join(RELEASES_DIR, 'releases'), { recursive: true });
attendreStrapi(Infinity).then(() => planifier('démarrage'));

let dernierJour = null;
setInterval(() => {
  const maintenant = new Date();
  const jour = maintenant.toISOString().slice(0, 10);
  if (maintenant.getHours() === 3 && dernierJour !== jour) {
    dernierJour = jour;
    planifier('build quotidien');
  }
}, 60_000);
