/**
 * La sauvegarde automatique de l'éditeur (MISE-EN-PAGE.md §6, étape 1) — côté
 * NAVIGATEUR. Deux copies, deux vitesses :
 *
 * - la copie LOCALE (IndexedDB, patron de `composer/depot/stockage.ts`) part à
 *   chaque modification, sans attendre : fermer l'onglet n'en perd aucune ;
 * - la copie du SERVEUR (routes `/api/admin/atelier/mise-en-page/magazines`)
 *   part ~2 s après la dernière modification, sous le verrou optimiste (la
 *   version lue). Jamais bloquante : l'écran n'attend aucune des deux.
 *
 * Les règles (quelle copie ouvrir, que dire après une réponse, quand
 * réessayer) vivent dans `sauvegardePure.ts` et sont au harnais. Ici : le
 * réseau, IndexedDB et le crochet React.
 *
 * Ce que le moteur NE fait jamais : écraser le travail d'un autre poste (409 =
 * état `conflit`, l'écran propose `ecraser` ou `recharger`), répéter une erreur
 * 503 (table absente → on travaille en local, une seule fois dit), réessayer
 * un contenu refusé (400, 413).
 */

import { useEffect, useState } from "react";
import { horodater, nouveauMagazine, type Magazine } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import {
  DELAI_ENVOI_MS,
  choisirOuverture,
  delaiReprise,
  issueDeReponse,
  titreAEnvoyer,
  type CopieLocale,
  type CopieServeur,
  type EtatSauvegarde,
  type InfoConflit,
  type LigneServeur,
  type RaisonLectureSeule,
} from "./sauvegardePure";

export type { EtatSauvegarde, RaisonLectureSeule } from "./sauvegardePure";

const ROUTE = "/api/admin/atelier/mise-en-page/magazines";

export type RattachementMep =
  | { source: "particulier"; numeroToken: string }
  | { source: "edition"; editionId: string; magazineId: string }
  | { source: "libre" };

/** Ce qui identifie un projet : la clé de la copie locale, ce à quoi la ligne serveur se rattache, un titre de repli. */
export type CleSauvegarde = { cle: string; rattachement: RattachementMep; titre: string };

/** La clé locale d'un projet (une copie par dossier, par magazine d'édition, par création libre). */
export function cleLocale(r: RattachementMep, idLibre?: string): string {
  if (r.source === "particulier") return `dossier:${r.numeroToken}`;
  if (r.source === "edition") return `edition:${r.editionId}:${r.magazineId}`;
  return `libre:${idLibre ?? "sans-id"}`;
}

/* ─────────────────────────── la copie locale (IndexedDB) ─────────────────────────── */

const BASE = "bj-mise-en-page";
const MAGASIN = "magazines";
const VERSION_BASE = 1;

let base: IDBDatabase | null = null;
let ouvertureBase: Promise<IDBDatabase | null> | null = null;
let desactive = false;

const promesse = <T>(r: IDBRequest<T>): Promise<T> => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

async function ouvrirBase(): Promise<IDBDatabase | null> {
  if (desactive) return null;
  if (base) return base;
  if (ouvertureBase) return ouvertureBase;
  ouvertureBase = new Promise<IDBDatabase | null>((ok) => {
    try {
      if (typeof indexedDB === "undefined") { desactive = true; return ok(null); }
      const req = indexedDB.open(BASE, VERSION_BASE);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(MAGASIN)) req.result.createObjectStore(MAGASIN, { keyPath: "cle" });
      };
      req.onsuccess = () => { base = req.result; ok(base); };
      /* Navigation privée, stockage refusé : on continue sans copie locale, le serveur reste. */
      req.onerror = () => { desactive = true; ok(null); };
      req.onblocked = () => { desactive = true; ok(null); };
    } catch {
      desactive = true;
      ok(null);
    }
  });
  return ouvertureBase;
}

async function lireLocal(cle: string): Promise<CopieLocale | null> {
  const db = await ouvrirBase();
  if (!db) return null;
  try {
    const v = await promesse<unknown>(db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(cle));
    return copieLocaleValide(v, cle);
  } catch {
    return null;
  }
}

async function ecrireLocal(c: CopieLocale): Promise<void> {
  const db = await ouvrirBase();
  if (!db) return;
  try {
    await promesse(db.transaction(MAGASIN, "readwrite").objectStore(MAGASIN).put(c));
  } catch {
    /* Quota plein : plus de copie locale pour cette séance ; le serveur garde la sienne. */
    desactive = true;
  }
}

/** Une copie relue du disque n'est crue que si elle a la forme attendue ET un contenu que le serveur accepterait. */
function copieLocaleValide(v: unknown, cle: string): CopieLocale | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (o.cle !== cle || !contenuValide(o.magazine)) return null;
  if (o.serveurId !== null && typeof o.serveurId !== "string") return null;
  if (o.version !== null && typeof o.version !== "number") return null;
  return { cle, magazine: o.magazine, serveurId: o.serveurId, version: o.version, synchronise: o.synchronise === true };
}

/* ─────────────────────────── le moteur ─────────────────────────── */

export type Moteur = {
  /** L'état d'aujourd'hui (instantané). */
  etat: () => EtatSauvegarde;
  /** `cb` est appelé à chaque changement d'état ; rend la fonction qui se désabonne. */
  abonner: (cb: (e: EtatSauvegarde) => void) => () => void;
  /** Ouvre le projet : copie du serveur, sinon locale, sinon un magazine neuf. Ne lève jamais. */
  ouvrir: () => Promise<Magazine>;
  /** À appeler à chaque modification du magazine : copie locale tout de suite, serveur dans ~2 s. */
  planifier: (m: Magazine) => void;
  /** Envoyer maintenant (bouton « Réessayer »). */
  reessayer: () => void;
  /** Conflit : envoyer quand même, par-dessus la version du serveur (choix explicite de l'utilisateur). */
  ecraser: () => void;
  /** Conflit : abandonner la copie locale et reprendre celle du serveur. Rend le magazine, null si illisible. */
  recharger: () => Promise<Magazine | null>;
  /** L'écran passe en lecture seule (photos effacées, archive) : plus rien n'est envoyé. */
  lectureSeule: (raison: RaisonLectureSeule) => void;
  /** Coupe les minuteurs et l'écoute du réseau (démontage). `ouvrir` les remet. */
  suspendre: () => void;
};

type LecteurServeur =
  | { type: "ok"; copie: CopieServeur }
  | { type: "introuvable" | "migration_absente" | "hors_ligne" | "erreur" | "non_authentifie" };

const lireCorps = async (rep: Response): Promise<unknown> => {
  try { return (await rep.json()) as unknown; } catch { return null; }
};

const ligneDe = (corps: unknown): LigneServeur | null => {
  const m = typeof corps === "object" && corps !== null ? (corps as { magazine?: unknown }).magazine : null;
  if (typeof m !== "object" || m === null) return null;
  const r = m as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.version !== "number") return null;
  return {
    id: r.id,
    version: r.version,
    modifie_par: typeof r.modifie_par === "string" ? r.modifie_par : null,
    modifie_le: typeof r.modifie_le === "string" ? r.modifie_le : "",
    etat: typeof r.etat === "string" ? r.etat : "en_cours",
  };
};

const versLogin = (): void => { if (typeof window !== "undefined") window.location.assign("/admin/login"); };

export function creerMoteur(cle: CleSauvegarde): Moteur {
  let etat: EtatSauvegarde = { etat: "enregistre", version: 0, le: "" };
  const abonnes = new Set<(e: EtatSauvegarde) => void>();

  let serveurId: string | null = null;
  let version: number | null = null;
  let enAttente: Magazine | null = null;
  let derniere: Magazine | null = null;
  let refOuverte: Magazine | null = null;
  let ouvert = false;
  let enVol = false;
  let rejouer = false;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let essai = 0;
  let migrationAbsente = false;
  let figee: RaisonLectureSeule | null = null;
  let aEteDitErreur = false;

  const v = (): number => version ?? 0;
  /* Une fonction, pas une comparaison directe : TypeScript fige `etat` dans un bloc où on vient de l'écrire. */
  const enConflit = (): boolean => etat.etat === "conflit";
  const dire = (e: EtatSauvegarde): void => {
    etat = e;
    for (const cb of abonnes) cb(e);
  };

  const planifierEnvoi = (ms: number): void => {
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(() => { minuteur = null; void envoyer(); }, ms);
  };

  const sauverLocal = (m: Magazine, synchronise: boolean): Promise<void> =>
    ecrireLocal({ cle: cle.cle, magazine: m, serveurId, version, synchronise });

  const auRetourDuReseau = (): void => { if (etat.etat === "hors_ligne") void envoyer(); };

  async function envoyer(): Promise<void> {
    if (!ouvert || figee || migrationAbsente || !enAttente) return;
    if (enConflit()) return;
    if (enVol) { rejouer = true; return; }
    if (typeof navigator !== "undefined" && navigator.onLine === false) { dire({ etat: "hors_ligne", version: v() }); return; }

    const m = enAttente;
    enVol = true;
    rejouer = false;
    dire({ etat: "envoi", version: v() });
    try {
      const creation = serveurId === null;
      const corpsEnvoi = creation
        ? { source: cle.rattachement.source, ...(cle.rattachement.source === "particulier" ? { numeroToken: cle.rattachement.numeroToken } : {}), ...(cle.rattachement.source === "edition" ? { editionId: cle.rattachement.editionId, magazineId: cle.rattachement.magazineId } : {}), titre: titreAEnvoyer(m, cle.titre), contenu: m }
        : { version: v(), titre: titreAEnvoyer(m, cle.titre), contenu: m };
      const rep = await fetch(creation ? ROUTE : `${ROUTE}/${encodeURIComponent(serveurId ?? "")}`, {
        method: creation ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(corpsEnvoi),
      });
      const corps = await lireCorps(rep);
      const issue = issueDeReponse(rep.status, corps);

      if (issue.type === "ok") {
        const ligne = ligneDe(corps);
        if (ligne) { serveurId = ligne.id; version = ligne.version; }
        essai = 0;
        aEteDitErreur = false;
        const toutEnvoye = enAttente === m;
        if (toutEnvoye) enAttente = null;
        void sauverLocal(toutEnvoye ? m : (enAttente ?? m), toutEnvoye);
        if (toutEnvoye) dire({ etat: "enregistre", version: v(), le: ligne?.modifie_le ?? "" });
        else { dire({ etat: "en_attente", version: v() }); planifierEnvoi(0); }
      } else if (issue.type === "conflit" || issue.type === "existe_deja") {
        if (issue.type === "existe_deja") serveurId = issue.id;
        dire({ etat: "conflit", version: v(), enBase: issue.enBase });
      } else if (issue.type === "migration_absente") {
        migrationAbsente = true;
        dire({ etat: "migration_absente", version: v() });
      } else if (issue.type === "non_authentifie") {
        dire({ etat: "erreur", version: v() });
        versLogin();
      } else if (issue.type === "introuvable") {
        /* La ligne a disparu côté serveur : on la recrée au prochain passage (POST). */
        serveurId = null;
        version = null;
        planifierEnvoi(0);
      } else if (issue.type === "refuse") {
        /* Contenu refusé : réessayer tel quel ne sert à rien ; la prochaine modification repart. */
        console.error("[mise-en-page] sauvegarde refusée", issue.erreur);
        dire({ etat: "erreur", version: v() });
      } else {
        /* Panne passagère : on garde le travail en local et on reprend, sans bruit. */
        if (!aEteDitErreur) { console.error("[mise-en-page] sauvegarde en panne, reprise automatique"); aEteDitErreur = true; }
        dire({ etat: "erreur", version: v() });
        planifierEnvoi(delaiReprise(essai++));
      }
    } catch {
      /* fetch a échoué : pas de réseau. La reprise vient du retour du réseau, avec un filet de minuteur. */
      dire({ etat: "hors_ligne", version: v() });
      planifierEnvoi(delaiReprise(essai++));
    } finally {
      enVol = false;
      if (rejouer && enAttente && !migrationAbsente && !enConflit()) planifierEnvoi(DELAI_ENVOI_MS);
    }
  }

  async function lireServeur(id: string): Promise<LecteurServeur> {
    try {
      const rep = await fetch(`${ROUTE}/${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" });
      const corps = await lireCorps(rep);
      const issue = issueDeReponse(rep.status, corps);
      if (issue.type === "non_authentifie") { versLogin(); return { type: "non_authentifie" }; }
      if (issue.type === "migration_absente") return { type: "migration_absente" };
      if (issue.type === "introuvable") return { type: "introuvable" };
      if (issue.type !== "ok") return { type: "erreur" };
      const ligne = ligneDe(corps);
      const contenu = (corps as { magazine?: { contenu?: unknown } }).magazine?.contenu;
      if (!ligne || !contenuValide(contenu)) return { type: "erreur" };
      return { type: "ok", copie: { ligne, magazine: contenu } };
    } catch {
      return { type: "hors_ligne" };
    }
  }

  /** Crée la ligne du projet avec `initial`. 201 → fait ; 409 existe_deja → l'id de la ligne déjà là ; autre → l'issue. */
  async function creer(initial: Magazine): Promise<{ type: "cree"; ligne: LigneServeur } | { type: "existe"; id: string } | { type: "migration_absente" | "hors_ligne" | "erreur" }> {
    try {
      const r = cle.rattachement;
      const rep = await fetch(ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          source: r.source,
          ...(r.source === "particulier" ? { numeroToken: r.numeroToken } : {}),
          ...(r.source === "edition" ? { editionId: r.editionId, magazineId: r.magazineId } : {}),
          titre: titreAEnvoyer(initial, cle.titre),
          contenu: initial,
        }),
      });
      const corps = await lireCorps(rep);
      const issue = issueDeReponse(rep.status, corps);
      if (issue.type === "ok") { const l = ligneDe(corps); return l ? { type: "cree", ligne: l } : { type: "erreur" }; }
      if (issue.type === "existe_deja") return { type: "existe", id: issue.id };
      if (issue.type === "migration_absente") return { type: "migration_absente" };
      if (issue.type === "non_authentifie") { versLogin(); return { type: "erreur" }; }
      return { type: "erreur" };
    } catch {
      return { type: "hors_ligne" };
    }
  }

  const adopter = (m: Magazine): Magazine => { refOuverte = m; derniere = m; return m; };

  async function ouvrirProjet(): Promise<Magazine> {
    ouvert = true;
    if (typeof window !== "undefined") window.addEventListener("online", auRetourDuReseau);
    const local = await lireLocal(cle.cle);
    const neuf = (): Magazine => nouveauMagazine(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `m-${Date.now()}`, cle.titre);
    serveurId = local?.serveurId ?? null;
    version = local?.version ?? null;

    /* Hors ligne, table absente, panne : on garde ce qu'on a (local, sinon neuf) et on le dit. */
    const sansServeur = (raison: "migration_absente" | "hors_ligne" | "erreur"): Magazine => {
      const m = adopter(local?.magazine ?? neuf());
      if (raison === "migration_absente") migrationAbsente = true;
      else if (!local || !local.synchronise) enAttente = m;
      dire({ etat: raison, version: v() });
      if (raison !== "migration_absente") planifierEnvoi(delaiReprise(essai++));
      return m;
    };

    let serveur: CopieServeur | null = null;
    if (serveurId) {
      const r = await lireServeur(serveurId);
      if (r.type === "ok") serveur = r.copie;
      else if (r.type === "introuvable") { serveurId = null; version = null; }
      else return sansServeur(r.type === "non_authentifie" ? "erreur" : r.type);
    }
    if (!serveur) {
      /* Pas de ligne connue : la créer avec la copie locale (ou un magazine neuf) ; si elle existe déjà, la lire. */
      const initial = local?.magazine ?? neuf();
      const c = await creer(initial);
      if (c.type === "cree") {
        serveurId = c.ligne.id;
        version = c.ligne.version;
        const m = adopter(initial);
        await sauverLocal(m, true);
        dire({ etat: "enregistre", version: v(), le: c.ligne.modifie_le });
        return m;
      }
      if (c.type !== "existe") return sansServeur(c.type);
      const r = await lireServeur(c.id);
      if (r.type !== "ok") return sansServeur(r.type === "non_authentifie" || r.type === "introuvable" ? "erreur" : r.type);
      serveur = r.copie;
    }

    const choix = choisirOuverture(local, serveur);
    serveurId = serveur.ligne.id;
    if (serveur.ligne.etat === "archive") figee = "archive";

    if (choix.source === "serveur" || !local) {
      version = serveur.ligne.version;
      const m = adopter(serveur.magazine);
      await sauverLocal(m, true);
      dire(figee ? { etat: "lecture_seule", raison: figee } : { etat: "enregistre", version: v(), le: serveur.ligne.modifie_le });
      return m;
    }
    /* La copie locale gagne. */
    const m = adopter(local.magazine);
    enAttente = m;
    if (choix.conflit) {
      /* Le serveur a avancé pendant que cette copie attendait : rien n'est écrasé, l'écran choisit. */
      version = local.version ?? serveur.ligne.version;
      await sauverLocal(m, false);
      dire({ etat: "conflit", version: v(), enBase: { version: serveur.ligne.version, modifie_par: serveur.ligne.modifie_par, modifie_le: serveur.ligne.modifie_le } });
      return m;
    }
    version = serveur.ligne.version;
    await sauverLocal(m, false);
    dire(figee ? { etat: "lecture_seule", raison: figee } : { etat: "en_attente", version: v() });
    if (!figee) planifierEnvoi(0);
    return m;
  }

  return {
    etat: () => etat,
    abonner: (cb) => { abonnes.add(cb); return () => { abonnes.delete(cb); }; },
    ouvrir: ouvrirProjet,
    planifier: (m) => {
      if (!ouvert || m === refOuverte || m === derniere) return;
      derniere = m;
      if (figee) return;
      const tamponne = horodater(m, new Date().toISOString());
      enAttente = tamponne;
      void sauverLocal(tamponne, false);
      if (etat.etat === "conflit" || migrationAbsente) {
        /* On continue de travailler en local : rien n'est envoyé, l'état reste celui qu'on a dit. */
        return;
      }
      dire({ etat: "en_attente", version: v() });
      planifierEnvoi(DELAI_ENVOI_MS);
    },
    reessayer: () => { essai = 0; if (etat.etat !== "conflit") migrationAbsente = false; void envoyer(); },
    ecraser: () => {
      if (etat.etat !== "conflit" || !enAttente) return;
      version = etat.enBase.version;
      dire({ etat: "en_attente", version: v() });
      void envoyer();
    },
    recharger: async () => {
      if (!serveurId) return null;
      const r = await lireServeur(serveurId);
      if (r.type !== "ok") return null;
      version = r.copie.ligne.version;
      enAttente = null;
      const m = adopter(r.copie.magazine);
      await sauverLocal(m, true);
      dire({ etat: "enregistre", version: v(), le: r.copie.ligne.modifie_le });
      return m;
    },
    lectureSeule: (raison) => {
      figee = raison;
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      dire({ etat: "lecture_seule", raison });
    },
    suspendre: () => {
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      if (typeof window !== "undefined") window.removeEventListener("online", auRetourDuReseau);
      ouvert = false;
    },
  };
}

/* ─────────────────────────── le crochet React ─────────────────────────── */

export type Sauvegarde = {
  etat: EtatSauvegarde;
  /** Ouvre le projet (à appeler une fois, au montage) : rend le magazine à afficher. */
  ouvrir: () => Promise<Magazine>;
  reessayer: () => void;
  ecraser: () => void;
  recharger: () => Promise<Magazine | null>;
  lectureSeule: (raison: RaisonLectureSeule) => void;
};

/**
 * `cle` doit être STABLE pendant la vie de l'écran (créée une fois). À chaque
 * nouveau `magazine` (référence), la copie locale est écrite et l'envoi
 * planifié ; le magazine rendu par `ouvrir` n'est pas renvoyé en sauvegarde.
 * Rien ne bloque l'écran : tout est asynchrone.
 */
export function useSauvegarde(cle: CleSauvegarde, magazine: Magazine | null): Sauvegarde {
  const [moteur] = useState(() => creerMoteur(cle));
  const [etat, setEtat] = useState<EtatSauvegarde>(() => moteur.etat());

  useEffect(() => {
    const off = moteur.abonner(setEtat);
    return () => { off(); moteur.suspendre(); };
  }, [moteur]);

  useEffect(() => {
    if (magazine) moteur.planifier(magazine);
  }, [moteur, magazine]);

  return { etat, ouvrir: moteur.ouvrir, reessayer: moteur.reessayer, ecraser: moteur.ecraser, recharger: moteur.recharger, lectureSeule: moteur.lectureSeule };
}

export type { InfoConflit };
