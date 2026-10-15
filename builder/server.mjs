// Service de régénération du site statique.
//  - POST /build (webhook Strapi, jeton Bearer) : relance `astro build` après un délai d'inactivité ;
//  - GET  /status : état du dernier build.
// Chaque build part dans un nouveau dossier releases/<horodatage>, puis le lien « current » (servi par Nginx)
// est basculé atomiquement : aucune coupure, et retour arrière possible.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';

const PORT = 4000;
const SITE_DIR = process.env.SITE_DIR ?? '/app';
const RELEASES_DIR = process.env.RELEASES_DIR ?? '/srv/site';
const TOKEN = process.env.BUILD_TOKEN ?? '';
const DEBOUNCE_MS = Number(process.env.BUILD_DEBOUNCE_MS ?? 8000);
const STRAPI_URL = process.env.STRAPI_URL ?? 'http://strapi:1337';
// Versions gardées pour un retour arrière : 3, mais seulement 2 quand une version dépasse GROSSE_VERSION_OCTETS
// (dizaines de milliers de pages : plusieurs Go chacune).
const VERSIONS_CONSERVEES = 3;
const VERSIONS_CONSERVEES_GROSSE = 2;
const GROSSE_VERSION_OCTETS = 1024 ** 3;
// Durée maximale d'un build : au-delà, il est arrêté et signalé en erreur (Strapi bloqué, boucle…).
const BUILD_DELAI_MAX_MS = Number(process.env.BUILD_TIMEOUT_MS ?? 45 * 60_000);
// Le dossier de travail est dans le volume des versions : la sortie d'Astro y est déjà au bon endroit et se publie par
// un simple rename (instantané), au lieu de recopier des dizaines de milliers de fichiers. Nginx ne sert que « current ».
const TRAVAIL = join(RELEASES_DIR, '.travail');

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
    await menage; // le ménage du build précédent (suppression de milliers de fichiers) doit être terminé
    // Astro déplace ses fichiers par rename() : source et sortie doivent être sur le même système de fichiers.
    // On construit donc dans une copie du site (sans node_modules), au même endroit que les versions publiées.
    const t0 = Date.now();
    await supprimer(TRAVAIL);
    // Copie par un processus à part (cp) : une copie synchrone bloquerait /status et les webhooks pendant ce temps.
    await commande('mkdir', ['-p', TRAVAIL]);
    const aCopier = readdirSync(SITE_DIR).filter((nom) => !['node_modules', 'dist', '.astro'].includes(nom)).map((nom) => join(SITE_DIR, nom));
    if (aCopier.length) await commande('cp', ['-a', ...aCopier, TRAVAIL]);
    symlinkSync(join(SITE_DIR, 'node_modules'), join(TRAVAIL, 'node_modules'));
    await executer('npm', ['run', 'build'], { ...process.env, OUT_DIR: join(TRAVAIL, 'dist'), MJC_BUILD_STATIQUE: '1' });
    const t1 = Date.now();
    // Avec l'adaptateur Node, Astro range les pages statiques dans dist/client (dist/server = aperçu à la demande).
    const statique = existsSync(join(TRAVAIL, 'dist', 'client')) ? join(TRAVAIL, 'dist', 'client') : join(TRAVAIL, 'dist');
    await deplacer(statique, sortie);
    basculer(version);
    const t2 = Date.now();
    etat.dernierBuild = new Date().toISOString();
    etat.derniereErreur = null;
    etat.dureeMs = t2 - debut;
    tentatives = 0;
    log(`build ${version} publié en ${etat.dureeMs} ms (génération ${t1 - t0} ms, publication ${t2 - t1} ms${pic ? `, mémoire max. ${pic} Mo` : ''})`);
    // Ménage après la bascule : il ne retarde pas la publication et ne bloque pas le serveur HTTP.
    menage = nettoyer().catch((e) => log(`ménage des anciennes versions impossible : ${e.message}`));
  } catch (e) {
    etat.derniereErreur = e.message;
    await supprimer(sortie).catch(() => {});
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

/** Mémoire résidente totale (Mo) des processus du conteneur, lue dans /proc (le conteneur ne contient que le builder). */
function memoireMo() {
  let ko = 0;
  for (const pid of readdirSync('/proc')) {
    if (!/^\d+$/.test(pid)) continue;
    try {
      ko += Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))?.[1] ?? 0);
    } catch {}
  }
  return Math.round(ko / 1024);
}

// Astro affiche une ligne par page générée : 90 000 lignes noieraient les journaux de Docker. On n'en garde que
// quelques-unes (une sur 5 000) et on laisse passer tout le reste (avertissements, erreurs, étapes).
const LIGNE_PAGE = /├─ \//;
function filtrerJournal(sortie) {
  let reste = '';
  let pages = 0;
  const ecrire = (morceau) => {
    const lignes = (reste + morceau).split('\n');
    reste = lignes.pop();
    for (const ligne of lignes) {
      if (LIGNE_PAGE.test(ligne)) {
        if (++pages % 5000 === 0) sortie.write(`${ligne}  [${pages} pages]\n`);
      } else sortie.write(`${ligne}\n`);
    }
  };
  // Dernière ligne sans retour à la ligne (souvent le message d'une erreur fatale) : écrite à la fin du processus.
  ecrire.vider = () => {
    if (reste) sortie.write(`${reste}\n`);
    reste = '';
  };
  return ecrire;
}

let pic = 0;
let menage = Promise.resolve();

function executer(commande, args, env) {
  return new Promise((resolve, reject) => {
    pic = 0;
    // Groupe de processus à part : en cas de dépassement, npm ET ses enfants (Astro, Node) sont arrêtés ensemble.
    const processus = spawn(commande, args, { cwd: TRAVAIL, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const journalSortie = filtrerJournal(process.stdout);
    const journalErreurs = filtrerJournal(process.stderr);
    processus.stdout.on('data', journalSortie);
    processus.stderr.on('data', journalErreurs);
    const mesure = setInterval(() => (pic = Math.max(pic, memoireMo())), 3000);
    // Un build bloqué (Strapi qui ne répond plus…) ne doit pas immobiliser le builder indéfiniment.
    const delai = setTimeout(() => {
      try {
        process.kill(-processus.pid, 'SIGKILL');
      } catch {
        processus.kill('SIGKILL');
      }
      reject(new Error(`build arrêté : plus de ${Math.round(BUILD_DELAI_MAX_MS / 60_000)} min`));
    }, BUILD_DELAI_MAX_MS);
    const fin = () => {
      clearInterval(mesure);
      clearTimeout(delai);
      journalSortie.vider();
      journalErreurs.vider();
    };
    processus.on('error', (e) => (fin(), reject(e)));
    processus.on('exit', (code, signal) => {
      fin();
      if (code === 0) resolve();
      else reject(new Error(`${commande} a terminé avec ${signal ? `le signal ${signal}` : `le code ${code}`}${pic ? ` (mémoire max. ${pic} Mo)` : ''}`));
    });
  });
}

/** Exécute une commande système et attend sa fin (sans bloquer le serveur HTTP, contrairement à rmSync / cpSync). */
function commande(nom, args) {
  return new Promise((resolve, reject) => {
    const processus = spawn(nom, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = '';
    processus.stdout.on('data', (d) => (sortie += d));
    processus.stderr.on('data', (d) => (sortie += d));
    processus.on('error', reject);
    processus.on('exit', (code) => (code === 0 ? resolve(sortie) : reject(new Error(`${nom} : ${sortie.trim() || `code ${code}`}`))));
  });
}

const supprimer = (chemin) => commande('rm', ['-rf', chemin]);

/** Déplace un dossier : rename (même volume, instantané) ou, à défaut, copie en conservant les attributs. */
async function deplacer(source, destination) {
  try {
    renameSync(source, destination);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    log('le dossier de travail est sur un autre volume : copie des fichiers');
    mkdirSync(destination, { recursive: true });
    await commande('cp', ['-a', `${source}/.`, destination]);
  }
}

/** Taille d'un dossier en octets (du -sk, rapide même avec 90 000 fichiers). */
async function tailleOctets(dossier) {
  return Number((await commande('du', ['-sk', dossier])).split(/\s/)[0]) * 1024;
}

/** Remplace le lien « current » de façon atomique (rename d'un lien temporaire). */
function basculer(version) {
  const temporaire = join(RELEASES_DIR, `current-${version}`);
  symlinkSync(join('releases', version), temporaire);
  renameSync(temporaire, join(RELEASES_DIR, 'current'));
}

async function nettoyer() {
  const dossier = join(RELEASES_DIR, 'releases');
  const versions = readdirSync(dossier).sort();
  // Une version de plusieurs Go : on n'en garde que deux (l'actuelle et la précédente) pour ne pas saturer le disque.
  const taille = await tailleOctets(join(dossier, versions.at(-1)));
  const gardees = taille > GROSSE_VERSION_OCTETS ? VERSIONS_CONSERVEES_GROSSE : VERSIONS_CONSERVEES;
  for (const ancienne of versions.slice(0, -gardees)) await supprimer(join(dossier, ancienne));
  await supprimer(TRAVAIL); // sans risque : le build suivant attend la fin du ménage avant de toucher à TRAVAIL
  log(`ménage : version publiée de ${Math.round(taille / 1024 ** 2)} Mo, ${gardees} version(s) conservée(s)`);
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
