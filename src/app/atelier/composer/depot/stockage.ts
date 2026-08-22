/**
 * Copie de secours sur le disque du navigateur — étape 5 du mémo.
 *
 * À quoi ça sert : un dépôt de 80 photos sur un réseau de festival dure des
 * minutes. L'onglet se ferme, le téléphone s'endort, la 4G tombe. Sans copie
 * locale, il faut tout reprendre depuis la pellicule — et on perd la cliente
 * à ce moment précis. Avec, elle rouvre le lien et l'envoi reprend où il en
 * était : la re-déclaration passe par le `photoId` conservé ici, et le serveur
 * répond `deja: true` pour ce qui est déjà arrivé (piège nº8) ou re-signe la
 * même clé pour ce qui a échoué (piège nº9).
 *
 * Ce que ça ne promet PAS. Piège nº23 : iOS ignore l'avertissement de
 * fermeture d'onglet, la sauvegarde n'est pas garantie. Piège nº24 : au-delà
 * de 95 % du quota, l'écriture s'arrête EN SILENCE. L'écran ne dit donc jamais
 * « c'est sauvegardé » — il dit, quand il le sait, que ça ne l'est pas.
 */

const BASE = 'bj-atelier-depot'
const MAGASIN = 'fichiers'
const VERSION = 1

export type Enregistrement = {
  id: string
  token: string
  /* Identifiant serveur : c'est LUI qui rend la reprise possible. */
  photoId: string | null
  nom: string
  mime: string
  taille: number
  ordre: number
  /* Vidée dès la confirmation serveur — jamais avant (piège nº18). */
  charge: Blob | null
  vignette: Blob | null
  confirmee: boolean
  cree: number
}

let base: IDBDatabase | null = null
let ouverture: Promise<IDBDatabase | null> | null = null
let desactive = false

export function stockageActif(): boolean {
  return !desactive
}

function promesse<T>(requete: IDBRequest<T>): Promise<T> {
  return new Promise((ok, ko) => {
    requete.onsuccess = () => ok(requete.result)
    requete.onerror = () => ko(requete.error)
  })
}

async function ouvrir(): Promise<IDBDatabase | null> {
  if (desactive) return null
  if (base) return base
  if (ouverture) return ouverture

  ouverture = new Promise<IDBDatabase | null>((ok) => {
    try {
      if (typeof indexedDB === 'undefined') { desactive = true; return ok(null) }

      const req = indexedDB.open(BASE, VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(MAGASIN)) {
          const magasin = db.createObjectStore(MAGASIN, { keyPath: 'id' })
          magasin.createIndex('token', 'token', { unique: false })
        }
      }
      req.onsuccess = () => { base = req.result; ok(base) }
      /* Navigation privée, stockage refusé, base corrompue : on continue en
         mémoire seule. Au pire on perd la reprise, jamais le dépôt. */
      req.onerror = () => { desactive = true; ok(null) }
      req.onblocked = () => { desactive = true; ok(null) }
    } catch {
      desactive = true
      ok(null)
    }
  })

  return ouverture
}

async function transaction(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
  const db = await ouvrir()
  if (!db) return null
  try {
    return db.transaction(MAGASIN, mode).objectStore(MAGASIN)
  } catch {
    desactive = true
    return null
  }
}

/** Les entrées d'un numéro, remises dans l'ordre du dépôt. */
export async function lire(token: string): Promise<Enregistrement[]> {
  const magasin = await transaction('readonly')
  if (!magasin) return []
  try {
    const tout = await promesse<Enregistrement[]>(
      magasin.index('token').getAll(IDBKeyRange.only(token)) as IDBRequest<Enregistrement[]>
    )
    return tout.sort((a, b) => a.ordre - b.ordre)
  } catch {
    return []
  }
}

export async function ecrire(rec: Enregistrement): Promise<void> {
  const magasin = await transaction('readwrite')
  if (!magasin) return
  try {
    await promesse(magasin.put(rec))
  } catch {
    /* QuotaExceededError, le plus souvent. On coupe le stockage pour de bon :
       une base à moitié écrite est pire qu'une base absente — la reprise
       proposerait des fichiers dont la charge manque. */
    desactive = true
  }
}

export async function oublier(id: string): Promise<void> {
  const magasin = await transaction('readwrite')
  if (!magasin) return
  try { await promesse(magasin.delete(id)) } catch { /* sans effet */ }
}

/**
 * Ménage : tout ce qui n'appartient pas au numéro courant. Une cliente qui
 * compose un deuxième numéro ne doit pas traîner les blobs du premier —
 * c'est ce qui remplit le quota et déclenche le piège nº24.
 */
export async function purgerAutresTokens(token: string): Promise<void> {
  const magasin = await transaction('readwrite')
  if (!magasin) return
  try {
    const tout = await promesse<Enregistrement[]>(magasin.getAll() as IDBRequest<Enregistrement[]>)
    for (const rec of tout) {
      if (rec.token !== token) magasin.delete(rec.id)
    }
  } catch {
    /* sans effet */
  }
}

/** Tout le numéro, une fois qu'il est parti à l'atelier. */
export async function purgerToken(token: string): Promise<void> {
  const magasin = await transaction('readwrite')
  if (!magasin) return
  try {
    const tout = await promesse<Enregistrement[]>(
      magasin.index('token').getAll(IDBKeyRange.only(token)) as IDBRequest<Enregistrement[]>
    )
    for (const rec of tout) magasin.delete(rec.id)
  } catch {
    /* sans effet */
  }
}

/**
 * Piège nº24 : au-delà de 95 % du quota, l'écriture s'arrête sans un mot.
 * On regarde AVANT d'y arriver pour pouvoir le dire, plutôt que de découvrir
 * l'absence de reprise le jour où elle sert.
 */
export async function quotaCritique(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return false
    const { usage, quota } = await navigator.storage.estimate()
    if (!usage || !quota) return false
    return usage / quota > 0.95
  } catch {
    return false
  }
}
