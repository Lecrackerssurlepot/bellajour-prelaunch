/**
 * La page du PARTICIPANT (`/depot/[token]`, planches 6 à 9 du 20/10, lot w2) :
 * ce qu'elle calcule sans rien lire. Module PUR, importable par le navigateur
 * (aucun accès base, réseau ou environnement), relu par le harnais.
 *
 * - `decouperAccord` : le texte de l'accord vient de `texteAccord` (accord.ts),
 *   JAMAIS d'un composant ; la page encadre seulement la phrase de l'album
 *   (planche 6) en la retrouvant à la fin du texte.
 * - `progression` : la barre avance à l'ARRIVÉE au coffre (planche 7B), pas à
 *   la confirmation groupée (15 s) : « 11 sur 18 envoyées · il en reste 7 ».
 * - `nouvellesDepuis`, `cleDeVisite` : « 7 nouvelles depuis ta visite » (8A),
 *   un repère gardé sur CE téléphone (jamais le token en clair).
 * - `photosDeLEnvoi`, `grilleDesMiennes` : « Mes photos » pendant l'envoi, sans
 *   montrer deux fois une photo ; une photo arrivée reste à sa place, en haut.
 *
 * Retours de Mathias du 21/10 (édition d'essai « Recette 1 ») :
 * - `compterLot`, `bilanDuLot`, `phrasesDuLot` : le merci compte le DERNIER
 *   envoi (un lot commence au choix des photos quand rien ne part, et
 *   « Ajouter d'autres photos » pendant l'envoi s'y ajoute), et SEULEMENT ce
 *   qui est arrivé. Les « déjà là » se disent par cas, jamais comme reçues :
 *   le 21/10, « Merci Mathias, 8 photos reçues » sur un lien à 5, alors que
 *   rien n'était parti. Le moteur sert aussi le responsable (`pour`).
 * - `phraseRetour` : « Content de vous revoir » dit ce qui est sur CE lien et
 *   ce qui reste, plus le total de l'édition (11 photos, tous liens confondus).
 * - `phraseAutresAppareils` : « Mes photos » ne montre que les photos de CET
 *   appareil (l'adresse n'est pas vérifiée) ; les autres se COMPTENT.
 * - `enTete`, `SONDAGE_ALBUM_MS` : « Tout l'album » se met à jour sans recharger.
 */

import { phraseAlbum } from "./accord";
import type { DejaLa, OuDeja } from "./depot";
import { nettoyerMorceau } from "./participant";

/** Le texte de l'accord en deux morceaux : le texte du 17/10, puis la phrase de l'album (encadrée). */
export function decouperAccord(texte: string, lien: string | null): { principal: string; album: string | null } {
  const album = phraseAlbum(lien);
  if (texte.endsWith(` ${album}`)) return { principal: texte.slice(0, texte.length - album.length - 1), album };
  return { principal: texte, album: null };
}

/**
 * Ce que la barre du bas compte pendant l'envoi : ce qui est ARRIVÉ (au coffre
 * ou confirmé) sur ce qui part VRAIMENT. Les « déjà là » n'y entrent plus
 * (21/10) : rien ne part pour elles, la barre les disait « envoyées ». On lui
 * passe le lot en cours (`vue.lot`), pas le cumul de la page.
 */
export function progression(v: { arrivees: number; auCoffre?: number; enCours: number }): {
  envoyees: number;
  restent: number;
  total: number;
  part: number;
} {
  const auCoffre = v.auCoffre ?? 0;
  const envoyees = v.arrivees + auCoffre;
  const restent = Math.max(0, v.enCours - auCoffre);
  const total = envoyees + restent;
  return { envoyees, restent, total, part: total ? Math.round((envoyees / total) * 100) : 0 };
}

/** « LM » pour Léa Martin, « L » pour Léa seule (une personne retrouvée ne montre que son prénom). */
export function initiales(prenom: string | null, nom?: string | null): string {
  const a = prenom ? nettoyerMorceau(prenom).charAt(0) : "";
  const b = nom ? nettoyerMorceau(nom).charAt(0) : "";
  return `${a}${b}`.toLocaleUpperCase("fr") || "?";
}

/** Le repère de visite de ce lien sur ce téléphone : une empreinte courte (FNV-1a), jamais le token. */
export function cleDeVisite(token: string, p: string | null): string {
  let h = 0x811c9dc5;
  for (const c of `${token}|${p ?? ""}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `bj-depot-vu-${h.toString(36)}`;
}

/** Les photos de l'album arrivées APRÈS la dernière visite, sauf les miennes (« 7 nouvelles »). Sans visite connue : aucune. */
export function nouvellesDepuis(photos: readonly { id: string; arrivee: string; moi: boolean }[], vuLe: string | null): Set<string> {
  const t = vuLe ? Date.parse(vuLe) : NaN;
  if (Number.isNaN(t)) return new Set();
  return new Set(photos.filter((p) => !p.moi && Date.parse(p.arrivee) > t).map((p) => p.id));
}

/** La plus récente arrivée vue (le prochain repère de visite), ou `null`. */
export function derniereArrivee(photos: readonly { arrivee: string }[]): string | null {
  let max: string | null = null;
  let tMax = -Infinity;
  for (const p of photos) {
    const t = Date.parse(p.arrivee);
    if (!Number.isNaN(t) && t > tMax) {
      tMax = t;
      max = p.arrivee;
    }
  }
  return max;
}

/**
 * « Mes photos » pendant et après l'envoi (test iPhone de Mathias, 27/10) : une photo arrivée
 * GARDE sa place dans l'envoi, en haut, dans l'ordre où elle part. Avant, elle quittait l'envoi
 * pour la liste du serveur, rangée EN DESSOUS : sur 66 photos, le haut de l'écran ne montrait que
 * celles qui attendaient, et « ça charge par le bas ». La liste du serveur ne redit donc pas une
 * photo de l'envoi. En mode « cocher », l'ancien partage revient : seule la liste du serveur se coche.
 */
export function grilleDesMiennes<T extends { photoId: string | null }, P extends { id: string }>(
  envoi: readonly T[],
  serveur: readonly P[],
  cocher: boolean
): { envoi: T[]; serveur: P[] } {
  if (cocher) return { envoi: photosDeLEnvoi(envoi, serveur), serveur: [...serveur] };
  const ids = new Set(envoi.map((e) => e.photoId).filter((id): id is string => Boolean(id)));
  return { envoi: [...envoi], serveur: serveur.filter((p) => !ids.has(p.id)) };
}

/** Les photos de l'envoi en cours qui ne sont pas DÉJÀ dans la liste du serveur (même id). */
export function photosDeLEnvoi<T extends { photoId: string | null }>(envoi: readonly T[], serveur: readonly { id: string }[]): T[] {
  const ids = new Set(serveur.map((p) => p.id));
  return envoi.filter((e) => !e.photoId || !ids.has(e.photoId));
}

/** La place qui reste, dite à l'écran (« tu peux encore en envoyer 36 ») ; vide si on ne la connaît pas. */
export function phrasePlace(place: number | null | undefined, tu: boolean): string {
  if (place === undefined) return "";
  if (place === null) return "sans limite";
  if (place <= 0) return tu ? "tu as envoyé toutes les photos prévues" : "vous avez envoyé toutes les photos prévues";
  return tu ? `tu peux encore en envoyer ${place}` : `vous pouvez encore en envoyer ${place}`;
}

/* ─────────────────────── le dernier envoi, et ce qui était déjà là (21/10) ─────────────────────── */

/** « Tout l'album » se relit toutes les 45 s, onglet visible (et au retour sur l'onglet, au plus toutes les 20 s : `REPOS_MIN_MS`). */
export const SONDAGE_ALBUM_MS = 45_000;

/**
 * Le sondage dit au serveur la dernière arrivée qu'il connaît (`depuis`) : rien de plus
 * récent, le serveur répond « rien de neuf » en une requête au lieu de relire et signer
 * toute la page 0 (perf-1, 26/10). Une relecture COMPLÈTE tous les `SONDAGES_AVANT_RELECTURE`
 * tours garde le compte juste quand une photo part à la corbeille.
 */
export const SONDAGES_AVANT_RELECTURE = 5;

/** Le repère `depuis` reçu du navigateur : une date lisible, réécrite par le serveur ; `null` sinon. */
export function lireDepuis(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * Ce qu'a fait le DERNIER envoi (un « lot ») : ses photos seulement, pas le
 * cumul de la page. Le moteur le recompte à chaque vue (`compterLot`).
 */
export type CompteLot = {
  /** Le numéro du lot (0 : rien encore). */
  numero: number;
  total: number;
  /** Confirmées par le serveur : les seules « reçues ». */
  arrivees: number;
  /** Au coffre, pas encore confirmées (comptées aussi dans `enCours`). */
  auCoffre: number;
  enCours: number;
  refusees: number;
  erreurs: number;
  /** Les raisons des refus et erreurs de CE lot, sans répétition. */
  raisons: string[];
  /** Les « déjà là », rangées par cas et par lien d'origine. */
  deja: { ou: OuDeja; lien: string | null; ici: boolean; n: number }[];
  /** Le même fichier choisi deux fois pendant cet envoi : il ne part qu'une fois. */
  deuxFois: number;
};

export const LOT_VIDE: CompteLot = { numero: 0, total: 0, arrivees: 0, auCoffre: 0, enCours: 0, refusees: 0, erreurs: 0, raisons: [], deja: [], deuxFois: 0 };

/** Compter les photos du lot `numero` (les états du moteur : `confirme`, `deja`, `refuse`, `erreur`, `envoye`, et ceux qui avancent). */
export function compterLot(
  items: readonly { lot: number; etat: string; deja: DejaLa | null; raison: string | null }[],
  numero: number,
  deuxFois: number
): CompteLot {
  const c: CompteLot = { ...LOT_VIDE, numero, raisons: [], deja: [], deuxFois: Math.max(0, Math.floor(deuxFois)) };
  const raisons = new Set<string>();
  const groupes = new Map<string, { ou: OuDeja; lien: string | null; ici: boolean; n: number }>();
  for (const it of items) {
    if (it.lot !== numero) continue;
    c.total++;
    if (it.etat === "confirme") c.arrivees++;
    else if (it.etat === "deja") {
      const d = it.deja ?? { ou: "connue" as const, lien: null, ici: false };
      const cle = `${d.ou}|${d.ici ? 1 : 0}|${d.lien ?? ""}`;
      const g = groupes.get(cle);
      if (g) g.n++;
      else groupes.set(cle, { ou: d.ou, lien: d.lien, ici: d.ici, n: 1 });
    } else if (it.etat === "refuse") {
      c.refusees++;
      if (it.raison) raisons.add(it.raison);
    } else if (it.etat === "erreur") {
      c.erreurs++;
      if (it.raison) raisons.add(it.raison);
    } else {
      c.enCours++;
      if (it.etat === "envoye") c.auCoffre++;
    }
  }
  c.raisons = [...raisons].slice(0, 6);
  c.deja = [...groupes.values()];
  return c;
}

export type BilanLot = {
  /** Les photos arrivées par CET envoi : le merci ne compte qu'elles. */
  recues: number;
  dejaAlbum: number;
  /** Déjà arrivées par un autre lien de l'édition depuis cet appareil (`lien` : son libellé, `null` sans nom). */
  dejaLiens: { lien: string | null; n: number }[];
  dejaEdition: number;
  dejaConnues: number;
  /** Revenues de la corbeille (`ici` : dans l'album de cette page). */
  restaurees: { ici: boolean; lien: string | null; n: number }[];
  /** À la corbeille par le responsable ou l'atelier : elles ne reviennent pas. */
  retirees: number;
  /** À la corbeille par leur auteur, mais pas depuis cet appareil ni par cette personne. */
  supprimees: number;
  deuxFois: number;
  refusees: number;
  erreurs: number;
  enCours: number;
  /** Rien n'est reparti pour elles (restaurées comprises). */
  dejaLa: number;
  /** Le lot a fini (rien ne part plus). */
  fini: boolean;
};

/** Le bilan d'un envoi : reçues / déjà dans l'album / déjà par un autre lien / restaurées / retirées par l'organisateur / refusées. */
export function bilanDuLot(lot: CompteLot): BilanLot {
  const b: BilanLot = {
    recues: lot.arrivees,
    dejaAlbum: 0,
    dejaLiens: [],
    dejaEdition: 0,
    dejaConnues: 0,
    restaurees: [],
    retirees: 0,
    supprimees: 0,
    deuxFois: lot.deuxFois,
    refusees: lot.refusees,
    erreurs: lot.erreurs,
    enCours: lot.enCours,
    dejaLa: 0,
    fini: lot.total > 0 && lot.enCours === 0,
  };
  const ajouter = <T extends { n: number }>(liste: T[], trouver: (x: T) => boolean, neuf: T) => {
    const x = liste.find(trouver);
    if (x) x.n += neuf.n;
    else liste.push(neuf);
  };
  for (const g of lot.deja) {
    b.dejaLa += g.n;
    if (g.ou === "album") b.dejaAlbum += g.n;
    else if (g.ou === "lien") ajouter(b.dejaLiens, (x) => x.lien === g.lien, { lien: g.lien, n: g.n });
    else if (g.ou === "edition") b.dejaEdition += g.n;
    else if (g.ou === "restauree") ajouter(b.restaurees, (x) => x.ici === g.ici && x.lien === (g.ici ? null : g.lien), { ici: g.ici, lien: g.ici ? null : g.lien, n: g.n });
    else if (g.ou === "retiree") b.retirees += g.n;
    else if (g.ou === "supprimee") b.supprimees += g.n;
    else b.dejaConnues += g.n;
  }
  return b;
}

/** « 3 photos étaient déjà dans l'album : elles ne repartent pas. » : le début, au singulier ou au pluriel. */
function etaient(n: number, attribut: string): string {
  return n > 1 ? `${n} photos étaient ${attribut.replace("{e}", "es")}` : `1 photo était ${attribut.replace("{e}", "e")}`;
}
function neRepartPas(n: number): string {
  return n > 1 ? "elles ne repartent pas." : "elle ne repart pas.";
}

/**
 * Les phrases d'un envoi, dans l'ordre de la barre du bas (au registre, sans
 * tiret cadratin, au masculin générique). `pour: "responsable"` : son dépôt
 * dit déjà « déjà là, sautées » ; seule la corbeille a sa phrase (il la
 * restaure lui-même depuis la page Photos), rien ne s'y restaure tout seul.
 */
export function phrasesDuLot(b: BilanLot, o: { tu: boolean; pour?: "participant" | "responsable" }): string[] {
  const v = (vous: string, toi: string) => (o.tu ? toi : vous);
  const out: string[] = [];
  if (o.pour === "responsable") {
    const n = b.retirees + b.supprimees;
    if (n) out.push(n > 1 ? `${n} photos à la corbeille.` : "1 photo à la corbeille.");
    return out;
  }
  for (const r of b.restaurees) {
    const sujet = r.n > 1 ? `${r.n} photos ${v("que vous aviez supprimées", "que tu avais supprimées")} sont revenues` : `1 photo ${v("que vous aviez supprimée", "que tu avais supprimée")} est revenue`;
    const ou = r.ici
      ? "dans l'album"
      : r.lien
        ? `dans l'album de « ${r.lien} »`
        : r.n > 1
          ? v("dans l'album où vous les aviez envoyées", "dans l'album où tu les avais envoyées")
          : v("dans l'album où vous l'aviez envoyée", "dans l'album où tu l'avais envoyée");
    out.push(`${sujet} ${ou}.`);
  }
  if (b.dejaAlbum) out.push(`${etaient(b.dejaAlbum, "déjà dans l'album")} : ${neRepartPas(b.dejaAlbum)}`);
  for (const l of b.dejaLiens) out.push(`${etaient(l.n, `déjà arrivé{e} par ${l.lien ? `« ${l.lien} »` : "un autre lien"}`)} : ${neRepartPas(l.n)}`);
  if (b.dejaEdition) out.push(`${etaient(b.dejaEdition, "déjà dans l'édition")} : ${neRepartPas(b.dejaEdition)}`);
  if (b.dejaConnues) out.push(`${etaient(b.dejaConnues, "déjà arrivé{e}")} : ${neRepartPas(b.dejaConnues)}`);
  if (b.retirees) out.push(b.retirees > 1 ? `${b.retirees} photos avaient été retirées par l'organisateur : elles ne repartent pas.` : "1 photo avait été retirée par l'organisateur : elle ne repart pas.");
  if (b.supprimees) out.push(b.supprimees > 1 ? `${b.supprimees} photos avaient été supprimées de l'album : elles ne repartent pas.` : "1 photo avait été supprimée de l'album : elle ne repart pas.");
  if (b.deuxFois) out.push(b.deuxFois > 1 ? `${b.deuxFois} photos choisies deux fois ne partent qu'une fois.` : "1 photo choisie deux fois ne part qu'une fois.");
  return out;
}

/**
 * La carte « Content de vous revoir » et l'annonce de retour dans l'album
 * (21/10) : ce qui est sur CE lien, et ce qui reste à envoyer par lui.
 * « 2 photos déjà sur « Bateau 1 ». Vous pouvez encore en envoyer 3. » ;
 * sans lien nommé : « dans l'album ». Plus jamais le total de l'édition.
 */
export function phraseRetour(surCeLien: number, place: number | null | undefined, lien: string | null, tu: boolean): string {
  const n = Math.max(0, Math.floor(surCeLien));
  const deja = n ? `${n} photo${n > 1 ? "s" : ""} déjà ${lien ? `sur « ${lien} »` : "dans l'album"}.` : "";
  const reste =
    place === undefined
      ? ""
      : place === null
        ? tu
          ? "Tu peux en envoyer sans limite."
          : "Vous pouvez en envoyer sans limite."
        : place <= 0
          ? tu
            ? "Tu as envoyé toutes les photos prévues."
            : "Vous avez envoyé toutes les photos prévues."
          : `${tu ? "Tu peux" : "Vous pouvez"} ${n ? "encore " : ""}en envoyer ${place}.`;
  return [deja, reste].filter(Boolean).join(" ");
}

/**
 * « Mes photos » ne montre que les photos de CET appareil (l'adresse n'est pas
 * vérifiée : on ne voit ni ne supprime celles d'un autre appareil). Celles de
 * la même personne sur ce lien, envoyées d'ailleurs, se COMPTENT (21/10) :
 * « 2 autres photos à votre nom, envoyées d'un autre appareil, sont dans Tout l'album. »
 */
export function phraseAutresAppareils(n: number | null | undefined, tu: boolean): string {
  const k = typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (!k) return "";
  const nom = tu ? "à ton nom" : "à votre nom";
  return k > 1
    ? `${k} autres photos ${nom}, envoyées d'un autre appareil, sont dans Tout l'album.`
    : `1 autre photo ${nom}, envoyée d'un autre appareil, est dans Tout l'album.`;
}

/** Les photos arrivées depuis la dernière lecture, en TÊTE de la liste, sans doublon (la relecture de « Tout l'album »). */
export function enTete<T extends { id: string }>(neuves: readonly T[], liste: readonly T[]): T[] {
  const deja = new Set(liste.map((p) => p.id));
  const vues = new Set<string>();
  const tete = neuves.filter((p) => !deja.has(p.id) && !vues.has(p.id) && Boolean(vues.add(p.id)));
  return tete.length ? [...tete, ...liste] : [...liste];
}

/* ─────────── l'envoi coupé (2A, décision de Mathias du 26/10) ───────────
   Au retour sur son lien après un envoi coupé (onglet fermé, téléphone verrouillé), la page le
   dit en quatre mots et propose de reprendre : choisir de nouveau les photos les renvoie sur la
   même ligne (rien ne compte deux fois). Aucune phrase d'explication (règle des textes courts). */

/** Le bouton qui rouvre le choix des photos. */
export const BOUTON_REPRENDRE = "Reprendre";

/** « 8 photos non arrivées », « 1 photo non arrivée » ; `null` quand il n'y a rien à dire. */
export function phraseCoupees(n: number): string | null {
  const k = Math.max(0, Math.floor(n));
  if (!k) return null;
  return k > 1 ? `${k} photos non arrivées` : "1 photo non arrivée";
}

/**
 * Combien de photos coupées la page dit encore : le compte du serveur tant que rien n'a été choisi
 * sur cette page (`totalMoteur` = 0) ; dès qu'un envoi part, c'est lui qui parle (ses arrivées,
 * ses erreurs), et le compte du chargement, devenu faux, se tait.
 */
export function coupeesADire(coupees: number, totalMoteur: number): number {
  return totalMoteur > 0 ? 0 : Math.max(0, Math.floor(coupees));
}
