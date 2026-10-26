/**
 * Le moteur d'envoi des photos de l'Édition collective (PRD §5.3).
 * Module NAVIGATEUR, sans React : une classe et un abonnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI PAS LE MOTEUR DU B2C (composer/depot/moteur.ts)
 *
 * Il garde une copie IndexedDB de chaque photo réduite et efface celles des
 * autres dossiers : à 2 000 photos, le quota du navigateur saute, et partager
 * sa base effacerait la reprise d'un dépôt B2C en cours. Ici :
 * - RIEN n'est gardé dans le navigateur. La reprise passe par la clé de
 *   fichier : re-sélectionner le même dossier, le serveur répond « déjà là »
 *   (`connues`) AVANT toute réduction.
 * - Le flux est BORNÉ : on ne réduit que quelques photos d'avance
 *   (`FENETRE`), chaque photo réduite part puis est libérée. Le `File`
 *   d'origine n'est qu'une poignée : le relire coûte rien en mémoire.
 * - L'écran lit des COMPTEURS, pas une liste de 2 000 éléments refaite à
 *   chaque image.
 * Ce qui est commun avec le B2C, importé tel quel : la réduction et la
 * vignette 320 px (`pool.ts` + `reduire.worker.js`), et le protocole
 * (déclaration, PUT signé, confirmation par lots).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Limite dite honnêtement à l'écran : un envoi ne continue pas page
 * fermée (iOS surtout). Ce qui est déjà arrivé est gardé.
 * ⚠️ Le TYPE envoyé suit la CHARGE réduite (`charge.type`), pas le fichier
 * d'origine : un PNG réduit part en JPEG, déclaré JPEG (le défaut soupçonné
 * côté B2C, vérifié dans une tâche à part, ne se reproduit pas ici).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE RÉSEAU QUI TOMBE (banc d'essai du 19/10, 4G faible, coupures de 12 s à
 * 5 min, avant / après dans `scripts/verif-collectif.ts`, section T-192)
 *
 * - Une coupure n'est PAS un essai raté : hors ligne, un envoi attend le
 *   réseau (`attendreReseau`, réveillé par l'événement `online`) au lieu de
 *   brûler ses trois essais. Seul un refus du COFFRE (une réponse HTTP) compte.
 * - La vignette est renvoyée comme la photo : une vignette perdue pendant une
 *   coupure laissait la photo s'afficher en original dans la grille (T-171).
 * - À la clôture, les photos déjà au coffre sont CONFIRMÉES avant de fermer :
 *   `complete` les accepte encore, et on les refusait toutes.
 * - Un statut que le réseau n'explique pas (lien supprimé, lot illisible) ne
 *   se réessaie pas à l'infini en disant « connexion interrompue ».
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LES PLANCHES DU 20/10 (lot w2, page du participant ; tout est FACULTATIF :
 * le dépôt du responsable, qui ne passe aucun de ces réglages, ne change pas)
 *
 * - Aucune adresse ne part avec les photos : la personne d'une photo est celle
 *   que CE téléphone représente (`depot/participant`, que la page appelle
 *   TOUJOURS d'abord) ; `presign` ignore `email` depuis le durcissement du 20/10.
 * - 409 `depot_pas_ouvert` refuse le lot avec la phrase du serveur (comme
 *   `accord_requis`), jamais une coupure ; une photo
 *   `corbeille: true` est « déjà là » (elle ne repart pas, ni ne ressuscite).
 * - La progression PAR ARRIVÉE (planche 7B) : `auCoffre` compte les photos que
 *   le coffre a reçues sans attendre la confirmation groupée (15 s) ; avant,
 *   l'écran disait « 0 photo reçue · 18 en cours » avec 7 photos au coffre.
 * - `apercus` (Configuration) : les N dernières photos gardent leur vignette
 *   de 320 px (quelques Ko) et leur avancement, pour « Mes photos » pendant
 *   l'envoi (l'anneau, puis la coche). Borné : au-delà de N, la plus ancienne
 *   est libérée. 0 par défaut : rien n'est gardé.
 * - `place` : ce que le serveur a dit de la place restante à la dernière
 *   déclaration (« tu peux encore en envoyer 18 »).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE DERNIER ENVOI, ET CE QUI ÉTAIT DÉJÀ LÀ (retours de Mathias du 21/10)
 *
 * - Un LOT commence quand on choisit des photos et que rien ne part ; « Ajouter
 *   d'autres photos » pendant l'envoi s'y ajoute. La vue dit ce qu'a fait le
 *   lot en cours (`vue.lot`, `compterLot`) : l'écran remercie pour CE lot, et
 *   pour ce qui est ARRIVÉ seulement (plus « 8 photos reçues » sur un lien à 5,
 *   le cumul de la page, déjà-là comprises).
 * - Chaque « déjà là » garde ce que le serveur en dit (`deja` : cet album, un
 *   autre lien, la corbeille, revenue de la corbeille), dès la vérification
 *   d'une reprise quand il le sait. Une photo que son auteur avait supprimée
 *   ne se réduit pas : elle part tout de suite en déclaration (`aRevoir`), où
 *   le serveur la restaure. Re-choisie après avoir été supprimée d'ici
 *   (`oublier`), elle redemande au serveur.
 * - Un lien mort (404 de la vérification, de la déclaration ou de la
 *   confirmation) ferme l'envoi ET le dit à la page (`vue.lienMort`), qui
 *   bascule tout entière sur « Ce lien ne fonctionne plus ».
 * ══════════════════════════════════════════════════════════════════════════
 */

import { reduire } from "@/app/(atelier)/composer/depot/pool";
import { estHeic, OCTETS_SIGNATURE, resoudreMime, signaturePhotoReconnue } from "@/lib/atelier/formats";
import { vignetteHeic } from "./heic";
import { DEJA_CONNUE, estVideo, lireDejaLa, LOT_CONFIRMATION, LOT_DECLARATION, LOT_VERIFICATION, type DejaLa } from "@/lib/collectif/depot";
import { compterLot, type CompteLot } from "@/lib/collectif/depotParticipant";
import { lienMort } from "@/lib/collectif/liens";
import { cleDuFichier } from "@/lib/collectif/cleDepot";
import { ERREUR_ACCORD } from "@/lib/collectif/accord";
import { ERREUR_PAS_OUVERT } from "@/lib/collectif/ouverture";

/** Combien de photos réduites EN MÉMOIRE, au plus (une charge réduite pèse plusieurs Mo). */
const FENETRE = 8;
/** Combien de photos préparées d'avance, au plus : une photo qui part en original ne tient
    qu'une vignette de quelques Ko, on peut donc en préparer davantage et déclarer par lots
    plus gros (une déclaration par photo coûtait une requête serveur par photo, T-168). */
const AVANCE = 40;
/** Envois en parallèle (PRD §5.3 : 3 à 4). */
const VOIES = 4;
/** Au-delà de ce nombre de photos signées qui attendent leur voie, on ne déclare plus. */
const FILE_SIGNEE = VOIES * 2;
/** Un lot de déclaration attend d'avoir au moins ce nombre de photos quand les voies sont pleines. */
const LOT_PLEIN = 10;
/** Refus du COFFRE (réponse HTTP) avant de passer en erreur. Une coupure ne compte pas. */
const ESSAIS_MAX = 3;
/** Échecs sans réponse alors que le navigateur se dit EN LIGNE (CORS, réseau captif) : au-delà,
    l'erreur est dite. Hors ligne, rien ne se compte. */
const ESSAIS_RESEAU_MAX = 12;
/** Échecs sans réponse d'une même photo à partir desquels l'écran le dit (l'envoi continue d'essayer). */
const ESSAIS_RESEAU_DITS = 2;
/** Un envoi sans le moindre octet de progrès pendant ce délai est abandonné puis repris. */
const SANS_PROGRES_MS = 180_000;
/** Une URL signée vit une heure ; au-delà de 45 min, on la redemande. */
const URL_VIEILLE_MS = 45 * 60_000;
const ATTENTES_MS = [2_000, 5_000, 10_000, 20_000, 45_000];
/** Une requête au serveur sans réponse passé ce délai est abandonnée, puis refaite : sans
    garde-temps, une requête partie juste avant un tunnel gardait son verrou pour toujours. */
const DELAI_REQUETE_MS = 30_000;
const DELAI_CONFIRMATION_MS = 60_000;
/** Une photo arrivée au coffre attend au plus ce délai d'être confirmée avec d'autres. */
const ATTENTE_CONFIRMATION_MS = 15_000;
/** L'avancement d'un envoi ne republie la vue qu'à ce rythme (un anneau, pas un film). */
const RYTHME_PROGRES_MS = 250;
/** Le refus d'un lot que le serveur explique par une phrase (409) : aucun réseau n'y changera rien. */
const REFUS_EXPLIQUES: readonly string[] = [ERREUR_PAS_OUVERT];

type Etat = "neuf" | "attente" | "reduction" | "pret" | "declare" | "envoi" | "envoye" | "confirme" | "deja" | "refuse" | "erreur";
const FINIS: readonly Etat[] = ["confirme", "deja", "refuse", "erreur"];

type Item = {
  n: number;
  fichier: File;
  cle: string;
  mime: string;
  etat: Etat;
  essais: number;
  /** Les envois partis sans réponse alors que le navigateur se disait en ligne. */
  essaisReseau: number;
  charge: Blob | null;
  vignette: Blob | null;
  typeEnvoye: string;
  photoId: string | null;
  url: string | null;
  urlVignette: string | null;
  signeLe: number;
  /** Quand le coffre l'a reçue (avant confirmation). */
  envoyeLe: number;
  raison: string | null;
  /** Le nom de qui envoie, AU MOMENT de l'ajout : changer le champ pendant l'envoi
      ne coupe plus une personne en deux (« Léa » puis « Léa Martin »). */
  deposant: string | null;
  /** La provenance choisie AU MOMENT de l'ajout : un second lot ajouté
      pendant l'envoi (« Ajouter d'autres photos ») ne relabellise jamais le
      premier. */
  provenance: Provenance | null;
  /** La version du texte d'accord cochée AU MOMENT de l'ajout (T-184) ;
      `null` pour le responsable, qui ne coche rien. */
  accord: string | null;
  /** L'avancement de l'envoi de l'original, de 0 à 1 (l'anneau de « Mes photos »). */
  progres: number;
  /** La vignette gardée pour l'écran (`apercus`), une adresse `blob:` ; `null` sinon. */
  apercu: string | null;
  /** Le lot (l'envoi) auquel elle appartient : celui de son ajout, ou de sa reprise. */
  lot: number;
  /** « Déjà là » : où elle était, tel que le serveur l'a dit ; `null` sinon. */
  deja: DejaLa | null;
};

/** Une photo de l'envoi en cours, telle que « Mes photos » la montre (planche 7B). */
export type ApercuEnvoi = {
  n: number;
  /** `attente` : pas encore partie ; `envoi` : en route (l'anneau) ; `arrivee` : au coffre ou confirmée (la coche) ;
      `deja` : le serveur l'avait déjà (elle ne repart pas : la liste du serveur la montre si elle est à moi). */
  etat: "attente" | "envoi" | "arrivee" | "deja" | "refusee" | "erreur";
  progres: number;
  apercu: string | null;
  /** L'id de la photo au serveur, dès qu'il est connu (pour ne pas la montrer deux fois). */
  photoId: string | null;
  /** La raison d'un refus ou d'une erreur (la phrase du serveur), `null` sinon. */
  raison: string | null;
};

export type Vue = {
  total: number;
  arrivees: number;
  dejaLa: number;
  enCours: number;
  refusees: number;
  erreurs: number;
  /** Les raisons des refus et erreurs, sans répétition. */
  raisons: string[];
  /** Le dépôt est fermé (clôture, lien supprimé) : la phrase à afficher. */
  ferme: string | null;
  /** Le réseau ne répond pas : on réessaie tout seul. */
  horsLigne: boolean;
  /** Le serveur répond mal (5xx) : on réessaie tout seul, sans accuser le réseau. */
  serveurLent: boolean;
  /** En ligne, mais le coffre ne répond pas (wifi filtré, bloqueur) : la phrase à dire, avec « Réessayer » ; `null` sinon. */
  reseauBloque: string | null;
  /** Les fichiers ignorés à l'ajout (pas des images). */
  ignores: number;
  /** Parmi eux, les vidéos (T-200 : refusées, décision de Mathias), et le nom de la première pour la nommer. */
  videos: number;
  premiereVideo: string | null;
  /** Les fichiers choisis une seconde fois pendant CET envoi : sautés, et dits (retours du 14/10, point 8). */
  dejaAjoutes: number;
  /** Les photos que le coffre a REÇUES, pas encore confirmées (elles sont aussi dans `enCours`) : la barre avance à l'arrivée. */
  auCoffre: number;
  /** La place restante dite par le serveur à la dernière déclaration : un nombre, `null` sans limite, `undefined` pas encore dite. */
  place?: number | null;
  /** Quand `place` a été dite (Date.now), pour la comparer à une autre source. */
  placeLe?: number;
  /** Le DERNIER envoi (ou celui en cours) : ce qu'il a fait, lui seul. */
  lot: CompteLot;
  /** Le lien ne mène plus nulle part (404) : la page dit « Ce lien ne fonctionne plus ». */
  lienMort: boolean;
};

export type Configuration = {
  token: string;
  /** La clé de provenance du lien (`?p=`), pour un lien sans plafond. */
  p?: string | null;
  /** Tutoyer (une école) : seulement pour les phrases que le moteur écrit lui-même. */
  tu?: boolean;
  /** Combien de photos gardent leur vignette pour l'écran pendant l'envoi (`apercus()`) ; 0 ou absent : aucune. */
  apercus?: number;
};

export type Provenance = { type: string; libelle: string };

function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Un fichier sans vignette porte-t-il au moins la signature d'une image ? Illisible lui-même : on le laisse partir. */
async function signatureLisible(f: Blob): Promise<boolean> {
  try {
    return signaturePhotoReconnue(new Uint8Array(await f.slice(0, OCTETS_SIGNATURE).arrayBuffer()));
  } catch {
    return true;
  }
}

/** La raison d'un fichier écarté parce qu'il n'est pas une image. */
const PAS_UNE_PHOTO = "Un fichier n'est pas une photo lisible : il n'est pas parti.";

function enLigne(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * Attendre `ms`, ou moins si le réseau revient : une coupure de métro ne doit
 * pas laisser la page dormir 45 s après le retour du signal.
 */
function attendreReseau(ms: number): Promise<void> {
  if (typeof window === "undefined") return attendre(ms);
  return new Promise((r) => {
    const fini = () => {
      clearTimeout(minuteur);
      window.removeEventListener("online", fini);
      r();
    };
    const minuteur = setTimeout(fini, ms);
    window.addEventListener("online", fini);
  });
}

/**
 * Le réseau est-il revenu ? Hors ligne, on attend l'événement `online` (borné
 * à 60 s pour se réveiller quand même : certains navigateurs ne le lancent pas).
 */
async function attendreEnLigne(): Promise<void> {
  while (!enLigne()) await attendreReseau(60_000);
}

/**
 * Le sel de CET appareil, gardé dans le navigateur. Sans date fiable (iPhone),
 * deux participants qui envoient chacun un « IMG_1234.JPG » de même poids
 * auraient la même clé, et la clé est unique PAR ÉDITION : la seconde photo
 * serait déclarée « déjà là » et perdue sans un mot. Le sel range chaque clé
 * chez son appareil. Navigation privée ou stockage refusé : un sel pour la
 * page seulement (la reprise après rechargement y renverra en double, et le
 * repérage des doublons le dira).
 */
const CLE_SEL = "bj-depot-sel";
export function selDeLAppareil(): string {
  const neuf = () => {
    const octets = new Uint8Array(6);
    crypto.getRandomValues(octets);
    return Array.from(octets, (o) => o.toString(36).padStart(2, "0")).join("").slice(0, 10);
  };
  try {
    const garde = window.localStorage.getItem(CLE_SEL);
    if (garde && /^[a-z0-9]{6,12}$/.test(garde)) return garde;
    const sel = neuf();
    window.localStorage.setItem(CLE_SEL, sel);
    return sel;
  } catch {
    return neuf();
  }
}

type Reponse = { status: number; json: Record<string, unknown> };

/** Un POST au serveur, abandonné passé `delai` (l'abandon se lit comme une coupure). */
async function poster(url: string, corps: unknown, delai: number = DELAI_REQUETE_MS): Promise<Reponse> {
  const garde = new AbortController();
  const minuteur = setTimeout(() => garde.abort(), delai);
  try {
    const rep = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
      credentials: "same-origin",
      signal: garde.signal,
    });
    /* Un corps coupé en route (la 4G qui tombe pendant la réponse) n'est PAS une
       réponse vide : il se relit comme une coupure, jamais comme « rien d'accepté ». */
    const texte = await rep.text();
    let json: Record<string, unknown> = {};
    if (texte) {
      try {
        json = JSON.parse(texte) as Record<string, unknown>;
      } catch {
        if (rep.ok) throw new Error("réponse coupée");
      }
    }
    return { status: rep.status, json };
  } finally {
    clearTimeout(minuteur);
  }
}

type ResultatPut = { ok: boolean; status: number };

export class MoteurDepot {
  private items: Item[] = [];
  private parCle = new Map<string, Item>();
  private abonnes = new Set<() => void>();
  private compteur = 0;
  private ignores = 0;
  private videos = 0;
  private premiereVideo: string | null = null;
  private dejaAjoutes = 0;
  private ferme: string | null = null;
  private horsLigne = false;
  private serveurLent = false;
  private bloque = false;
  /** Les photos qui attendent avant de retenter : « Réessayer » les réveille. */
  private readonly reveils = new Set<() => void>();
  private verification = false;
  private declaration = false;
  private confirmation = false;
  private voies = 0;
  private echecsReseau = 0;
  private detruit = false;
  private confirmationProgrammee = false;
  private version = 0;
  private cache: { version: number; vue: Vue } | null = null;
  private readonly sel: string;
  /** L'écran reste allumé pendant l'envoi : sur un iPhone, l'écran qui s'éteint suspend tout. */
  private veille: WakeLockSentinel | null = null;
  private veilleDemandee = false;

  private deposant: string | null = null;
  private provenance: Provenance | null = null;
  private accord: string | null = null;
  private place: number | null | undefined = undefined;
  private placeLe = 0;
  /** Le numéro du lot en cours (0 : rien encore) et ses fichiers choisis deux fois. */
  private lot = 0;
  private deuxFoisLot = 0;
  private mort = false;
  private progresProgramme = false;
  private cacheApercus: { version: number; liste: ApercuEnvoi[] } | null = null;

  constructor(private readonly cfg: Configuration) {
    this.sel = typeof window === "undefined" ? "serveur" : selDeLAppareil();
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.auRetourDuReseau);
      window.addEventListener("offline", this.aLaCoupure);
      document.addEventListener("visibilitychange", this.auRetourALaPage);
    }
  }

  private v(vous: string, toi: string): string {
    return this.cfg.tu ? toi : vous;
  }

  /** Le nom de qui envoie : il part avec les fichiers ajoutés ENSUITE. */
  definirDeposant(nom: string | null): void {
    this.deposant = nom?.trim() || null;
  }

  /** La provenance choisie par le responsable (« Le photographe »…), pour les PROCHAINS fichiers ajoutés. */
  definirProvenance(p: Provenance | null): void {
    this.provenance = p;
  }

  /** L'accord coché par le participant (la VERSION du texte affiché), pour les
      PROCHAINS fichiers ajoutés ; `null` s'il le décoche (T-184). */
  definirAccord(version: string | null): void {
    this.accord = version;
  }

  /** La provenance des prochains fichiers (la fenêtre la retrouve en se rouvrant). */
  provenanceChoisie(): Provenance | null {
    return this.provenance;
  }

  /* ───────────────────────────── l'abonnement ───────────────────────────── */

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => this.abonnes.delete(fn);
  };

  private notifier(): void {
    this.version++;
    void this.tenirEcran();
    for (const fn of this.abonnes) fn();
  }

  /** L'avancement d'un envoi : une republication au plus tous les `RYTHME_PROGRES_MS`. */
  private notifierBientot(): void {
    if (this.progresProgramme) return;
    this.progresProgramme = true;
    setTimeout(() => {
      this.progresProgramme = false;
      if (!this.detruit) this.notifier();
    }, RYTHME_PROGRES_MS);
  }

  vue = (): Vue => {
    if (this.cache?.version === this.version) return this.cache.vue;
    let arrivees = 0, dejaLa = 0, enCours = 0, refusees = 0, erreurs = 0, auCoffre = 0;
    const raisons = new Set<string>();
    for (const it of this.items) {
      if (it.etat === "envoye") auCoffre++;
      if (it.etat === "confirme") arrivees++;
      else if (it.etat === "deja") dejaLa++;
      else if (it.etat === "refuse") {
        refusees++;
        if (it.raison) raisons.add(it.raison);
      } else if (it.etat === "erreur") {
        erreurs++;
        if (it.raison) raisons.add(it.raison);
      } else enCours++;
    }
    const vue: Vue = {
      total: this.items.length,
      arrivees,
      dejaLa,
      enCours,
      refusees,
      erreurs,
      raisons: [...raisons].slice(0, 6),
      ferme: this.ferme,
      horsLigne: this.horsLigne,
      serveurLent: this.serveurLent && !this.horsLigne,
      reseauBloque:
        this.bloque && enCours > 0 && !this.horsLigne && !this.ferme
          ? this.v(
              "L'envoi n'aboutit pas pour l'instant (un wifi filtré ?). Il réessaie tout seul ; vous pouvez aussi passer en 4G, puis « Réessayer ».",
              "L'envoi n'aboutit pas pour l'instant (un wifi filtré ?). Il réessaie tout seul ; tu peux aussi passer en 4G, puis « Réessayer »."
            )
          : null,
      ignores: this.ignores,
      videos: this.videos,
      premiereVideo: this.premiereVideo,
      dejaAjoutes: this.dejaAjoutes,
      lienMort: this.mort,
      lot: compterLot(this.items, this.lot, this.deuxFoisLot),
      auCoffre,
      place: this.place,
      placeLe: this.placeLe,
    };
    this.cache = { version: this.version, vue };
    return vue;
  };

  /**
   * Les photos de l'envoi gardées pour l'écran (`apercus` de la configuration),
   * la plus récente d'abord. Mise en cache par version, comme `vue` : la même
   * liste tant que rien ne bouge (useSyncExternalStore).
   */
  apercus = (): ApercuEnvoi[] => {
    if (this.cacheApercus?.version === this.version) return this.cacheApercus.liste;
    const max = this.cfg.apercus ?? 0;
    const liste: ApercuEnvoi[] = [];
    for (let i = this.items.length - 1; i >= 0 && liste.length < max; i--) {
      const it = this.items[i];
      const etat: ApercuEnvoi["etat"] =
        it.etat === "envoye" || it.etat === "confirme"
          ? "arrivee"
          : it.etat === "deja"
            ? "deja"
            : it.etat === "refuse"
            ? "refusee"
            : it.etat === "erreur"
              ? "erreur"
              : it.etat === "envoi"
                ? "envoi"
                : "attente";
      liste.push({ n: it.n, etat, progres: it.progres, apercu: it.apercu, photoId: it.photoId, raison: it.raison });
    }
    this.cacheApercus = { version: this.version, liste };
    return liste;
  };

  /** Y a-t-il un envoi en cours (pour l'avertissement de fermeture de page) ? */
  occupe(): boolean {
    return this.items.some((i) => !FINIS.includes(i.etat));
  }

  detruire(): void {
    this.detruit = true;
    this.abonnes.clear();
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.auRetourDuReseau);
      window.removeEventListener("offline", this.aLaCoupure);
      document.removeEventListener("visibilitychange", this.auRetourALaPage);
    }
    void this.veille?.release().catch(() => {});
    this.veille = null;
    for (const it of this.items) this.libererApercu(it);
  }

  private libererApercu(it: Item): void {
    if (!it.apercu) return;
    try {
      URL.revokeObjectURL(it.apercu);
    } catch {
      /* déjà libérée */
    }
    it.apercu = null;
  }

  /** Garder la vignette d'une photo pour l'écran, et libérer celles qui sortent des `apercus` dernières. */
  private garderApercu(it: Item, vignette: Blob | null): void {
    const max = this.cfg.apercus ?? 0;
    if (!max || !vignette || it.apercu || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
    it.apercu = URL.createObjectURL(vignette);
    const dernier = this.items.length ? this.items[this.items.length - 1].n : it.n;
    for (const autre of this.items) if (autre.apercu && autre.n <= dernier - max) this.libererApercu(autre);
  }

  /* ───────────────────────────── le réseau, l'écran ───────────────────────────── */

  /** Le réseau revient : on repart TOUT DE SUITE, et ce qu'un wifi filtré avait arrêté repart aussi. */
  private auRetourDuReseau = (): void => {
    this.horsLigne = false;
    this.bloque = false;
    this.echecsReseau = 0;
    for (const it of this.items) {
      if (it.etat === "erreur" && it.essaisReseau >= ESSAIS_RESEAU_MAX) this.remettre(it);
    }
    this.notifier();
    this.pompe();
  };

  private aLaCoupure = (): void => {
    this.horsLigne = true;
    this.notifier();
  };

  /** La page revient au premier plan (écran rallumé, appli rouverte) : les minuteurs ont dormi. */
  private auRetourALaPage = (): void => {
    if (document.visibilityState !== "visible") return;
    this.veille = null;
    this.veilleDemandee = false;
    this.notifier();
    this.pompe();
  };

  /**
   * Garder l'écran allumé tant que des photos partent (Screen Wake Lock :
   * Safari 16.4+, Chrome Android). Sur un iPhone, l'écran éteint au bout de
   * 30 s suspend la page et tout envoi avec elle. Refusé ou absent : rien ne
   * change, l'écran le dit toujours (« Gardez cette page ouverte »).
   */
  private async tenirEcran(): Promise<void> {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    const veut = !this.detruit && this.occupe();
    if (veut && !this.veille && !this.veilleDemandee && document.visibilityState === "visible") {
      this.veilleDemandee = true;
      try {
        this.veille = await navigator.wakeLock.request("screen");
        this.veille.addEventListener("release", () => {
          this.veille = null;
          this.veilleDemandee = false;
        });
      } catch {
        /* refusé (économie d'énergie, iframe) : on n'insiste pas avant le prochain retour à la page */
      }
    } else if (!veut && this.veille) {
      const v = this.veille;
      this.veille = null;
      this.veilleDemandee = false;
      void v.release().catch(() => {});
    }
  }

  /* ───────────────────────────── l'ajout ───────────────────────────── */

  ajouter(fichiers: Iterable<File>): void {
    if (this.ferme) return;
    const maintenant = Date.now();
    /* Rien ne part : un nouvel envoi commence (son merci, ses « déjà là ») ; sinon, ces photos s'ajoutent à celui en cours. */
    this.nouveauLotSiLibre();
    for (const f of fichiers) {
      const mime = resoudreMime(f.name, f.type);
      if (!mime) {
        this.ignores++;
        if (estVideo(f.name, f.type)) {
          this.videos++;
          this.premiereVideo ??= f.name;
        }
        continue;
      }
      const cle = cleDuFichier(this.sel, f, maintenant);
      const connu = this.parCle.get(cle);
      /* Arrivée ou déjà là par un envoi PRÉCÉDENT de cette page : elle ne repart pas, et le
         nouvel envoi le dit (une case « déjà là » de plus, où elle était). */
      let deja: DejaLa | null = null;
      if (connu) {
        /* Re-choisie : refusée (plafond relevé depuis ?) ou en erreur, elle repart ;
           en route ou arrivée, elle est comptée et ne repart pas. */
        if (connu.etat === "refuse" || connu.etat === "erreur") {
          connu.fichier = f;
          connu.deposant = this.deposant;
          connu.provenance = this.provenance;
          connu.accord = this.accord;
          connu.lot = this.lot;
          this.remettre(connu);
          continue;
        }
        if ((connu.etat === "confirme" || connu.etat === "deja") && connu.lot !== this.lot) {
          const avant = connu.etat === "deja" ? connu.deja : null;
          /* Revenue de la corbeille par un envoi précédent : elle est maintenant dans son album. */
          deja = !avant
            ? { ou: "album", lien: null, ici: true }
            : avant.ou === "restauree"
              ? { ou: avant.ici ? "album" : "lien", lien: avant.lien, ici: avant.ici }
              : avant;
        } else {
          this.dejaAjoutes++;
          this.deuxFoisLot++;
          continue;
        }
      }
      this.items.push({
        n: this.compteur++,
        fichier: f,
        cle,
        mime,
        etat: deja ? "deja" : "neuf",
        essais: 0,
        essaisReseau: 0,
        charge: null,
        vignette: null,
        typeEnvoye: mime,
        photoId: deja ? (connu?.photoId ?? null) : null,
        url: null,
        urlVignette: null,
        signeLe: 0,
        envoyeLe: 0,
        raison: null,
        progres: 0,
        apercu: null,
        lot: this.lot,
        deja,
        deposant: this.deposant,
        provenance: this.provenance,
        accord: this.accord,
      });
      /* Une case « déjà là » n'est pas une photo à suivre : la clé reste à la première. */
      if (!deja) this.parCle.set(cle, this.items[this.items.length - 1]);
    }
    this.notifier();
    this.pompe();
  }

  /** Un nouveau lot, si rien ne part (un envoi fini, en erreur ou refusé, est fini). */
  private nouveauLotSiLibre(): void {
    if (this.occupe()) return;
    this.lot++;
    this.deuxFoisLot = 0;
  }

  /**
   * Des photos de cette page supprimées d'ici (« Mes photos ») : leur clé est
   * oubliée, pour que les choisir de nouveau redemande au serveur, qui les
   * restaure (au lieu de « déjà là » d'après la mémoire de la page).
   */
  oublier(photoIds: Iterable<string>): void {
    const ids = new Set(photoIds);
    for (const it of this.items) {
      if (it.photoId && ids.has(it.photoId) && this.parCle.get(it.cle) === it) this.parCle.delete(it.cle);
    }
  }

  private remettre(it: Item): void {
    it.etat = "attente";
    it.progres = 0;
    it.essais = 0;
    it.essaisReseau = 0;
    it.raison = null;
    it.photoId = null;
    it.url = null;
    it.urlVignette = null;
  }

  /** Reprendre les photos en erreur (un bouton « Réessayer ») : elles rejoignent l'envoi en cours, ou en font un nouveau. */
  reessayer(): void {
    this.nouveauLotSiLibre();
    for (const it of this.items) {
      if (it.etat === "erreur") {
        it.lot = this.lot;
        this.remettre(it);
      }
    }
    this.horsLigne = false;
    this.bloque = false;
    this.echecsReseau = 0;
    for (const reveil of [...this.reveils]) reveil();
    this.notifier();
    this.pompe();
  }

  /** Attendre avant de retenter : `ms`, le retour du réseau, ou « Réessayer ». */
  private attendreOuReveil(ms: number): Promise<void> {
    return new Promise((r) => {
      const fini = () => {
        this.reveils.delete(fini);
        r();
      };
      this.reveils.add(fini);
      void attendreReseau(ms).then(fini);
    });
  }

  /* ───────────────────────────── la pompe ───────────────────────────── */

  private pompe(): void {
    if (this.detruit || this.ferme) return;
    void this.verifier();
    this.reduireAvance();
    void this.declarer();
    while (this.voies < VOIES && this.items.some((i) => i.etat === "declare")) {
      const it = this.items.find((i) => i.etat === "declare")!;
      void this.envoyer(it);
    }
    void this.confirmer(false);
  }

  /** Une reprise : demander d'abord ce qui est DÉJÀ arrivé, pour ne rien réduire pour rien. */
  private async verifier(): Promise<void> {
    if (this.verification) return;
    const lot = this.items.filter((i) => i.etat === "neuf").slice(0, LOT_VERIFICATION);
    if (!lot.length) return;
    this.verification = true;
    try {
      const { status, json } = await poster("/api/collectif/depot/presign", {
        token: this.cfg.token,
        /* Le lien de la page : le serveur dit si une photo déjà là l'est dans CET album ou par un autre lien. */
        p: this.cfg.p ?? null,
        connues: lot.map((i) => i.cle),
      });
      if (status === 404) {
        /* Un lien régénéré ou supprimé pendant que la page était ouverte. */
        this.mourir();
        return;
      }
      if (status === 409 && typeof json.error === "string" && REFUS_EXPLIQUES.includes(json.error)) {
        /* Pas encore ouvert (planche 9B) : le lot est refusé avec la phrase du serveur, le
           dépôt n'est pas « fermé » pour autant (il ouvrira). */
        const raison = typeof json.message === "string" ? json.message : "Le dépôt n'est pas encore ouvert.";
        for (const it of lot) this.finir(it, "refuse", raison);
        return;
      }
      if (status === 409) {
        this.fermer(typeof json.message === "string" ? json.message : this.v("Le dépôt est fermé.", "Le dépôt est fermé."));
        return;
      }
      /* Une réponse autre que 200 ne dit rien de ce qui est arrivé : la déclaration
         reconnaîtra les déjà-là, lot par lot. */
      const deja = new Set(status === 200 && Array.isArray(json.confirmees) ? (json.confirmees as string[]) : []);
      /* Où chacune était (cet album, un autre lien, la corbeille) ; et celles que leur auteur avait
         supprimées : elles partent tout de suite en déclaration, SANS réduction (rien ne sera envoyé
         pour elles, le serveur décide de les restaurer). */
      const details = new Map<string, DejaLa>();
      if (status === 200 && Array.isArray(json.details)) {
        for (const d of json.details as Record<string, unknown>[]) if (d && typeof d.cle === "string") details.set(d.cle, lireDejaLa(d));
      }
      const aRevoir = new Set(status === 200 && Array.isArray(json.aRevoir) ? (json.aRevoir as string[]) : []);
      for (const it of lot) {
        if (deja.has(it.cle)) {
          it.etat = "deja";
          it.deja = details.get(it.cle) ?? DEJA_CONNUE;
        } else it.etat = aRevoir.has(it.cle) ? "pret" : "attente";
      }
      if (status === 200) this.horsLigne = false;
    } catch {
      /* Hors ligne : on n'arrête rien, la déclaration reconnaîtra les déjà-là. */
      for (const it of lot) it.etat = "attente";
    } finally {
      this.verification = false;
      this.notifier();
      this.pompe();
    }
  }

  private reduireAvance(): void {
    /* Ce qui tient une photo réduite EN MÉMOIRE ne dépasse jamais FENETRE ; ce
       qui est préparé d'avance (une vignette de quelques Ko) ne dépasse jamais
       AVANCE. Un envoi lent ne fait donc jamais grossir la mémoire. */
    let enMemoire = 0, prepares = 0;
    for (const i of this.items) {
      if (i.etat === "reduction") {
        enMemoire++;
        prepares++;
      } else if (i.etat === "pret" || i.etat === "declare" || i.etat === "envoi") {
        prepares++;
        if (i.charge) enMemoire++;
      }
    }
    while (enMemoire < FENETRE && prepares < AVANCE) {
      const it = this.items.find((i) => i.etat === "attente");
      if (!it) return;
      it.etat = "reduction";
      enMemoire++;
      prepares++;
      void reduire({ id: String(it.n), fichier: it.fichier, reduire: !estHeic(it.mime), estJpeg: it.mime === "image/jpeg" })
        .then(async (r) => {
          it.charge = r.charge;
          /* Un HEIC que ce navigateur ne lit pas (Chrome, Firefox, Android) : sa
             vignette vient de libheif (T-150), l'original part tel quel. Sans elle,
             ni aperçu ni empreinte, donc aucun doublon repéré. */
          it.vignette = r.vignette ?? (estHeic(it.mime) ? await vignetteHeic(it.fichier) : null);
          this.garderApercu(it, it.vignette);
          /* Le type suit ce qui part VRAIMENT : une charge réduite est du JPEG. */
          it.typeEnvoye = r.charge?.type || it.mime;
        })
        .catch(() => {
          /* Rien de produit : l'original part tel quel, sans vignette. */
          it.charge = null;
          it.vignette = null;
          it.typeEnvoye = it.mime;
        })
        .then(async () => {
          /* Ni vignette ni signature d'image : un texte renommé, un fichier abîmé. Il ne part pas. */
          if (it.etat === "reduction" && !it.vignette && !(await signatureLisible(it.fichier))) {
            if (it.etat === "reduction") this.finir(it, "refuse", PAS_UNE_PHOTO);
            this.notifier();
            this.pompe();
          }
        })
        .finally(() => {
          if (it.etat !== "reduction") return;
          it.etat = "pret";
          this.notifier();
          this.pompe();
        });
    }
  }

  private async declarer(): Promise<void> {
    if (this.declaration) return;
    /* Assez de photos signées attendent déjà leur voie : on déclarera plus tard, par un lot plus plein. */
    let signees = 0, enPreparation = 0;
    for (const i of this.items) {
      if (i.etat === "declare") signees++;
      else if (i.etat === "reduction" || i.etat === "attente" || i.etat === "neuf") enPreparation++;
    }
    if (signees >= FILE_SIGNEE) return;
    /* Un lot ne mêle jamais deux provenances, deux accords ni deux noms : le premier prêt décide. */
    const premier = this.items.find((i) => i.etat === "pret");
    if (!premier) return;
    const memeLot = (i: Item) =>
      i.provenance?.type === premier.provenance?.type && i.provenance?.libelle === premier.provenance?.libelle && i.accord === premier.accord && i.deposant === premier.deposant;
    const lot = this.items.filter((i) => i.etat === "pret" && memeLot(i)).slice(0, LOT_DECLARATION);
    /* Les voies sont pleines et d'autres photos se préparent : attendre un lot plus plein
       (la pompe repasse à chaque photo prête et à chaque envoi fini). */
    if (lot.length < LOT_PLEIN && enPreparation > 0 && this.voies + signees >= VOIES) return;
    this.declaration = true;
    try {
      const { status, json } = await poster("/api/collectif/depot/presign", {
        token: this.cfg.token,
        p: this.cfg.p ?? null,
        deposant: premier.deposant,
        provenance: premier.provenance,
        /* L'accord du participant et la version du texte qu'il a lu : sans
           eux, le serveur refuse le lot (T-184). */
        accord: premier.accord !== null,
        accordVersion: premier.accord,
        fichiers: lot.map((i) => ({
          cle: i.cle,
          nom: i.fichier.name,
          taille: (i.charge ?? i.fichier).size,
          type: i.typeEnvoye,
          tailleVignette: i.vignette?.size ?? null,
          ordre: i.n,
        })),
      });
      if (status === 409 && json.error === "depot_ferme") {
        this.fermer(typeof json.message === "string" ? json.message : "Le dépôt est fermé.");
        return;
      }
      if (status === 409 && typeof json.error === "string" && REFUS_EXPLIQUES.includes(json.error)) {
        /* Pas encore ouvert : le lot ne part pas, et l'écran dit pourquoi avec la phrase du
           serveur (jamais « Connexion interrompue »). */
        const raison = typeof json.message === "string" ? json.message : "Refusée par le serveur.";
        for (const it of lot) this.finir(it, "refuse", raison);
        return;
      }
      if (status === 409) {
        await attendre(1_000);
        return;
      }
      if (status === 400 && json.error === ERREUR_ACCORD) {
        /* Refusé faute d'accord : le lot ne part pas, et l'écran dit pourquoi
           (jamais « Connexion interrompue », qui réessaierait sans fin). */
        const raison = typeof json.message === "string" ? json.message : this.v("Cochez l'accord pour envoyer vos photos.", "Coche l'accord pour envoyer tes photos.");
        for (const it of lot) this.finir(it, "refuse", raison);
        return;
      }
      if (status === 404) {
        /* Un lien supprimé, une édition archivée : aucun réseau n'y changera rien. */
        this.mourir();
        return;
      }
      if (status >= 400 && status < 500) {
        for (const it of lot) this.finir(it, "refuse", typeof json.message === "string" ? json.message : "Refusée par le serveur.");
        return;
      }
      if (status !== 200 || !Array.isArray(json.resultats)) {
        this.serveurLent = status >= 500;
        throw new Error(`presign ${status}`);
      }
      this.echecsReseau = 0;
      this.horsLigne = false;
      this.serveurLent = false;
      const parCle = new Map<string, Record<string, unknown>>();
      for (const r of json.resultats as Record<string, unknown>[]) if (typeof r.cle === "string") parCle.set(r.cle, r);
      let refusPlafond: string | null = null;
      for (const it of lot) {
        const r = parCle.get(it.cle);
        if (!r) {
          this.finir(it, "refuse", "Fichier refusé (format ou taille).");
        } else if (r.deja || r.double) {
          /* Où elle était (`ou`, `lien`) ; `restauree` : supprimée par son auteur, elle revient
             (21/10) ; retirée par l'organisateur, elle reste à la corbeille. */
          if (typeof r.photoId === "string") it.photoId = r.photoId;
          it.deja = r.double ? DEJA_CONNUE : lireDejaLa(r);
          this.finir(it, "deja", null);
        } else if (typeof r.erreur === "string") {
          const raison = typeof r.message === "string" ? r.message : "Refusée.";
          this.finir(it, "refuse", raison);
          if (r.erreur.startsWith("plafond")) refusPlafond = raison;
        } else {
          it.photoId = r.photoId as string;
          it.url = r.url as string;
          it.urlVignette = (r.urlVignette as string | null) ?? null;
          it.signeLe = Date.now();
          it.etat = "declare";
        }
      }
      if (typeof json.place === "number" || json.place === null) {
        this.place = json.place as number | null;
        this.placeLe = Date.now();
      }
      /* Plus aucune place : les photos suivantes du même lot ne se préparent ni ne
         se déclarent pour rien (500 photos choisies à plafond 30 faisaient 494
         déclarations). Re-choisies plus tard, elles repartent (plafond relevé). */
      if (refusPlafond && json.place === 0) {
        for (const it of this.items) {
          if ((it.etat === "neuf" || it.etat === "attente" || it.etat === "pret") && memeLot(it)) this.finir(it, "refuse", refusPlafond);
        }
      }
    } catch {
      this.horsLigne = !this.serveurLent;
      const attente = ATTENTES_MS[Math.min(this.echecsReseau++, ATTENTES_MS.length - 1)];
      if (!enLigne()) await attendreEnLigne();
      else await attendreReseau(attente);
    } finally {
      this.declaration = false;
      this.notifier();
      this.pompe();
    }
  }

  private put(url: string, corps: Blob, type: string, avancer?: (part: number) => void): Promise<ResultatPut> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      let dernier = Date.now();
      let tic = Date.now();
      const garde = setInterval(() => {
        const maintenant = Date.now();
        /* La page a dormi (écran éteint, appli en fond) : ce sommeil n'est pas un
           envoi bloqué. Sans ce garde, la reprise avortait des envois peut-être finis. */
        if (maintenant - tic > 30_000) dernier = maintenant;
        tic = maintenant;
        if (maintenant - dernier > SANS_PROGRES_MS) xhr.abort();
      }, 10_000);
      xhr.upload.onprogress = (e) => {
        dernier = Date.now();
        if (avancer && e.lengthComputable && e.total > 0) avancer(Math.min(1, e.loaded / e.total));
      };
      xhr.onload = () => {
        clearInterval(garde);
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
      };
      xhr.onerror = xhr.onabort = () => {
        clearInterval(garde);
        resolve({ ok: false, status: 0 });
      };
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", type);
      xhr.send(corps);
    });
  }

  private async envoyer(it: Item): Promise<void> {
    if (Date.now() - it.signeLe > URL_VIEILLE_MS) {
      it.etat = "pret";
      return;
    }
    it.etat = "envoi";
    this.voies++;
    try {
      it.progres = 0;
      const r = await this.put(
        it.url!,
        it.charge ?? it.fichier,
        it.typeEnvoye,
        this.cfg.apercus
          ? (part) => {
              it.progres = part;
              this.notifierBientot();
            }
          : undefined
      );
      if (!r.ok) {
        if (r.status > 0) {
          /* Le coffre a RÉPONDU non (URL périmée, signature refusée) : un vrai essai. */
          it.essais++;
          if (it.essais >= ESSAIS_MAX) this.finir(it, "erreur", "Envoi impossible après trois essais.");
          else await attendreReseau(ATTENTES_MS[Math.min(it.essais, ATTENTES_MS.length - 1)]);
        } else if (!enLigne()) {
          /* Hors ligne : rien ne se compte, on attend le réseau. */
          this.horsLigne = true;
          this.notifier();
          await attendreEnLigne();
        } else {
          /* En ligne mais sans réponse : réseau qui flanche, ou un wifi qui filtre le coffre. */
          it.essaisReseau++;
          if (it.essaisReseau >= ESSAIS_RESEAU_DITS && !this.bloque) {
            this.bloque = true;
            this.notifier();
          }
          if (it.essaisReseau >= ESSAIS_RESEAU_MAX) {
            this.finir(it, "erreur", this.v("Le réseau bloque l'envoi des photos (un wifi filtré ?) : passez en 4G, puis « Réessayer ».", "Le réseau bloque l'envoi des photos (un wifi filtré ?) : passe en 4G, puis « Réessayer »."));
          } else await this.attendreOuReveil(ATTENTES_MS[Math.min(it.essaisReseau - 1, ATTENTES_MS.length - 1)]);
        }
        if (it.etat === "envoi") {
          if (this.ferme) this.finir(it, "refuse", this.ferme);
          else it.etat = "pret";
        }
        return;
      }
      this.horsLigne = false;
      this.bloque = false;
      /* La vignette repart comme la photo (T-171 : une vignette perdue pendant une
         coupure laissait l'original s'afficher dans la grille). Elle ne fait
         jamais échouer la photo : au bout de quatre essais, on renonce. */
      if (it.urlVignette && it.vignette) {
        for (let k = 0; k < 4; k++) {
          if ((await this.put(it.urlVignette, it.vignette, "image/jpeg")).ok) break;
          if (!enLigne()) await attendreEnLigne();
          else await attendreReseau(ATTENTES_MS[k]);
        }
      }
      it.charge = null;
      it.vignette = null;
      it.progres = 1;
      it.etat = "envoye";
      it.envoyeLe = Date.now();
    } finally {
      this.voies--;
      this.notifier();
      if (this.ferme) void this.confirmerRestes();
      else this.pompe();
    }
  }

  /** Confirmer par lots : quand un lot est plein, ou quand il ne reste plus rien à envoyer. */
  private async confirmer(force: boolean): Promise<void> {
    if (this.confirmation) return;
    const envoyes = this.items.filter((i) => i.etat === "envoye");
    if (!envoyes.length) return;
    const restant = this.items.some((i) => ["attente", "reduction", "pret", "declare", "envoi", "neuf"].includes(i.etat));
    const attendue = Date.now() - Math.min(...envoyes.map((i) => i.envoyeLe));
    if (!force && envoyes.length < 10 && restant && attendue < ATTENTE_CONFIRMATION_MS) {
      /* Un lot incomplet part quand la plus ancienne photo envoyée a attendu
         ATTENTE_CONFIRMATION_MS : en 4G faible, une photo arrive toutes les
         10 s, et la règle d'avant (« une pause de 2,5 s ») confirmait photo
         par photo (banc du 19/10 : 22 confirmations pour 24 photos, une ligne
         de journal et un enrichissement chacune). Une seule relance à la fois. */
      if (!this.confirmationProgrammee) {
        this.confirmationProgrammee = true;
        setTimeout(() => {
          this.confirmationProgrammee = false;
          this.pompe();
        }, ATTENTE_CONFIRMATION_MS - attendue + 50);
      }
      return;
    }
    const lot = envoyes.slice(0, LOT_CONFIRMATION);
    this.confirmation = true;
    try {
      const { status, json } = await poster("/api/collectif/depot/complete", { token: this.cfg.token, photoIds: lot.map((i) => i.photoId) }, DELAI_CONFIRMATION_MS);
      if (status === 404) {
        this.mourir();
        return;
      }
      if (status !== 200) {
        this.serveurLent = status >= 500;
        throw new Error(`complete ${status}`);
      }
      this.horsLigne = false;
      this.serveurLent = false;
      this.lireConfirmation(lot, json, false);
    } catch {
      this.horsLigne = !this.serveurLent;
      const attente = ATTENTES_MS[Math.min(this.echecsReseau++, ATTENTES_MS.length - 1)];
      if (!enLigne()) await attendreEnLigne();
      else await attendreReseau(attente);
    } finally {
      this.confirmation = false;
      this.notifier();
      if (this.ferme) void this.confirmerRestes();
      else this.pompe();
    }
  }

  /** Ce que le coffre a vu. `fin` : la collecte est close, une absente ne repartira plus. */
  private lireConfirmation(lot: Item[], json: Record<string, unknown>, fin: boolean): void {
    const confirmees = new Set((json.confirmees as string[]) ?? []);
    const absentes = new Set((json.absentes as string[]) ?? []);
    const rejetees = new Map(((json.rejetees as { id: string; raison: string }[]) ?? []).map((r) => [r.id, r.raison]));
    for (const it of lot) {
      if (confirmees.has(it.photoId!)) this.finir(it, "confirme", null);
      else if (rejetees.has(it.photoId!)) {
        this.finir(it, "refuse", rejetees.get(it.photoId!) === "trop_volumineuse" ? "Photo trop lourde (50 Mo au plus)." : "Refusée.");
      } else if (absentes.has(it.photoId!)) {
        if (fin) this.finir(it, "refuse", this.ferme);
        else {
          /* Le coffre ne l'a pas : on la renvoie (même clé, reprise). */
          it.essais++;
          it.etat = it.essais >= ESSAIS_MAX ? "erreur" : "attente";
          if (it.etat === "erreur") it.raison = "Le coffre n'a pas reçu la photo.";
        }
      }
    }
  }

  private finir(it: Item, etat: "confirme" | "deja" | "refuse" | "erreur", raison: string | null): void {
    it.etat = etat;
    it.raison = raison;
    it.charge = null;
    it.vignette = null;
  }

  /**
   * Le lien ne mène plus nulle part (404 : régénéré par l'atelier, supprimé par
   * le responsable, édition archivée) : l'envoi se ferme avec la phrase de la
   * page « Ce lien ne fonctionne plus », et la vue le dit (`lienMort`) pour
   * que la page entière bascule.
   */
  private mourir(): void {
    this.mort = true;
    this.fermer(lienMort(Boolean(this.cfg.tu)).phrase);
    this.notifier();
  }

  /**
   * Le dépôt se ferme (clôture, lien supprimé). Ce qui n'est pas parti est
   * refusé ; ce qui est EN ROUTE finit sa course ; ce qui est déjà au coffre
   * est confirmé (`confirmerRestes`) : `complete` l'accepte encore, et ces
   * photos étaient perdues (au coffre, jamais visibles).
   */
  private fermer(message: string): void {
    if (this.ferme) return;
    this.ferme = message;
    for (const it of this.items) {
      if (it.etat === "neuf" || it.etat === "attente" || it.etat === "reduction" || it.etat === "pret" || it.etat === "declare") this.finir(it, "refuse", message);
    }
    this.notifier();
    void this.confirmerRestes();
  }

  private async confirmerRestes(): Promise<void> {
    if (this.confirmation) return;
    const envoyes = this.items.filter((i) => i.etat === "envoye");
    if (!envoyes.length) return;
    this.confirmation = true;
    try {
      for (let i = 0; i < envoyes.length; i += LOT_CONFIRMATION) {
        const lot = envoyes.slice(i, i + LOT_CONFIRMATION);
        for (let essai = 0; essai < 4; essai++) {
          try {
            const { status, json } = await poster("/api/collectif/depot/complete", { token: this.cfg.token, photoIds: lot.map((x) => x.photoId) }, DELAI_CONFIRMATION_MS);
            if (status === 200) {
              this.lireConfirmation(lot, json, true);
              break;
            }
          } catch {
            /* coupure : on réessaie ci-dessous */
          }
          if (!enLigne()) await attendreEnLigne();
          else await attendreReseau(ATTENTES_MS[essai]);
        }
        for (const it of lot) if (it.etat === "envoye") this.finir(it, "refuse", this.ferme);
      }
    } finally {
      this.confirmation = false;
      this.notifier();
      /* Une photo en route pendant cette confirmation arrive ensuite : elle repasse ici. */
      if (this.items.some((i) => i.etat === "envoye")) void this.confirmerRestes();
    }
  }
}
