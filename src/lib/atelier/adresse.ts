/**
 * LE FILET SUR L'ADRESSE DE LIVRAISON — la partie PURE (T-138, 25/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * L'adresse vient de Stripe Checkout, en champs libres, et personne ne la
 * relit. `adresseCloudprinter` vérifie que les champs EXISTENT, jamais qu'ils
 * désignent un lieu réel. Le 25/09, le dossier d'Eloïse portait « Rua antero
 * de quantal n3, 1150-041 Lisbonne » : la rue s'écrit « Rua Antero de
 * Quental », et la faute n'a été vue que parce qu'un humain a lu l'adresse
 * ligne à ligne avant de commander.
 *
 * Elle était détectable : passée chez Geoapify, la graphie d'origine ne rend
 * aucune rue de ce nom, et la plus proche trouvée s'écrit « Quental » — à UNE
 * lettre de « quantal ». C'est exactement ce que ce module juge.
 *
 * ⚠️ CE VERDICT NE REFUSE JAMAIS RIEN. C'est une REMARQUE, au même titre que
 * le contrôle des bords (`bords.ts`) : une adresse réelle peut manquer d'une
 * base de géocodage (lotissement neuf, lieu-dit, boîte postale), et un refus
 * qui se trompe finit contourné en SQL. L'atelier lit, l'atelier tranche.
 *
 * ⚠️ IL NE JUGE QUE LE NOM DE LA RUE, et c'est délibéré. Le numéro, l'étage
 * et le code postal ne se vérifient pas de façon fiable d'un pays à l'autre
 * (un code postal portugais est attribué à la porte près), et une alerte qui
 * se trompe souvent est une alerte qu'on apprend à ignorer.
 *
 * Aucun réseau ici : l'appel à Geoapify est dans `adresseDistant.ts`.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { distanceDamerau } from "./questionnaire";

/** Un candidat rendu par le géocodeur, réduit à ce dont la règle a besoin. */
export type CandidatAdresse = {
  /** L'adresse complète telle que le géocodeur l'écrit. */
  formatted: string;
  /** Le nom de rue seul, quand le géocodeur a su l'isoler. */
  rue: string | null;
  ville: string | null;
};

export type VerdictAdresse =
  /** Une rue de ce nom existe, écrite comme le client l'a écrite. */
  | { genre: "connue" }
  /** Aucune rue de ce nom, mais une graphie très proche existe. */
  | { genre: "graphie"; proposee: string; phrase: string }
  /** Rien de ressemblant n'a été trouvé dans ce pays. */
  | { genre: "introuvable"; phrase: string }
  /** Geoapify n'a pas répondu, ou aucune clé n'est posée. */
  | { genre: "non_verifie"; phrase: string };

/**
 * Au-delà de cette distance de Damerau, deux noms de rue ne sont plus une
 * faute de frappe l'un de l'autre mais deux rues différentes. Deux, parce
 * que « quantal » → « quental » en coûte UNE et qu'une seconde faute dans un
 * nom long reste plausible.
 */
export const DISTANCE_MAX = 2;

/**
 * Et jamais plus d'un quart du nom : sur un nom court une distance de 2
 * change tout, sur « Avenida da Liberdade » elle ne change presque rien.
 */
export const PART_MAX = 0.25;

/**
 * En deçà de cette longueur, on ne propose RIEN.
 *
 * ⚠️ Le quart de longueur ne suffisait pas, et le harnais l'a prouvé :
 * « rua a » fait 5 caractères, donc un plafond de 1, et « rua b » tombait
 * dedans — deux rues différentes déclaraient une faute de frappe. Sur un nom
 * si court, la lettre qui diffère EST ce qui distingue les deux rues, jamais
 * une coquille. Dix caractères laissent passer tous les vrais noms de rue
 * (« Rua Antero de Quental » en fait 21) et ferment ce trou.
 */
export const LONGUEUR_MIN = 10;

/**
 * Le nom de rue réduit à ce qui se compare : sans accents, sans casse, sans
 * ponctuation, et SANS LES NOMBRES — « Rua Antero de Quental 3 » et « Rua
 * Antero de Quental » sont la même rue, et le numéro se compare ailleurs
 * (nulle part, en l'occurrence : voir l'en-tête).
 */
export function normaliserRue(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    /* « n3 », « nº 3 », « no 3 » : la marque du numéro avant le chiffre. */
    .replace(/\bn[ºo°]?\s*\d+\w*/g, " ")
    .replace(/\d+/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Les mots qui ne désignent rien : le type de voie et les articles. Ils sont
 * dans presque toutes les adresses et ne distinguent aucune rue d'une autre.
 * FR et PT d'abord, parce que c'est là que sont nos clients.
 */
const MOTS_VIDES = new Set([
  "rue", "rua", "avenue", "avenida", "av", "travessa", "praca", "largo", "calcada",
  "estrada", "beco", "quinta", "impasse", "chemin", "route", "allee", "boulevard",
  "bd", "place", "quai", "lieu", "dit", "residence", "lotissement",
  "le", "la", "les", "l", "de", "des", "du", "da", "do", "das", "dos", "d", "et", "e",
]);

/** Longueur minimale d'un mot pour qu'il DISTINGUE une rue d'une autre. */
export const MOT_DISTINCTIF_MIN = 4;

/** Ce qui reste d'un nom de rue une fois ôté ce qui ne distingue rien. */
export function motsDistinctifs(rue: string): string[] {
  return rue
    .split(" ")
    .filter((m) => m.length >= MOT_DISTINCTIF_MIN && !MOTS_VIDES.has(m));
}

/**
 * Le géocodeur écrit-il le MÊME lieu autrement ?
 *
 * ⚠️ Cette règle existe à cause d'un vrai dossier, pas d'une hypothèse.
 * Lara habite « 1 LE GALET » à Saint-Ciers-de-Canesse ; son colis est
 * arrivé. Geoapify connaît parfaitement l'endroit, mais l'écrit « Lieu Dit
 * Galet » — un lieu-dit, pas une rue. Sans cette règle, le filet criait au
 * loup sur une adresse juste, et une alerte qui se trompe une fois sur
 * quatre est une alerte qu'on apprend à ignorer.
 *
 * ⚠️ Un simple « contient » ne marche PAS, et le harnais l'a prouvé :
 * « le galet » n'est pas un morceau de « lieu dit galet ». Ce qui se compare,
 * ce sont les mots qui DÉSIGNENT — « galet » —, jamais le type de voie ni
 * les articles, qui sont partout.
 */
export function memeRueAutrementEcrite(a: string, b: string): boolean {
  const ma = motsDistinctifs(a);
  const mb = motsDistinctifs(b);
  if (!ma.length || !mb.length) return false;
  const [court, long] = ma.length <= mb.length ? [ma, mb] : [mb, ma];
  const grand = new Set(long);
  return court.every((m) => grand.has(m));
}

/** Deux noms de rue sont-ils une faute de frappe l'un de l'autre ? */
export function memeRueATypoPres(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (Math.max(a.length, b.length) < LONGUEUR_MIN) return false;
  const plafond = Math.min(DISTANCE_MAX, Math.floor(Math.max(a.length, b.length) * PART_MAX));
  if (plafond < 1) return false;
  const d = distanceDamerau(a, b, plafond);
  return d > 0 && d <= plafond;
}

/**
 * LE VERDICT. `candidats` est ce que le géocodeur a rendu pour l'adresse
 * telle qu'elle est écrite sur le dossier ; `null` veut dire qu'il n'a pas
 * répondu, ce qui n'est PAS la même chose qu'une liste vide (« rien là »).
 */
export function jugerAdresse(
  ligne1: unknown,
  candidats: CandidatAdresse[] | null,
): VerdictAdresse {
  const voulue = normaliserRue(ligne1);
  if (!voulue) {
    /* Pas de rue lisible : `adresseCloudprinter` a déjà refusé plus haut.
       On ne double pas son message. */
    return { genre: "non_verifie", phrase: "Adresse illisible : rien à vérifier." };
  }
  if (candidats === null) {
    return {
      genre: "non_verifie",
      phrase: "Adresse non vérifiée : le géocodeur n'a pas répondu. Relis-la à l'œil.",
    };
  }

  /* La graphie du client existe telle quelle, ou le géocodeur écrit le même
     lieu autrement (« LE GALET » / « Lieu Dit Galet ») : on se tait. */
  if (
    candidats.some((c) => {
      const rue = normaliserRue(c.rue);
      return rue === voulue || memeRueAutrementEcrite(voulue, rue);
    })
  ) {
    return { genre: "connue" };
  }

  /* Sinon, la plus proche, si elle est à une faute de frappe près. */
  let meilleure: { rue: string; distance: number } | null = null;
  for (const c of candidats) {
    const rue = normaliserRue(c.rue);
    if (!memeRueATypoPres(voulue, rue)) continue;
    const plafond = Math.min(DISTANCE_MAX, Math.floor(Math.max(voulue.length, rue.length) * PART_MAX));
    const d = distanceDamerau(voulue, rue, plafond);
    if (!meilleure || d < meilleure.distance) meilleure = { rue: c.rue ?? "", distance: d };
  }

  if (meilleure && meilleure.rue) {
    return {
      genre: "graphie",
      proposee: meilleure.rue,
      /* La phrase dit ce qu'on sait ET ce qu'on ne sait pas : le nom trouvé
         peut être celui d'une rue d'une AUTRE ville (c'était le cas pour
         Eloïse). On propose une graphie, jamais une adresse. */
      phrase: `Aucune rue ne s'écrit ainsi. La graphie la plus proche trouvée est « ${meilleure.rue} ». À confirmer avant d'imprimer.`,
    };
  }

  return {
    genre: "introuvable",
    phrase: "Aucun lieu connu ne correspond à cette rue. Vérifie l'adresse avant d'imprimer.",
  };
}

/**
 * LA REQUÊTE envoyée au géocodeur, et sa forme n'est pas cosmétique.
 *
 * ⚠️ LE NUMÉRO DE RUE EST RETIRÉ, et c'est ce qui fait marcher le filet.
 * Mesuré le 25/09 sur l'adresse d'Eloïse, les deux points d'entrée de
 * Geoapify (`search` et `autocomplete`) :
 *   « Rua antero de quantal n3, 1150-041 Lisbonne » → deux rues sans rapport
 *     (Almada, Amora), et rien du tout en autocomplete ;
 *   « Rua antero de quantal, 1150-041 Lisboa »      → « Rua Antero de
 *     Quental » trouvée, des deux côtés.
 * Le jeton « n3 » collé au nom suffit à égarer la recherche. Comme on ne
 * juge QUE le nom de la rue (voir l'en-tête), l'ôter ne coûte rien.
 *
 * ⚠️ Le code postal et la ville se joignent par une ESPACE, pas une virgule :
 * c'est la forme postale, et c'est celle que le géocodeur lit le mieux.
 */
export function requeteAdresse(ligne1: unknown, codePostal: unknown, ville: unknown): string {
  const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const rue = texte(ligne1)
    .replace(/\bn[ºo°]?\s*\d+\w*/gi, " ")
    .replace(/\b\d+\w*\b/g, " ")
    .replace(/[\s,]+/g, " ")
    .trim();
  const lieu = [texte(codePostal), texte(ville)].filter(Boolean).join(" ");
  return [rue, lieu].filter(Boolean).join(", ");
}
