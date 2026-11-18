/**
 * La lecture COMPLÈTE côté navigateur (18/11/2026, feat/analyse-et-v2, point 3) : les appels qui manquent à une lecture pour porter tous les
 * tags de la définition (planches de complément, regards complémentaires, classement des couvertures), et eux seuls. Les choix (quelles
 * photos, quels champs, quel coût) sont dans le module pur (`editeur/lectureComplete.ts`) ; la route relit tout. M-13 : jamais une case
 * vide (une image qui ne vient pas est retirée de la planche ; au-delà de 10 %, arrêt avant de payer). Rien n'est écrit en base ; les
 * images partent et sont oubliées. N'importe aucun écran : l'écran appelle `completerLecture` et `estimerComplement`.
 */

import {
  CLASSEMENT_MIN, MODELE_PLANCHE, MODELE_REGARD, appliquerComplement, arretIllisibles, classementVersPhotos, entonnoirA, planComplement, planchesDe,
  plancheSansVide, triDe,
  type ChampsComplement, type CouvertureClassee, type EtatEditeur, type LectureIA, type LuComplement, type LuRegardComplement, type PlanComplement,
} from "@/lib/mise-en-page/editeur";
import type { Adresse } from "./contexte";
import { chargerImages, composerPlanche, imageRegard } from "./lireLesPhotosClient";

const ROUTE = "/api/admin/atelier/mise-en-page/lecture-ia";
const EN_VOL = 3;
const QUAND = () => new Date().toISOString();

export type EtapeComplement = "planches" | "regards" | "classement";
type Reponse<T> = { ok: true; resultat: T; dollars: number; modele: string } | { ok: false; erreur: string; statut: number; dollars: number };

async function poster<T>(corps: Record<string, unknown>, signal: AbortSignal): Promise<Reponse<T>> {
  try {
    const r = await fetch(ROUTE, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(corps), signal });
    const j = (await r.json().catch(() => null)) as { ok?: boolean; resultat?: T; dollars?: number; modele?: string; error?: string } | null;
    const dollars = typeof j?.dollars === "number" && Number.isFinite(j.dollars) ? j.dollars : 0;
    if (r.ok && j?.ok && j.resultat !== undefined) return { ok: true, resultat: j.resultat, dollars, modele: j.modele ?? "" };
    return { ok: false, erreur: j?.error ?? "erreur", statut: r.status, dollars };
  } catch {
    return { ok: false, erreur: signal.aborted ? "arrete" : "reseau", statut: 0, dollars: 0 };
  }
}

/** Les photos que l'entonnoir A envoie (dans l'ordre d'envoi), par défaut. */
const luesDe = (etat: EtatEditeur): string[] => entonnoirA(etat.catalogue, etat.lecture, new Set(triDe(etat.magazine).ecartees)).lues;

/** Le coût annoncé AVANT (chiffres du banc, `BANC_18_11_COMPLEMENT`), et ce qui sera demandé. Aucun appel. */
export function estimerComplement(etat: EtatEditeur, lues?: readonly string[]): PlanComplement {
  return planComplement(etat.lectureIA?.source ?? null, etat.catalogue, lues ?? luesDe(etat));
}

export type IssueComplement = {
  /** Le coût RÉEL de ce passage. */
  dollars: number;
  /** La lecture complétée (null s'il n'y avait aucune lecture à compléter). */
  lecture: LectureIA | null;
  /** M-13 : la phrase d'arrêt (images illisibles), quand on s'est arrêté avant de payer plus. */
  arret?: string;
  /** Une erreur qui bloque la suite (401, 403, 503 : session, IA fermée, clé absente), en code de la route. */
  bloquant?: string;
};

/**
 * Complète la lecture du projet : planches de complément, puis regards complémentaires (choisis APRÈS les planches, qui disent qui a des
 * gens), puis classement des couvertures. `poser` reçoit chaque lecture intermédiaire (l'écran la garde et l'adopte). Rend le coût réel.
 */
export async function completerLecture(o: {
  cle: string; etat: EtatEditeur; adresses: ReadonlyMap<string, Adresse>; signal: AbortSignal;
  surAvance?: (etape: EtapeComplement, fait: number, total: number) => void; poser: (lecture: LectureIA) => void; lues?: readonly string[];
}): Promise<IssueComplement> {
  const { cle, etat, adresses, signal } = o;
  const cat = etat.catalogue;
  const lues = o.lues ?? luesDe(etat);
  let lecture = etat.lectureIA?.source ?? null;
  if (!lecture) return { dollars: 0, lecture: null };
  let dollars = 0;
  let bloquant: string | undefined;
  let arret: string | undefined;
  const modeles = new Set<string>();
  const avance = (e: EtapeComplement, fait: number, total: number) => o.surAvance?.(e, fait, total);
  const appliquer = (planche: Map<string, LuComplement>, regard: Map<string, LuRegardComplement>, classement: Map<string, CouvertureClassee> | null, d: number) => {
    lecture = appliquerComplement(lecture!, cat, { planche, regard, classement, dollars: d, modeles: [...modeles], quand: QUAND() });
    o.poser(lecture);
  };
  const stop = (r: { ok: false; statut: number; erreur: string }) => { if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur; };

  /* P : les planches de complément (« six », puis « dix » pour une lecture d'avant B5), jamais une case vide */
  const plan = planComplement(lecture, cat, lues);
  const lots: { champs: ChampsComplement; n0: number; ids: string[] }[] = (["six", "dix"] as const).flatMap((champs) =>
    planchesDe(plan.planche.filter((x) => x.champs === champs).map((x) => x.id)).map((l) => ({ champs, ...l })));
  const planche = new Map<string, LuComplement>();
  let dP = 0, faits = 0, suivant = 0;
  avance("planches", 0, lots.length);
  await Promise.all(Array.from({ length: Math.min(EN_VOL, lots.length) }, async () => {
    while (!signal.aborted && !bloquant && !arret && suivant < lots.length) {
      const lot = lots[suivant++];
      const ims = await chargerImages(lot.ids, (id) => adresses.get(id), signal);
      if (signal.aborted) { for (const im of ims.values()) im?.close(); return; }
      const p = plancheSansVide(lot.ids, (id) => !!ims.get(id), lot.n0);
      const a = arretIllisibles(lot.ids.length, p.illisibles.length);
      if (a.arreter) { for (const im of ims.values()) im?.close(); arret = a.phrase; return; }
      for (const id of p.illisibles) ims.get(id)?.close();
      if (p.ids.length) {
        const image = composerPlanche(p.ids.map((id) => ims.get(id)!), p.n0);
        const r = await poster<{ photos: LuComplement[]; absents: number[] }>({ cle, etape: "complement", image, numeros: [p.n0, p.ids.length], champs: lot.champs }, signal);
        dP += r.dollars;
        if (r.ok) { modeles.add(r.modele || MODELE_PLANCHE); for (const x of r.resultat.photos) { const id = p.ids[x.numero - p.n0]; if (id) planche.set(id, x); } }
        else stop(r);
      }
      faits += 1;
      avance("planches", faits, lots.length);
    }
  }));
  dollars += dP;
  if (planche.size || dP) appliquer(planche, new Map(), null, dP);
  if (signal.aborted || bloquant || arret) return { dollars, lecture, ...(arret ? { arret } : {}), ...(bloquant ? { bloquant } : {}) };

  /* R : le regard complémentaire, choisi APRÈS les planches (elles disent qui a des gens) */
  const plan2 = planComplement(lecture, cat, lues);
  const regard = new Map<string, LuRegardComplement>();
  let dR = 0, k = 0, fait = 0, illisibles = 0;
  avance("regards", 0, plan2.regard.length);
  await Promise.all(Array.from({ length: Math.min(EN_VOL, plan2.regard.length) }, async () => {
    while (!signal.aborted && !bloquant && !arret && k < plan2.regard.length) {
      const id = plan2.regard[k++];
      const image = await imageRegard(adresses.get(id), signal);
      if (!image) { illisibles += 1; const a = arretIllisibles(plan2.regard.length, illisibles); if (a.arreter) arret = a.phrase; }
      else if (!signal.aborted) {
        const r = await poster<LuRegardComplement>({ cle, etape: "regard_complement", image }, signal);
        dR += r.dollars;
        if (r.ok) { modeles.add(r.modele || MODELE_REGARD); regard.set(id, r.resultat); } else stop(r);
      }
      fait += 1;
      avance("regards", fait, plan2.regard.length);
    }
  }));
  dollars += dR;
  if (regard.size || dR) appliquer(new Map(), regard, null, dR);
  if (signal.aborted || bloquant || arret) return { dollars, lecture, ...(arret ? { arret } : {}), ...(bloquant ? { bloquant } : {}) };

  /* K : le classement des couvertures (une planche de 16 au plus, numérotée de 1 à n ; une image absente est retirée) */
  const plan3 = planComplement(lecture, cat, lues);
  if (plan3.classement) {
    avance("classement", 0, 1);
    const ims = await chargerImages(plan3.classement, (id) => adresses.get(id), signal);
    const ids = plan3.classement.filter((id) => !!ims.get(id));
    for (const id of plan3.classement) if (!ims.get(id)) ims.get(id)?.close();
    if (!signal.aborted && ids.length >= CLASSEMENT_MIN) {
      const image = composerPlanche(ids.map((id) => ims.get(id)!), 1);
      const r = await poster<{ numero: number; rang: number; type: CouvertureClassee["type"]; raison: string }[]>({ cle, etape: "classement", image, numeros: [1, ids.length] }, signal);
      dollars += r.dollars;
      if (r.ok) { modeles.add(r.modele || MODELE_PLANCHE); appliquer(new Map(), new Map(), classementVersPhotos(ids, r.resultat), r.dollars); }
      else { stop(r); if (r.dollars) appliquer(new Map(), new Map(), null, r.dollars); }
    } else for (const id of ids) ims.get(id)?.close();
    avance("classement", 1, 1);
  }
  return { dollars, lecture, ...(bloquant ? { bloquant } : {}) };
}
