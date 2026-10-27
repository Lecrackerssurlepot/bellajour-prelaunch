/**
 * La mosaïque de la page Photos (planches 2D et 3 du 21/10, validées par Mathias) : QUELLE tuile est grande,
 * large ou petite. Module PUR : aucun accès réseau, base ni écran ; importable navigateur et harnais.
 *
 * Une tuile par lien (« Par lien ») ou par personne (« Personnes »). Trois formes : GRANDE (2 × 2), LARGE
 * (2 × 1), PETITE (1 × 1), sur 2 colonnes au téléphone et 4 à l'ordinateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA RÈGLE, VOLONTAIREMENT SIMPLE (Mathias : « ça ne doit pas être compliqué ni toujours recalculer ») :
 *   1. on classe par nombre de photos (hors corbeille), le plus gros d'abord ; à égalité, par nom
 *      (« Bateau 2 » avant « Bateau 10 ») ;
 *   2. la première tuile est GRANDE ; les trois suivantes au plus sont LARGES ; le reste est PETIT, par deux ;
 *   3. s'il reste une petite SEULE dans sa rangée, elle devient LARGE ;
 *   4. un seul lien : GRAND.
 * Sur quatre colonnes, on ajuste de 0 à 3 le nombre de larges pour que chaque rangée soit pleine (une rangée
 * est faite de deux moitiés de deux colonnes : une large, ou deux petites). Avec deux liens ou moins, la
 * mosaïque reste à deux colonnes, même à l'ordinateur (`colonnesDeLaMosaique`).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Cette fonction ne SAIT PAS quand elle est appelée : « à l'ouverture de la page seulement » est l'affaire
 * de l'écran (`Mosaique.tsx` fige les poids à son montage). Le direct change les chiffres des pastilles, jamais
 * la place ni la taille d'une tuile.
 *
 * L'ordre d'affichage (celui de la maquette) : la grande, puis une large, deux petites, une large, deux
 * petites… ; une large qui était une petite seule ferme la marche.
 *
 * `enTete` (27/10, « Mes photos ») : la clé d'une tuile qui doit venir EN PREMIER (en haut à gauche, « chez soi »). Elle garde
 * la taille que son poids lui donne (petite, large ou grande) ; si, ainsi remontée, elle laissait un trou, elle prend la place
 * de la première (la grande) et celle-ci prend sa place d'avant : les tailles des places ne changent pas, donc aucun trou.
 */

import { clePersonne, QUI_RESPONSABLE, type Arbre } from "./dossiers";

export type TailleTuile = "grand" | "large" | "petit";
/** Ce que la règle lit d'une tuile : de quoi la retrouver, la départager par son nom, et son poids. */
export type Pesee = { cle: string; nom: string; n: number };
export type Classee<T> = T & { taille: TailleTuile };

/** Combien de larges au plus derrière la grande (la règle 2). */
export const LARGES_MAX = 3;
/** Au-dessous de ce nombre de tuiles, la mosaïque de l'ordinateur garde deux colonnes (une grande et une large ne remplissent pas quatre colonnes). */
export const TUILES_MIN_QUATRE_COLONNES = 3;
/** La clé de la tuile « Mes photos » (les photos déposées par le responsable) : toujours la première de la mosaïque. */
export const CLE_VOUS = "vous";

const compareNoms = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });

/** Le classement : le plus de photos d'abord, à égalité par nom (la même mosaïque pour le responsable et l'équipe), puis par clé (jamais deux ordres possibles). */
export function classerParPoids<T extends Pesee>(tuiles: readonly T[]): T[] {
  return [...tuiles].sort((a, b) => b.n - a.n || compareNoms(a.nom, b.nom) || (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0));
}

/** Les colonnes que la mosaïque a VRAIMENT : l'ordinateur demande quatre, mais deux tuiles ou moins n'en remplissent pas quatre. */
export function colonnesDeLaMosaique(nombre: number, colonnes: 2 | 4): 2 | 4 {
  return colonnes === 4 && nombre > TUILES_MIN_QUATRE_COLONNES ? 4 : 2;
}

/** Combien de tuiles larges derrière la grande, pour `reste` tuiles qui la suivent. */
function nombreDeLarges(reste: number, colonnes: 2 | 4): number {
  if (colonnes === 4) return (4 - (reste % 4)) % 4;
  return Math.min(LARGES_MAX, reste);
}

/**
 * La taille de chaque tuile, dans l'ordre où elles s'affichent. `colonnes` : 2 (téléphone) ou 4 (ordinateur).
 * Aucune tuile n'est perdue ni ajoutée, et la mosaïque n'a aucun trou : voir le harnais.
 */
export function mosaiqueDesLiens<T extends Pesee>(tuiles: readonly T[], colonnes: 2 | 4 = 2, enTete?: string): Classee<T>[] {
  const rendu = ordreDeLaMosaique(tuiles, colonnes);
  const i = enTete === undefined ? -1 : rendu.findIndex((t) => t.cle === enTete);
  if (i <= 0) return rendu;
  const remontee = [rendu[i], ...rendu.slice(0, i), ...rendu.slice(i + 1)];
  if (casesVides(remontee, colonnesDeLaMosaique(rendu.length, colonnes)) === 0) return remontee;
  const echange = [...rendu];
  echange[0] = { ...rendu[i], taille: rendu[0].taille };
  echange[i] = { ...rendu[0], taille: rendu[i].taille };
  return echange;
}

function ordreDeLaMosaique<T extends Pesee>(tuiles: readonly T[], colonnes: 2 | 4): Classee<T>[] {
  const triees = classerParPoids(tuiles);
  if (triees.length === 0) return [];
  if (triees.length === 1) return [{ ...triees[0], taille: "grand" }];
  const effectives = colonnesDeLaMosaique(triees.length, colonnes);
  const reste = triees.length - 1;
  const nbLarges = nombreDeLarges(reste, effectives);
  const larges: Classee<T>[] = triees.slice(1, 1 + nbLarges).map((t) => ({ ...t, taille: "large" as const }));
  const petites: Classee<T>[] = triees.slice(1 + nbLarges).map((t) => ({ ...t, taille: "petit" as const }));
  /* Une petite seule dans sa rangée (la dernière, la plus légère) devient large : jamais une tuile seule. Elle reste à sa place, la dernière. */
  const seule = petites.length % 2 === 1 ? (petites.pop() as Classee<T>) : null;
  const rendu: Classee<T>[] = [{ ...triees[0], taille: "grand" }];
  while (larges.length || petites.length) {
    const large = larges.shift();
    if (large) rendu.push(large);
    const a = petites.shift();
    const b = petites.shift();
    if (a) rendu.push(a);
    if (b) rendu.push(b);
  }
  if (seule) rendu.push({ ...seule, taille: "large" });
  return rendu;
}

/** Les colonnes que prend une tuile (2 × 2, 2 × 1, 1 × 1) : de quoi vérifier, au harnais, qu'une rangée est pleine. */
export const LARGEUR_DE = { grand: 2, large: 2, petit: 1 } as const satisfies Record<TailleTuile, number>;
export const HAUTEUR_DE = { grand: 2, large: 1, petit: 1 } as const satisfies Record<TailleTuile, number>;

/**
 * Pose les tuiles sur la grille (`grid-auto-flow: dense`, comme la feuille de style) et dit combien de cases
 * restent vides, rangée complète comprise. Zéro : aucun trou. Le harnais l'exige pour 1 à 40 tuiles, sur 2 et 4 colonnes.
 */
export function casesVides(tuiles: readonly { taille: TailleTuile }[], colonnes: 2 | 4): number {
  const rangees: boolean[][] = [];
  const prise = (r: number, c: number) => rangees[r]?.[c] === true;
  const poser = (r: number, c: number) => {
    while (rangees.length <= r) rangees.push(Array<boolean>(colonnes).fill(false));
    rangees[r][c] = true;
  };
  for (const t of tuiles) {
    const l = LARGEUR_DE[t.taille];
    const h = HAUTEUR_DE[t.taille];
    let place = false;
    for (let r = 0; !place; r++) {
      for (let c = 0; c + l <= colonnes && !place; c++) {
        let libre = true;
        for (let dr = 0; dr < h && libre; dr++) for (let dc = 0; dc < l && libre; dc++) if (prise(r + dr, c + dc)) libre = false;
        if (!libre) continue;
        for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < l; dc++) poser(r + dr, c + dc);
        place = true;
      }
    }
  }
  let vides = 0;
  for (const r of rangees) for (let c = 0; c < colonnes; c++) if (!r[c]) vides++;
  return vides;
}

/* ─────────────────────────── ce que la tuile dit ─────────────────────────── */

const nombre = (n: number) => n.toLocaleString("fr-FR");

/**
 * La taille du NOM d'une tuile, en trois échelles : 0 (jusqu'à 9 caractères, aucun mot de plus de 9), 1 (jusqu'à
 * 15 : 72 % de la taille de la tuile), 2 (plus long : 56 %). Un mot trop long pour la tuile n'est jamais coupé
 * au milieu : il rapetisse d'abord.
 */
export function echelleDuNom(nom: string): 0 | 1 | 2 {
  const plusLong = Math.max(0, ...nom.split(/\s+/).map((m) => m.length));
  if (nom.length <= 9 && plusLong <= 9) return 0;
  return nom.length <= 15 ? 1 : 2;
}

export type Pastille = {
  /** Sur une grande ou une large tuile. */
  long: string;
  /** Sur une petite tuile (« 214 photos » : deux nombres côte à côte ne se lisent pas). */
  court: string;
  /** Ce que lit la voix : le texte complet, sans le point médian. */
  voix: string;
};

/** « 214 photos · 9 personnes », « 214 photos » ; un lien sans photo : « Rien reçu pour l'instant » / « Rien reçu ». */
export function pastilleDuLien(n: number, personnes: number): Pastille {
  if (!n) return { long: "Rien reçu pour l'instant", court: "Rien reçu", voix: "Rien reçu pour l'instant" };
  const p = Math.max(1, personnes);
  const photos = `${nombre(n)} photo${n > 1 ? "s" : ""}`;
  const gens = `${nombre(p)} personne${p > 1 ? "s" : ""}`;
  return { long: `${photos} · ${gens}`, court: photos, voix: `${photos}, ${gens}` };
}

/** « 38 photos · Bateau 1 », « 38 » ; sans photo : « Aucune photo » / « 0 ». */
export function pastilleDeLaPersonne(n: number, detail: string | null): Pastille {
  if (!n) return { long: "Aucune photo", court: "0", voix: "Aucune photo" };
  const photos = `${nombre(n)} photo${n > 1 ? "s" : ""}`;
  return { long: detail ? `${photos} · ${detail}` : photos, court: nombre(n), voix: detail ? `${photos}, ${detail}` : photos };
}

/* ─────────────────────────── les personnes : où elles ont déposé ─────────────────────────── */

/**
 * Où une personne a déposé, en quelques mots (la pastille « 38 photos · Bateau 1 ») : le nom du lien quand elle n'a
 * déposé que par un seul ; « N liens » sinon ; rien pour le responsable (ses dossiers ne sont pas des liens). La
 * personne d'un lien dont le nom est le sien (« Le photographe », seul sur son lien) n'a pas de nœud enfant : on la
 * reconnaît à son nom.
 */
export function detailDeLaPersonne(arbre: Arbre, cle: string): string | null {
  if (cle === QUI_RESPONSABLE) return null;
  const nom = cle.startsWith("qui:") ? cle.slice(4) : null;
  if (nom === null) return null;
  /* `pers:<id|general>:<nom comparé>` : l'id n'a jamais de deux-points, tout ce qui suit le second est le nom. */
  const nomDe = (c: string) => (c.startsWith("pers:") ? c.slice(c.indexOf(":", 5) + 1) : null);
  const liens = arbre.liens.filter((l) => l.enfants.some((e) => nomDe(e.cle) === nom) || (l.enfants.length === 0 && clePersonne(l.nom) === nom));
  if (liens.length === 0) return null;
  return liens.length === 1 ? liens[0].nom : `${nombre(liens.length)} liens`;
}

/* ─────────────────────────── à l'ouverture de la page seulement ─────────────────────────── */

/** Les poids de la mosaïque « Par lien » : les liens de contribution, « Sans groupe » et, si on lui donne un nom, « Mes photos » (en tête) ; l'atelier n'est pas un lien (une ligne sous la mosaïque). */
export function peseesDesLiens(arbre: Arbre, nomVous?: string): Pesee[] {
  const liens = arbre.liens.filter((l) => l.cle.startsWith("lien:") || l.cle === "participants").map((l) => ({ cle: l.cle, nom: l.nom, n: l.n }));
  /* « Mes photos » (27/10) : une tuile de la mosaïque, en tête (`CLE_VOUS`), seulement si le responsable a déposé quelque chose. */
  const n = arbre.vous.reduce((s, d) => s + d.n, 0);
  return nomVous !== undefined && n > 0 ? [...liens, { cle: CLE_VOUS, nom: nomVous, n }] : liens;
}

/** Les poids de la mosaïque « Personnes » : chaque personne de l'édition, le responsable compris. */
export function peseesDesPersonnes(arbre: Arbre): Pesee[] {
  return arbre.personnes.map((x) => ({ cle: x.cle, nom: x.nom, n: x.n }));
}

/**
 * LE GEL, en une fonction : les poids de la mosaïque sont ceux de l'OUVERTURE. Une lecture plus récente (une photo de plus,
 * un lien qui grossit, la mise à jour en direct) rend `avant` tel quel tant que ce sont les MÊMES tuiles : les chiffres des
 * pastilles bougent, jamais la place ni la taille. Seul un ensemble de tuiles différent (un lien créé ou supprimé) reprend les
 * poids du moment, sans quoi la tuile nouvelle n'aurait pas de place.
 */
export function figerLesPesees(avant: readonly Pesee[] | null, maintenant: readonly Pesee[]): readonly Pesee[] {
  if (!avant) return maintenant;
  if (avant.length !== maintenant.length) return maintenant;
  const cles = new Set(avant.map((p) => p.cle));
  return maintenant.every((p) => cles.has(p.cle)) ? avant : maintenant;
}

/* ─────────────────────────── les pastilles de personnes d'un lien ─────────────────────────── */

/**
 * Le prénom de chaque personne, pour sa pastille (« Léa », « Hugo ») : si deux personnes ont le même prénom, l'initiale du
 * nom les départage (« Léa M. », « Léa D. ») ; si elle ne suffit pas, le nom entier. Aucun doublon ne reste.
 */
export function prenomsCourts(noms: readonly string[]): string[] {
  const mots = noms.map((n) => n.trim().split(/\s+/).filter(Boolean));
  const cle = (s: string) => s.toLocaleLowerCase("fr");
  const prenoms = mots.map((m, i) => m[0] ?? noms[i]);
  const comptes = new Map<string, number>();
  for (const p of prenoms) comptes.set(cle(p), (comptes.get(cle(p)) ?? 0) + 1);
  const courts = prenoms.map((p, i) => ((comptes.get(cle(p)) ?? 0) > 1 && mots[i].length > 1 ? `${p} ${mots[i][1].slice(0, 1).toLocaleUpperCase("fr")}.` : p));
  const reste = new Map<string, number>();
  for (const c of courts) reste.set(cle(c), (reste.get(cle(c)) ?? 0) + 1);
  return courts.map((c, i) => ((reste.get(cle(c)) ?? 0) > 1 ? noms[i].trim() : c));
}
