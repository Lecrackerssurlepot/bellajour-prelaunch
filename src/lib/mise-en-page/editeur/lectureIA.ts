/**
 * La LECTURE IA (lot F, 14/11) : ce que la machine a vu et ce qu'elle PROPOSE sur chaque photo, chargé dans le tri.
 * Rien n'est décidé à la place de l'atelier : les marques (coup de cœur, gardée, réserve, écartée) restent les siennes.
 *
 * Un fichier = une ENVELOPPE JSON (format complet et exemple : `docs/moteur/LECTURE-IA.md`, `docs/moteur/exemple-lecture-ia.json`) :
 *   { "format": "bellajour-lecture-ia", "version": 1,
 *     "projet":  { type, source, raison }                       (facultatif : solo, couple, bande ; déclaré ou compté)
 *     "photos":  { "<nom de fichier d'origine>": { visages?, role?, lieu?, capture? } },
 *     "rafales": [ { photos, garder, usage, pourquoi } ],
 *     "groupes": [ { type, photos, idee } ],
 *     "couleurs": [ { nom, couleurs, raison, dansLesPhotos? } ] }   (pour le lot G : jamais affichées ici)
 *
 * D29 (14/11) : AUCUNE reconnaissance de visages. On COMPTE les visages (nombre, taille du plus grand, selfie), on ne dit
 * jamais qui est qui ni qui revient : le validateur refuse toute autre clé, donc toute identité.
 *
 * Les photos se relient par leur NOM DE FICHIER d'origine, comme le premier jet (`nomComparable` : casse, dossier, espaces
 * ignorés) ; une photo absente est listée, rien ne casse. La lecture ne touche JAMAIS au magazine ni à sa sauvegarde : elle vit
 * dans l'état d'écran (`EtatEditeur.lectureIA`) et dans ce navigateur (`[id]/lectureIAClient.ts`).
 *
 * Module PUR : ni React, ni réseau, ni horloge.
 */

import { ROLES_COULEUR, type Couleurs as CouleursMagazine } from "../style";
import { NOM_FICHIER_MAX, nomComparable } from "./premierJet";
import type { Pile } from "./mesures";
import { REGLAGES } from "./reglages";

export const FORMAT_LECTURE_IA = "bellajour-lecture-ia";
export const VERSION_LECTURE_IA = 1;
/** Bornes TECHNIQUES (octets du fichier, nombre de photos) : un magazine en porte quelques centaines. */
export const TAILLE_MAX_LECTURE_IA = 8 * 1024 * 1024;
export const PHOTOS_MAX_LECTURE_IA = 10000;
/** La règle que porte une proposition venue de la lecture IA (`Proposition.regle`, et la leçon qui la renverse). */
export const REGLE_IA = "IA";

export const ROLES_IA = ["couverture", "pleine", "double", "heros", "satellite", "detail", "vue_ensemble", "a_ecarter"] as const;
export type RoleIA = (typeof ROLES_IA)[number];
export const COUVERTURES_IA = ["groupe", "couple", "combo", "paysage", "lieu", "detail"] as const;
export type CouvertureIA = (typeof COUVERTURES_IA)[number];
export const CAPTURES_IA = ["billet", "carte", "message", "recu", "meme", "autre"] as const;
export type TypeCapture = (typeof CAPTURES_IA)[number];
export const USAGES_RAFALE = ["meilleure_seule", "sequence", "photomaton", "page_rafale"] as const;
export type UsageRafale = (typeof USAGES_RAFALE)[number];
export const TYPES_GROUPE = ["duo", "trio", "combo"] as const;
export type TypeGroupe = (typeof TYPES_GROUPE)[number];
export const TYPES_PROJET = ["solo", "couple", "bande"] as const;
export type TypeProjet = (typeof TYPES_PROJET)[number];

/** Des MESURES, jamais une identité (D29) : combien de visages, la hauteur du plus grand (fraction de la photo), un selfie ou non. */
export type VisagesIA = { nombre: number; plusGrand: number | null; selfie: boolean };
export type RoleProposeIA = { role: RoleIA; interet: number; raison: string; couverture?: CouvertureIA | null };
/** Le lieu NOMMÉ (« BMW Welt »). `statut` « sur » exige une `preuve` (panneau ou enseigne lisible, ou GPS qui confirme) ; sinon « a_verifier ». */
export type LieuIA = { nom: string; confiance: number; source: "ia" | "gps"; statut: "sur" | "a_verifier"; preuve?: "panneau" | "gps" };
export type CaptureIA = { type: TypeCapture; dit: string; utile: boolean };
export type PhotoIA = { visages?: VisagesIA; role?: RoleProposeIA; lieu?: LieuIA; capture?: CaptureIA };
export type RafaleIA = { photos: string[]; garder: string[]; usage: UsageRafale; pourquoi: string };
export type GroupeIA = { type: TypeGroupe; photos: string[]; idee: string };
export type ComboCouleurs = { nom: string; couleurs: CouleursMagazine; raison: string; dansLesPhotos?: boolean };
export type ProjetIA = { type: TypeProjet; source: "client" | "comptage"; raison: string };

export type LectureIA = {
  format: typeof FORMAT_LECTURE_IA;
  version: typeof VERSION_LECTURE_IA;
  projet?: ProjetIA;
  photos: Readonly<Record<string, PhotoIA>>;
  rafales: RafaleIA[];
  groupes: GroupeIA[];
  couleurs?: ComboCouleurs[];
};

export type LectureLectureIA = { ok: true; lecture: LectureIA } | { ok: false; phrase: string };

/* ─────────────────────────── la lecture du fichier ─────────────────────────── */

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const mots = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const entre = (v: unknown, a: number, b: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= a && v <= b;
const texte = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const dans = <T extends string>(l: readonly T[], v: unknown): v is T => typeof v === "string" && (l as readonly string[]).includes(v);
const clesEn = (o: Record<string, unknown>, admises: readonly string[]): string | undefined => Object.keys(o).find((k) => !admises.includes(k));
const HEX = /^#[0-9a-f]{6}$/;

/** Bornes du contrat (LECTURE-IA.md) : la raison d'un rôle en 8 mots, l'idée d'un groupe en 6 mots au plus. */
export const RAISON_MOTS_MAX = 8;
export const IDEE_MOTS_MAX = 6;

function lirePhoto(nom: string, x: unknown): string | PhotoIA {
  const ou = `la photo « ${nom} »`;
  if (!estObjet(x)) return `${ou} doit être un objet.`;
  const k = clesEn(x, ["visages", "role", "lieu", "capture"]);
  if (k) return `${ou} : le champ « ${k} » n'existe pas (visages, role, lieu, capture). Aucune identité de personne n'est admise.`;
  const p: PhotoIA = {};
  if (x.visages !== undefined) {
    const v = x.visages;
    if (!estObjet(v) || clesEn(v, ["nombre", "plusGrand", "selfie"])) return `${ou} : « visages » = { nombre, plusGrand, selfie }, rien d'autre (on compte les visages, on ne les reconnaît pas).`;
    if (!Number.isInteger(v.nombre) || !entre(v.nombre, 0, 200)) return `${ou} : « visages.nombre » doit être un entier de 0 à 200.`;
    if (!(v.plusGrand === null || entre(v.plusGrand, 0, 1))) return `${ou} : « visages.plusGrand » est une fraction de 0 à 1 (ou null sans visage).`;
    if (typeof v.selfie !== "boolean") return `${ou} : « visages.selfie » est vrai ou faux.`;
    p.visages = { nombre: v.nombre as number, plusGrand: v.plusGrand as number | null, selfie: v.selfie };
  }
  if (x.role !== undefined) {
    const r = x.role;
    if (!estObjet(r) || clesEn(r, ["role", "interet", "raison", "couverture"])) return `${ou} : « role » = { role, interet, raison, couverture? }.`;
    if (!dans(ROLES_IA, r.role)) return `${ou} : rôle inconnu (${ROLES_IA.join(", ")}).`;
    if (!entre(r.interet, 0, 1)) return `${ou} : « interet » va de 0 à 1.`;
    if (!texte(r.raison, 120) || mots(r.raison) > RAISON_MOTS_MAX) return `${ou} : la raison du rôle tient en ${RAISON_MOTS_MAX} mots au plus.`;
    if (!(r.couverture === undefined || r.couverture === null || dans(COUVERTURES_IA, r.couverture))) return `${ou} : type de couverture inconnu (${COUVERTURES_IA.join(", ")}).`;
    p.role = { role: r.role, interet: r.interet, raison: r.raison.trim(), ...(r.couverture ? { couverture: r.couverture } : {}) };
  }
  if (x.lieu !== undefined) {
    const l = x.lieu;
    if (!estObjet(l) || clesEn(l, ["nom", "confiance", "source", "statut", "preuve"])) return `${ou} : « lieu » = { nom, confiance, source, statut, preuve? }.`;
    if (!texte(l.nom, 120)) return `${ou} : le nom du lieu est un texte de 120 signes au plus.`;
    if (!entre(l.confiance, 0, 1)) return `${ou} : la confiance du lieu va de 0 à 1.`;
    if (!dans(["ia", "gps"] as const, l.source)) return `${ou} : la source du lieu est « ia » ou « gps ».`;
    if (!dans(["sur", "a_verifier"] as const, l.statut)) return `${ou} : le statut du lieu est « sur » ou « a_verifier ».`;
    if (!(l.preuve === undefined || dans(["panneau", "gps"] as const, l.preuve))) return `${ou} : la preuve du lieu est « panneau » ou « gps ».`;
    if (l.statut === "sur" && !l.preuve) return `${ou} : un lieu « sûr » dit sa preuve (un panneau lisible ou le GPS qui confirme) ; sinon il est « à vérifier ».`;
    p.lieu = { nom: l.nom.trim(), confiance: l.confiance, source: l.source, statut: l.statut, ...(l.preuve ? { preuve: l.preuve } : {}) };
  }
  if (x.capture !== undefined) {
    const c = x.capture;
    if (!estObjet(c) || clesEn(c, ["type", "dit", "utile"])) return `${ou} : « capture » = { type, dit, utile }.`;
    if (!dans(CAPTURES_IA, c.type)) return `${ou} : type de capture inconnu (${CAPTURES_IA.join(", ")}).`;
    if (!texte(c.dit, 300)) return `${ou} : ce que dit la capture tient en 300 signes au plus.`;
    if (typeof c.utile !== "boolean") return `${ou} : « utile » est vrai ou faux.`;
    p.capture = { type: c.type, dit: c.dit.trim(), utile: c.utile };
  }
  return p;
}

function listeNoms(v: unknown, min: number, max: number): string[] | null {
  if (!Array.isArray(v) || v.length < min || v.length > max) return null;
  const l = v.map((x) => (typeof x === "string" ? x.trim() : ""));
  if (l.some((x) => !x || x.length > NOM_FICHIER_MAX)) return null;
  if (new Set(l.map(nomComparable)).size !== l.length) return null;
  return l;
}

/** Lit une lecture IA (le texte JSON, ou l'objet déjà lu). Un refus rend UNE phrase, jamais une exception. */
export function lireLectureIA(entree: unknown): LectureLectureIA {
  const refus = (phrase: string): LectureLectureIA => ({ ok: false, phrase });
  let x = entree;
  if (typeof entree === "string") {
    if (entree.length > TAILLE_MAX_LECTURE_IA) return refus("Cette lecture est trop grosse.");
    try { x = JSON.parse(entree) as unknown; } catch { return refus("Ce fichier n'est pas du JSON lisible."); }
  }
  if (!estObjet(x)) return refus("Ce fichier n'est pas une lecture : il faut un objet JSON.");
  if (x.format !== FORMAT_LECTURE_IA) return refus(`Ce JSON n'est pas une lecture IA Bellajour : le champ « format » doit valoir « ${FORMAT_LECTURE_IA} ».`);
  if (x.version !== VERSION_LECTURE_IA) return refus(`Version ${typeof x.version === "number" || typeof x.version === "string" ? String(x.version) : "absente"} inconnue : seule la version ${VERSION_LECTURE_IA} se charge.`);
  const k = clesEn(x, ["format", "version", "projet", "photos", "rafales", "groupes", "couleurs"]);
  if (k) return refus(`Le champ « ${k} » n'existe pas dans une lecture (format, version, projet, photos, rafales, groupes, couleurs).`);

  let projet: ProjetIA | undefined;
  if (x.projet !== undefined) {
    const p = x.projet;
    if (!estObjet(p) || clesEn(p, ["type", "source", "raison"]) || !dans(TYPES_PROJET, p.type) || !dans(["client", "comptage"] as const, p.source) || !texte(p.raison, 160)) {
      return refus("« projet » = { type : solo, couple ou bande ; source : client ou comptage ; raison } (jamais une reconnaissance de visages).");
    }
    projet = { type: p.type, source: p.source, raison: p.raison.trim() };
  }

  if (!estObjet(x.photos)) return refus("Il manque la table « photos » : chaque nom de fichier d'origine y porte ce que la machine a vu.");
  const noms = Object.keys(x.photos);
  if (noms.length > PHOTOS_MAX_LECTURE_IA) return refus("Trop de photos dans cette lecture.");
  const photos: Record<string, PhotoIA> = {};
  const vus = new Map<string, string>();
  for (const nom of noms) {
    if (!nom.trim() || nom.length > NOM_FICHIER_MAX) return refus(`Un nom de fichier de « photos » est vide ou trop long (${NOM_FICHIER_MAX} signes au plus).`);
    const c = nomComparable(nom);
    if (vus.has(c)) return refus(`« ${vus.get(c)} » et « ${nom} » sont le même nom de fichier : une seule entrée par photo.`);
    vus.set(c, nom);
    const p = lirePhoto(nom, x.photos[nom]);
    if (typeof p === "string") return refus(`${p.charAt(0).toUpperCase()}${p.slice(1)}`);
    photos[nom.trim()] = p;
  }

  if (!Array.isArray(x.rafales)) return refus("Il manque la liste « rafales » (vide s'il n'y en a pas).");
  const rafales: RafaleIA[] = [];
  const enRafale = new Set<string>();
  for (const [i, r] of x.rafales.entries()) {
    const ou = `La rafale ${i + 1}`;
    if (!estObjet(r) || clesEn(r, ["photos", "garder", "usage", "pourquoi"])) return refus(`${ou} = { photos, garder, usage, pourquoi }.`);
    const ph = listeNoms(r.photos, 2, 60);
    if (!ph) return refus(`${ou} : de 2 à 60 noms de fichier, sans doublon.`);
    const ga = listeNoms(r.garder, 1, 60);
    const dedans = new Set(ph.map(nomComparable));
    if (!ga || ga.some((n) => !dedans.has(nomComparable(n)))) return refus(`${ou} : « garder » nomme au moins une photo, toutes prises dans la rafale.`);
    if (!dans(USAGES_RAFALE, r.usage)) return refus(`${ou} : usage inconnu (${USAGES_RAFALE.join(", ")}).`);
    if (!texte(r.pourquoi, 300)) return refus(`${ou} : « pourquoi » tient en 300 signes au plus.`);
    for (const n of ph) { const c = nomComparable(n); if (enRafale.has(c)) return refus(`« ${n} » est dans deux rafales : une photo n'est que dans une.`); enRafale.add(c); }
    rafales.push({ photos: ph, garder: ga, usage: r.usage, pourquoi: r.pourquoi.trim() });
  }

  if (!Array.isArray(x.groupes)) return refus("Il manque la liste « groupes » (vide s'il n'y en a pas).");
  const groupes: GroupeIA[] = [];
  const enGroupe = new Set<string>();
  for (const [i, g] of x.groupes.entries()) {
    const ou = `Le groupe ${i + 1}`;
    if (!estObjet(g) || clesEn(g, ["type", "photos", "idee"])) return refus(`${ou} = { type, photos, idee }.`);
    const ph = listeNoms(g.photos, 2, 12);
    if (!ph) return refus(`${ou} : de 2 à 12 noms de fichier (une double), sans doublon.`);
    const attendu: TypeGroupe = ph.length === 2 ? "duo" : ph.length === 3 ? "trio" : "combo";
    if (g.type !== attendu) return refus(`${ou} : ${ph.length} photos font un ${attendu}, pas « ${String(g.type)} ».`);
    if (!texte(g.idee, 60) || mots(g.idee) > IDEE_MOTS_MAX) return refus(`${ou} : l'idée tient en ${IDEE_MOTS_MAX} mots au plus.`);
    for (const n of ph) { const c = nomComparable(n); if (enGroupe.has(c)) return refus(`« ${n} » est dans deux groupes : une photo n'est que dans un.`); enGroupe.add(c); }
    groupes.push({ type: attendu, photos: ph, idee: g.idee.trim() });
  }

  let couleurs: ComboCouleurs[] | undefined;
  if (x.couleurs !== undefined) {
    if (!Array.isArray(x.couleurs) || x.couleurs.length > 12) return refus("« couleurs » est une liste de 12 combos au plus.");
    couleurs = [];
    for (const [i, c] of x.couleurs.entries()) {
      const ou = `Le combo de couleurs ${i + 1}`;
      if (!estObjet(c) || clesEn(c, ["nom", "couleurs", "raison", "dansLesPhotos"])) return refus(`${ou} = { nom, couleurs, raison, dansLesPhotos? }.`);
      if (!texte(c.nom, 60) || !texte(c.raison, 160)) return refus(`${ou} : un nom (60 signes) et une raison (160 signes).`);
      const cc = c.couleurs;
      if (!estObjet(cc) || Object.keys(cc).length !== ROLES_COULEUR.length || !ROLES_COULEUR.every((r) => typeof cc[r] === "string" && HEX.test(cc[r] as string))) {
        return refus(`${ou} : six couleurs #rrggbb en minuscules (${ROLES_COULEUR.join(", ")}).`);
      }
      if (!(c.dansLesPhotos === undefined || typeof c.dansLesPhotos === "boolean")) return refus(`${ou} : « dansLesPhotos » est vrai ou faux.`);
      couleurs.push({ nom: c.nom.trim(), couleurs: Object.fromEntries(ROLES_COULEUR.map((r) => [r, cc[r] as string])) as CouleursMagazine, raison: c.raison.trim(), ...(typeof c.dansLesPhotos === "boolean" ? { dansLesPhotos: c.dansLesPhotos } : {}) });
    }
  }

  return { ok: true, lecture: { format: FORMAT_LECTURE_IA, version: VERSION_LECTURE_IA, ...(projet ? { projet } : {}), photos, rafales, groupes, ...(couleurs ? { couleurs } : {}) } };
}

/** Le fichier est-il une lecture IA (et pas un premier jet) ? Juste le marqueur : le bouton « Premier jet » aiguille ainsi. */
export const estLectureIA = (x: unknown): boolean => estObjet(x) && x.format === FORMAT_LECTURE_IA;

/* ─────────────────────────── le lien avec les photos importées ─────────────────────────── */

export type RafaleReliee = { photos: string[]; garder: string[]; usage: UsageRafale; pourquoi: string };
export type GroupeRelie = { cle: string; type: TypeGroupe; photos: string[]; idee: string };

/** La lecture reliée aux photos du catalogue : tout est en identifiants de l'éditeur. */
export type LectureIAReliee = {
  source: LectureIA;
  photos: ReadonlyMap<string, PhotoIA>;
  rafales: RafaleReliee[];
  groupes: GroupeRelie[];
  /** Les noms du fichier qu'aucune photo importée ne porte (listés, jamais bloquants). */
  manquantes: string[];
  /** Combien de noms du fichier ont trouvé leur photo, sur combien. */
  reliees: number;
  total: number;
};

/** Relie la lecture aux photos par leur NOM DE FICHIER (casse, dossier, espaces ignorés) ; la première du catalogue gagne. */
export function relierLectureIA(l: LectureIA, catalogue: ReadonlyMap<string, { nom: string }>): LectureIAReliee {
  const parNom = new Map<string, string>();
  for (const [id, p] of catalogue) { const k = nomComparable(p.nom); if (!parNom.has(k)) parNom.set(k, id); }
  const tous = new Map<string, string>();
  const noter = (n: string) => { const k = nomComparable(n); if (!tous.has(k)) tous.set(k, n); };
  Object.keys(l.photos).forEach(noter);
  for (const r of l.rafales) r.photos.forEach(noter);
  for (const g of l.groupes) g.photos.forEach(noter);
  const id = (n: string): string | undefined => parNom.get(nomComparable(n));
  const photos = new Map<string, PhotoIA>();
  for (const [n, p] of Object.entries(l.photos)) { const i = id(n); if (i && !photos.has(i)) photos.set(i, p); }
  const rafales: RafaleReliee[] = [];
  for (const r of l.rafales) {
    const ph = [...new Set(r.photos.map(id).filter((x): x is string => !!x))];
    if (ph.length < 2) continue;
    const ga = [...new Set(r.garder.map(id).filter((x): x is string => !!x))];
    rafales.push({ photos: ph, garder: ga, usage: r.usage, pourquoi: r.pourquoi });
  }
  const groupes: GroupeRelie[] = [];
  l.groupes.forEach((g, i) => {
    const ph = [...new Set(g.photos.map(id).filter((x): x is string => !!x))];
    if (ph.length < 2) return;
    groupes.push({ cle: `g${String(i).padStart(4, "0")}`, type: ph.length === 2 ? "duo" : ph.length === 3 ? "trio" : "combo", photos: ph, idee: g.idee });
  });
  const manquantes = [...tous.entries()].filter(([k]) => !parNom.has(k)).map(([, n]) => n);
  return { source: l, photos, rafales, groupes, manquantes, reliees: tous.size - manquantes.length, total: tous.size };
}

/* ─────────────────────────── ce que l'écran en tire ─────────────────────────── */

/** R147 : le lieu nommé qu'on propose EN PREMIER dans les textes : seulement s'il est SÛR (preuve) et assez confiant. Sinon null. */
export function lieuSur(p: PhotoIA | undefined): string | null {
  const l = p?.lieu;
  return l && l.statut === "sur" && l.confiance >= REGLAGES.lieu_ia_confiance.valeur ? l.nom : null;
}

/** Les mises en avant (R143) : couverture (rôle ou candidate), pleine page, double. Rien d'autre n'a de repère sur la vignette.
 *  Une photo peut en avoir deux (une double candidate à la couverture « paysage ») : la couverture d'abord. */
export type MiseEnAvant = "couverture" | "pleine" | "double";
export function misesEnAvant(p: PhotoIA | undefined): MiseEnAvant[] {
  const r = p?.role;
  if (!r) return [];
  const l: MiseEnAvant[] = [];
  if (r.role === "couverture" || r.couverture) l.push("couverture");
  if (r.role === "pleine" || r.role === "double") l.push(r.role);
  return l;
}

/** Les tags de la lecture IA, filtrables comme ceux de la lecture locale (R143 à R147). */
export type TagIA = "ia_couverture" | "ia_pleine" | "ia_double" | "ia_ecarter" | "ia_groupe" | "ia_garder"
  | "ia_billet" | "ia_carte" | "ia_message" | "ia_recu" | "ia_meme" | "ia_capture" | "ia_inutile" | "ia_lieu" | "ia_lieu_a_verifier";
export const TAGS_IA: readonly TagIA[] = ["ia_couverture", "ia_pleine", "ia_double", "ia_groupe", "ia_garder", "ia_ecarter",
  "ia_billet", "ia_carte", "ia_message", "ia_recu", "ia_meme", "ia_capture", "ia_inutile", "ia_lieu", "ia_lieu_a_verifier"];
export const MOT_TAG_IA: Readonly<Record<TagIA, { mot: string; regle: string }>> = {
  ia_couverture: { mot: "Couverture", regle: "R143" },
  ia_pleine: { mot: "Pleine page", regle: "R143" },
  ia_double: { mot: "Double page", regle: "R143" },
  ia_ecarter: { mot: "À écarter", regle: "R143" },
  ia_groupe: { mot: "En groupe", regle: "R144" },
  ia_garder: { mot: "Rafale : à garder", regle: "R145" },
  ia_billet: { mot: "Billet", regle: "R146" },
  ia_carte: { mot: "Carte", regle: "R146" },
  ia_message: { mot: "Message", regle: "R146" },
  ia_recu: { mot: "Reçu", regle: "R146" },
  ia_meme: { mot: "Mème", regle: "R146" },
  ia_capture: { mot: "Capture", regle: "R146" },
  ia_inutile: { mot: "Capture inutile", regle: "R146" },
  ia_lieu: { mot: "Lieu nommé", regle: "R147" },
  ia_lieu_a_verifier: { mot: "Lieu à vérifier", regle: "R147" },
};
export const estTagIA = (t: string): t is TagIA => (TAGS_IA as readonly string[]).includes(t);
/** Le mot d'une capture lue (« Billet », « Carte »…) : ce que la capture raconte, sur la vignette. */
export const MOT_CAPTURE: Readonly<Record<TypeCapture, string>> = { billet: "Billet", carte: "Carte", message: "Message", recu: "Reçu", meme: "Mème", autre: "Capture" };
export const MOT_ROLE: Readonly<Record<RoleIA, string>> = {
  couverture: "Couverture", pleine: "Pleine page", double: "Double page", heros: "Héros", satellite: "Satellite", detail: "Détail", vue_ensemble: "Vue d'ensemble", a_ecarter: "À écarter",
};
export const MOT_USAGE: Readonly<Record<UsageRafale, string>> = { meilleure_seule: "la meilleure seule", sequence: "une séquence", photomaton: "un photomaton", page_rafale: "une page rafale" };

let memoTags: { r: LectureIAReliee; t: ReadonlyMap<string, TagIA[]> } | null = null;
export function tagsIA(r: LectureIAReliee | null): ReadonlyMap<string, TagIA[]> {
  if (!r) return new Map();
  if (memoTags && memoTags.r === r) return memoTags.t;
  const t = new Map<string, TagIA[]>();
  const ajouter = (id: string, x: TagIA) => { const l = t.get(id); if (!l) t.set(id, [x]); else if (!l.includes(x)) l.push(x); };
  for (const [id, p] of r.photos) {
    for (const m of misesEnAvant(p)) ajouter(id, `ia_${m}`);
    if (p.role?.role === "a_ecarter") ajouter(id, "ia_ecarter");
    if (p.capture) { ajouter(id, p.capture.type === "autre" ? "ia_capture" : `ia_${p.capture.type}`); if (!p.capture.utile) ajouter(id, "ia_inutile"); }
    if (p.lieu) ajouter(id, lieuSur(p) ? "ia_lieu" : "ia_lieu_a_verifier");
  }
  for (const g of r.groupes) for (const id of g.photos) ajouter(id, "ia_groupe");
  for (const ra of r.rafales) for (const id of ra.garder) ajouter(id, "ia_garder");
  memoTags = { r, t };
  return t;
}

/** Le groupe d'une photo (R144), s'il y en a un. */
export function groupeDe(r: LectureIAReliee | null, id: string): GroupeRelie | null {
  return r?.groupes.find((g) => g.photos.includes(id)) ?? null;
}

/** La rafale d'une photo (R145), s'il y en a une. */
export function rafaleDe(r: LectureIAReliee | null, id: string): RafaleReliee | null {
  return r?.rafales.find((x) => x.photos.includes(id)) ?? null;
}

/**
 * R145 : les rafales de la lecture deviennent des PILES, qui priment sur celles mesurées dans le navigateur. La tête est la
 * première photo que la machine garde (sinon la première de la rafale) ; ouverte, la pile montre TOUTE la rafale. Une pile
 * mesurée qui partageait des photos avec une rafale de la lecture perd ces photos ; réduite à une seule, elle disparaît.
 * Sans lecture, les piles reviennent telles quelles (même tableau).
 */
export function pilesAvecIA(piles: readonly Pile[], r: LectureIAReliee | null): Pile[] {
  if (!r || !r.rafales.length) return piles as Pile[];
  const prises = new Set(r.rafales.flatMap((x) => x.photos));
  const out: Pile[] = [];
  for (const p of piles) {
    const reste = [p.tete, ...p.autres].filter((x) => !prises.has(x));
    if (reste.length < 2) continue;
    out.push(reste[0] === p.tete && reste.length === p.autres.length + 1 ? p : { ...p, tete: reste[0], autres: reste.slice(1) });
  }
  for (const x of r.rafales) {
    const tete = x.garder.find((id) => x.photos.includes(id)) ?? x.photos[0];
    out.push({ tete, autres: x.photos.filter((id) => id !== tete), raison: "rafale", source: "ia" });
  }
  return out;
}

/** R145 : ce que « Accepter » pose sur une rafale : les photos que la machine garde deviennent gardées, les autres écartées,
 *  SEULEMENT sur les photos encore sans marque (une marque de l'atelier n'est jamais touchée). */
export function propositionRafale(r: RafaleReliee, marque: (id: string) => string | null): { garder: string[]; ecarter: string[] } {
  const garde = new Set(r.garder);
  const libres = r.photos.filter((id) => marque(id) === null);
  return { garder: libres.filter((id) => garde.has(id)), ecarter: libres.filter((id) => !garde.has(id)) };
}
