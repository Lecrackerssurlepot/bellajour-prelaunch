/**
 * Les phrases des gestes de l'ATELIER sur les photos et les personnes d'une
 * édition : la corbeille (planche 5 du 20/10, T-199) et les personnes (planches
 * 4B et 4C, T-198). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement. Importable par le navigateur.
 *
 * Les panneaux de la fiche (`PanneauCorbeille`, `PanneauPersonnes`) ne
 * décident rien : la règle est dans `corbeille.ts` et `personnes.ts`, relue par
 * les routes `/api/admin/collectif/editions/[id]/corbeille` et `…/personnes`.
 * Ici, seulement comment on le DIT (les dates de Paris, « Effacée dans 2
 * jours », le nom gardé d'une fusion), pour que le harnais tienne chaque phrase
 * sans lancer un écran. Aucun chiffre n'est inventé : tout vient de la réponse
 * du serveur.
 */

import { PHOTOS_PAR_GESTE } from "./corbeille";
import { formaterHeureParis } from "./dates";
import { SANS_NOM, nomDePersonne } from "./dossiers";
import { MIGRATION_PERSONNES } from "./migration";
import { decouperNom, lireRefPersonne, planFusion, type Personne, type RaisonFusion } from "./personnes";

/* ─────────────────────────────── sans la migration 20261023 ─────────────────────────────── */

/**
 * Ce que dit l'écran quand la base n'a pas encore la mise à jour (la route répond 503
 * `migration_personnes_absente`) : ce qui attend, le fichier, et que rien n'est écrit.
 */
export function phraseMigrationAbsente(quoi: string): string {
  return `${quoi} attend la mise à jour de la base : ${MIGRATION_PERSONNES}. Rien n'est enregistré en attendant.`;
}

/* ─────────────────────────────── les dates ─────────────────────────────── */

const JOUR_COURT = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });

/** « 15 h 02 », « 9 h 12 » : l'heure de Paris sans le zéro de tête, avec des espaces INSÉCABLES (sur un téléphone, « 16 h » ne se sépare pas de « 18 »). */
function heureCourte(iso: string): string {
  return formaterHeureParis(iso).replace(/^0/, "").replace(/ h /, " h ");
}

/** « sam. 7 nov. à 15 h 02 », heure de Paris. Vide si illisible. */
export function jourEtHeureParis(iso: string | null | undefined): string {
  const ms = Date.parse(iso ?? "");
  return Number.isFinite(ms) ? `${JOUR_COURT.format(new Date(ms))} à ${heureCourte(new Date(ms).toISOString())}` : "";
}

/** « sam. 7 nov., 14 h 32 », heure de Paris (la dernière arrivée d'une personne). Vide si illisible. */
export function quandArrivee(iso: string | null | undefined): string {
  const ms = Date.parse(iso ?? "");
  return Number.isFinite(ms) ? `${JOUR_COURT.format(new Date(ms))}, ${heureCourte(new Date(ms).toISOString())}` : "";
}

/* ─────────────────────────────── la corbeille ─────────────────────────────── */

const pluriel = (n: number, mot: string) => `${n.toLocaleString("fr-FR")} ${mot}${n > 1 ? "s" : ""}`;
/** « 1 photo cochée », « 3 photos cochées » : le nom ET son adjectif s'accordent. */
const photos = (n: number, adjectif?: string) => `${n.toLocaleString("fr-FR")} photo${n > 1 ? "s" : ""}${adjectif ? ` ${adjectif}${n > 1 ? "s" : ""}` : ""}`;

/** « Effacée dans 2 jours » : le jour où la purge l'efface (la réponse du serveur, `joursRestants`). 0 : le délai est passé, la purge du jour l'emporte. */
export function phraseEcheance(jours: number): string {
  if (!Number.isFinite(jours) || jours <= 0) return "Effacée à la prochaine purge";
  return `Effacée dans ${pluriel(jours, "jour")}`;
}

/** « 9 photos » : le sous-titre de la corbeille. */
export function nombrePhotos(n: number): string {
  return photos(n);
}

/** Un geste de la corbeille ne prend que `PHOTOS_PAR_GESTE` photos : « Tout cocher » d'une grande corbeille part en plusieurs gestes. */
export function enGestes<T>(ids: readonly T[], taille: number = PHOTOS_PAR_GESTE): T[][] {
  const paquets: T[][] = [];
  for (let i = 0; i < ids.length; i += taille) paquets.push(ids.slice(i, i + taille));
  return paquets;
}

/** La confirmation d'« Effacer maintenant » : ce que le serveur dit qui partirait (`verifier: true`). */
export function phraseEffacer(aEffacer: number, cochees: number): { titre: string; corps: string } {
  if (aEffacer <= 0) {
    return { titre: "Rien à effacer", corps: "Ces photos ne sont plus à la corbeille : quelqu'un les a restaurées ou la purge est passée. La liste se relit." };
  }
  const reste = cochees - aEffacer;
  const sur = reste > 0 ? ` Sur les ${photos(cochees, "cochée")}, ${reste > 1 ? `${reste} ne sont plus à la corbeille` : "1 n'est plus à la corbeille"} : ${reste > 1 ? "elles ne sont pas touchées" : "elle n'est pas touchée"}.` : "";
  return {
    titre: `Effacer pour de bon ${photos(aEffacer)} ?`,
    corps: `Chaque photo part du coffre (l'original et la vignette), puis sa ligne est supprimée. C'est définitif : plus personne ne peut les restaurer, et le journal garde seulement combien et par qui.${sur}`,
  };
}

/** Le bilan d'une restauration (`n` restaurées, `refusees` qui n'étaient plus à la corbeille). */
export function bilanRestauration(n: number, refusees: number): string {
  if (n === 0) return "Rien n'a été restauré : ces photos n'étaient plus à la corbeille. La liste se relit.";
  const base = `${photos(n, "restaurée")} : ${n > 1 ? "elles reviennent" : "elle revient"} à sa place (son lien, sa personne, sa sélection).`;
  return refusees > 0 ? `${base} ${refusees > 1 ? `${refusees} n'étaient plus à la corbeille.` : "1 n'était plus à la corbeille."}` : base;
}

/**
 * Le bilan d'un effacement (audit S7 du 20/10) : la LIGNE part d'abord, donc `n` photos sont
 * effacées pour de bon même si un fichier a résisté ; `ratees` d'entre elles ont un fichier resté
 * au coffre, noté au journal et retiré par la purge suivante. Plus de 502 : rien ne « reste » à la
 * corbeille.
 */
export function bilanEffacement(n: number, ratees: number): string {
  if (n <= 0) return "Rien n'est effacé : ces photos n'étaient plus à la corbeille. La liste se relit.";
  const base = `${photos(n, "effacée")} pour de bon.`;
  if (ratees <= 0) return base;
  return `${base} Pour ${ratees > 1 ? `${ratees} d'entre elles` : "l'une d'elles"}, un fichier est resté au coffre : la purge du jour le retirera.`;
}

/* ─────────────────────────────── les personnes ─────────────────────────────── */

/** « 2 téléphones », « 1 téléphone », et rien de plus quand aucun n'est connu. */
export function phraseTelephones(n: number): string {
  return n > 0 ? pluriel(n, "téléphone") : "aucun téléphone connu";
}

/** Les liens d'une personne : « Bateau 1 » ; plusieurs, « Bateau 1 (20), Bateau 3 (4) ». Un lien inconnu garde sa clé hors de l'écran : « Lien retiré ». */
export function libelleLiens(p: Pick<Personne, "liens">, noms: ReadonlyMap<string, string>): string {
  if (p.liens.length === 0) return "aucun lien";
  const nom = (cle: string) => noms.get(cle) ?? "Lien retiré";
  return p.liens.length === 1 ? nom(p.liens[0].cle) : p.liens.map((l) => `${nom(l.cle)} (${l.n})`).join(", ");
}

/** « même nom, sans l'accent » : pourquoi l'on propose de fusionner (planche 4C). */
export function raisonFusion(r: RaisonFusion): string {
  return r === "meme_nom" ? "même nom, sans l'accent" : "même prénom, même lien";
}

/** La personne la plus fournie reste (la cible), l'autre est absorbée (la source). À égalité, la première. */
export function sensDeLaFusion(a: Personne, b: Personne): { cible: Personne; source: Personne } {
  return b.n > a.n ? { cible: b, source: a } : { cible: a, source: b };
}

export type NomGardable = { garder: "cible" | "source"; nom: string; refus: string | null };

/**
 * Les deux noms qu'on peut garder, et celui que la table refuserait : une personne qui a une
 * adresse a besoin d'un prénom ET d'un nom ; garder le nom d'AVANT d'un seul mot (« Léa »)
 * pour elle est refusé par le serveur (409), et l'écran le dit avant de le laisser choisir.
 */
export function nomsGardables(cible: Personne, source: Personne): NomGardable[] {
  const plan = planFusion(lireRefPersonne(source.ref), lireRefPersonne(cible.ref), "cible");
  const resteAUneAdresse = plan.ok && plan.reste.genre === "participant";
  const un = (p: Personne, garder: "cible" | "source"): NomGardable => {
    const unSeulMot = resteAUneAdresse && !p.participant && decouperNom(p.nom) === null;
    return { garder, nom: nomDePersonne(p.nom), refus: unSeulMot ? "Un seul mot : une personne qui a une adresse a besoin d'un prénom et d'un nom." : null };
  };
  return [un(cible, "cible"), un(source, "source")];
}

/** Ce que fait la fusion, sous les noms (planche 4B), avec le compte exact et les adresses qui suivent. */
export function phraseFusion(cible: Personne, source: Personne, nomGarde: string): string {
  const n = cible.n + source.n;
  const adresses = [cible, source].filter((p) => p.participant).length;
  const suite =
    adresses === 2
      ? " Les deux adresses mènent ensuite à cette personne, sur chacun de ses téléphones."
      : adresses === 1
        ? " L'adresse mène ensuite à cette personne, sur chacun de ses téléphones."
        : "";
  return `${n > 1 ? "Les" : "La"} ${photos(n)} ${n > 1 ? "sont rangées" : "est rangée"} sous ${nomDePersonne(nomGarde)}, sur tous les liens.${suite} Rien n'est effacé, et le journal garde la fusion : l'atelier peut la défaire.`;
}

/** Après une fusion : le TOTAL lu à l'écran (le `n` du serveur ne compte que les photos réécrites), et où la défaire. */
export function bilanFusion(total: number, nom: string): string {
  return `Fusion faite : ${total > 1 ? "les" : "la"} ${photos(total)} ${total > 1 ? "sont rangées" : "est rangée"} sous ${nomDePersonne(nom)}. Elle est dans « Fusions passées » : l'atelier peut la défaire.`;
}

/** Après un renommage : `n` photos réécrites (toutes celles de la personne), partout où le nom se lit. */
export function bilanRenommage(avant: string, apres: string, n: number): string {
  return `${nomDePersonne(avant)} s'appelle maintenant ${nomDePersonne(apres)} : ${photos(n, "renommée")}, dans la grille, les dossiers et le lot.`;
}

/** Après « Défaire » : `n` photos ont repris leur personne et leur nom d'avant. */
export function bilanDefaire(n: number): string {
  return `Fusion défaite : ${photos(n)} ${n > 1 ? "ont retrouvé leur personne et leur nom" : "a retrouvé sa personne et son nom"} d'avant.`;
}

/** Une fusion passée, en une ligne : « Lea Martin → Léa Martin ». */
export function ligneFusion(f: { nomPart: string | null; nomApres: string }): string {
  return `${f.nomPart?.trim() || SANS_NOM} → ${f.nomApres?.trim() || SANS_NOM}`;
}

/** Ce que ferait « Défaire » (la réponse de `defaire` avec `verifier: true`), sans rien écrire. */
export function phraseDefaire(v: { n: number; nomAvant: string | null; nomPart: string | null }): string {
  const noms = [v.nomPart ? `« ${v.nomPart} »` : null, v.nomAvant ? `« ${v.nomAvant} »` : null].filter(Boolean);
  const retour = noms.length ? ` (${noms.join(" et ")})` : "";
  const reprise = v.n > 1 ? "reprennent leur personne et leur nom" : "reprend sa personne et son nom";
  return `${photos(v.n)} ${reprise} d'avant la fusion${retour}. Une photo arrivée depuis la fusion reste chez la personne qui est restée. Si l'une des deux a été renommée depuis, elle reprend aussi son nom d'avant la fusion.`;
}
