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
/**
 * Une taille servie d'une image de style (T-172) : sa largeur en pixels et sa
 * clé au coffre. Les tailles réduites (`cleTailleImage`) ET la maîtresse, sous
 * sa propre clé, avec sa largeur : c'est la liste `srcset` du mur.
 */
export type TailleImage = { largeur: number; key: string };
export type Typos = { titres: string; texte: string; echantillon_key: string | null; echantillon_tailles?: TailleImage[] };
export type CouvertureStyle = { cle: string; image_key: string; legende: string; tailles?: TailleImage[] };
export type DoubleStyle = { type: TypeDouble; image_key: string | null; legende: string; tailles?: TailleImage[] };

/** Le nombre de couleurs d'une palette (PRD §8 : « nom + 4 couleurs »). */
export const COULEURS_PAR_PALETTE = 4;

const MAX_PALETTES = 12;
const MAX_COUVERTURES = 24;
const HEX = /^#[0-9a-f]{6}$/;
const CLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Erreur = { champ: string; message: string };

/** « Riviéra d'été » → « riviera-d-ete ». Vide si rien de lisible. */
/**
 * Les adresses déjà prises sous `/edition/<t>/style/` : `brief` est la page
 * « modifier le brief partie par partie » (révision §14.6). Un style qui
 * s'appellerait ainsi serait inatteignable (le segment fixe gagne).
 */
export const SLUGS_RESERVES = ["brief"] as const;

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

/* ─────────── T-172 : les tailles réduites d'une image de style ───────────

   Une pièce de style est gardée jusqu'à 2 400 px et 4 Mo (`reduireImage.ts`),
   et le mur la montre dans une carte de 300 px. À l'enregistrement de l'image,
   le serveur en écrit aussi une version de 600 px et une de 1 200 px de LARGE
   (`taillesStyle.ts`), rangées à côté de la maîtresse ; le style les garde
   dans `tailles`, et le mur les sert en `srcset`. Sans tailles (une image
   d'avant, ou une production ratée), l'écran montre la maîtresse, comme
   avant. Les images d'avant : `scripts/collectif-styles-vignettes.ts`. */

/** Les largeurs produites : la carte du mur (600 sur un écran dense), la fiche d'un style (1 200). */
export const LARGEURS_REDUITES = [600, 1200] as const;

/** Une largeur au-delà ne vient pas de `reduireImage` (2 400 au plus) : une garde, pas une règle. */
const LARGEUR_LUE_MAX = 10000;

/**
 * La clé d'une taille réduite, à côté de sa maîtresse :
 * `…/couverture-c1-a1b2c3.webp` → `…/couverture-c1-a1b2c3_w600.webp`.
 * Toujours en WebP. Le tiret bas sépare : `nomImageStyle` n'en écrit jamais,
 * donc aucun nom de maîtresse ne ressemble à celui d'une taille.
 */
export function cleTailleImage(imageKey: string, largeur: number): string {
  return `${imageKey.replace(/\.[a-z0-9]+$/i, "")}_w${largeur}.webp`;
}

/** Les largeurs à produire pour une maîtresse de cette largeur : seulement les plus ÉTROITES (on n'agrandit jamais). */
export function largeursAProduire(largeurMaitresse: number): number[] {
  if (!Number.isInteger(largeurMaitresse) || largeurMaitresse <= 0) return [];
  return LARGEURS_REDUITES.filter((l) => l < largeurMaitresse);
}

/**
 * Une taille réduite plus lourde que sa maîtresse (une maîtresse déjà très
 * compressée) ne ferait que coûter plus : elle n'est pas gardée.
 */
export function tailleUtile(octetsTaille: number, octetsMaitresse: number): boolean {
  return octetsTaille > 0 && octetsTaille < octetsMaitresse;
}

/**
 * La liste que le style garde pour une image : les tailles réduites écrites,
 * puis la maîtresse avec sa largeur, de la plus étroite à la plus large. Vide
 * sans taille réduite (l'écran garde alors la maîtresse seule). C'est ce que
 * la route rend et ce que `lireTailles` relit : le harnais prouve l'aller-retour.
 */
export function listeDesTailles(imageKey: string, largeurMaitresse: number, reduites: readonly TailleImage[]): TailleImage[] {
  if (!reduites.length) return [];
  return [...reduites.map(({ largeur, key }) => ({ largeur, key })), { largeur: largeurMaitresse, key: imageKey }].sort((a, b) => a.largeur - b.largeur);
}

/**
 * Les tailles d'une image relues (saisie de l'éditeur, ligne de la base).
 * Ne restent que celles qui DÉRIVENT de cette maîtresse (`cleTailleImage`),
 * et la maîtresse elle-même avec sa largeur. Les tailles d'une autre image
 * (une maîtresse remplacée dont l'écran aurait gardé la liste) sont écartées :
 * jamais une vignette qui montrerait une autre image que celle du style.
 * Sans aucune taille réduite : `[]`, et l'écran garde la maîtresse seule.
 */
export function lireTailles(slug: string, imageKey: unknown, brut: unknown): TailleImage[] {
  if (!estCleImageStyle(slug, imageKey) || !Array.isArray(brut)) return [];
  const reduites = new Map<number, TailleImage>();
  let maitresse: TailleImage | null = null;
  for (const t of brut.slice(0, 8)) {
    const x = (t ?? {}) as Record<string, unknown>;
    const largeur = x.largeur;
    if (typeof largeur !== "number" || !Number.isInteger(largeur) || largeur <= 0 || largeur > LARGEUR_LUE_MAX) continue;
    if (x.key === imageKey) {
      maitresse ??= { largeur, key: imageKey };
    } else if ((LARGEURS_REDUITES as readonly number[]).includes(largeur) && x.key === cleTailleImage(imageKey, largeur)) {
      reduites.set(largeur, { largeur, key: x.key });
    }
  }
  const utiles = [...reduites.values()].filter((t) => !maitresse || t.largeur < maitresse.largeur);
  if (!utiles.length) return [];
  return [...utiles, ...(maitresse ? [maitresse] : [])].sort((a, b) => a.largeur - b.largeur);
}

/**
 * La valeur `srcset` (« url 600w, url 1200w, url 2400w »), ou `null` : l'écran
 * garde alors la maîtresse seule. Une adresse avec un blanc ou une virgule
 * couperait la liste en deux : elle est écartée (une adresse signée les
 * encode, `%20` et `%2C`, le harnais le vérifie).
 */
export function srcSetDe(entrees: readonly { largeur: number; url: string | null }[]): string | null {
  const l = entrees.filter(
    (e): e is { largeur: number; url: string } => typeof e.url === "string" && e.url.length > 0 && !/[\s,]/.test(e.url) && e.largeur > 0
  );
  return l.length ? l.map((e) => `${e.url} ${e.largeur}w`).join(", ") : null;
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
  const tailles = lireTailles(slug, echantillon, t.echantillon_tailles);
  return {
    titres: texte(t.titres, 60),
    texte: texte(t.texte, 60),
    echantillon_key: estCleImageStyle(slug, echantillon) ? echantillon : null,
    ...(tailles.length ? { echantillon_tailles: tailles } : {}),
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
    const tailles = lireTailles(slug, c.image_key, c.tailles);
    sortie.push({ cle, image_key: c.image_key, legende: texte(c.legende, 120), ...(tailles.length ? { tailles } : {}) });
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
    const tailles = lireTailles(slug, image, d.tailles);
    return {
      type: cle,
      image_key: estCleImageStyle(slug, image) ? image : null,
      legende: texte(d.legende, 160),
      ...(tailles.length ? { tailles } : {}),
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
    } else if ((SLUGS_RESERVES as readonly string[]).includes(slug)) {
      erreurs.push({ champ: "slug", message: `« ${slug} » est une adresse de l'espace client : en choisir une autre.` });
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
