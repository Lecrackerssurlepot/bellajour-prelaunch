/**
 * Pool de workers de réduction.
 *
 * Piège nº14 : convertir dans le processus principal rend l'application muette
 * (0 % de disponibilité mesurée sur l'autre chantier). Même cause ici, autre
 * victime : le thread principal peint la jauge et le compteur. On dimensionne
 * donc sur les cœurs DISPONIBLES, jamais sur un nombre choisi au doigt
 * mouillé, et on plafonne à 3 : au-delà, sur un iPhone, les workers se
 * disputent le décodeur matériel et l'interface se met à saccader —
 * exactement ce qu'on voulait éviter.
 *
 * ┌── LA POIGNÉE DE MAIN ────────────────────────────────────────────────────
 * │ Chaque worker doit répondre à un ping AVANT de recevoir du travail. Sans
 * │ elle, un fichier worker que le navigateur n'exécute pas — un `.ts` recopié
 * │ tel quel par le bundler, une politique de sécurité de contenu qui refuse
 * │ les workers — produirait un dépôt sans vignettes et sans réduction, sans
 * │ le moindre signe. Le mode dégradé est prévu ; il ne doit pas être discret.
 * └──────────────────────────────────────────────────────────────────────────
 *
 * Le pool ne peut pas faire échouer un dépôt : quand il renonce, chaque
 * demande se résout en « rien produit » et l'original part tel quel.
 */

export type DemandeReduction = {
  id: string
  fichier: Blob
  /* Faux pour un HEIC : il part brut, en taille réelle (piège nº16). */
  reduire: boolean
  /* Seul un JPEG porte un APP1 à retransplanter. */
  estJpeg: boolean
}

export type Reduction = {
  /* null = « envoie l'original » : rien de mieux n'a pu être produit. */
  charge: Blob | null
  vignette: Blob | null
  largeur: number
  hauteur: number
}

type ReponseWorker = Partial<Reduction> & { id: string; pong?: true }

const RIEN: Reduction = { charge: null, vignette: null, largeur: 0, hauteur: 0 }

/* Un worker coincé ne doit pas retenir une voie à vie. Même principe que le
   chien de garde de l'envoi, à une autre échelle. */
const DELAI_TRAVAIL_MS = 90_000
const DELAI_PING_MS = 10_000

type Tache = { demande: DemandeReduction; resoudre: (r: Reduction) => void }

type Voie = {
  worker: Worker
  etat: 'demarrage' | 'libre' | 'occupee'
  tache: Tache | null
  minuteur: ReturnType<typeof setTimeout> | null
}

let voies: Voie[] = []
let file: Tache[] = []
let indisponible = false

export function tailleDuPool(): number {
  const coeurs = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
  return Math.max(1, Math.min(3, coeurs - 1))
}

/** Vrai quand la réduction a renoncé : les originaux partent tels quels. */
export function poolIndisponible(): boolean {
  return indisponible
}

function minuter(voie: Voie, ms: number, alors: () => void): void {
  if (voie.minuteur) clearTimeout(voie.minuteur)
  voie.minuteur = setTimeout(alors, ms)
}

function jeter(voie: Voie): Tache | null {
  if (voie.minuteur) clearTimeout(voie.minuteur)
  voie.minuteur = null
  const tache = voie.tache
  voie.tache = null
  try { voie.worker.terminate() } catch { /* déjà mort */ }
  voies = voies.filter((v) => v !== voie)
  return tache
}

/** Renonciation définitive : plus de worker, la file se vide en « rien ». */
function renoncer(): void {
  indisponible = true
  for (const voie of [...voies]) {
    const t = jeter(voie)
    if (t) t.resoudre(RIEN)
  }
  const restantes = file
  file = []
  for (const t of restantes) t.resoudre(RIEN)
}

function creerVoie(): void {
  let worker: Worker
  try {
    worker = new Worker(new URL('./reduire.worker.js', import.meta.url))
  } catch {
    renoncer()
    return
  }

  const voie: Voie = { worker, etat: 'demarrage', tache: null, minuteur: null }
  voies.push(voie)

  worker.onmessage = (e: MessageEvent<ReponseWorker>) => {
    const data = e.data

    if (voie.etat === 'demarrage') {
      if (!data?.pong) return
      if (voie.minuteur) clearTimeout(voie.minuteur)
      voie.minuteur = null
      voie.etat = 'libre'
      pomper()
      return
    }

    const tache = voie.tache
    if (!tache || tache.demande.id !== data?.id) return

    if (voie.minuteur) clearTimeout(voie.minuteur)
    voie.minuteur = null
    voie.tache = null
    voie.etat = 'libre'
    tache.resoudre({
      charge: data.charge ?? null,
      vignette: data.vignette ?? null,
      largeur: data.largeur ?? 0,
      hauteur: data.hauteur ?? 0,
    })
    pomper()
  }

  worker.onerror = () => {
    /* Une erreur AVANT le pong, c'est le fichier lui-même qui ne s'exécute
       pas : aucun worker neuf n'y changera rien, on renonce pour de bon.
       Après le pong, c'est une photo qui a mal tourné : on jette la voie,
       on rend « rien produit », et la suivante repart sur un worker neuf. */
    if (voie.etat === 'demarrage') { renoncer(); return }
    const tache = jeter(voie)
    if (tache) tache.resoudre(RIEN)
    pomper()
  }

  minuter(voie, DELAI_PING_MS, () => {
    /* Un worker qui ne répond même pas au ping n'a jamais démarré. */
    jeter(voie)
    renoncer()
  })

  try {
    worker.postMessage({ id: 'ping', ping: true })
  } catch {
    jeter(voie)
    renoncer()
  }
}

function pomper(): void {
  while (file.length) {
    const voie = voies.find((v) => v.etat === 'libre')

    if (!voie) {
      /* Une voie à la fois : chaque pong relance la pompe, ce qui fait monter
         le pool en régime au lieu de démarrer trois workers d'un coup au
         moment précis où le thread principal a le plus besoin d'air. */
      if (!indisponible && voies.length < tailleDuPool()) creerVoie()
      return
    }

    const tache = file.shift()!
    voie.tache = tache
    voie.etat = 'occupee'

    minuter(voie, DELAI_TRAVAIL_MS, () => {
      /* Silence de 90 s : le worker est perdu, on ne l'attend pas plus. */
      const t = jeter(voie)
      if (t) t.resoudre(RIEN)
      pomper()
    })

    try {
      voie.worker.postMessage(tache.demande)
    } catch {
      const t = jeter(voie)
      if (t) t.resoudre(RIEN)
    }
  }
}

export function reduire(demande: DemandeReduction): Promise<Reduction> {
  if (indisponible) return Promise.resolve(RIEN)

  return new Promise<Reduction>((resoudre) => {
    file.push({ demande, resoudre })
    pomper()
  })
}

/** Appelé quand le dépôt est terminé : rien ne doit survivre à l'écran. */
export function fermerPool(): void {
  for (const voie of [...voies]) {
    const t = jeter(voie)
    if (t) t.resoudre(RIEN)
  }
  const restantes = file
  file = []
  for (const t of restantes) t.resoudre(RIEN)
}
