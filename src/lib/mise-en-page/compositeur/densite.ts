/**
 * COMBIEN DE PHOTOS SUR CETTE DOUBLE, ET POURQUOI (18/11, ajout de Mathias : « Tu dois avoir les règles pour déterminer le nombre de
 * photos qu'il faut par page ! »). La densité n'est pas un curseur global : c'est une DÉCISION par double, prise par une table de règles
 * écrites, générales (M-01), qui lisent des données mesurables, et dont le résultat cite les règles qui ont joué.
 *
 * `nombreVoulu(g, ctx)` : pour un groupe de photos candidat (un moment ou un morceau de moment), le nombre VOULU, ses bornes et ses
 * raisons. Le découpage (`decouperV2`, trame.ts) cherche les coupures qui s'en écartent le moins, sous les règles de RYTHME (état du
 * découpage). `phraseDouble` dit, pour la double posée, « N photos ici parce que… » en mots d'atelier.
 * Module pur, déterministe.
 */

import { REGLAGES_V2 } from "./reglagesCompositeur";
import { belle } from "./selectionV2";
import type { Ph } from "./selection";

const R = REGLAGES_V2;

/** LA TABLE DE DÉCISION, en clair (reprise telle quelle dans `docs/moteur/tunnel/DEFINITION.md`, corrigeable ligne par ligne). */
export const TABLE_DENSITE: readonly { id: string; si: string; alors: string; pourquoi: string; exception: string }[] = [
  { id: "N-44", si: "toujours", alors: `${R.PHOTOS_MAX_DOUBLE} photos au plus sur une double ; ${R.PHOTOS_MAX_SERIE} en série voulue (planche-contact, photomaton)`, pourquoi: "décision 8 de Mathias", exception: "le profil festif monte le plafond de série (PARAMETRES)" },
  { id: "N-45", si: "une photo de la double montre des personnes", alors: `${R.PERSONNES_MAX_DOUBLE} photos au plus`, pourquoi: "M-08 : une photo de gens garde 70 mm de côté et 100 cm²", exception: "aucune" },
  { id: "N-46", si: "les formats des photos", alors: "très larges seules : 6 au plus (trois bandes par page) ; verticales seules : 8 ; formats mêlés : 7", pourquoi: "une très large prend une bande, une verticale une colonne : la page a une capacité", exception: "une série voulue suit N-44" },
  { id: "N-46b", si: "une photo n'a pas la définition d'une demi-page", alors: "elle ne se pose jamais seule : 2 photos au moins", pourquoi: "une photo faible en pixels ne peut pas être grande (S-004)", exception: "aucune" },
  { id: "N-49", si: "une BELLE photo (note image forte, définition suffisante, aucun défaut, un point d'accroche pour un paysage) ou un coup de cœur", alors: "dans le dixième le plus fort du lot : seule (1 photo) ; sinon à deux (pleine et encadrée) ; jamais dans une double dense (6 et plus)", pourquoi: "une belle photo n'est jamais noyée (V2-NOT-04, V2-NOT-05)", exception: "un moment très chargé en densité serrée : à deux" },
  { id: "N-23", si: "le sommet du magazine (la plus forte entre 55 et 85 % du livre)", alors: "1 photo", pourquoi: "S-053 : le sommet est seul", exception: "aucune" },
  { id: "N-48", si: "le moment : photos gardées sur cette période", alors: "voulu = densité visée × √(photos du moment ÷ photos d'un moment ordinaire), borné par N-44 à N-46", pourquoi: "on photographie plus quand ça compte (Notion R-40) : une période chargée n'est jamais étalée en doubles vides", exception: "N-49 et N-23 priment" },
  { id: "N-47", si: "le rythme du magazine", alors: `jamais plus de ${R.DENSES_DE_SUITE} doubles denses (${R.DENSE_MIN} et plus) d'affilée ; après ${R.CHARGEES_DE_SUITE} doubles chargées (${R.CHARGEE_MIN} et plus), une respiration à 1 ou 2 photos ; chaque chapitre a une page récit (3 et plus)`, pourquoi: "Notion Mai, S-051, S-087", exception: "un chapitre de moins de 3 photos n'a pas de page récit" },
  { id: "N-50", si: "une paire (pancarte + sujet, portrait + ambiance, large + détail) ou une série", alors: "indivisible : jamais coupée entre deux doubles ; un détail n'est jamais seul", pourquoi: "Notion Av #08, #16, #18 ; S-032", exception: "une coupure est permise si rien d'autre ne tient, et elle coûte" },
  { id: "N-48b", si: "le profil et l'ambiance", alors: "la densité visée est le milieu de la fourchette du profil (PARAMETRES) ; sobre : un demi-cran plus bas ; stylisée : un demi-cran plus haut", pourquoi: "M-06 : le profil change les réglages, jamais les règles", exception: "aucune" },
  { id: "N-47b", si: "la taille du magazine (décision 1, réglage « serrée »)", alors: "si les bonnes photos ne tiennent pas à la densité visée, la densité monte jusqu'au plafond du profil AVANT toute réserve « pas de place »", pourquoi: "décision 1 : serrer avant de mettre une bonne photo en réserve", exception: "réglage « avant » : 2,9 photos par double, le reste en réserve" },
];

export type CtxDensite = {
  /** La densité visée (photos par double), déjà réglée par le profil, l'ambiance et la taille (N-48b, N-47b). */
  moyenne: number;
  plafond: number;
  maxDouble: number;
  maxSerie: number;
  serree: boolean;
  /** Photos gardées par moment (clé du moment) et la médiane : la charge d'une période. */
  momentTaille: ReadonlyMap<string, number>;
  medianeMoment: number;
  sommetId: string | null;
  dpiDouble150: boolean;
  /** V2-NOT-05 : la note image du dixième le plus fort du lot ; au-dessus, la belle photo se pose SEULE, en dessous à deux. */
  seuilTopImage?: number;
  /** v2.1 : le recadrage par ce qu'on coupe est actif (M-29) ; une page ne reste jamais presque vide (M-07 dure). */
  recadrage?: boolean;
};

export type Voulu = { cible: number; min: number; max: number; regles: string[]; belle: Ph | null; serie: boolean; personnes: boolean; moment: number };

const momentDe = (g: readonly Ph[]): string => {
  const n = new Map<string, number>();
  for (const x of g) { const k = x.moment ?? `seule:${x.id}`; n.set(k, (n.get(k) ?? 0) + 1); }
  return [...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? "";
};

/** Le groupe forme-t-il une SÉRIE voulue (même série v2 d'au moins 3, hors quasi-identiques) ? */
export const serieVoulue = (g: readonly Ph[]): boolean => g.length >= 3 && !!g[0].v2?.serie && g[0].v2.serie.type !== "quasi_identiques" && g.every((x) => x.v2?.serie?.id === g[0].v2!.serie!.id);

/** La table appliquée à un groupe candidat. */
export function nombreVoulu(g: readonly Ph[], c: CtxDensite): Voulu {
  const regles: string[] = [];
  const serie = serieVoulue(g);
  let max = serie ? c.maxSerie : c.maxDouble;
  regles.push("N-44");
  const personnes = g.some((x) => x.nbPers > 0);
  if (personnes && !serie && R.PERSONNES_MAX_DOUBLE < max) { max = R.PERSONNES_MAX_DOUBLE; regles.push("N-45"); }
  /* v2.1 (M-29) : une très large RECADRABLE compte comme une photo de format libre */
  const U = g.filter((x) => x.r >= 1.6 && !x.v2?.recadrable).length, V = g.filter((x) => x.r <= 0.9 || !!x.v2?.recadrable).length;
  const cap = serie ? max : U === g.length ? 6 : V === g.length ? 8 : 7;
  if (cap < max) { max = cap; regles.push("N-46"); }
  let min = 1;
  if (g.some((x) => x.dpi.demi < 200 && x.dpi.pleine < 200)) { min = 2; regles.push("N-46b"); }
  const mom = c.momentTaille.get(momentDe(g)) ?? g.length;
  const b = g.find((x) => belle(x, c.dpiDouble150)) ?? null;
  let cible: number;
  if (c.sommetId && g.some((x) => x.id === c.sommetId)) { cible = 1; regles.push("N-23"); }
  else if (b) {
    /* v2.1 (M-07 dure) : une belle verticale seule laisserait la page d'en face vide : elle va à deux (pleine et encadrée) ; une très large
       belle traverse la double, seule */
    const seule = (b.v2?.notes?.image.valeur ?? 0) >= (c.seuilTopImage ?? 0) && !(c.serree && mom > 2 * c.moyenne) && !(c.recadrage && belle(b, c.dpiDouble150) === "pleine");
    cible = seule ? 1 : 2; regles.push("N-49");
  }
  else {
    cible = Math.round(c.moyenne * Math.sqrt(mom / Math.max(1, c.medianeMoment)));
    regles.push("N-48");
    if (c.serree && c.moyenne > 3.2) regles.push("N-47b");
  }
  cible = Math.max(min, Math.min(max, cible));
  return { cible, min, max, regles, belle: b, serie, personnes, moment: mom };
}

/** « N photos ici parce que… » pour une double POSÉE (mots d'atelier, 2 à 12 mots par raison). */
export function phraseDouble(g: readonly Ph[], v: Voulu, rythme: { respiration: boolean }, c: CtxDensite): { phrase: string; regles: string[] } {
  const n = g.length;
  const nb = `${n} photo${n > 1 ? "s" : ""}`;
  if (n === 1 && c.sommetId === g[0].id) return { phrase: `${nb} : le sommet du magazine, seule sur sa double`, regles: ["N-23", "S-053"] };
  if (v.belle && n <= 2) return { phrase: `${nb} : la plus forte de son moment, elle se pose ${n === 1 ? "seule" : "presque seule"}`, regles: ["N-49", "V2-NOT-04"] };
  if (rythme.respiration && n <= 2) return { phrase: `${nb} : une respiration après quatre doubles chargées`, regles: ["N-47", "S-051"] };
  if (v.serie) return { phrase: `${nb} : une série (${g[0].v2!.serie!.type}), elle reste ensemble`, regles: ["N-50", "N-44", "S-032"] };
  const regles = [...v.regles];
  const morceaux: string[] = [];
  if (n === 1) morceaux.push(v.moment <= 1 ? "la seule photo gardée de ce moment" : "une photo qui tient la double");
  else {
    const moments = new Set(g.map((x) => x.moment ?? x.id)).size;
    const domine = n >= R.CHARGEE_MIN && !g.some((x) => x.v2?.notes?.image.cran === "forte") ? ", aucune ne domine" : "";
    morceaux.push(moments <= 1 ? `${v.moment} photos gardées sur ce moment${domine}` : `${n} photos de ${moments} moments proches de la même période${domine}`);
  }
  if (n >= v.max && v.regles.includes("N-45")) morceaux.push("plafonnée : des personnes, chacune garde 70 mm");
  else if (n >= v.max && v.regles.includes("N-46")) morceaux.push("plafonnée par les formats");
  if (c.serree && n > 3 && c.moyenne > 3.2) morceaux.push("serrée pour garder les bonnes photos");
  if (v.min >= 2 && n <= 2) morceaux.push("une photo trop petite pour être seule");
  return { phrase: `${nb} : ${morceaux.join(" ; ")}`, regles };
}
