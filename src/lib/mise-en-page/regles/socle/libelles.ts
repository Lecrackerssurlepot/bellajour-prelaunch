/**
 * Les LIBELLÉS D'ATELIER (19/11, M-57) : Mathias, sur « satellite » : « je ne comprends pas ». Tout ce que l'atelier lit doit être un mot
 * clair. Ici : un libellé pour chaque RÔLE de photo et le dictionnaire qui traduit le jargon des auteurs du socle en mots d'atelier
 * (`libelleDe`), appliqué à chaque information et à chaque valeur de `INFORMATIONS_SOCLE`.
 *
 * AUCUN écran ne change : ces libellés sont des DONNÉES proposées. Les écrans actuels (`ROLES_IA`, `editeur/lectureIA.ts`) gardent leurs mots
 * tant qu'on ne les y branche pas. Module pur.
 */

import type { RoleAtelier } from "./types";

/**
 * Chaque rôle qu'une photo peut tenir, d'où vient la clé (code ou socle), et son libellé d'atelier. Les clés de `ROLES_IA`
 * (`editeur/lectureIA.ts`) et de `POIDS_ROLE` (`compositeur/reglagesCompositeur.ts`) y sont toutes (le harnais le vérifie).
 */
export const ROLES_ATELIER: readonly RoleAtelier[] = [
  { cle: "heros", libelle: "photo principale", sens: "la photo qui domine la double : le plus grand cadre", ou: "code (ROLES_IA, POIDS_ROLE) ; socle Assortiment" },
  { cle: "satellite", libelle: "photo d'accompagnement", sens: "une photo plus petite posée à côté de la principale, qui la complète", ou: "code (ROLES_IA, POIDS_ROLE) ; socle Assortiment ; libellé demandé par M-57" },
  { cle: "detail", libelle: "photo de détail", sens: "un gros plan (objet, plat, enseigne) qui apporte ce que la vue large n'a pas", ou: "code (ROLES_IA, POIDS_ROLE)" },
  { cle: "vue_ensemble", libelle: "vue d'ensemble", sens: "le plan large qui montre le lieu entier", ou: "code (ROLES_IA, POIDS_ROLE)" },
  { cle: "pleine", libelle: "pleine page", sens: "une photo seule qui prend toute une page", ou: "code (ROLES_IA, POIDS_ROLE)" },
  { cle: "double", libelle: "photo sur deux pages", sens: "une photo seule qui traverse la double, pli compris", ou: "code (ROLES_IA, POIDS_ROLE)" },
  { cle: "couverture", libelle: "photo de couverture", sens: "candidate pour la 1re ou la 4e de couverture", ou: "code (ROLES_IA)" },
  { cle: "a_ecarter", libelle: "à laisser de côté", sens: "la lecture propose de ne pas la poser ; elle va en réserve, jamais supprimée", ou: "code (ROLES_IA)" },
  { cle: "pancarte", libelle: "panneau ou enseigne", sens: "une photo de panneau qui nomme le lieu, posée avec son sujet", ou: "socle Assortiment" },
  { cle: "ambiance", libelle: "photo d'ambiance", sens: "une photo sans sujet précis qui donne l'atmosphère du moment", ou: "socle Assortiment" },
  { cle: "serie", libelle: "suite de photos", sens: "plusieurs photos d'un même geste, posées ensemble et dans l'ordre", ou: "socle Tri, Assortiment" },
  { cle: "reunion", libelle: "page qui rassemble un sujet", sens: "des photos d'un même sujet (plats, animaux) réunies sur une double", ou: "socle Récit" },
  { cle: "ouverture", libelle: "ouverture de chapitre", sens: "la première double d'un chapitre, avec le nom du lieu", ou: "socle Récit" },
  { cle: "sommet", libelle: "moment fort du magazine", sens: "la double la plus forte, placée vers les deux tiers", ou: "socle Récit" },
  { cle: "fin", libelle: "dernière page", sens: "la photo qui clôt le magazine (au revoir ou les gens)", ou: "socle Récit" },
  { cle: "respiration", libelle: "page calme", sens: "une double à une ou deux photos entre des doubles chargées", ou: "socle Récit, Assortiment" },
  { cle: "jalon", libelle: "photo de groupe de l'étape", sens: "la photo posée où tout le groupe regarde l'objectif, une par étape", ou: "registre S-008" },
  { cle: "punctum", libelle: "photo insolite", sens: "une photo surprenante qui arrête le regard, une à trois par magazine", ou: "socle Assortiment" },
];

/**
 * Le jargon des auteurs et son mot d'atelier. Appliqué mot à mot (frontières de mots, sans accent ni casse) par `libelleDe`.
 * Un mot de cette liste ne doit plus paraître dans un libellé d'atelier (le harnais le vérifie).
 */
export const JARGON: readonly (readonly [string, string])[] = [
  ["satellite", "photo d'accompagnement"], ["satellites", "photos d'accompagnement"], ["heros", "photo principale"],
  ["vue_ensemble", "vue d'ensemble"], ["a_ecarter", "à laisser de côté"],
  ["saillance", "zone qui attire l'œil"], ["saillant", "qui attire l'œil"], ["sail", "zone qui attire l'œil"],
  ["heatmap", "carte de chaleur"], ["dhash", "empreinte de l'image"], ["hash", "empreinte"], ["hamming", "écart d'empreinte"],
  ["laplacien", "netteté"], ["ratio", "rapport largeur sur hauteur"], ["dpi", "définition (points par pouce)"],
  ["ppp", "définition (points par pouce)"], ["exif", "données de l'appareil"], ["iso", "sensibilité"], ["luma", "luminosité"],
  ["punctum", "photo insolite"], ["pile", "groupe de photos presque pareilles"], ["piles", "groupes de photos presque pareilles"],
  ["delta_e", "écart de couleur"], ["geo", "géolocalisation"], ["gps", "position de prise de vue"], ["bbox", "contour"],
  ["slot", "emplacement"], ["layout", "mise en page"], ["score", "note"], ["tag", "étiquette"], ["tags", "étiquettes"],
];
/** Les mots qui ne doivent plus paraître dans un libellé (l'abréviation sans sa traduction). */
export const JARGON_INTERDIT: readonly string[] = ["satellite", "satellites", "heros", "saillance", "heatmap", "dhash", "hamming", "laplacien", "bbox", "slot", "layout", "punctum", "delta_e"];

/** Les libellés d'information écrits à la main, quand la traduction mot à mot ne suffit pas (clé = nom de l'information). */
export const LIBELLES_INFO: Readonly<Record<string, string>> = {
  date_prise: "date et heure de la prise",
  fuseau: "fuseau horaire de l'appareil",
  date_estimee: "date estimée (arrivée dans la galerie)",
  numero_galerie: "numéro de la photo dans la galerie",
  dimensions_orientation: "taille en pixels et sens de la photo",
  forme: "format de la photo",
  taille_possible: "plus grande taille imprimable",
  provenance: "d'où vient la photo",
  rafale_appareil: "rafale marquée par l'appareil",
  live_profondeur_couleur: "photo animée, profondeur et profil de couleur",
  nom_fichier: "nom du fichier",
  interieur_local: "dedans ou dehors (mesuré sans IA)",
  lumiere_moment_local: "lumière du moment (mesurée sans IA)",
  plan_local: "plan large, moyen ou serré (mesuré sans IA)",
  texte_lignes: "lignes de texte dans l'image",
};

const sansAccent = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Traduit un nom ou une valeur d'auteur en mots d'atelier : soulignés en espaces, jargon traduit, rien d'autre ne change. */
export function libelleDe(brut: string): string {
  const t = brut.replace(/`/g, "").trim();
  /* d'abord les mots composés (vue_ensemble), puis les mots seuls ; la comparaison ignore accents et casse */
  const traduit = t.replace(/[A-Za-zÀ-ÿ]+(?:_[A-Za-zÀ-ÿ]+)*/g, (mot) => {
    const cle = sansAccent(mot);
    const entier = JARGON.find(([j]) => j === cle);
    if (entier) return entier[1];
    return mot.split("_").map((m) => JARGON.find(([j]) => j === sansAccent(m))?.[1] ?? m).join(" ");
  });
  return traduit.replace(/\s+/g, " ").trim();
}

/** Le libellé d'atelier d'un rôle (la clé elle-même traduite quand le rôle n'est pas listé). */
export const libelleDuRole = (cle: string): string => ROLES_ATELIER.find((r) => r.cle === cle)?.libelle ?? libelleDe(cle);
