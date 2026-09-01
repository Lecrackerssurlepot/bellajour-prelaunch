/**
 * Le moteur du dépôt — file, états, chien de garde, reprise.
 *
 * ┌── POURQUOI UN SINGLETON DE MODULE, ET PAS UN useState ───────────────────
 * │ Le bouton « ← Retour » reste visible sur l'écran 5. Démonter le composant
 * │ ne doit pas tuer une file de 80 photos en cours d'envoi. Le moteur vit
 * │ donc hors de React ; le composant s'y abonne et s'en détache.
 * │
 * │ Corollaire de performance : les File, Blob et XMLHttpRequest ne passent
 * │ JAMAIS par le rendu. Le composant ne lit qu'un instantané immuable,
 * │ republié une fois par frame. Sans cette séparation, un événement de
 * │ progression toutes les 50 ms × 100 tuiles = un re-rendu par octet.
 * └──────────────────────────────────────────────────────────────────────────
 *
 * L'ORDRE EST IMPOSÉ : réduire → déclarer → envoyer. Jamais autrement.
 * La taille annoncée à la déclaration fait partie de la signature R2. Déclarer
 * avant de réduire, c'est signer une taille que le corps ne fera pas, et R2
 * répond alors 403 SANS en-tête CORS — le navigateur affiche une « erreur
 * d'accès » qui envoie chercher le bug à l'autre bout de la chaîne (piège nº1).
 *
 * Et la réduction ne se fait qu'UNE fois, à l'entrée (piège nº2) : la mettre
 * sur le chemin commun de l'envoi casserait aussi le réessai et la reprise.
 */

import {
  MAX_FILE_BYTES, estHeic, resoudreMime, type MimeAccepte,
} from '@/lib/atelier/formats'
import { fermerPool, poolIndisponible, reduire, tailleDuPool } from './pool'
import * as stockage from './stockage'
import { MAX_PHOTOS } from './paliers'

/* ── Réglages ─────────────────────────────────────────────────────────── */

/** PRD §7.4 : cinq envois en parallèle. Cinq voies, pas une de plus. */
const VOIES_ENVOI = 5

/* Piège nº20 : trois plafonds de lot différents se ressemblent. Ici :
   déclaration 25 par appel (le serveur en accepte 100), confirmation 25
   (le serveur en accepte 50). On reste sous les plafonds serveur — un refus
   de trop-plein sur la confirmation perd les photos au dernier centimètre. */
const LOT_DECLARATION = 25
const LOT_CONFIRMATION = 25

/* Piège nº12 : 50 photos perdues le 30/07 sur un refus de confirmation.
   Cinq tentatives espacées, jamais un abandon au premier échec. */
const BACKOFF_MS = [0, 2_000, 8_000, 20_000, 45_000]

/* Piège nº22 : aucun délai d'expiration sur l'envoi = une photo suspendue
   bloque une voie à vie. Tic toutes les 10 s, coupure à 3 min SANS PROGRÈS
   (pas 3 min d'envoi : une grosse photo sur un réseau lent progresse). */
const CHIEN_DE_GARDE_MS = 10_000
const SANS_PROGRES_MAX_MS = 180_000

/* Piège nº5 : une URL signée vit 1 h et peut expirer PENDANT l'import.
   On la jette à 45 min et on refait signer, plutôt que de découvrir
   l'expiration sous la forme d'un 403 indéchiffrable. */
const URL_PERIMEE_MS = 45 * 60 * 1000

/** Un 403 se retente deux fois (URL périmée, signature) avant d'abandonner. */
const ESSAIS_ENVOI_MAX = 3

/* ── Types ────────────────────────────────────────────────────────────── */

export type EtatPhoto =
  | 'attente' | 'reduction' | 'prete' | 'declaree'
  | 'envoi' | 'envoyee' | 'confirmee' | 'erreur'

type Item = {
  id: string
  nom: string
  mime: MimeAccepte
  ordre: number
  /* `original` et `charge` sont vidés APRÈS la confirmation serveur, jamais
     au succès du PUT (piège nº18) : tant que le serveur n'a pas dit oui, un
     réessai doit avoir de quoi renvoyer. */
  original: Blob | null
  charge: Blob | null
  taille: number
  apercu: string | null
  /* D7 — la vignette de 320 px fabriquée par le worker. Elle sert déjà
     l'aperçu local (`apercu` est un objectURL posé dessus) ; elle part
     désormais AUSSI sur R2, pour la grille de l'atelier, qui servait jusqu'ici
     des originaux de plusieurs Mo dans des cases de 84 px. Gardée jusqu'à la
     confirmation, comme `charge` : un réessai doit avoir de quoi renvoyer.
     `null` est un cas normal — HEIC sous Chrome, worker indisponible. */
  vignette: Blob | null
  photoId: string | null
  url: string | null
  urlVignette: string | null
  urlSigneeA: number
  etat: EtatPhoto
  octetsEnvoyes: number
  xhr: XMLHttpRequest | null
  dernierProgres: number
  essaisEnvoi: number
  message: string | null
}

export type VuePhoto = {
  id: string
  nom: string
  etat: EtatPhoto
  /* 0 → 1. Rendu en scaleX, jamais en width (PRD §15). */
  progression: number
  apercu: string | null
  message: string | null
}

export type Vue = {
  photos: VuePhoto[]
  /** Photos réellement arrivées sur R2 et vérifiées par le serveur. */
  confirmees: number
  enVol: number
  erreurs: number
  octetsEnvoyes: number
  octetsTotal: number
  /** Piège nº24 : la reprise ne sera pas là. On le dit, on ne le cache pas. */
  stockageDegrade: boolean
  /** Le worker n'a pas démarré : les photos partent en taille réelle. */
  reductionDegradee: boolean
  /** Le serveur a refusé pour de bon : plus rien ne repartira. */
  clos: boolean
  /** Le clic « Envoyer à l'atelier » a abouti : le dossier est chez nous. */
  finalise: boolean
  /** Combien de photos la file portait au moment de ce clic. */
  attendues: number
  bandeau: string | null
  /** T2-4 — ce que le SERVEUR sait d'un passage précédent (autre appareil,
      autre session), ou null tant qu'il n'a pas parlé. La grille locale ne
      montre que cette session : ce compte est le seul témoin des photos
      déjà chez nous. */
  serveur: number | null
}

export type Refus = { nom: string; raison: string }

/* ── Moteur ───────────────────────────────────────────────────────────── */

class Moteur {
  readonly token: string

  private items = new Map<string, Item>()
  private abonnes = new Set<() => void>()
  private version = 0

  private declarationEnVol = false
  private confirmationEnVol = false
  private essaisConfirmation = 0
  private prochaineConfirmationA = 0
  private prochaineDeclarationA = 0

  private nbServeur: number | null = null
  /* Le clic a abouti (consent_photos posé en base). Le moteur continue de
     pomper : c'est tout l'objet du changement du 01/09. */
  private finalise = false
  private attendues = 0
  private purgeFaite = false
  private bandeau: string | null = null
  private stockageDegrade = false
  private minuteur: ReturnType<typeof setInterval> | null = null
  private arrete = false
  private ordreSuivant = 0

  constructor(token: string) {
    this.token = token
    this.minuteur = setInterval(() => this.chienDeGarde(), CHIEN_DE_GARDE_MS)
  }

  /* ── abonnement ─────────────────────────────────────────────────────── */

  abonner(fn: () => void): () => void {
    this.abonnes.add(fn)
    return () => { this.abonnes.delete(fn) }
  }

  /** Numéro de version : le composant ne reconstruit qu'au changement. */
  get revision(): number { return this.version }

  private changement(): void {
    this.version++
    for (const fn of this.abonnes) fn()
  }

  /* ── reprise ────────────────────────────────────────────────────────── */

  /**
   * Relit la copie locale. Les entrées confirmées reviennent SANS charge :
   * elles ne servent qu'à peupler la grille et le compteur après un
   * rechargement. Les autres repartent à l'étage de déclaration, où le
   * `photoId` conservé fait toute la reprise.
   */
  async reprendre(): Promise<void> {
    this.stockageDegrade = !stockage.stockageActif() || (await stockage.quotaCritique())
    await stockage.purgerAutresTokens(this.token)

    const enregistrements = await stockage.lire(this.token)
    for (const rec of enregistrements) {
      if (this.items.has(rec.id)) continue

      const confirmee = rec.confirmee
      const charge = confirmee ? null : rec.charge

      /* Une entrée non confirmée dont la charge a disparu ne peut plus rien
         envoyer : on l'oublie plutôt que d'afficher une tuile fantôme. */
      if (!confirmee && !charge) { void stockage.oublier(rec.id); continue }

      this.items.set(rec.id, {
        id: rec.id,
        nom: rec.nom,
        mime: rec.mime as MimeAccepte,
        ordre: rec.ordre,
        original: charge,
        charge,
        taille: rec.taille,
        apercu: rec.vignette ? URL.createObjectURL(rec.vignette) : null,
        /* La reprise récupère la vignette du coffre local : après un
           rechargement, une photo non confirmée peut encore déposer la
           sienne. Une photo confirmée n'en a plus l'usage. */
        vignette: confirmee ? null : rec.vignette,
        photoId: rec.photoId,
        url: null,
        urlVignette: null,
        urlSigneeA: 0,
        /* Même une photo qui semblait envoyée repart par la déclaration :
           c'est le serveur qui tranche (`deja: true`), jamais le navigateur. */
        etat: confirmee ? 'confirmee' : 'prete',
        octetsEnvoyes: confirmee ? rec.taille : 0,
        xhr: null,
        dernierProgres: 0,
        essaisEnvoi: 0,
        message: null,
      })
      this.ordreSuivant = Math.max(this.ordreSuivant, rec.ordre + 1)
    }

    this.changement()
    this.pompe()
  }

  /* ── entrée des fichiers ────────────────────────────────────────────── */

  ajouter(fichiers: File[]): Refus[] {
    const refus: Refus[] = []
    const vivantes = this.compte((i) => i.etat !== 'erreur')
    let place = MAX_PHOTOS - Math.max(vivantes, this.nbServeur ?? 0)

    /* Re-sélectionner la même photo est le geste le plus courant du monde :
       on l'ignore en silence plutôt que de la déposer deux fois. */
    const deja = new Set(
      [...this.items.values()].map((i) => `${i.nom}|${i.taille}`)
    )

    for (const fichier of fichiers) {
      const mime = resoudreMime(fichier.name, fichier.type)
      if (!mime) { refus.push({ nom: fichier.name, raison: 'format' }); continue }
      if (fichier.size <= 0 || fichier.size > MAX_FILE_BYTES) {
        refus.push({ nom: fichier.name, raison: 'taille' }); continue
      }
      if (deja.has(`${fichier.name}|${fichier.size}`)) continue
      if (place <= 0) { refus.push({ nom: fichier.name, raison: 'plafond' }); continue }

      /* Piège nº17 : sur iCloud, le type arrive souvent VIDE. On ré-emballe
         le fichier avec le type résolu, pour que l'en-tête Content-Type du
         PUT soit exactement celui qui aura été signé — le repli par extension
         ne suffit pas si le File d'origine garde son type vide. */
      const rembale = fichier.type === mime
        ? fichier
        : new File([fichier], fichier.name, { type: mime })

      const id = identifiant()
      const ordre = this.ordreSuivant++

      this.items.set(id, {
        id,
        nom: fichier.name,
        mime,
        ordre,
        original: rembale,
        charge: null,
        taille: rembale.size,
        apercu: null,
        vignette: null,
        photoId: null,
        url: null,
        urlVignette: null,
        urlSigneeA: 0,
        etat: 'attente',
        octetsEnvoyes: 0,
        xhr: null,
        dernierProgres: 0,
        essaisEnvoi: 0,
        message: null,
      })
      deja.add(`${fichier.name}|${fichier.size}`)
      place--
    }

    this.changement()
    this.pompe()
    return refus
  }

  /* ── suppression ────────────────────────────────────────────────────── */

  async supprimer(id: string): Promise<void> {
    const item = this.items.get(id)
    if (!item) return

    /* Confirmée = déjà sur R2 et déjà comptée dans nb_photos. La retirer de la
       grille sans le dire au serveur ferait mentir le palier affiché et
       enverrait à l'atelier une photo qu'elle croit avoir retirée. */
    if (item.etat === 'confirmee' && item.photoId) {
      try {
        const r = await fetch('/api/atelier/photos/supprimer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.token, photoId: item.photoId }),
        })
        if (!r.ok) {
          item.message = 'Suppression impossible pour l’instant.'
          this.changement()
          return
        }
        const data = (await r.json()) as { nbPhotos?: number }
        if (typeof data.nbPhotos === 'number') this.nbServeur = data.nbPhotos
      } catch {
        item.message = 'Connexion perdue — la photo est toujours là.'
        this.changement()
        return
      }
    }

    item.xhr?.abort()
    this.liberer(item)
    if (item.apercu) URL.revokeObjectURL(item.apercu)
    this.items.delete(id)
    void stockage.oublier(id)

    this.changement()
    this.pompe()
  }

  /** Une photo en échec est ROUVERTE, jamais rejetée (piège nº9). */
  reprendrePhoto(id: string): void {
    const item = this.items.get(id)
    if (!item || item.etat !== 'erreur' || !item.charge) return
    item.etat = 'prete'
    item.essaisEnvoi = 0
    item.octetsEnvoyes = 0
    item.message = null
    this.changement()
    this.pompe()
  }

  /* ── l'orchestrateur ────────────────────────────────────────────────── */

  private pompe(): void {
    if (this.arrete) { this.purgerSiTermine(); return }
    this.etageReduction()
    this.etageDeclaration()
    this.etageEnvoi()
    this.etageConfirmation()
    this.purgerSiTermine()
  }

  /* Étage R — réduire. Le pool se charge de sa propre concurrence ; on
     n'engage que ce qu'il peut avaler, pour ne pas décoder 80 photos en même
     temps et faire exploser la mémoire du téléphone. */
  private etageReduction(): void {
    let libres = tailleDuPool() - this.compte((i) => i.etat === 'reduction')

    for (const item of this.items.values()) {
      if (libres <= 0) break
      if (item.etat !== 'attente' || !item.original) continue

      item.etat = 'reduction'
      libres--

      const original = item.original
      reduire({
        id: item.id,
        fichier: original,
        /* Un HEIC ne passe JAMAIS par le canvas : il part brut, en taille
           réelle (piège nº16). Seule sa vignette est tentée. */
        reduire: !estHeic(item.mime),
        estJpeg: item.mime === 'image/jpeg',
      }).then((r) => {
        if (this.arrete) return
        const vivant = this.items.get(item.id)
        if (!vivant || vivant.etat !== 'reduction') return

        vivant.charge = r.charge ?? original
        vivant.taille = vivant.charge.size

        /* L'aperçu vient de la VIGNETTE, jamais du fichier d'origine : un
           objectURL posé sur l'original le maintiendrait en vie jusqu'à la
           fermeture de l'onglet. Pas de vignette (HEIC hors Safari, worker
           indisponible) → tuile sobre au nom du fichier, tout de suite et
           définitivement. Jamais de case cassée, jamais de bascule d'aspect
           après la confirmation. */
        if (r.vignette) vivant.apercu = URL.createObjectURL(r.vignette)
        /* D7 — on la GARDE, en plus de l'objectURL. L'aperçu et le dépôt sur
           R2 sont deux usages du même blob : un objectURL ne se relit pas. */
        vivant.vignette = r.vignette

        vivant.etat = 'prete'
        void this.persister(vivant, r.vignette)
        this.changement()
        this.pompe()
      })
    }
  }

  /* Étage D — déclarer. Un seul appel en vol : le serveur insère des lignes,
     deux lots concurrents se marcheraient dessus sur le calcul de `ordre`. */
  private etageDeclaration(): void {
    if (this.declarationEnVol || Date.now() < this.prochaineDeclarationA) return

    const lot = this.selection((i) => i.etat === 'prete' && !!i.charge, LOT_DECLARATION)
    if (!lot.length) return

    this.declarationEnVol = true
    void this.declarer(lot).finally(() => {
      this.declarationEnVol = false
      this.pompe()
    })
  }

  private async declarer(lot: Item[]): Promise<void> {
    type Resultat = {
      photoId?: string; key?: string; url?: string; deja?: boolean; erreur?: string
      /* D7 — absente si le worker n'a pas produit de vignette, ou si le
         serveur n'a pas su la signer. Ce n'est jamais une erreur. */
      urlVignette?: string
    }

    let resultats: Resultat[]
    try {
      const r = await fetch('/api/atelier/photos/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          fichiers: lot.map((i) => ({
            /* Présent = re-déclaration. C'est cette ligne qui porte toute la
               reprise : le serveur re-signe la même clé, ou répond
               `deja: true` si la photo est déjà arrivée (pièges nº8 et nº9). */
            id: i.photoId ?? undefined,
            nom: i.nom,
            taille: i.taille,
            type: i.mime,
            /* D7 — la taille FAIT PARTIE de la signature (piège nº1), même
               pour une vignette. Elle est connue : un item n'est déclaré
               qu'à l'état `prete`, donc après le passage du worker. */
            tailleVignette: i.vignette?.size,
          })),
        }),
      })

      /* 409 « dépôt clos » et 404 « dossier inconnu » sont DÉFINITIFS. Les
         confondre avec une panne réseau, c'est relancer indéfiniment sous un
         bandeau qui promet que « l'envoi reprend tout seul » — le pire des
         messages, puisqu'il est faux et rassurant. */
      if (r.status === 409 || r.status === 404) {
        this.bandeau = r.status === 404
          ? 'Ce dossier est introuvable. Reprenez le questionnaire depuis le début.'
          : 'Ce dépôt est clos : l’atelier travaille déjà sur vos photos.'
        for (const i of lot) {
          i.etat = 'erreur'
          i.message = r.status === 404 ? 'Dossier introuvable' : 'Dépôt clos'
        }
        this.arreterDefinitivement()
        this.changement()
        return
      }
      if (!r.ok) throw new Error(String(r.status))

      const data = (await r.json()) as { resultats?: Resultat[] }
      resultats = data.resultats ?? []
    } catch {
      /* Réseau perdu : les photos restent en 'prete', on réessaiera. Rien
         n'est perdu, rien n'est marqué en échec — c'est le réseau, pas elle. */
      this.prochaineDeclarationA = Date.now() + 4_000
      this.bandeau = 'Connexion instable — l’envoi reprend tout seul.'
      this.changement()
      return
    }

    this.bandeau = null
    const maintenant = Date.now()

    lot.forEach((item, index) => {
      /* Les résultats sont positionnels : un par fichier déclaré, dans
         l'ordre. Un trou signifierait un serveur qui a changé de contrat. */
      const res = resultats[index]
      if (!res) { item.etat = 'erreur'; item.message = 'Réponse incomplète'; return }

      if (res.erreur) {
        item.etat = 'erreur'
        item.message = MESSAGES_REFUS[res.erreur] ?? 'Refusée par l’atelier'
        return
      }
      if (res.photoId) item.photoId = res.photoId

      if (res.deja) {
        /* Déjà arrivée et vérifiée : le serveur ne re-signe pas, et il a
           raison — redonner une URL écraserait l'objet référencé. */
        item.etat = 'confirmee'
        item.octetsEnvoyes = item.taille
        this.liberer(item)
        void this.persister(item, null)
        return
      }
      if (!res.url) { item.etat = 'erreur'; item.message = 'Aucune adresse d’envoi'; return }

      item.url = res.url
      item.urlVignette = res.urlVignette ?? null
      item.urlSigneeA = maintenant
      item.etat = 'declaree'
      /* La vignette est RÉÉCRITE, pas effacée. `persister` remplace tout
         l'enregistrement : passer `null` ici la supprimait du coffre local,
         et une reprise après rechargement rendait des tuiles sans aperçu —
         puis, depuis D7, une photo qui ne pouvait plus déposer la sienne. */
      void this.persister(item, item.vignette)
    })

    this.changement()
  }

  /* Étage E — envoyer. Cinq voies (PRD §7.4). XHR et non fetch : on a besoin
     de la progression réelle et d'un abort() franc pour le chien de garde. */
  private etageEnvoi(): void {
    let libres = VOIES_ENVOI - this.compte((i) => i.etat === 'envoi')

    for (const item of this.items.values()) {
      if (libres <= 0) break
      if (item.etat !== 'declaree' || !item.url || !item.charge) continue
      libres--
      this.envoyer(item)
    }
  }

  private envoyer(item: Item): void {
    const xhr = new XMLHttpRequest()
    item.xhr = xhr
    item.etat = 'envoi'
    item.octetsEnvoyes = 0
    item.dernierProgres = Date.now()

    xhr.open('PUT', item.url!, true)
    /* Le SEUL en-tête posé par le navigateur. La signature voyage dans
       l'adresse ; toute autre en-tête ferait échouer la vérification. */
    xhr.setRequestHeader('Content-Type', item.mime)

    xhr.upload.onprogress = (e) => {
      item.octetsEnvoyes = e.loaded
      item.dernierProgres = Date.now()
      /* Pas de this.changement() ici : l'instantané est republié une fois par
         frame par le composant. Notifier à chaque paquet, c'est re-rendre
         cent tuiles cent fois par seconde. */
      this.version++
    }

    xhr.onload = () => {
      item.xhr = null
      if (xhr.status >= 200 && xhr.status < 300) {
        item.octetsEnvoyes = item.taille
        /* La mémoire N'EST PAS libérée ici. Le PUT a réussi côté réseau, mais
           le serveur n'a pas encore mesuré l'objet : tant qu'il n'a pas dit
           oui, il faut de quoi recommencer (piège nº18). */
        this.envoyerVignette(item)
      } else {
        this.echecEnvoi(item, xhr.status)
      }
      this.changement()
      this.pompe()
    }

    xhr.onerror = () => { item.xhr = null; this.echecEnvoi(item, 0); this.changement(); this.pompe() }
    xhr.ontimeout = () => { item.xhr = null; this.echecEnvoi(item, 0); this.changement(); this.pompe() }
    xhr.onabort = () => { item.xhr = null; this.echecEnvoi(item, -1); this.changement(); this.pompe() }

    try {
      xhr.send(item.charge)
    } catch {
      item.xhr = null
      this.echecEnvoi(item, 0)
    }
  }

  /**
   * D7 — le second objet : la vignette de 320 px, dans la foulée de l'original.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * POURQUOI AVANT `envoyee`, ET NON EN TÂCHE DE FOND
   *
   * La confirmation part sur son propre rythme, par lots. Une vignette lâchée
   * en parallèle courrait contre elle : /complete ferait son HEAD, ne
   * trouverait rien, et `vignette_key` resterait nulle pendant que l'objet
   * arrive une seconde plus tard — un fichier payé au stockage que rien ne
   * lira jamais. En la posant AVANT de marquer la photo envoyée, la question
   * est tranchée quand le serveur la pose.
   *
   * ⚠️ Cette voie ne peut PAS échouer. Une vignette est un confort pour
   * l'atelier ; perdre une photo pour un fichier de 20 Ko serait absurde.
   * Toutes les issues — succès, refus, réseau coupé, chien de garde —
   * mènent à `envoyee`. Et elle ne passe JAMAIS par `echecEnvoi()`, qui
   * renverrait l'original tout entier une seconde fois.
   *
   * ⚠️ `item.xhr` est bien réassigné : c'est le contrat du chien de garde.
   * Une voie suspendue doit rester interruptible (piège nº22), et un
   * `dernierProgres` laissé en arrière la ferait couper aussitôt.
   * ══════════════════════════════════════════════════════════════════════════
   */
  private envoyerVignette(item: Item): void {
    if (!item.urlVignette || !item.vignette) { item.etat = 'envoyee'; return }

    const xhr = new XMLHttpRequest()
    item.xhr = xhr
    item.dernierProgres = Date.now()

    const fini = () => {
      item.xhr = null
      item.urlVignette = null
      /* Le blob est relâché quoi qu'il arrive : il n'y a pas de réessai. */
      item.vignette = null
      item.etat = 'envoyee'
      this.changement()
      this.pompe()
    }

    xhr.open('PUT', item.urlVignette, true)
    xhr.setRequestHeader('Content-Type', 'image/jpeg')
    xhr.upload.onprogress = () => { item.dernierProgres = Date.now() }
    xhr.onload = fini
    xhr.onerror = fini
    xhr.ontimeout = fini
    xhr.onabort = fini

    try {
      xhr.send(item.vignette)
    } catch {
      fini()
    }
  }

  private echecEnvoi(item: Item, statut: number): void {
    item.essaisEnvoi++
    item.octetsEnvoyes = 0

    if (item.essaisEnvoi >= ESSAIS_ENVOI_MAX) {
      item.etat = 'erreur'
      item.message = statut === 403
        ? 'Envoi refusé — reprenez cette photo'
        : 'Envoi interrompu'
      return
    }

    /* On repart de la DÉCLARATION, pas de l'envoi : un 403 vient presque
       toujours d'une URL périmée ou d'une signature qui ne correspond plus.
       Renvoyer sur la même adresse rejouerait le même échec (piège nº1). */
    item.url = null
    item.etat = 'prete'
  }

  /* Étage C — confirmer, puis SEULEMENT ensuite libérer la mémoire. */
  private etageConfirmation(): void {
    if (this.confirmationEnVol || Date.now() < this.prochaineConfirmationA) return

    const lot = this.selection((i) => i.etat === 'envoyee' && !!i.photoId, LOT_CONFIRMATION)
    if (!lot.length) return

    this.confirmationEnVol = true
    void this.confirmer(lot).finally(() => {
      this.confirmationEnVol = false
      this.pompe()
    })
  }

  private async confirmer(lot: Item[]): Promise<void> {
    type Reponse = {
      confirmees?: string[]
      rejetees?: Array<{ id: string; raison: string }>
      absentes?: string[]
      nbPhotos?: number
    }

    let data: Reponse
    try {
      const r = await fetch('/api/atelier/photos/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, photoIds: lot.map((i) => i.photoId) }),
      })
      /* Même règle qu'à la déclaration : un dossier introuvable ne guérit pas
         en réessayant. Tout le reste — 500, coupure, délai — se retente. */
      if (r.status === 404) {
        for (const i of lot) { i.etat = 'erreur'; i.message = 'Dossier introuvable' }
        this.bandeau = 'Ce dossier est introuvable. Reprenez le questionnaire depuis le début.'
        this.arreterDefinitivement()
        this.changement()
        return
      }
      if (!r.ok) throw new Error(String(r.status))
      data = (await r.json()) as Reponse
    } catch {
      /* Piège nº12 : c'est ICI qu'on perd des photos au dernier centimètre,
         alors qu'elles sont déjà sur R2. Cinq tentatives espacées, et le lot
         reste en 'envoyee' entre-temps — rien n'est abandonné. */
      const attente = BACKOFF_MS[Math.min(this.essaisConfirmation, BACKOFF_MS.length - 1)]
      this.essaisConfirmation++
      this.prochaineConfirmationA = Date.now() + Math.max(attente, 2_000)
      this.bandeau = 'Vos photos sont arrivées — l’atelier finit de les vérifier.'
      this.changement()
      return
    }

    this.essaisConfirmation = 0
    this.prochaineConfirmationA = 0
    this.bandeau = null

    if (typeof data.nbPhotos === 'number') this.nbServeur = data.nbPhotos

    const parPhotoId = new Map(lot.map((i) => [i.photoId!, i]))

    for (const id of data.confirmees ?? []) {
      const item = parPhotoId.get(id)
      if (!item) continue
      item.etat = 'confirmee'
      item.octetsEnvoyes = item.taille
      /* ICI, et pas une ligne plus tôt : le serveur a mesuré l'objet sur R2. */
      this.liberer(item)
      void this.persister(item, null)
    }

    for (const { id, raison } of data.rejetees ?? []) {
      const item = parPhotoId.get(id)
      if (!item) continue
      item.etat = 'erreur'
      item.photoId = null
      item.message = raison === 'trop_volumineuse' ? 'Photo trop lourde' : 'Refusée à l’arrivée'
    }

    /* « Absente » n'est pas une erreur : l'objet n'est pas sur R2, donc le PUT
       n'a pas réellement abouti. On repart de la déclaration pour obtenir une
       adresse fraîche. La charge est toujours là — c'est tout l'intérêt de ne
       pas avoir libéré la mémoire au succès du PUT. */
    for (const id of data.absentes ?? []) {
      const item = parPhotoId.get(id)
      if (!item || !item.charge) continue
      item.url = null
      item.octetsEnvoyes = 0
      item.etat = item.essaisEnvoi >= ESSAIS_ENVOI_MAX ? 'erreur' : 'prete'
      if (item.etat === 'erreur') item.message = 'Envoi interrompu'
    }

    this.changement()
  }

  /**
   * Le serveur a dit non pour de bon. On coupe les voies encore ouvertes et
   * on cesse de pomper : insister ne ferait que répéter le même refus. Les
   * items restent en place — l'écran doit rester lisible, pas se vider.
   */
  private arreterDefinitivement(): void {
    for (const item of this.items.values()) {
      if (item.etat === 'confirmee' || item.etat === 'erreur') continue
      item.xhr?.abort()
      item.xhr = null
      item.etat = 'erreur'
      item.message = item.message ?? 'Envoi impossible'
    }
    this.arrete = true
    if (this.minuteur) clearInterval(this.minuteur)
    this.minuteur = null
  }

  /* ── chien de garde ─────────────────────────────────────────────────── */

  private chienDeGarde(): void {
    if (this.arrete) return
    const maintenant = Date.now()
    let bouge = false

    for (const item of this.items.values()) {
      /* 3 min SANS PROGRÈS — pas 3 min d'envoi. Une photo de 40 Mo sur une 3G
         de festival met légitimement plus longtemps ; ce qu'on traque, c'est
         la voie suspendue qui ne rendra jamais la main (piège nº22). */
      if (item.etat === 'envoi' && maintenant - item.dernierProgres > SANS_PROGRES_MAX_MS) {
        item.xhr?.abort()
        bouge = true
        continue
      }
      /* Piège nº5 : URL signée jetée avant expiration, pas après. */
      if (item.etat === 'declaree' && maintenant - item.urlSigneeA > URL_PERIMEE_MS) {
        item.url = null
        item.etat = 'prete'
        bouge = true
      }
    }

    if (bouge) this.changement()
    this.pompe()
  }

  /* ── fin de parcours ────────────────────────────────────────────────── */

  /**
   * Clic sur « Envoyer à l'atelier ». Le consentement au droit d'usage des
   * photos est horodaté en base ICI : il ne doit pas exister uniquement en
   * mémoire d'un onglet.
   *
   * ══════════════════════════════════════════════════════════════════════════
   * LE CLIC N'ATTEND PLUS LA FIN DES TRANSFERTS (01/09)
   *
   * Le dossier ENTRE dans le travail de l'atelier à cet instant : c'est
   * `consent_photos` qui le décide, et lui seul (invariant nº7). Ce qui reste
   * en vol continue de monter tant que l'onglet vit — le moteur est un
   * singleton hors React, il survit au passage à l'écran 6.
   *
   * ⚠️ LE COFFRE LOCAL N'EST PLUS PURGÉ ICI. Il l'était, et c'était sans
   * conséquence tant que le clic exigeait `enVol === 0`. Aujourd'hui il reste
   * des charges à envoyer : les effacer, c'est perdre la reprise après un
   * rechargement, et perdre les blobs qu'un réessai devrait renvoyer. La purge
   * a lieu quand plus rien ne peut partir (`purgerSiTermine`).
   *
   * ⚠️ `photos_attendues` n'est PAS une promesse, c'est un témoin. Le serveur
   * ne s'en sert que pour le journal : si l'onglet se ferme en route, l'écart
   * entre ce nombre et `nb_photos` est la SEULE trace qui dise à l'atelier
   * qu'il manque quelque chose. Sans lui, un dépôt amputé ressemble trait pour
   * trait à un dépôt de quarante photos voulu tel quel.
   * ══════════════════════════════════════════════════════════════════════════
   */
  async finaliser(): Promise<{ ok: boolean; message?: string }> {
    /* Tout ce qui a une chance d'arriver : les confirmées, plus ce qui est
       encore en route. Les photos en échec définitif n'en sont pas — elles
       ont déjà été décomptées sur le libellé du bouton. */
    const attendues = Math.max(
      this.compte((i) => i.etat !== 'erreur'),
      this.nbServeur ?? 0,
    )

    try {
      const r = await fetch('/api/atelier/numero', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          consent_photos: true,
          photos_attendues: attendues,
        }),
      })
      if (!r.ok) return { ok: false, message: 'L’atelier n’a pas pu enregistrer votre accord. Réessayez.' }
    } catch {
      return { ok: false, message: 'Connexion perdue. Vérifiez votre réseau, puis réessayez.' }
    }

    this.finalise = true
    this.attendues = attendues
    this.changement()
    /* Rien en vol : le cas d'avant, la purge tombe tout de suite. */
    this.purgerSiTermine()
    return { ok: true }
  }

  /**
   * Le coffre local ne se vide qu'une fois le dossier parti ET la file
   * épuisée. Appelé à chaque tour de pompe : c'est le seul endroit qui voit
   * passer la dernière confirmation, quel que soit le chemin (succès, échec
   * définitif, refus serveur).
   */
  private purgerSiTermine(): void {
    if (!this.finalise || this.purgeFaite) return
    if (this.compte((i) => i.etat !== 'confirmee' && i.etat !== 'erreur') > 0) return
    this.purgeFaite = true
    void stockage.purgerToken(this.token)
  }

  /* ── instantané ─────────────────────────────────────────────────────── */

  instantane(): Vue {
    const photos: VuePhoto[] = []
    let confirmees = 0
    let enVol = 0
    let erreurs = 0
    let octetsEnvoyes = 0
    let octetsTotal = 0

    for (const item of this.items.values()) {
      if (item.etat === 'confirmee') confirmees++
      else if (item.etat === 'erreur') erreurs++
      else enVol++

      octetsTotal += item.taille
      octetsEnvoyes += item.etat === 'confirmee' ? item.taille : item.octetsEnvoyes

      photos.push({
        id: item.id,
        nom: item.nom,
        etat: item.etat,
        progression: item.taille > 0 ? Math.min(1, item.octetsEnvoyes / item.taille) : 0,
        apercu: item.apercu,
        message: item.message,
      })
    }

    photos.sort((a, b) => (this.items.get(a.id)!.ordre - this.items.get(b.id)!.ordre))

    return {
      photos,
      /* Le serveur fait foi quand il a parlé : il compte les lignes dont la
         taille a été MESURÉE sur R2, y compris celles d'une session
         précédente sur un autre appareil. */
      confirmees: Math.max(confirmees, this.nbServeur ?? 0),
      enVol,
      erreurs,
      octetsEnvoyes,
      octetsTotal,
      stockageDegrade: this.stockageDegrade,
      /* Sans worker, une photo d'iPhone part à 48 Mpx au lieu de 5200 px :
         plusieurs fois plus d'octets sur un forfait mobile. Ça se dit. */
      reductionDegradee: poolIndisponible(),
      clos: this.arrete,
      finalise: this.finalise,
      attendues: this.attendues,
      bandeau: this.bandeau,
      serveur: this.nbServeur,
    }
  }

  /* ── outillage ──────────────────────────────────────────────────────── */

  private compte(predicat: (i: Item) => boolean): number {
    let n = 0
    for (const i of this.items.values()) if (predicat(i)) n++
    return n
  }

  private selection(predicat: (i: Item) => boolean, max: number): Item[] {
    const out: Item[] = []
    for (const i of this.items.values()) {
      if (out.length >= max) break
      if (predicat(i)) out.push(i)
    }
    return out
  }

  /** Le geste du piège nº18, isolé pour qu'on voie où il est appelé. */
  private liberer(item: Item): void {
    item.original = null
    item.charge = null
    /* La vignette suit le même sort que la charge : plus rien ne l'enverra.
       L'objectURL de `apercu`, lui, RESTE — c'est ce que la grille affiche,
       et il est révoqué par `detruire()`. */
    item.vignette = null
    item.urlVignette = null
    item.xhr = null
  }

  private async persister(item: Item, vignette: Blob | null): Promise<void> {
    if (!stockage.stockageActif()) {
      if (!this.stockageDegrade) { this.stockageDegrade = true; this.changement() }
      return
    }
    await stockage.ecrire({
      id: item.id,
      token: this.token,
      photoId: item.photoId,
      nom: item.nom,
      mime: item.mime,
      taille: item.taille,
      ordre: item.ordre,
      charge: item.etat === 'confirmee' ? null : item.charge,
      vignette,
      confirmee: item.etat === 'confirmee',
      cree: Date.now(),
    })
    if (!stockage.stockageActif() && !this.stockageDegrade) {
      this.stockageDegrade = true
      this.changement()
    }
  }

  detruire(): void {
    this.arrete = true
    if (this.minuteur) clearInterval(this.minuteur)
    this.minuteur = null
    for (const item of this.items.values()) {
      item.xhr?.abort()
      if (item.apercu) URL.revokeObjectURL(item.apercu)
    }
    this.items.clear()
    this.abonnes.clear()
    fermerPool()
  }
}

const MESSAGES_REFUS: Record<string, string> = {
  taille: 'Photo trop lourde',
  format: 'Format non accepté',
  plafond: 'Le numéro est complet',
  internal: 'L’atelier n’a pas pu l’enregistrer',
}

function identifiant(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/* ── singleton, une instance par numéro ───────────────────────────────── */

let instance: Moteur | null = null

export function moteurPour(token: string): Moteur {
  if (instance && instance.token !== token) {
    instance.detruire()
    instance = null
  }
  if (!instance) instance = new Moteur(token)
  return instance
}

export function oublierMoteur(): void {
  instance?.detruire()
  instance = null
}

export type { Moteur }
