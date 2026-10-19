/**
 * Ce que l'atelier demande au client d'envoyer (T-191, planche 12 du 19/10 au
 * soir, validée par Mathias) : une liste de DEMANDES, chacune avec son NOM
 * (écrit par l'atelier, lu tel quel par le client), sa FORME (un fichier : des
 * images, un PDF ou un SVG, ou tout fichier ; ou le questionnaire du « mot
 * de… ») et une CLÉ stable qui relie les envois du client.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX FORMES EN BASE, UNE SEULE LECTURE
 *
 * `collectif_editions.contenus_demandes` (jsonb) a porté jusqu'au 19/10 des
 * CLÉS TEXTE (« logo », « mot »…). Elles restent valables et se relisent comme
 * des demandes HÉRITÉES : le nom, les formats et les phrases d'aujourd'hui,
 * tels quels (`CONTENUS_CLIENT`). Une édition existante ne change donc pas
 * d'un pixel tant que l'atelier ne touche pas à ses demandes, et enregistrer
 * une autre étape la réécrit à l'identique (une héritée repart en texte).
 * Une demande écrite depuis T-191 est un objet `{ cle, nom, forme }`.
 *
 * LA CLÉ. Héritée, c'est le type d'aujourd'hui (« logo ») ; nouvelle, elle est
 * TIRÉE AU SORT (`nouvelleCle`, « d-… ») et ne sert qu'une fois : retirer une
 * demande puis la rajouter en fait une autre, les anciens envois ne s'y
 * raccrochent pas. Renommer une héritée GARDE sa clé : ses envois restent les
 * siens, et elle marche AVANT la migration 20261021 (la base n'accepte que les
 * cinq clés d'origine tant qu'elle n'est pas passée : `CLES_HERITEES`).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { CONTENUS_CLIENT, contenuClient, lireFichierContenu, OCTETS_MAX_CONTENU, QUESTIONS_MOT, TYPE_PAR_EXTENSION, type FichierLu } from "./contenus";
import type { Registre } from "./types";

/* ─────────────────────────────── la forme ─────────────────────────────── */

export type FormeDemande = "images" | "pdf" | "tout" | "questionnaire";
export const FORMES_DEMANDE: readonly FormeDemande[] = ["images", "pdf", "tout", "questionnaire"];

/** Les trois formes d'un fichier, dans l'ordre de la pastille (planche 12). */
export const FORMES_FICHIER: readonly { cle: Exclude<FormeDemande, "questionnaire">; libelle: string }[] = [
  { cle: "images", libelle: "Images" },
  { cle: "pdf", libelle: "PDF ou SVG" },
  { cle: "tout", libelle: "Tout" },
];

export function estFormeDemande(v: unknown): v is FormeDemande {
  return typeof v === "string" && (FORMES_DEMANDE as readonly string[]).includes(v);
}

/* ─────────────────────────────── la demande ─────────────────────────────── */

/** Ce qui s'écrit en base pour une demande nouvelle. */
export type DemandeEcrite = { cle: string; nom: string; forme: FormeDemande };
/** Une entrée de `contenus_demandes` : une clé d'avant T-191, ou une demande écrite. */
export type DemandeEnBase = string | DemandeEcrite;
/** Une demande lue. `heritee` : une clé texte d'avant T-191, montrée exactement comme avant. */
export type Demande = DemandeEcrite & { heritee: boolean };

/** Au-delà, l'espace du client devient une liste de courses. */
export const DEMANDES_MAX = 12;
export const NOM_DEMANDE_MAX = 80;

/** Les cinq clés d'origine : les seules que la base accepte tant que la migration 20261021 manque. */
export const CLES_HERITEES: readonly string[] = CONTENUS_CLIENT.map((c) => c.cle);

export function estCleHeritee(v: unknown): boolean {
  return typeof v === "string" && CLES_HERITEES.includes(v);
}

/** Une clé de demande : des minuscules, des chiffres, des tirets (« logo », « d-k3j9x2a1b4 »). */
const MOTIF_CLE = /^[a-z][a-z0-9-]{1,39}$/;
export function estCleDemande(v: unknown): v is string {
  return typeof v === "string" && MOTIF_CLE.test(v);
}

/** Un nom sur une ligne : les blancs (retours compris) deviennent une espace, rien autour. */
export function nettoyerNom(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** « Le mot de » sans personne : le modèle « Le mot de… » laissé tel quel. */
export function nomInacheve(nom: string): boolean {
  return /^le mot (de|du|des|d['’])\s*(…|\.\.\.)?$/i.test(nettoyerNom(nom));
}

/** La forme qu'une héritée prend quand l'atelier la retouche : celle qui ne refuse rien de ce qu'elle acceptait. */
function formeHeritee(cle: string): FormeDemande {
  return contenuClient(cle)?.mode === "questionnaire" ? "questionnaire" : "tout";
}

function heritee(cle: string): Demande | null {
  const c = contenuClient(cle);
  return c ? { cle: c.cle, nom: c.libelle, forme: formeHeritee(c.cle), heritee: true } : null;
}

/**
 * Une liste qui n'a QUE des clés texte (toute édition d'avant T-191) se lit
 * dans l'ordre d'aujourd'hui, celui de `CONTENUS_CLIENT` : c'est l'ordre que
 * l'espace du client montrait, quel que soit celui du jsonb.
 */
function ordonner(liste: readonly unknown[]): readonly unknown[] {
  if (!liste.every((x) => typeof x === "string")) return liste;
  return [...liste].sort((a, b) => rang(a as string) - rang(b as string));
}
function rang(cle: string): number {
  const i = CLES_HERITEES.indexOf(cle);
  return i === -1 ? CLES_HERITEES.length : i;
}

/**
 * La lecture qui SERT (l'espace du client, la route, la fiche) : les deux
 * formes, tolérante. Une entrée illisible (nom vide, forme inconnue, clé
 * inconnue) est ignorée, une clé en double aussi : le client ne voit jamais
 * une demande à moitié écrite.
 */
export function lireDemandes(brut: unknown): Demande[] {
  const liste = ordonner(Array.isArray(brut) ? brut : []);
  const vues = new Set<string>();
  const sortie: Demande[] = [];
  for (const x of liste) {
    const d = typeof x === "string" ? heritee(x) : lireObjet(x, true);
    if (!d || vues.has(d.cle)) continue;
    vues.add(d.cle);
    sortie.push(d);
  }
  return sortie;
}

/**
 * La lecture du FORMULAIRE de l'atelier : comme `lireDemandes`, mais une
 * demande sans nom reste là (« Autre » vient d'être ajoutée, on la nomme) et
 * le nom n'est pas nettoyé pendant qu'on le tape.
 */
export function demandesDuFormulaire(brut: unknown): Demande[] {
  const liste = ordonner(Array.isArray(brut) ? brut : []);
  const vues = new Set<string>();
  const sortie: Demande[] = [];
  for (const x of liste) {
    const d = typeof x === "string" ? heritee(x) : lireObjet(x, false);
    if (!d || vues.has(d.cle)) continue;
    vues.add(d.cle);
    sortie.push(d);
  }
  return sortie;
}

function lireObjet(x: unknown, strict: boolean): Demande | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (!estCleDemande(o.cle) || !estFormeDemande(o.forme)) return null;
  if (!strict) return { cle: o.cle, nom: typeof o.nom === "string" ? o.nom : "", forme: o.forme, heritee: false };
  const nom = nettoyerNom(o.nom);
  if (!nom || nom.length > NOM_DEMANDE_MAX) return null;
  return { cle: o.cle, nom, forme: o.forme, heritee: false };
}

/** Ce qui repart en base : une héritée intacte reste une clé texte (rien ne bouge chez le client). */
export function versBase(d: Demande): DemandeEnBase {
  return d.heritee ? d.cle : { cle: d.cle, nom: d.nom, forme: d.forme };
}

/* ─────────────────────────── la saisie de l'atelier ─────────────────────────── */

export type DemandesSaisies = { demandes: DemandeEnBase[]; erreurs: string[] };

/**
 * La règle de `lireSaisieEdition` (création ET réglages) : un nom non vide de
 * 80 caractères au plus, une forme connue, 12 demandes au plus, des clés et
 * des noms tous différents (deux cases « Logo » chez le client, il ne saurait
 * pas laquelle remplir). Une clé texte inconnue est ignorée, comme avant.
 */
export function lireDemandesSaisies(brut: unknown): DemandesSaisies {
  const liste = ordonner(Array.isArray(brut) ? brut : []);
  const erreurs: string[] = [];
  const demandes: DemandeEnBase[] = [];
  const cles = new Set<string>();
  const noms = new Set<string>();
  let illisible = false;
  let sansNom = false;
  for (const x of liste) {
    let d: Demande | null;
    if (typeof x === "string") {
      d = heritee(x);
      if (!d) continue;
    } else {
      if (!x || typeof x !== "object" || Array.isArray(x)) {
        illisible = true;
        continue;
      }
      const o = x as Record<string, unknown>;
      if (!estCleDemande(o.cle) || !estFormeDemande(o.forme)) {
        illisible = true;
        continue;
      }
      const nom = nettoyerNom(o.nom);
      if (!nom) {
        sansNom = true;
        continue;
      }
      if (nom.length > NOM_DEMANDE_MAX) {
        erreurs.push(`« ${nom.slice(0, 30)}… » : ${NOM_DEMANDE_MAX} caractères au plus.`);
        continue;
      }
      if (nomInacheve(nom)) {
        erreurs.push(`« ${nom} » : à compléter (« Le mot du proviseur », « Le mot de la présidente »…).`);
        continue;
      }
      d = { cle: o.cle, nom, forme: o.forme, heritee: false };
    }
    if (cles.has(d.cle)) {
      erreurs.push("Deux demandes portent la même clé : recharger la page.");
      continue;
    }
    const n = d.nom.toLocaleLowerCase("fr");
    if (noms.has(n)) {
      erreurs.push(`Deux demandes s'appellent « ${d.nom} » : le client ne saurait pas laquelle remplir.`);
      continue;
    }
    cles.add(d.cle);
    noms.add(n);
    demandes.push(versBase(d));
  }
  if (sansNom) erreurs.unshift("Chaque demande a un nom : c'est ce que le client lit dans son espace.");
  if (illisible) erreurs.push("Une demande est illisible : recharger la page.");
  if (demandes.length > DEMANDES_MAX) erreurs.push(`Au plus ${DEMANDES_MAX} demandes.`);
  return { demandes, erreurs };
}

/* ─────────────────────────── ce que l'atelier règle ─────────────────────────── */

/** Les modèles en un clic de « + Ajouter une demande » (planche 12). */
export const MODELES_DEMANDE: readonly { cle: string; libelle: string; nom: string; forme: FormeDemande }[] = [
  { cle: "logo", libelle: "Logo", nom: "Logo, en vectoriel", forme: "pdf" },
  { cle: "programme", libelle: "Programme", nom: "Programme", forme: "tout" },
  { cle: "mot", libelle: "Le mot de…", nom: "Le mot de ", forme: "questionnaire" },
  { cle: "liste", libelle: "Liste des participants", nom: "Liste des participants", forme: "tout" },
  { cle: "autre", libelle: "Autre", nom: "", forme: "tout" },
];

/**
 * Les demandes d'une édition NEUVE (les quatre cases cochées d'avant, sous les
 * noms et les formes de la planche 12). Elles gardent les clés d'origine :
 * une édition neuve n'a encore reçu aucun envoi (aucune clé n'est réutilisée),
 * et ces quatre-là marchent AVANT la migration 20261021.
 */
export const DEMANDES_PAR_DEFAUT: readonly DemandeEcrite[] = [
  { cle: "logo", nom: "Logo, en vectoriel", forme: "pdf" },
  { cle: "programme", nom: "Programme", forme: "tout" },
  { cle: "mot", nom: "Le mot du dirigeant", forme: "questionnaire" },
  { cle: "liste", nom: "Liste des participants", forme: "tout" },
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Une clé neuve, tirée au sort (`hasard` rend un nombre dans [0, 1[), jamais
 * une clé d'origine ni une clé déjà dans la liste. 36^10 tirages possibles :
 * une clé retirée ne revient pas.
 */
export function nouvelleCle(existantes: readonly string[], hasard: () => number): string {
  for (let essai = 0; essai < 50; essai++) {
    let s = "d-";
    for (let i = 0; i < 10; i++) s += ALPHABET[Math.min(ALPHABET.length - 1, Math.floor(hasard() * ALPHABET.length))];
    if (!existantes.includes(s) && !CLES_HERITEES.includes(s)) return s;
  }
  throw new Error("[collectif] aucune clé de demande libre : le hasard ne tire plus");
}

/** Renommer : une héritée renommée devient une demande écrite, SA CLÉ RESTE (ses envois aussi). */
export function renommer(d: Demande, nom: string): Demande {
  if (d.heritee && nom === d.nom) return d;
  return { ...d, nom, heritee: false };
}

/** Changer la forme. Une héritée qui reçoit la forme qu'elle a déjà (le questionnaire) ne bouge pas. */
export function changerForme(d: Demande, forme: FormeDemande): Demande {
  if (d.forme === forme && (!d.heritee || forme === "questionnaire")) return d;
  return { ...d, forme, heritee: false };
}

/**
 * La pastille allumée. Une héritée de fichier n'en allume AUCUNE : ses formats
 * d'avant (« SVG, PDF, AI, EPS, PNG ») ne sont aucune des trois, et l'écran
 * ne doit pas promettre ce que le client ne verra pas.
 */
export function formeAffichee(d: Demande): FormeDemande | null {
  return d.heritee && d.forme !== "questionnaire" ? null : d.forme;
}

export const ICONE_FORME: Record<FormeDemande, string> = { images: "▣", pdf: "◆", tout: "▤", questionnaire: "✎" };

/** L'icône d'une ligne (le logo d'origine garde le losange de la maquette). */
export function iconeDe(d: Demande): string {
  return d.heritee && d.cle === "logo" ? ICONE_FORME.pdf : ICONE_FORME[d.forme];
}

function listeFr(mots: readonly string[]): string {
  return mots.length > 1 ? `${mots.slice(0, -1).join(", ")} ou ${mots[mots.length - 1]}` : (mots[0] ?? "");
}

/** Ce que voit le client, en une ligne, sous le nom (planche 12). */
export function aideAtelier(d: Demande): string {
  if (d.forme === "questionnaire") return "Quatre questions, il répond dans son espace";
  const c = d.heritee ? contenuClient(d.cle) : null;
  if (c) return `Formats d'avant : ${listeFr(c.extensions.map((e) => e.toUpperCase()))}`;
  if (d.forme === "images") return "Seulement une image";
  if (d.forme === "pdf") return "Seulement un PDF ou un SVG";
  return "N'importe quel fichier (tableur, PDF, texte)";
}

/* ─────────────────────────── ce que le client voit ─────────────────────────── */

/**
 * Les questions du « mot de… » au tutoiement : la transposition mot pour mot
 * de `QUESTIONS_MOT`, à relire par Mathias avec elles (PRD §12.14). Les
 * RÉPONSES se rangent toujours sous `QUESTIONS_MOT` (la question au
 * vouvoiement est la clé) : l'atelier lit les mêmes quatre questions, quel
 * que soit le ton de l'édition.
 */
export const QUESTIONS_MOT_TU = [
  "Que retiens-tu de cet événement ?",
  "Une personne ou un moment à remercier ?",
  "Ce que cette édition dit de ton équipe ?",
  "Un mot pour la suite ?",
] as const;

/** Ce qu'une image peut être, pour la forme « Images ». */
export const EXTENSIONS_IMAGES = ["jpg", "png", "webp", "heic", "heif", "gif", "tif", "tiff", "svg"] as const;
const EXTENSIONS_PDF = ["pdf", "svg"] as const;
const TYPES_PDF = ["application/pdf", "application/x-pdf", "application/acrobat", "text/pdf"];
const TYPES_SVG = ["image/svg+xml", "image/svg", "text/xml", "application/xml"];

export type VueDemande = {
  cle: string;
  /** La puce de « À envoyer » : le nom choisi par l'atelier. */
  libelle: string;
  /** Le titre de la fenêtre. */
  titre: string;
  mode: "fichier" | "questionnaire";
  forme: FormeDemande;
  heritee: boolean;
  /** Les extensions acceptées ; `null` : tout fichier. */
  extensions: readonly string[] | null;
  /** Le sous-titre de la fenêtre. */
  aide: string;
  /** La ligne sous la zone de dépôt. */
  formats: string;
  /** Pourquoi un fichier est refusé par sa forme. */
  refus: string;
  /** Au-delà de 4 Mo. */
  lourd: string;
  /** Les questions telles que le client les lit (le questionnaire seulement). */
  questions: readonly string[];
};

/** La demande telle que le client la lit, au vouvoiement ou au tutoiement de l'édition. */
export function vueDemande(d: Demande, registre: Registre): VueDemande {
  const v = (vous: string, toi: string) => (registre === "ecole_tu" ? toi : vous);
  const c = d.heritee ? contenuClient(d.cle) : null;
  if (c) {
    /* Exactement l'écran d'avant T-191, mots compris (au vouvoiement, comme avant). */
    const formats = c.extensions.map((e) => e.toUpperCase()).join(", ");
    return {
      cle: c.cle,
      libelle: c.libelle,
      titre: c.titre,
      mode: c.mode,
      forme: d.forme,
      heritee: true,
      extensions: c.extensions,
      aide: c.aide,
      formats,
      refus: `Format accepté : ${formats}.`,
      lourd: "4 Mo au plus. Pour un fichier plus lourd, écrivez à l'atelier.",
      questions: QUESTIONS_MOT,
    };
  }
  const base = {
    cle: d.cle,
    libelle: d.nom,
    titre: d.nom,
    forme: d.forme,
    heritee: false,
    lourd: v("4 Mo au plus. Pour un fichier plus lourd, écrivez à l'atelier.", "4 Mo au plus. Pour un fichier plus lourd, écris à l'atelier."),
    questions: [] as readonly string[],
  };
  if (d.forme === "questionnaire") {
    return {
      ...base,
      mode: "questionnaire",
      extensions: [],
      aide: v(
        "Quelques questions courtes. L'atelier écrit le texte à partir de vos réponses, et vous le relisez au bon à tirer.",
        "Quelques questions courtes. L'atelier écrit le texte à partir de tes réponses, et tu le relis au bon à tirer."
      ),
      formats: "",
      refus: "Ce contenu se remplit en répondant aux questions.",
      questions: registre === "ecole_tu" ? QUESTIONS_MOT_TU : QUESTIONS_MOT,
    };
  }
  if (d.forme === "images") {
    return {
      ...base,
      mode: "fichier",
      extensions: EXTENSIONS_IMAGES,
      aide: v("Seulement une image. Vous pouvez en envoyer plusieurs.", "Seulement une image. Tu peux en envoyer plusieurs."),
      formats: "JPG, PNG, WEBP, HEIC, GIF, TIFF, SVG",
      refus: "Seulement une image (JPG, PNG, WEBP, HEIC, GIF, TIFF ou SVG).",
    };
  }
  if (d.forme === "pdf") {
    return {
      ...base,
      mode: "fichier",
      extensions: EXTENSIONS_PDF,
      aide: v("Seulement un PDF ou un SVG. Envoyez le fichier d'origine si vous l'avez.", "Seulement un PDF ou un SVG. Envoie le fichier d'origine si tu l'as."),
      formats: "PDF, SVG",
      refus: "Seulement un PDF ou un SVG.",
    };
  }
  return {
    ...base,
    mode: "fichier",
    extensions: null,
    aide: v("N'importe quel fichier : tableur, PDF, texte, image. Vous pouvez en envoyer plusieurs.", "N'importe quel fichier : tableur, PDF, texte, image. Tu peux en envoyer plusieurs."),
    formats: "Tout fichier",
    refus: "",
  };
}

/** Les demandes d'une édition, telles que son client les lit. */
export function vuesDemandes(brut: unknown, registre: Registre): VueDemande[] {
  return lireDemandes(brut).map((d) => vueDemande(d, registre));
}

/** L'extension d'un nom de fichier, en minuscules (« jpeg » devient « jpg ») ; « » sans extension. */
export function extensionDe(nom: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(nom.trim());
  return m ? m[1].toLowerCase().replace(/^jpeg$/, "jpg") : "";
}

/**
 * Le type annoncé par le navigateur CONTREDIT-il l'extension ? Vide ou
 * générique (`application/octet-stream`, fréquent pour un HEIC sous Chrome) :
 * l'extension décide seule. Une « photo.png » annoncée en PDF est refusée.
 */
export function typeCompatible(forme: FormeDemande, extension: string, mime: string): boolean {
  const m = (mime ?? "").split(";")[0].trim().toLowerCase();
  if (!m || m === "application/octet-stream") return true;
  if (forme === "images") return m.startsWith("image/");
  if (forme === "pdf") return extension === "pdf" ? TYPES_PDF.includes(m) : TYPES_SVG.includes(m);
  return true;
}

/**
 * Un fichier pour cette demande, lu par le SERVEUR (la route) comme par le
 * navigateur (avant d'envoyer, pour dire tout de suite pourquoi) : l'extension
 * ET le type annoncé, pas vide, 4 Mo au plus. Une héritée garde sa règle
 * d'avant (`lireFichierContenu`), message compris.
 */
export function lireFichierDemande(vue: VueDemande, nom: string, taille: number, mime = ""): FichierLu {
  if (vue.mode !== "fichier") return { ok: false, message: "Ce contenu se remplit en répondant aux questions." };
  if (vue.heritee) {
    const c = contenuClient(vue.cle);
    if (c) return lireFichierContenu(c, nom, taille);
  }
  const ext = extensionDe(nom);
  if (vue.extensions && (!vue.extensions.includes(ext) || !typeCompatible(vue.forme, ext, mime))) return { ok: false, message: vue.refus };
  if (!Number.isFinite(taille) || taille <= 0) return { ok: false, message: "Ce fichier est vide." };
  if (taille > OCTETS_MAX_CONTENU) return { ok: false, message: vue.lourd };
  /* L'extension vient du client : lue par `Object.hasOwn`, jamais `TABLE[saisie]` (api/CLAUDE.md, T-161). */
  const type = ext && Object.hasOwn(TYPE_PAR_EXTENSION, ext) ? TYPE_PAR_EXTENSION[ext] : "application/octet-stream";
  return { ok: true, extension: ext || "bin", type };
}

/** L'attribut `accept` du sélecteur de fichier ; `undefined` : tout fichier. */
export function accepteDe(vue: VueDemande): string | undefined {
  if (!vue.extensions) return undefined;
  const ext = vue.extensions.flatMap((e) => (e === "jpg" ? [".jpg", ".jpeg"] : [`.${e}`]));
  if (vue.heritee) return vue.extensions.map((e) => `.${e}`).join(",");
  if (vue.forme === "images") return [...ext, "image/*"].join(",");
  if (vue.forme === "pdf") return [...ext, "application/pdf", "image/svg+xml"].join(",");
  return ext.join(",");
}

/* ─────────────────────────── les envois reçus ─────────────────────────── */

/**
 * Le nom sous lequel un envoi se montre : celui de sa demande, ou, pour une
 * clé d'origine que la fiche ne demande plus, son nom d'avant. `null` : sa
 * demande a été retirée (une clé tirée au sort ne se devine pas).
 */
export function nomDeLEnvoi(type: string, demandes: readonly Demande[]): string | null {
  return demandes.find((d) => d.cle === type)?.nom ?? contenuClient(type)?.libelle ?? null;
}

/** Un envoi est-il un fichier ou des réponses ? Même règle que `nomDeLEnvoi`. */
export function modeDeLEnvoi(type: string, demandes: readonly Demande[]): "fichier" | "questionnaire" | null {
  const d = demandes.find((x) => x.cle === type);
  if (d) return d.heritee ? (contenuClient(d.cle)?.mode ?? null) : d.forme === "questionnaire" ? "questionnaire" : "fichier";
  return contenuClient(type)?.mode ?? null;
}
