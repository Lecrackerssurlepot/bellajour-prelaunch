/**
 * L'aperçu d'un HEIC quand le navigateur ne sait pas le lire (T-150).
 * Module NAVIGATEUR, sans React.
 *
 * Le moteur passe d'abord chaque photo à `reduire` (le worker du B2C, importé
 * tel quel) : Safari décode le HEIC et rend sa vignette, Chrome, Firefox et
 * Android échouent et rendent `vignette: null`. Seulement dans ce cas, la
 * photo passe ici : un worker classique (`public/heic/vignette-heic.worker.js`)
 * charge libheif en WebAssembly à la première photo et rend une vignette de
 * 320 px. L'original part toujours tel quel.
 *
 * Deux workers au plus (le décodage tient ~1 s de processeur et ~100 Mo par
 * photo, mesuré le 15/10 sur des HEIC d'iPhone). Un échec, un délai dépassé,
 * un navigateur sans worker : `null`, et la photo part sans aperçu, comme
 * avant. Un outil de confort ne bloque jamais un envoi.
 */

const URL_WORKER = "/heic/vignette-heic.worker.js";
const WORKERS_MAX = 2;
/* Le premier passage charge 1,4 Mo de décodeur : on lui laisse le temps. */
const DELAI_MAX_MS = 45_000;

type Attente = { resoudre: (v: Blob | null) => void; minuteur: ReturnType<typeof setTimeout> };
type Voie = { worker: Worker; occupe: boolean };

let voies: Voie[] | null = null;
let indisponible = false;
let suivant = 0;
const attentes = new Map<string, Attente>();
const file: { id: string; fichier: File }[] = [];

function creerVoies(): Voie[] | null {
  if (voies || indisponible) return voies;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    indisponible = true;
    return null;
  }
  try {
    const n = Math.max(1, Math.min(WORKERS_MAX, Math.floor((navigator.hardwareConcurrency || 2) / 2)));
    voies = Array.from({ length: n }, () => {
      const voie: Voie = { worker: new Worker(URL_WORKER), occupe: false };
      voie.worker.onmessage = (e: MessageEvent<{ id: string; vignette: Blob | null }>) => {
        voie.occupe = false;
        finir(e.data.id, e.data.vignette ?? null);
        lancer();
      };
      voie.worker.onerror = () => {
        /* Un worker qui ne démarre pas (fichier absent, CSP) : plus de HEIC décodé, rien ne bloque. */
        indisponible = true;
        for (const [id] of attentes) finir(id, null);
      };
      return voie;
    });
    return voies;
  } catch {
    indisponible = true;
    return null;
  }
}

function finir(id: string, vignette: Blob | null): void {
  const a = attentes.get(id);
  if (!a) return;
  clearTimeout(a.minuteur);
  attentes.delete(id);
  a.resoudre(vignette);
}

function lancer(): void {
  if (!voies) return;
  for (const voie of voies) {
    if (voie.occupe) continue;
    const tache = file.shift();
    if (!tache) return;
    if (!attentes.has(tache.id)) continue;
    voie.occupe = true;
    void tache.fichier
      .arrayBuffer()
      .then((octets) => voie.worker.postMessage({ id: tache.id, octets }, [octets]))
      .catch(() => {
        voie.occupe = false;
        finir(tache.id, null);
        lancer();
      });
  }
}

/** La vignette JPEG de 320 px d'un HEIC, ou `null` (jamais d'exception). */
export function vignetteHeic(fichier: File): Promise<Blob | null> {
  if (!creerVoies()) return Promise.resolve(null);
  const id = `h${suivant++}`;
  return new Promise((resoudre) => {
    attentes.set(id, { resoudre, minuteur: setTimeout(() => finir(id, null), DELAI_MAX_MS) });
    file.push({ id, fichier });
    lancer();
  });
}
