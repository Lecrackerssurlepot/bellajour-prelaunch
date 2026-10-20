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
 */

import { reduire } from "@/app/(atelier)/composer/depot/pool";
import { estHeic, resoudreMime } from "@/lib/atelier/formats";
import { vignetteHeic } from "./heic";
import { estVideo, LOT_CONFIRMATION, LOT_DECLARATION, LOT_VERIFICATION } from "@/lib/collectif/depot";
import { lienMort } from "@/lib/collectif/liens";
import { cleDuFichier } from "@/lib/collectif/cleDepot";
import { ERREUR_ACCORD } from "@/lib/collectif/accord";

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
  /** Les fichiers ignorés à l'ajout (pas des images). */
  ignores: number;
  /** Parmi eux, les vidéos (T-200 : refusées, décision de Mathias), et le nom de la première pour la nommer. */
  videos: number;
  premiereVideo: string | null;
  /** Les fichiers choisis une seconde fois pendant CET envoi : sautés, et dits (retours du 14/10, point 8). */
  dejaAjoutes: number;
};

export type Configuration = {
  token: string;
  /** La clé de provenance du lien (`?p=`), pour un lien sans plafond. */
  p?: string | null;
  /** Tutoyer (une école) : seulement pour les phrases que le moteur écrit lui-même. */
  tu?: boolean;
};

export type Provenance = { type: string; libelle: string };

function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

  vue = (): Vue => {
    if (this.cache?.version === this.version) return this.cache.vue;
    let arrivees = 0, dejaLa = 0, enCours = 0, refusees = 0, erreurs = 0;
    const raisons = new Set<string>();
    for (const it of this.items) {
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
      ignores: this.ignores,
      videos: this.videos,
      premiereVideo: this.premiereVideo,
      dejaAjoutes: this.dejaAjoutes,
    };
    this.cache = { version: this.version, vue };
    return vue;
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
  }

  /* ───────────────────────────── le réseau, l'écran ───────────────────────────── */

  /** Le réseau revient : on repart TOUT DE SUITE, et ce qu'un wifi filtré avait arrêté repart aussi. */
  private auRetourDuReseau = (): void => {
    this.horsLigne = false;
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
      if (connu) {
        /* Re-choisie : refusée (plafond relevé depuis ?) ou en erreur, elle repart ;
           en route ou arrivée, elle est comptée et ne repart pas. */
        if (connu.etat === "refuse" || connu.etat === "erreur") {
          connu.fichier = f;
          connu.deposant = this.deposant;
          connu.provenance = this.provenance;
          connu.accord = this.accord;
          this.remettre(connu);
        } else this.dejaAjoutes++;
        continue;
      }
      this.items.push({
        n: this.compteur++,
        fichier: f,
        cle,
        mime,
        etat: "neuf",
        essais: 0,
        essaisReseau: 0,
        charge: null,
        vignette: null,
        typeEnvoye: mime,
        photoId: null,
        url: null,
        urlVignette: null,
        signeLe: 0,
        envoyeLe: 0,
        raison: null,
        deposant: this.deposant,
        provenance: this.provenance,
        accord: this.accord,
      });
      this.parCle.set(cle, this.items[this.items.length - 1]);
    }
    this.notifier();
    this.pompe();
  }

  private remettre(it: Item): void {
    it.etat = "attente";
    it.essais = 0;
    it.essaisReseau = 0;
    it.raison = null;
    it.photoId = null;
    it.url = null;
    it.urlVignette = null;
  }

  /** Reprendre les photos en erreur (un bouton « Réessayer »). */
  reessayer(): void {
    for (const it of this.items) {
      if (it.etat === "erreur") this.remettre(it);
    }
    this.horsLigne = false;
    this.echecsReseau = 0;
    this.notifier();
    this.pompe();
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
        connues: lot.map((i) => i.cle),
      });
      if (status === 409) {
        this.fermer(typeof json.message === "string" ? json.message : this.v("Le dépôt est fermé.", "Le dépôt est fermé."));
        return;
      }
      /* Une réponse autre que 200 ne dit rien de ce qui est arrivé : la déclaration
         reconnaîtra les déjà-là, lot par lot. */
      const deja = new Set(status === 200 && Array.isArray(json.confirmees) ? (json.confirmees as string[]) : []);
      for (const it of lot) it.etat = deja.has(it.cle) ? "deja" : "attente";
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
          /* Le type suit ce qui part VRAIMENT : une charge réduite est du JPEG. */
          it.typeEnvoye = r.charge?.type || it.mime;
        })
        .catch(() => {
          /* Rien de produit : l'original part tel quel, sans vignette. */
          it.charge = null;
          it.vignette = null;
          it.typeEnvoye = it.mime;
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
        this.fermer(lienMort(Boolean(this.cfg.tu)).phrase);
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

  private put(url: string, corps: Blob, type: string): Promise<ResultatPut> {
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
      xhr.upload.onprogress = () => {
        dernier = Date.now();
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
      const r = await this.put(it.url!, it.charge ?? it.fichier, it.typeEnvoye);
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
          if (it.essaisReseau >= ESSAIS_RESEAU_MAX) {
            this.finir(it, "erreur", this.v("Le réseau bloque l'envoi des photos (un wifi filtré ?) : passez en 4G, puis « Réessayer ».", "Le réseau bloque l'envoi des photos (un wifi filtré ?) : passe en 4G, puis « Réessayer »."));
          } else await attendreReseau(ATTENTES_MS[Math.min(it.essaisReseau - 1, ATTENTES_MS.length - 1)]);
        }
        if (it.etat === "envoi") {
          if (this.ferme) this.finir(it, "refuse", this.ferme);
          else it.etat = "pret";
        }
        return;
      }
      this.horsLigne = false;
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
        this.fermer(lienMort(Boolean(this.cfg.tu)).phrase);
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
