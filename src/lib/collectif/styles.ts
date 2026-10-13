/**
 * Les styles du mur : leur forme, leur saisie, et ce qui manque pour publier
 * (PRD §1 « Style », §8 éditeur des styles).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Un style = un univers créé par les fondateurs : des palettes, deux
 * typographies, des couvertures, et CINQ doubles pages types. Mathias les
 * ajoute au fil de l'eau ; un style dépublié disparaît du mur sans rien
 * effacer.
 *
 * ⚠️ LES TYPOGRAPHIES SONT DES NOMS ET UNE IMAGE, JAMAIS UNE POLICE SERVIE.
 * Servir un fichier de police, c'est le redistribuer, et la plupart des
 * fichiers de `assets/typo` l'interdisent (D2, mémoire « Typos : licences »).
 * Le client voit donc l'échantillon en IMAGE, rendu par l'atelier.
 *
 * Les plafonds de longueur et de nombre ci-dessous sont des GARDES TECHNIQUES
 * (une saisie qui déborde, un tableau gonflé), pas des promesses faites au
 * client.
 */

import { estSlugStyle, RACINE_COLLECTIF } from "./cles";
import { SEGMENTS, type Segment } from "./types";

export const TYPES_DOUBLES = [
  { cle: "aeree", libelle: "Aérée" },
  { cle: "equilibree", libelle: "Équilibrée" },
  { cle: "dense", libelle: "Dense" },
  { cle: "recit", libelle: "Récit" },
  { cle: "audacieuse", libelle: "Audacieuse" },
] as const;
export type TypeDouble = (typeof TYPES_DOUBLES)[number]["cle"];

export type Palette = { cle: string; nom: string; couleurs: string[] };
export type Typos = { titres: string; texte: string; echantillon_key: string | null };
export type CouvertureStyle = { cle: string; image_key: string; legende: string };
export type DoubleStyle = { type: TypeDouble; image_key: string | null; legende: string };

/** Le nombre de couleurs d'une palette (PRD §8 : « nom + 4 couleurs »). */
export const COULEURS_PAR_PALETTE = 4;

const MAX_PALETTES = 12;
const MAX_COUVERTURES = 24;
const HEX = /^#[0-9a-f]{6}$/;
const CLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Erreur = { champ: string; message: string };

/** « Riviéra d'été » → « riviera-d-ete ». Vide si rien de lisible. */
export function slugDepuisNom(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Une image de CE style : sous `collectif/styles/<slug>/`, rien d'autre. */
export function estCleImageStyle(slug: string, key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.startsWith(`${RACINE_COLLECTIF}/styles/${slug}/`) &&
    !key.includes("..") &&
    key.length <= 200
  );
}

/** Où une image se range dans un style. */
export type EmplacementImage = "couverture" | "double" | "echantillon";
export const EMPLACEMENTS_IMAGE: readonly EmplacementImage[] = ["couverture", "double", "echantillon"];

/**
 * Le nom d'un fichier image, VERSIONNÉ par un suffixe aléatoire : remplacer
 * une image crée un nouveau nom, jamais un écrasement qu'un cache servirait
 * encore un jour durant (mémoire « Cache 404 sur /images »).
 */
export function nomImageStyle(
  emplacement: EmplacementImage,
  cle: string,
  alea: string,
  extension: "webp" | "jpg"
): string {
  const c = CLE.test(cle) ? cle : "x";
  const a = /^[a-z0-9]{4,16}$/.test(alea) ? alea : "0000";
  return `${emplacement}-${c}-${a}.${extension}`;
}

function texte(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function lirePalettes(v: unknown, erreurs: Erreur[]): Palette[] {
  if (!Array.isArray(v)) return [];
  const sortie: Palette[] = [];
  const vues = new Set<string>();
  for (const brut of v.slice(0, MAX_PALETTES)) {
    const p = (brut ?? {}) as Record<string, unknown>;
    const nom = texte(p.nom, 40);
    const cle = CLE.test(texte(p.cle, 24)) ? texte(p.cle, 24) : slugDepuisNom(nom).slice(0, 24);
    const couleurs = Array.isArray(p.couleurs)
      ? p.couleurs.map((c) => texte(c, 7).toLowerCase())
      : [];
    if (!nom) {
      erreurs.push({ champ: "palettes", message: "Chaque palette a un nom." });
      continue;
    }
    if (!cle || vues.has(cle)) {
      erreurs.push({ champ: "palettes", message: `Deux palettes portent le même nom (« ${nom} »).` });
      continue;
    }
    if (couleurs.length !== COULEURS_PAR_PALETTE || !couleurs.every((c) => HEX.test(c))) {
      erreurs.push({
        champ: "palettes",
        message: `La palette « ${nom} » doit avoir ${COULEURS_PAR_PALETTE} couleurs au format #rrggbb.`,
      });
      continue;
    }
    vues.add(cle);
    sortie.push({ cle, nom, couleurs });
  }
  return sortie;
}

function lireTypos(v: unknown, slug: string, erreurs: Erreur[]): Typos {
  const t = (v ?? {}) as Record<string, unknown>;
  const echantillon = t.echantillon_key;
  if (echantillon !== null && echantillon !== undefined && echantillon !== "" && !estCleImageStyle(slug, echantillon)) {
    erreurs.push({ champ: "typos", message: "L'échantillon de typographie n'est pas une image de ce style." });
  }
  return {
    titres: texte(t.titres, 60),
    texte: texte(t.texte, 60),
    echantillon_key: estCleImageStyle(slug, echantillon) ? echantillon : null,
  };
}

function lireCouvertures(v: unknown, slug: string, erreurs: Erreur[]): CouvertureStyle[] {
  if (!Array.isArray(v)) return [];
  const sortie: CouvertureStyle[] = [];
  const vues = new Set<string>();
  for (const brut of v.slice(0, MAX_COUVERTURES)) {
    const c = (brut ?? {}) as Record<string, unknown>;
    const cle = texte(c.cle, 24);
    if (!CLE.test(cle) || vues.has(cle)) {
      erreurs.push({ champ: "couvertures", message: "Une couverture a un identifiant invalide ou en double." });
      continue;
    }
    if (!estCleImageStyle(slug, c.image_key)) {
      erreurs.push({ champ: "couvertures", message: "Une couverture n'a pas d'image de ce style." });
      continue;
    }
    vues.add(cle);
    sortie.push({ cle, image_key: c.image_key, legende: texte(c.legende, 120) });
  }
  return sortie;
}

/** Toujours les CINQ types, dans l'ordre : une entrée manquante revient vide. */
function lireDoubles(v: unknown, slug: string, erreurs: Erreur[]): DoubleStyle[] {
  const brutes = Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  return TYPES_DOUBLES.map(({ cle }) => {
    const d = brutes.find((x) => x && x.type === cle) ?? {};
    const image = d.image_key;
    if (image !== null && image !== undefined && image !== "" && !estCleImageStyle(slug, image)) {
      erreurs.push({ champ: "doubles", message: "Une double page n'a pas d'image de ce style." });
    }
    return {
      type: cle,
      image_key: estCleImageStyle(slug, image) ? image : null,
      legende: texte(d.legende, 160),
    };
  });
}

export type SaisieStyle =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; erreurs: Erreur[] };

/**
 * Une saisie de l'éditeur → le patch de `collectif_styles`.
 *
 * Création : `nom` et `slug` exigés. Modification : seuls les champs présents
 * sont lus, et le slug NE CHANGE JAMAIS (les images sont rangées sous lui).
 * `publie` n'est pas lu ici : publier passe par `manquesPourPublier`.
 */
export function lireSaisieStyle(
  corps: unknown,
  mode: "creation" | "modification",
  slugActuel?: string
): SaisieStyle {
  const s = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;
  const erreurs: Erreur[] = [];
  const patch: Record<string, unknown> = {};

  let slug = slugActuel ?? "";
  if (mode === "creation") {
    const nom = texte(s.nom, 60);
    if (!nom) erreurs.push({ champ: "nom", message: "Donner un nom au style." });
    slug = texte(s.slug, 60) || slugDepuisNom(nom);
    if (!estSlugStyle(slug)) {
      erreurs.push({
        champ: "slug",
        message: "L'adresse du style : minuscules, chiffres et tirets seulement (ex. riviera).",
      });
    }
    patch.nom = nom;
    patch.slug = slug;
  } else if ("nom" in s) {
    const nom = texte(s.nom, 60);
    if (!nom) erreurs.push({ champ: "nom", message: "Le nom ne peut pas être vide." });
    patch.nom = nom;
  }

  if ("description" in s) patch.description = texte(s.description, 600) || null;
  if ("segment" in s || mode === "creation") {
    const seg = (s.segment ?? "tous") as Segment;
    if (!SEGMENTS.includes(seg)) erreurs.push({ champ: "segment", message: "Public inconnu." });
    else patch.segment = seg;
  }
  if ("ordre" in s) {
    const n = Number(s.ordre);
    if (!Number.isInteger(n) || n < 0 || n > 9999) {
      erreurs.push({ champ: "ordre", message: "L'ordre sur le mur est un nombre entier positif." });
    } else patch.ordre = n;
  }
  if ("palettes" in s) patch.palettes = lirePalettes(s.palettes, erreurs);
  if ("typos" in s) patch.typos = lireTypos(s.typos, slug, erreurs);
  if ("couvertures" in s) patch.couvertures = lireCouvertures(s.couvertures, slug, erreurs);
  if ("doubles" in s) patch.doubles = lireDoubles(s.doubles, slug, erreurs);

  return erreurs.length ? { ok: false, erreurs } : { ok: true, patch };
}

export type StylePourPublier = {
  nom: string;
  palettes: unknown;
  typos: unknown;
  couvertures: unknown;
  doubles: unknown;
};

/**
 * Ce qui manque pour qu'un style aille sur le mur. Vide = publiable.
 * Un style à moitié fait sur le mur d'un client, c'est une page qui ment.
 */
export function manquesPourPublier(s: StylePourPublier): string[] {
  const manques: string[] = [];
  if (!s.nom?.trim()) manques.push("un nom");
  const palettes = Array.isArray(s.palettes) ? (s.palettes as Palette[]) : [];
  if (!palettes.some((p) => p?.couleurs?.length === COULEURS_PAR_PALETTE)) manques.push("au moins une palette");
  const t = (s.typos ?? {}) as Partial<Typos>;
  if (!t.titres?.trim() || !t.texte?.trim()) manques.push("les deux typographies (titres et texte)");
  const couvertures = Array.isArray(s.couvertures) ? (s.couvertures as CouvertureStyle[]) : [];
  if (!couvertures.some((c) => c?.image_key)) manques.push("au moins une couverture");
  const doubles = Array.isArray(s.doubles) ? (s.doubles as DoubleStyle[]) : [];
  const sansImage = TYPES_DOUBLES.filter(
    ({ cle }) => !doubles.some((d) => d?.type === cle && d.image_key)
  ).map((d) => d.libelle.toLowerCase());
  if (sansImage.length) manques.push(`l'image des doubles pages : ${sansImage.join(", ")}`);
  return manques;
}
