/**
 * LES CINQ NOTES LISIBLES (définition v2 du 18/11, décision 5 de Mathias : « OUI ») : la note unique et opaque disparaît.
 *
 *   technique « elle s'imprime bien »          netteté du sujet (relative au lot), définition, provenance
 *   histoire  « elle compte pour le récit »    intérêt lu, lieu lu, geste, groupe posé (un jalon)
 *   image     « elle tient seule, en grand »   force d'image lue (sinon l'intérêt), lumière dorée, point d'accroche, coup de cœur
 *   gens      « on y voit les nôtres »         nombre de personnes, taille des visages, expression, groupe complet, spontané
 *   unicité   « on n'a rien d'autre de ce moment »  seule trace du moment, distance d'empreinte aux voisines du moment
 *
 * Chaque note va de 0 à 1 et s'affiche en MOTS, sur quatre crans PRIS DANS LE LOT (quarts du lot, N-40, V2-NOT-01) : jamais un seuil
 * absolu, parce que l'IA note planche par planche. Chaque note porte sa PHRASE d'explication. Une borne n'est pas une note : la taille
 * possible (définition) plafonne tout. Module pur, déterminisme garanti (aucune horloge, aucun hasard).
 */

import { REGLAGES_V2 } from "./reglagesCompositeur";
import type { Ph } from "./selection";
import type { CinqNotes, Cran, NoteLisible } from "./types";

const borne = (v: number): number => Math.max(0, Math.min(1, v));
const r2 = (v: number): number => Math.round(v * 100) / 100;
const virgule = (v: number, d = 2): string => v.toFixed(d).replace(".", ",");

/** Les bits qui diffèrent entre deux empreintes dHash de 16 hexas (64 si l'une manque ou est mal formée). */
export function distanceEmpreinte(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b || !/^[0-9a-f]{16}$/i.test(a) || !/^[0-9a-f]{16}$/i.test(b)) return 64;
  let d = 0;
  for (let i = 0; i < 16; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d;
}

/** Les seuils de crans d'une note, pris dans le lot (quarts). */
export function quarts(valeurs: readonly number[]): [number, number, number] {
  const t = [...valeurs].sort((a, b) => a - b);
  if (!t.length) return [0.25, 0.5, 0.75];
  const q = (f: number) => t[Math.min(t.length - 1, Math.max(0, Math.floor(f * t.length)))];
  return [q(REGLAGES_V2.CRAN_BAS), q(REGLAGES_V2.CRAN_MILIEU), q(REGLAGES_V2.CRAN_HAUT)];
}
export const cranDe = (v: number, q: readonly [number, number, number]): Cran => (v < q[0] ? "faible" : v < q[1] ? "correcte" : v < q[2] ? "bonne" : "forte");
const RANG: Readonly<Record<Cran, number>> = { faible: 0, correcte: 1, bonne: 2, forte: 3 };
export const auMoins = (n: NoteLisible | undefined, c: Cran): boolean => !!n && RANG[n.cran] >= RANG[c];

type Brutes = { technique: [number, string]; histoire: [number, string]; image: [number, string]; gens: [number, string]; unicite: [number, string] };

/** La taille du plus grand visage (fraction de la largeur de la photo). */
const visageMax = (x: Ph): number => x.visages.reduce((m, v) => Math.max(m, v[2]), 0);

function brutes(x: Ph, groupe: number, voisines: readonly Ph[]): Brutes {
  const R = REGLAGES_V2;
  const ia = x.v2?.ia ?? null;
  /* technique */
  const tNet = borne(x.net / R.NET_REFERENCE), tDpi = borne(x.dpi.pleine / R.DPI_REFERENCE);
  const technique = borne(0.5 * tNet + 0.3 * tDpi + 0.2 * (x.msg ? 0 : 1) - (x.v2?.floue ? 0.2 : 0));
  const pT = [`netteté ${virgule(x.net, 1)} fois la médiane du lot`, `${x.dpi.pleine} ppp en pleine page`, ...(x.msg ? ["image reçue par messagerie"] : []), ...(x.v2?.floue ? ["floue à la lecture"] : [])].join(", ");
  /* histoire */
  const hBase = ia ? ia.interet : 0.6;
  const hPlus: string[] = [];
  let h = hBase;
  if (x.lieuSur) { h += 0.08; hPlus.push("un lieu lu"); }
  if (ia?.geste) { h += 0.08; hPlus.push("une action"); }
  if (ia?.pose === "pose" && x.nbPers >= 3) { h += 0.05; hPlus.push("un groupe posé (un jalon)"); }
  const pH = `${ia ? `intérêt lu ${virgule(hBase)}` : "pas de lecture : intérêt neutre 0,60"}${hPlus.length ? `, ${hPlus.join(", ")}` : ""}`;
  /* image */
  const lue = typeof ia?.forceImage === "number";
  let im = lue ? ia!.forceImage! : hBase * 0.9;
  const iPlus: string[] = [lue ? `force d'image lue ${virgule(ia!.forceImage!)}` : "force d'image non lue : l'intérêt sert de repli"];
  if (ia?.momentJournee === "dore") { im += 0.06; iPlus.push("lumière dorée"); }
  if (x.calme) { im += 0.03; iPlus.push("une zone calme pour un titre"); }
  if (ia?.pointAccroche) { im += 0.05; iPlus.push("un point d'accroche"); }
  if (ia?.yeuxFermes === "oui") { im -= 0.2; iPlus.push("yeux fermés"); }
  if (ia?.expression === "grimace_subie") { im -= 0.2; iPlus.push("une grimace subie"); }
  if (x.v2?.coeur) { im = Math.max(im, 0.95); iPlus.push("coup de cœur"); }
  /* gens */
  let g = 0;
  let pG = "personne sur la photo";
  if (x.nbPers > 0) {
    g = 0.35 + 0.1 * Math.min(x.nbPers, 4) + Math.min(0.2, 2 * visageMax(x));
    const gp: string[] = [`${x.nbPers >= 7 ? "sept personnes et plus" : `${x.nbPers} personne${x.nbPers > 1 ? "s" : ""}`}${x.v2?.personnesDeduites ? " (comptées par les visages)" : ""}`];
    if (groupe >= 2 && x.nbPers >= groupe) { g += 0.15; gp.push("le groupe entier"); }
    if (ia?.expression === "rire" || ia?.expression === "sourire") { g += 0.1; gp.push(ia.expression === "rire" ? "un rire" : "un sourire"); }
    if (ia?.pose === "spontane") { g += 0.05; gp.push("prise sur le vif"); }
    if (visageMax(x) && visageMax(x) < 0.04) { g -= 0.15; gp.push("visages minuscules"); }
    pG = gp.join(", ");
  }
  /* unicité */
  let u = 1;
  let pU = "la seule photo gardée de ce moment";
  if (voisines.length) {
    const dmin = Math.min(...voisines.map((v) => distanceEmpreinte(x.v2?.empreinte, v.v2?.empreinte)));
    u = dmin < 64 ? borne(0.25 + 0.75 * (dmin / 32)) * (1 / Math.sqrt(1 + voisines.length / 6)) : borne(1 / Math.sqrt(1 + voisines.length));
    pU = `le moment compte ${voisines.length + 1} photos${dmin < 64 ? ` ; la plus proche diffère de ${dmin} bits sur 64` : ""}`;
  }
  return { technique: [technique, pT], histoire: [borne(h), pH], image: [borne(im), iPlus.join(", ")], gens: [borne(g), pG], unicite: [borne(u), pU] };
}

/**
 * Note TOUT le lot (les photos non écartées) : crans par quarts du lot ; `groupe` = la taille du groupe (fiche, sinon comptée).
 * Écrit `x.v2.notes` et `x.v2.seuleTrace`. Les photos sans personne n'entrent pas dans les quarts de la note « gens ».
 */
export function noterCinq(lot: readonly Ph[], groupe: number): void {
  const parMoment = new Map<string, Ph[]>();
  for (const x of lot) { const k = x.moment ?? `seule:${x.id}`; parMoment.set(k, [...(parMoment.get(k) ?? []), x]); }
  const b = new Map(lot.map((x) => [x.id, brutes(x, groupe, (parMoment.get(x.moment ?? `seule:${x.id}`) ?? []).filter((y) => y !== x))]));
  const noms = ["technique", "histoire", "image", "gens", "unicite"] as const;
  const q = Object.fromEntries(noms.map((n) => [n, quarts(lot.filter((x) => n !== "gens" || x.nbPers > 0).map((x) => b.get(x.id)![n][0]))])) as Record<(typeof noms)[number], [number, number, number]>;
  for (const x of lot) {
    if (!x.v2) continue;
    const v = b.get(x.id)!;
    const note = (n: (typeof noms)[number]): NoteLisible => {
      const [val, phrase] = v[n];
      const cran: Cran = n === "gens" && x.nbPers === 0 ? "faible" : cranDe(val, q[n]);
      return { valeur: r2(val), cran, phrase };
    };
    x.v2.notes = { technique: note("technique"), histoire: note("histoire"), image: note("image"), gens: note("gens"), unicite: note("unicite") } satisfies CinqNotes;
    x.v2.seuleTrace = (parMoment.get(x.moment ?? `seule:${x.id}`) ?? []).length === 1;
  }
}

/** Les cinq notes en une ligne de mots d'atelier (« Technique bonne · Histoire forte · … »). */
export const motsDesNotes = (n: CinqNotes): string =>
  `Technique ${n.technique.cran} · Histoire ${n.histoire.cran} · Image ${n.image.cran} · Gens ${n.gens.cran} · Unicité ${n.unicite.cran}`;

/** Le héros d'un moment (V2-NOT-03) : la meilleure « image », puis « gens », puis « histoire ». */
export const cleHeros = (x: Ph): [number, number, number] => [x.v2?.notes?.image.valeur ?? x.s, x.v2?.notes?.gens.valeur ?? 0, x.v2?.notes?.histoire.valeur ?? x.s];
