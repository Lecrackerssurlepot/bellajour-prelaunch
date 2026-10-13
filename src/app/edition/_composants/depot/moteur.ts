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
 */

import { reduire } from "@/app/(atelier)/composer/depot/pool";
import { estHeic, resoudreMime } from "@/lib/atelier/formats";
import { cleFichier, LOT_CONFIRMATION, LOT_DECLARATION, LOT_VERIFICATION } from "@/lib/collectif/depot";

/** Combien de photos réduites d'avance, au plus : la mémoire reste bornée. */
const FENETRE = 8;
/** Envois en parallèle (PRD §5.3 : 3 à 4). */
const VOIES = 4;
const ESSAIS_MAX = 3;
/** Un envoi sans le moindre octet de progrès pendant ce délai est abandonné puis repris. */
const SANS_PROGRES_MS = 180_000;
/** Une URL signée vit une heure ; au-delà de 45 min, on la redemande. */
const URL_VIEILLE_MS = 45 * 60_000;
const ATTENTES_MS = [2_000, 5_000, 10_000, 20_000, 45_000];

type Etat = "neuf" | "attente" | "reduction" | "pret" | "declare" | "envoi" | "envoye" | "confirme" | "deja" | "refuse" | "erreur";

type Item = {
  n: number;
  fichier: File;
  cle: string;
  mime: string;
  etat: Etat;
  essais: number;
  charge: Blob | null;
  vignette: Blob | null;
  typeEnvoye: string;
  photoId: string | null;
  url: string | null;
  urlVignette: string | null;
  signeLe: number;
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
  /** Le dépôt est fermé (clôture) : la phrase du serveur. */
  ferme: string | null;
  /** Le réseau ne répond pas : on réessaie tout seul. */
  horsLigne: boolean;
  /** Les fichiers ignorés à l'ajout (pas des images). */
  ignores: number;
};

export type Configuration = {
  token: string;
  /** La clé de provenance du lien (`?p=`), pour un lien sans plafond. */
  p?: string | null;
};

export type Provenance = { type: string; libelle: string };

function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function poster(url: string, corps: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const rep = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps),
    credentials: "same-origin",
  });
  const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: rep.status, json };
}

export class MoteurDepot {
  private items: Item[] = [];
  private cles = new Set<string>();
  private abonnes = new Set<() => void>();
  private compteur = 0;
  private ignores = 0;
  private ferme: string | null = null;
  private horsLigne = false;
  private verification = false;
  private declaration = false;
  private confirmation = false;
  private voies = 0;
  private echecsReseau = 0;
  private detruit = false;
  private dernierEnvoye = 0;
  private confirmationProgrammee = false;
  private version = 0;
  private cache: { version: number; vue: Vue } | null = null;

  private deposant: string | null = null;
  private provenance: Provenance | null = null;

  constructor(private readonly cfg: Configuration) {}

  /** Le nom tapé par le participant : lu à la PROCHAINE déclaration. */
  definirDeposant(nom: string | null): void {
    this.deposant = nom?.trim() || null;
  }

  /** La provenance choisie par le responsable (« Le photographe »…). */
  definirProvenance(p: Provenance | null): void {
    this.provenance = p;
  }

  /* ───────────────────────────── l'abonnement ───────────────────────────── */

  abonner = (fn: () => void): (() => void) => {
    this.abonnes.add(fn);
    return () => this.abonnes.delete(fn);
  };

  private notifier(): void {
    this.version++;
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
      ignores: this.ignores,
    };
    this.cache = { version: this.version, vue };
    return vue;
  };

  /** Y a-t-il un envoi en cours (pour l'avertissement de fermeture de page) ? */
  occupe(): boolean {
    return this.items.some((i) => !["confirme", "deja", "refuse", "erreur"].includes(i.etat));
  }

  detruire(): void {
    this.detruit = true;
    this.abonnes.clear();
  }

  /* ───────────────────────────── l'ajout ───────────────────────────── */

  ajouter(fichiers: Iterable<File>): void {
    if (this.ferme) return;
    for (const f of fichiers) {
      const mime = resoudreMime(f.name, f.type);
      if (!mime) {
        this.ignores++;
        continue;
      }
      const cle = cleFichier(f.name, f.size, f.lastModified);
      if (this.cles.has(cle)) continue;
      this.cles.add(cle);
      this.items.push({
        n: this.compteur++,
        fichier: f,
        cle,
        mime,
        etat: "neuf",
        essais: 0,
        charge: null,
        vignette: null,
        typeEnvoye: mime,
        photoId: null,
        url: null,
        urlVignette: null,
        signeLe: 0,
        raison: null,
      });
    }
    this.notifier();
    this.pompe();
  }

  /** Reprendre les photos en erreur (un bouton « Réessayer »). */
  reessayer(): void {
    for (const it of this.items) {
      if (it.etat === "erreur") {
        it.etat = "attente";
        it.essais = 0;
        it.raison = null;
      }
    }
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
        this.fermer(json);
        return;
      }
      const deja = new Set(Array.isArray(json.confirmees) ? (json.confirmees as string[]) : []);
      for (const it of lot) it.etat = deja.has(it.cle) ? "deja" : "attente";
      this.horsLigne = false;
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
    /* Tout ce qui tient une photo réduite EN MÉMOIRE compte : réduite, prête,
       déclarée, en route. Un envoi lent ne fait donc jamais grossir la file. */
    const occupees = () =>
      this.items.filter((i) => i.etat === "reduction" || i.etat === "pret" || i.etat === "declare" || i.etat === "envoi").length;
    while (occupees() < FENETRE) {
      const it = this.items.find((i) => i.etat === "attente");
      if (!it) return;
      it.etat = "reduction";
      void reduire({ id: String(it.n), fichier: it.fichier, reduire: !estHeic(it.mime), estJpeg: it.mime === "image/jpeg" }).then((r) => {
        it.charge = r.charge;
        it.vignette = r.vignette;
        /* Le type suit ce qui part VRAIMENT : une charge réduite est du JPEG. */
        it.typeEnvoye = r.charge?.type || it.mime;
        it.etat = "pret";
        this.notifier();
        this.pompe();
      });
    }
  }

  private async declarer(): Promise<void> {
    if (this.declaration) return;
    const lot = this.items.filter((i) => i.etat === "pret").slice(0, LOT_DECLARATION);
    if (!lot.length) return;
    this.declaration = true;
    try {
      const { status, json } = await poster("/api/collectif/depot/presign", {
        token: this.cfg.token,
        p: this.cfg.p ?? null,
        deposant: this.deposant,
        provenance: this.provenance,
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
        this.fermer(json);
        return;
      }
      if (status === 409) {
        await attendre(1_000);
        return;
      }
      if (status !== 200) throw new Error(`presign ${status}`);
      this.echecsReseau = 0;
      this.horsLigne = false;
      const parCle = new Map<string, Record<string, unknown>>();
      for (const r of (json.resultats as Record<string, unknown>[]) ?? []) if (typeof r.cle === "string") parCle.set(r.cle, r);
      for (const it of lot) {
        const r = parCle.get(it.cle);
        if (!r) {
          this.finir(it, "refuse", "Fichier refusé (format ou taille).");
        } else if (r.deja || r.double) {
          this.finir(it, "deja", null);
        } else if (typeof r.erreur === "string") {
          this.finir(it, "refuse", typeof r.message === "string" ? r.message : "Refusée.");
        } else {
          it.photoId = r.photoId as string;
          it.url = r.url as string;
          it.urlVignette = (r.urlVignette as string | null) ?? null;
          it.signeLe = Date.now();
          it.etat = "declare";
        }
      }
    } catch {
      this.horsLigne = true;
      await attendre(ATTENTES_MS[Math.min(this.echecsReseau++, ATTENTES_MS.length - 1)]);
    } finally {
      this.declaration = false;
      this.notifier();
      this.pompe();
    }
  }

  private put(url: string, corps: Blob, type: string): Promise<boolean> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      let dernier = Date.now();
      const garde = setInterval(() => {
        if (Date.now() - dernier > SANS_PROGRES_MS) xhr.abort();
      }, 10_000);
      xhr.upload.onprogress = () => {
        dernier = Date.now();
      };
      xhr.onload = () => {
        clearInterval(garde);
        resolve(xhr.status >= 200 && xhr.status < 300);
      };
      xhr.onerror = xhr.onabort = () => {
        clearInterval(garde);
        resolve(false);
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
      const ok = await this.put(it.url!, it.charge ?? it.fichier, it.typeEnvoye);
      if (!ok) {
        it.essais++;
        this.horsLigne = !navigator.onLine;
        if (it.essais >= ESSAIS_MAX) this.finir(it, "erreur", "Envoi impossible après trois essais.");
        else {
          it.etat = "pret";
          await attendre(ATTENTES_MS[Math.min(it.essais, ATTENTES_MS.length - 1)]);
        }
        return;
      }
      /* La vignette ne fait jamais échouer une photo : sans elle, la grille
         montrera l'original. */
      if (it.urlVignette && it.vignette) await this.put(it.urlVignette, it.vignette, "image/jpeg");
      it.charge = null;
      it.vignette = null;
      it.etat = "envoye";
      this.dernierEnvoye = Date.now();
    } finally {
      this.voies--;
      this.notifier();
      this.pompe();
    }
  }

  /** Confirmer par lots : quand un lot est plein, ou quand il ne reste plus rien à envoyer. */
  private async confirmer(force: boolean): Promise<void> {
    if (this.confirmation) return;
    const envoyes = this.items.filter((i) => i.etat === "envoye");
    if (!envoyes.length) return;
    const restant = this.items.some((i) => ["attente", "reduction", "pret", "declare", "envoi", "neuf"].includes(i.etat));
    if (!force && envoyes.length < 10 && restant) {
      /* Un lot incomplet part quand l'envoi marque une pause : une seule
         relance programmée à la fois. */
      if (!this.confirmationProgrammee) {
        this.confirmationProgrammee = true;
        setTimeout(() => {
          this.confirmationProgrammee = false;
          if (Date.now() - this.dernierEnvoye >= 2_500) void this.confirmer(true);
          else this.pompe();
        }, 3_000);
      }
      return;
    }
    const lot = envoyes.slice(0, LOT_CONFIRMATION);
    this.confirmation = true;
    try {
      const { status, json } = await poster("/api/collectif/depot/complete", {
        token: this.cfg.token,
        photoIds: lot.map((i) => i.photoId),
      });
      if (status !== 200) throw new Error(`complete ${status}`);
      this.horsLigne = false;
      const confirmees = new Set((json.confirmees as string[]) ?? []);
      const absentes = new Set((json.absentes as string[]) ?? []);
      const rejetees = new Map(((json.rejetees as { id: string; raison: string }[]) ?? []).map((r) => [r.id, r.raison]));
      for (const it of lot) {
        if (confirmees.has(it.photoId!)) this.finir(it, "confirme", null);
        else if (rejetees.has(it.photoId!)) {
          this.finir(it, "refuse", rejetees.get(it.photoId!) === "trop_volumineuse" ? "Photo trop lourde (50 Mo au plus)." : "Refusée.");
        } else if (absentes.has(it.photoId!)) {
          /* Le coffre ne l'a pas : on la renvoie (même clé, reprise). */
          it.essais++;
          it.etat = it.essais >= ESSAIS_MAX ? "erreur" : "attente";
          if (it.etat === "erreur") it.raison = "Le coffre n'a pas reçu la photo.";
        }
      }
    } catch {
      this.horsLigne = true;
      await attendre(ATTENTES_MS[Math.min(this.echecsReseau++, ATTENTES_MS.length - 1)]);
    } finally {
      this.confirmation = false;
      this.notifier();
      this.pompe();
    }
  }

  private finir(it: Item, etat: "confirme" | "deja" | "refuse" | "erreur", raison: string | null): void {
    it.etat = etat;
    it.raison = raison;
    it.charge = null;
    it.vignette = null;
  }

  private fermer(json: Record<string, unknown>): void {
    this.ferme = typeof json.message === "string" ? json.message : "Le dépôt est fermé.";
    for (const it of this.items) {
      if (!["confirme", "deja", "refuse", "erreur"].includes(it.etat)) this.finir(it, "refuse", this.ferme);
    }
    this.notifier();
  }
}
