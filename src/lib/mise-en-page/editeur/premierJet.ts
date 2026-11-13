/**
 * Le PREMIER JET (lot E, 13/11) : un magazine composé HORS de l'éditeur (une démo de composition automatique), chargé en un
 * geste sur les photos qu'on vient d'importer. Le format est écrit dans `docs/moteur/PREMIER-JET.md`, avec un exemple
 * (`docs/moteur/exemple-premier-jet.json`).
 *
 * Un fichier = une ENVELOPPE JSON :
 *   { "format": "bellajour-premier-jet", "version": 1,
 *     "magazine": <le Magazine EXACT de la sauvegarde, validé par `contenuValide`>,
 *     "photos":   { "<photoId du magazine>": "<nom de fichier d'origine>" },
 *     "raisons":  { "<photoId>": "pourquoi la démo a marqué cette photo" } }          (facultatif)
 *
 * Les photos du fichier ne sont pas celles de l'éditeur (autres identifiants) : elles se relient par leur NOM DE FICHIER d'origine.
 * Ce qui ne trouve pas sa photo n'est jamais perdu ni écrit de travers : la photo reste posée, « indisponible » (un identifiant
 * `jet:…` que le catalogue ne connaît pas, comme une photo retirée de la bibliothèque), et le bandeau de l'écran la nomme.
 *
 * Module PUR : ni React, ni réseau, ni horloge. `lirePremierJet` valide le fichier (une phrase par refus) ; `appliquerPremierJet`
 * relie les photos et rend le magazine à adopter, ce que le geste `chargerPremierJet` (plans.ts) exécute.
 */

import { avecDerniere, type Magazine, type Planche, type Disposition, type Affectation } from "../magazine";
import type { Couverture } from "../couverture";
import { contenuValide, tailleContenu } from "../sauvegarde";
import { marqueDe, type Marque } from "./tri";
import type { Proposition } from "./pretri";

/** Le marqueur du fichier, et sa version. Un changement de forme = une autre version, jamais une retouche de la 1. */
export const FORMAT_PREMIER_JET = "bellajour-premier-jet";
export const VERSION_PREMIER_JET = 1;
/** Borne TECHNIQUE du fichier (octets) : le magazine seul est borné à 2 Mo (`TAILLE_MAX_CONTENU`), la table des noms et les raisons s'y ajoutent. */
export const TAILLE_MAX_PREMIER_JET = 4 * 1024 * 1024;
/** Bornes techniques d'un nom de fichier et d'une raison (la raison part en leçon : 200 signes au plus avec son préfixe). */
export const NOM_FICHIER_MAX = 260;
export const RAISON_MAX = 120;
/** La règle que porte une marque venue du premier jet (`Proposition.regle` : 8 signes au plus, comme les autres règles). */
export const REGLE_PREMIER_JET = "PJ";
/** Le mot qui précède la raison d'une marque proposée : « premier jet » pour celles du fichier, « pré-tri » pour celles du pré-tri. */
export const motProposition = (p: { regle: string }): string => (p.regle === REGLE_PREMIER_JET ? "premier jet" : "pré-tri");
/** Le préfixe de l'identifiant d'une photo du fichier qui n'a pas trouvé la sienne : jamais un identifiant du catalogue (`loc-…`, uuid). */
export const PREFIXE_ABSENTE = "jet:";

export type PremierJet = {
  format: typeof FORMAT_PREMIER_JET;
  version: typeof VERSION_PREMIER_JET;
  magazine: Magazine;
  photos: Readonly<Record<string, string>>;
  raisons?: Readonly<Record<string, string>>;
};

export type LecturePremierJet = { ok: true; jet: PremierJet } | { ok: false; phrase: string };

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Les identifiants de photo que porte un magazine : planches (devant et derrière), couverture, tri. */
export function idsDuMagazine(m: Magazine): string[] {
  const vus = new Set<string>();
  const ajoute = (a: Affectation | null | undefined) => {
    if (a?.photoId) vus.add(a.photoId);
    if (a?.hesitation?.photoId) vus.add(a.hesitation.photoId);
  };
  for (const p of m.planches) for (const d of [p.double, p.gauche, p.droite]) for (const a of d?.photos ?? []) ajoute(a);
  for (const a of m.couverture?.photos ?? []) ajoute(a);
  if (m.tri) {
    for (const l of [m.tri.choisies, m.tri.ecartees, m.tri.coupsDeCoeur ?? [], m.tri.reserve ?? [], ...Object.values(m.tri.etiquettes ?? {})]) for (const id of l ?? []) vus.add(id);
  }
  return [...vus];
}

/** Quelle clé facultative du magazine fait refuser le contenu ? (celle dont le retrait le rend valide), sinon « planches ». */
function cleFautive(m: Record<string, unknown>): string {
  for (const k of ["tri", "style", "couverture", "derniere"]) {
    if (!(k in m)) continue;
    const { [k]: _, ...sans } = m;
    void _;
    if (contenuValide(sans)) return k;
  }
  return "planches";
}

const liste = (l: readonly string[], n = 4): string => `${l.slice(0, n).join(", ")}${l.length > n ? `… (${l.length})` : ""}`;

/** Lit un fichier de premier jet (le texte JSON, ou l'objet déjà lu). Un refus rend UNE phrase, jamais une exception. */
export function lirePremierJet(entree: unknown): LecturePremierJet {
  const refus = (phrase: string): LecturePremierJet => ({ ok: false, phrase });
  let x = entree;
  if (typeof entree === "string") {
    if (entree.length > TAILLE_MAX_PREMIER_JET) return refus("Ce fichier est trop gros pour un premier jet.");
    try { x = JSON.parse(entree) as unknown; } catch { return refus("Ce fichier n'est pas du JSON lisible."); }
  }
  if (!estObjet(x)) return refus("Ce fichier n'est pas un premier jet : il faut un objet JSON.");
  if (x.format !== FORMAT_PREMIER_JET) return refus(`Ce JSON n'est pas un premier jet Bellajour : le champ « format » doit valoir « ${FORMAT_PREMIER_JET} ».`);
  if (x.version !== VERSION_PREMIER_JET) return refus(`Version ${typeof x.version === "number" || typeof x.version === "string" ? String(x.version) : "absente"} inconnue : seule la version ${VERSION_PREMIER_JET} se charge.`);
  const clesAdmises = ["format", "version", "magazine", "photos", "raisons"];
  const inconnue = Object.keys(x).find((k) => !clesAdmises.includes(k));
  if (inconnue) return refus(`Le champ « ${inconnue} » n'existe pas dans un premier jet (format, version, magazine, photos, raisons).`);
  if (!estObjet(x.magazine)) return refus("Le premier jet n'a pas de « magazine ».");
  if (!contenuValide(x.magazine)) return refus(`Le magazine du premier jet n'a pas la forme d'un magazine sauvegardé (« ${cleFautive(x.magazine)} » est refusé) : rien n'est chargé.`);
  const magazine = x.magazine;
  if (!estObjet(x.photos)) return refus("Il manque la table « photos » : chaque identifiant de photo du magazine y est associé à son nom de fichier d'origine.");
  const table: Record<string, string> = {};
  for (const [id, nom] of Object.entries(x.photos)) {
    if (typeof nom !== "string" || !nom.trim() || nom.length > NOM_FICHIER_MAX) return refus(`La table « photos » : le nom de fichier de « ${id} » doit être un texte non vide (${NOM_FICHIER_MAX} signes au plus).`);
    table[id] = nom.trim();
  }
  const sansNom = idsDuMagazine(magazine).filter((id) => !(id in table));
  if (sansNom.length) return refus(`La table « photos » n'a pas de nom de fichier pour ${liste(sansNom)}.`);
  let raisons: Record<string, string> | undefined;
  if (x.raisons !== undefined) {
    if (!estObjet(x.raisons)) return refus("« raisons » doit associer un identifiant de photo à un texte.");
    raisons = {};
    for (const [id, r] of Object.entries(x.raisons)) {
      if (!(id in table)) return refus(`« raisons » parle de « ${id} », qui n'est pas dans la table « photos ».`);
      if (typeof r !== "string" || !r.trim() || r.length > RAISON_MAX) return refus(`« raisons » : la raison de « ${id} » doit être un texte non vide (${RAISON_MAX} signes au plus).`);
      raisons[id] = r.trim();
    }
  }
  if (tailleContenu(x) > TAILLE_MAX_PREMIER_JET) return refus("Ce premier jet est trop gros.");
  return { ok: true, jet: { format: FORMAT_PREMIER_JET, version: VERSION_PREMIER_JET, magazine, photos: table, ...(raisons ? { raisons } : {}) } };
}

/** Un nom de fichier comparable : sans dossier, sans accents décomposés, minuscules, espaces rognés. */
export const nomComparable = (nom: string): string => (nom.trim().split(/[\\/]/).pop() ?? "").normalize("NFC").toLowerCase();

export type BilanPremierJet = {
  /** Le magazine à adopter : les planches du fichier (photos reliées), le tri relié, le style et la couverture du fichier ; l'identité du magazine courant. */
  magazine: Magazine;
  /** Les raisons du fichier, une proposition par photo reliée qui porte une marque du machine (gardée, réserve, écartée). */
  propositions: Record<string, Proposition>;
  /** Combien de photos du fichier ont trouvé la leur, sur combien. */
  reliees: number;
  total: number;
  /** Les photos du fichier sans photo importée du même nom : leur identifiant dans le magazine (`jet:…`) et leur nom de fichier. */
  manquantes: { id: string; nom: string }[];
  /** Les noms que PLUSIEURS photos importées portent : la première (dans l'ordre du catalogue) a été prise. */
  ambigues: string[];
  /** Une phrase si le magazine composé n'est pas valide (deux photos du fichier reliées à la même photo importée et posées ensemble, par exemple) : il n'est alors pas chargé. */
  refus: string | null;
};

/**
 * Relie les photos du fichier aux photos importées par leur NOM DE FICHIER, et compose le magazine à adopter.
 * - le magazine courant garde son identité (`id`, `titre`, `creeLe`, `modifieLe`) ; les PLANCHES sont toujours celles du fichier ;
 *   le tri, le style et la couverture du fichier remplacent les courants quand le fichier les porte, sinon les courants restent ;
 * - une photo sans photo du même nom devient `jet:<id>` (indisponible, jamais perdue) ; sa marque de tri n'est pas écrite (le tri ne
 *   porte que des photos que le catalogue connaît) ;
 * - `catalogue` : toute table dont les valeurs ont un `nom` (l'état de l'éditeur, ou des photos de test).
 */
export function appliquerPremierJet(jet: PremierJet, courant: Magazine, catalogue: ReadonlyMap<string, { nom: string }>): BilanPremierJet {
  /* nom comparable → identifiants du catalogue, dans l'ordre du catalogue */
  const parNom = new Map<string, string[]>();
  for (const [id, p] of catalogue) {
    const k = nomComparable(p.nom);
    const l = parNom.get(k);
    if (l) l.push(id); else parNom.set(k, [id]);
  }
  const lie = new Map<string, string>();
  const manquantes: BilanPremierJet["manquantes"] = [];
  const ambigues = new Set<string>();
  const ids = idsDuMagazine(jet.magazine);
  for (const id of ids) {
    const nom = jet.photos[id];
    const trouvees = parNom.get(nomComparable(nom)) ?? [];
    if (trouvees.length) {
      lie.set(id, trouvees[0]);
      if (trouvees.length > 1) ambigues.add(nom);
    } else {
      lie.set(id, `${PREFIXE_ABSENTE}${id}`);
      manquantes.push({ id: `${PREFIXE_ABSENTE}${id}`, nom });
    }
  }
  const absente = (id: string): boolean => id.startsWith(PREFIXE_ABSENTE) && !catalogue.has(id);
  const vers = (id: string): string => lie.get(id) ?? id;
  const versAff = (a: Affectation): Affectation => {
    const r: Affectation = { photoId: a.photoId === null ? null : vers(a.photoId), recadrage: { ...a.recadrage } };
    if (a.hesitation) r.hesitation = { ...a.hesitation, photoId: vers(a.hesitation.photoId), recadrage: { ...a.hesitation.recadrage } };
    return r;
  };
  const versDispo = (d: Disposition | null): Disposition | null => (d ? { ...d, photos: d.photos.map(versAff) } : null);
  const planches: Planche[] = jet.magazine.planches.map((p) => ({ ...p, double: versDispo(p.double), gauche: versDispo(p.gauche), droite: versDispo(p.droite) }));

  /* le tri : les photos reliées seulement, sans doublon, une marque par photo (coup de cœur > gardée > réserve > écartée) */
  let tri = courant.tri;
  if (jet.magazine.tri) {
    const t = jet.magazine.tri;
    const vues = new Set<string>();
    const reliee = (l: readonly string[] | undefined): string[] => {
      const out: string[] = [];
      for (const id of l ?? []) {
        const v = vers(id);
        if (absente(v) || vues.has(v)) continue;
        vues.add(v);
        out.push(v);
      }
      return out;
    };
    const coeurs = reliee(t.coupsDeCoeur), choisies = reliee(t.choisies), reserve = reliee(t.reserve), ecartees = reliee(t.ecartees);
    const gardees = new Set([...choisies, ...coeurs]);
    const nt: NonNullable<Magazine["tri"]> = { choisies, ecartees, visees: t.visees };
    if (coeurs.length) nt.coupsDeCoeur = coeurs;
    if (reserve.length) nt.reserve = reserve;
    if (t.etiquettes) {
      const et: NonNullable<NonNullable<Magazine["tri"]>["etiquettes"]> = {};
      for (const k of ["couverture", "double", "pleine"] as const) {
        const l = [...new Set((t.etiquettes[k] ?? []).map(vers))].filter((id) => gardees.has(id));
        if (l.length) et[k] = l;
      }
      if (Object.keys(et).length) nt.etiquettes = et;
    }
    tri = nt;
  }

  const couverture: Couverture | undefined = jet.magazine.couverture
    ? { ...jet.magazine.couverture, photos: jet.magazine.couverture.photos.map(versAff), textes: jet.magazine.couverture.textes.map((t) => ({ ...t })) }
    : courant.couverture;

  const base: Magazine = { version: 1, id: courant.id, titre: courant.titre, planches, creeLe: courant.creeLe, modifieLe: courant.modifieLe };
  if (tri) base.tri = tri;
  if (jet.magazine.style) base.style = jet.magazine.style; else if (courant.style) base.style = courant.style;
  if (couverture) base.couverture = couverture;
  if (jet.magazine.derniere) base.derniere = true;
  const magazine = avecDerniere(base);

  /* les raisons : une proposition par photo RELIÉE qui porte, dans le tri écrit, une marque de la machine ; la marque vient du tri, jamais de la raison */
  const propositions: Record<string, Proposition> = {};
  for (const [id, raison] of Object.entries(jet.raisons ?? {})) {
    const v = vers(id);
    if (absente(v)) continue;
    const m: Marque | null = marqueDe(magazine, v);
    if (m === "choisie" || m === "reserve" || m === "ecartee") propositions[v] = { marque: m, raison, regle: REGLE_PREMIER_JET };
  }
  const reliees = [...lie.values()].filter((v) => !absente(v)).length;
  /* une photo ne se pose qu'une fois sur une planche, ni sur la couverture (invariants I9 et C3 de l'éditeur) : deux photos du fichier de même nom,
     reliées à la même photo importée, se retrouveraient ensemble ; le fichier lui-même peut aussi poser deux fois la même photo */
  const deuxFois = (l: readonly (string | null)[]): boolean => { const v = l.filter((x): x is string => x !== null); return new Set(v).size !== v.length; };
  const doublon = magazine.planches.some((p) => deuxFois([p.double, p.gauche, p.droite].flatMap((d) => d?.photos.map((a) => a.photoId) ?? []))) || deuxFois(magazine.couverture?.photos.map((a) => a.photoId) ?? []);
  const refus = doublon ? "Une même photo se retrouve deux fois sur une planche (ou sur la couverture) : deux photos du premier jet portent le même nom de fichier. Rien n'est chargé."
    : contenuValide(magazine) ? null : "Le magazine composé à partir du premier jet n'est pas valide : rien n'est chargé.";
  return { magazine, propositions, reliees, total: lie.size, manquantes, ambigues: [...ambigues], refus };
}
