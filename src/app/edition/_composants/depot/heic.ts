/**
 * L'aperçu d'un HEIC quand le navigateur ne sait pas le lire (T-150).
 * Module NAVIGATEUR, sans React.
 *
 * Le moteur passe d'abord chaque photo à `reduire` (le worker du B2C, importé
 * tel quel) : Safari décode le HEIC et rend sa vignette, Chrome, Firefox et
 * Android échouent et rendent `vignette: null`. Seulement dans ce cas, la
 * photo passe ici : un worker classique (`public/heic/vignette-heic.worker.js`)
 * charge libheif en WebAssembly à la première photo et rend une vignette de
 * 320 px (et, pour les éditions, la version moyenne d'« Agrandir »). L'original
 * part toujours tel quel. Le moteur de /composer s'en sert aussi depuis le
 * 26/10 (8A), pour la vignette seulement.
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

/** Ce que libheif rend d'un HEIC : la vignette de 320 px et, si demandée, la version moyenne d'« Agrandir » (5A). */
export type ApercusHeic = { vignette: Blob | null; moyenne: Blob | null };
const AUCUN: ApercusHeic = { vignette: null, moyenne: null };

type Attente = { resoudre: (v: ApercusHeic) => void; minuteur: ReturnType<typeof setTimeout> };
type Voie = { worker: Worker; occupe: boolean };

let voies: Voie[] | null = null;
let indisponible = false;
let suivant = 0;
const attentes = new Map<string, Attente>();
const file: { id: string; fichier: Blob; moyenne: { cote: number; qualite: number } | null }[] = [];

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
      voie.worker.onmessage = (e: MessageEvent<{ id: string; vignette: Blob | null; moyenne?: Blob | null }>) => {
        voie.occupe = false;
        finir(e.data.id, { vignette: e.data.vignette ?? null, moyenne: e.data.moyenne ?? null });
        lancer();
      };
      voie.worker.onerror = () => {
        /* Un worker qui ne démarre pas (fichier absent, CSP) : plus de HEIC décodé, rien ne bloque. */
        indisponible = true;
        for (const [id] of attentes) finir(id, AUCUN);
      };
      return voie;
    });
    return voies;
  } catch {
    indisponible = true;
    return null;
  }
}

function finir(id: string, apercus: ApercusHeic): void {
  const a = attentes.get(id);
  if (!a) return;
  clearTimeout(a.minuteur);
  attentes.delete(id);
  a.resoudre(apercus);
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
      .then((octets) => voie.worker.postMessage({ id: tache.id, octets, moyenne: tache.moyenne }, [octets]))
      .catch(() => {
        voie.occupe = false;
        finir(tache.id, AUCUN);
        lancer();
      });
  }
}

/**
 * La vignette d'un HEIC et, si `moyenne` est donné, sa version moyenne
 * (Édition collective, 5A). Rien de lu : `{ vignette: null, moyenne: null }`,
 * jamais d'exception.
 */
export function apercusHeic(fichier: Blob, moyenne: { cote: number; qualite: number } | null = null): Promise<ApercusHeic> {
  if (!creerVoies()) return Promise.resolve(AUCUN);
  const id = `h${suivant++}`;
  return new Promise((resoudre) => {
    attentes.set(id, { resoudre, minuteur: setTimeout(() => finir(id, AUCUN), DELAI_MAX_MS) });
    file.push({ id, fichier, moyenne });
    lancer();
  });
}

/** La vignette JPEG de 320 px d'un HEIC, ou `null` (jamais d'exception). Le moteur de /composer s'en sert (8A). */
export function vignetteHeic(fichier: Blob): Promise<Blob | null> {
  if (!creerVoies()) return Promise.resolve(null);
  return apercusHeic(fichier).then((a) => a.vignette);
}
