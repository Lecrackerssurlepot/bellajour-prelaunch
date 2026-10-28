/**
 * Le passage de rattrapage d'une édition (T-194, T-171) et le passage
 * quotidien. Module À EFFETS (Supabase, R2, service key) : serveur uniquement.
 * Les règles sont dans `rattrapage.ts` (pur, au harnais) ; ici, l'ordre.
 *
 * Trois déclencheurs, AUCUN cron neuf (Vercel Hobby) :
 * - la fiche de l'édition dans l'atelier (`/admin/collectif/[id]`), en
 *   `after()` : la page est servie d'abord, le passage tourne ensuite ;
 * - la page Photos du responsable (`/edition/[token]/photos`), pareil ;
 * - la relève quotidienne de l'atelier (`/api/atelier/mails/relever`), après
 *   sa réponse : `rattrapageQuotidien`, sur les éditions en collecte.
 *
 * L'ORDRE D'UN PASSAGE
 * 1. Trois lectures ensemble : les lignes déclarées depuis plus de dix minutes,
 *    les photos confirmées sans vignette, les dernières lignes du rattrapage.
 * 2. Rien à faire : on s'arrête là, SANS écrire (la fiche se rouvre souvent).
 * 3. Le verrou (`etatVerrou`) : un passage tourne, ou un autre vient de finir :
 *    on s'arrête aussi.
 * 4. `rattrapage_demarre`, relu : deux démarrages croisés, le plus récent cède.
 * 5. Peu de lignes : une tête (HEAD) chacune. Beaucoup : la liste du dossier
 *    du coffre d'abord, puis une tête pour celles qui y sont. Chaque photo
 *    arrivée et sous la taille maximale se confirme par `confirmerArrivee`
 *    (LA fonction de `depot/complete`).
 * 6. Les vignettes qui manquent (`fabriquerVignettes`) : les retrouvées
 *    d'abord, puis les autres confirmées sans vignette.
 * 7. La fin (`photos_rattrapees` ou `rattrapage_fini`), puis les échecs du
 *    passage (T-160), puis la lecture des métadonnées des retrouvées
 *    (`enrichirCollectif`, comme après `complete`).
 *
 * Ne lève JAMAIS : un passage raté ne fait tomber ni la fiche, ni la page du
 * responsable, ni la relève des particuliers.
 *
 * Recette Audencia du 28/10 : une ligne déclarée sur un appareil puis coupée,
 * que la même personne a depuis envoyée par un AUTRE appareil (une photo
 * arrivée, hors corbeille, même fichier sel mis à part : `remplaceesParmi`),
 * n'est PLUS candidate. Confirmée parce que son objet est au coffre, elle
 * ferait revenir le doublon que `depot/presign` refuse désormais. Elle reste en
 * base, telle quelle (rien n'est effacé). Ces lignes illisibles : aucune
 * confirmation dans ce passage (le suivant reprendra), jamais un doublon.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lireEnSuspens } from "./collecte";
import { enrichirCollectif } from "./enrichissement";
import { noterEchec } from "./echecsJournal";
import { collectifOuvert } from "./interrupteur";
import { journaliser } from "./journal";
import { lireToutesLesLignes } from "./lignes";
import {
  aExaminer,
  bilanVide,
  BUDGET_RATTRAPAGE_MS,
  cessionDe,
  CONFIRMATIONS_PAR_PASSAGE,
  demarrageDe,
  doitCeder,
  editionsDuPassageQuotidien,
  estCandidate,
  etatVerrou,
  EVTS_RATTRAPAGE,
  finDePassage,
  impossiblesRecentes,
  issueTete,
  PASSAGES_MEMOIRE,
  seuilCandidates,
  strategie,
  type BilanRattrapage,
  type Declencheur,
  type EvenementRattrapage,
} from "./rattrapage";
import { clesDuCoffre, confirmerArrivee, teteObjet } from "./rattrapageCoffre";
import { fabriquerVignettes, type PhotoSansVignette } from "./rattrapageVignettes";

/** Les photos confirmées sans vignette lues par passage (les plus récentes) : la file est bornée bien en dessous. */
const SANS_VIGNETTE_LUES = 200;
/** Les têtes au coffre en même temps (le patron de `depot/complete`). */
const TETES_ENSEMBLE = 8;

type Candidate = { id: string; r2_key: string; created_at: string; confirmee_le: string | null; mime: string | null; taille: number | null };

export type IssuePassage = {
  statut: "rien" | "en_cours" | "repos" | "cede" | "fait" | "erreur";
  bilan: BilanRattrapage;
};

/**
 * Les gestes vers le coffre et l'enrichissement. Les vrais par défaut ; le
 * harnais passe les siens (un faux coffre) pour jouer le passage entier sans
 * réseau. Aucun appelant de production ne les remplace.
 */
export type Outils = {
  /** Les lignes « remplacées » parmi les déclarées avant `seuil` (`null` : base illisible). */
  remplacees: (supabase: SupabaseClient, editionId: string, seuil: string) => Promise<Set<string> | null>;
  tete: typeof teteObjet;
  liste: typeof clesDuCoffre;
  confirmer: typeof confirmerArrivee;
  vignettes: typeof fabriquerVignettes;
  enrichir: typeof enrichirCollectif;
};

/** Les remplacées, par la lecture commune (`lireEnSuspens`, bornée aux lignes candidates : avant le seuil). */
async function remplaceesAvant(supabase: SupabaseClient, editionId: string, seuil: string): Promise<Set<string> | null> {
  const lu = await lireEnSuspens(supabase, editionId, new Date(0), new Date(seuil));
  return lu ? lu.remplacees : null;
}

const OUTILS: Outils = { remplacees: remplaceesAvant, tete: teteObjet, liste: clesDuCoffre, confirmer: confirmerArrivee, vignettes: fabriquerVignettes, enrichir: enrichirCollectif };

function lireJournal(supabase: SupabaseClient, editionId: string) {
  return supabase
    .from("collectif_evenements")
    .select("id, type, payload, created_at")
    .eq("edition_id", editionId)
    .in("type", [...EVTS_RATTRAPAGE])
    .order("created_at", { ascending: false })
    .limit(PASSAGES_MEMOIRE * 2)
    .returns<EvenementRattrapage[]>();
}

/** Les échecs du passage, une ligne par étape (le frein de `noterEchec` fait le reste). */
async function noterPannes(supabase: SupabaseClient, editionId: string, b: BilanRattrapage): Promise<void> {
  const { lecture, coffre, ecriture } = b.pannes;
  if (lecture) await noterEchec(supabase, editionId, "rattrapage", { etape: "lecture", n: lecture });
  if (coffre) await noterEchec(supabase, editionId, "rattrapage", { etape: "coffre", n: coffre });
  if (ecriture) await noterEchec(supabase, editionId, "rattrapage", { etape: "ecriture", n: ecriture });
  if (b.vignettes.ratees) await noterEchec(supabase, editionId, "vignette", { n: b.vignettes.ratees });
}

/**
 * Un passage sur une édition. `jusqua` : l'instant après lequel rien de
 * nouveau ne commence (par défaut, maintenant + `BUDGET_RATTRAPAGE_MS`).
 */
export async function rattraperEdition(
  supabase: SupabaseClient,
  editionId: string,
  options: { declencheur: Declencheur; jusqua?: number },
  outils: Outils = OUTILS
): Promise<IssuePassage> {
  const bilan = bilanVide();
  const debut = Date.now();
  const jusqua = Math.min(options.jusqua ?? Infinity, debut + BUDGET_RATTRAPAGE_MS);
  try {
    const maintenant = new Date(debut);
    const seuil = seuilCandidates(maintenant);

    /* ── 1. trois lectures ensemble ── */
    const [lusCandidates, lusSansVignette, lusJournal] = await Promise.all([
      lireToutesLesLignes<Candidate>(
        () =>
          supabase
            .from("collectif_photos")
            .select("id, r2_key, created_at, confirmee_le, mime, taille")
            .eq("edition_id", editionId)
            .is("confirmee_le", null)
            .lte("created_at", seuil)
            .returns<Candidate[]>(),
        { colonne: "created_at", croissant: false },
        "photos à rattraper"
      ),
      supabase
        .from("collectif_photos")
        .select("id, r2_key, mime, taille, metadonnees_le, empreinte, largeur, hauteur")
        .eq("edition_id", editionId)
        .not("confirmee_le", "is", null)
        .is("vignette_key", null)
        .order("created_at", { ascending: false })
        .limit(SANS_VIGNETTE_LUES)
        .returns<PhotoSansVignette[]>(),
      lireJournal(supabase, editionId),
    ]);

    if (lusJournal.error) {
      /* Sans le journal, pas de verrou : on ne passe pas « au cas où » (patron du souvenir). */
      console.error("[collectif] rattrapage : journal illisible", editionId, lusJournal.error.code);
      bilan.pannes.lecture++;
      await noterPannes(supabase, editionId, bilan);
      return { statut: "erreur", bilan };
    }
    if (lusCandidates.error) {
      console.error("[collectif] rattrapage : photos déclarées illisibles", editionId, lusCandidates.error.code);
      bilan.pannes.lecture++;
    }
    if (lusSansVignette.error) {
      console.error("[collectif] rattrapage : photos sans vignette illisibles", editionId, lusSansVignette.error.code);
      bilan.pannes.lecture++;
    }

    const journal = lusJournal.data ?? [];
    let candidates = (lusCandidates.data ?? []).filter((l) => estCandidate(l, maintenant));
    /* Les remplacées (28/10) ne sont pas candidates : la même personne a déjà la photo, arrivée par un autre appareil. */
    if (candidates.length) {
      const remplacees = await outils.remplacees(supabase, editionId, seuil);
      if (!remplacees) {
        console.error("[collectif] rattrapage : lignes remplacées illisibles, aucune confirmation ce passage", editionId);
        bilan.pannes.lecture++;
        candidates = [];
      } else if (remplacees.size) candidates = candidates.filter((l) => !remplacees.has(l.id));
    }
    const exclues = impossiblesRecentes(journal);
    const autres = (lusSansVignette.data ?? []).filter((p) => !exclues.has(p.id));
    bilan.candidates = candidates.length;

    /* ── 2. rien à faire : rien d'écrit ── */
    if (!candidates.length && !autres.length) {
      if (bilan.pannes.lecture) await noterPannes(supabase, editionId, bilan);
      return { statut: bilan.pannes.lecture ? "erreur" : "rien", bilan };
    }

    /* ── 3. le verrou ── */
    const verrou = etatVerrou(journal, Date.now());
    if (!verrou.libre) return { statut: verrou.raison, bilan };

    /* ── 4. le démarrage, relu ── */
    const passage = randomUUID();
    const d = demarrageDe(passage, options.declencheur, candidates.length);
    if (!(await journaliser(supabase, { editionId }, d.type, d.payload, null))) {
      /* Le journal ne s'écrit pas : la base refusera vraisemblablement le reste. Le passage suivant reprendra. */
      bilan.pannes.ecriture++;
      return { statut: "erreur", bilan };
    }
    const relu = await lireJournal(supabase, editionId);
    if (!relu.error && doitCeder(relu.data ?? [], passage, Date.now())) {
      const c = cessionDe(passage, options.declencheur);
      await journaliser(supabase, { editionId }, c.type, c.payload, null);
      return { statut: "cede", bilan };
    }

    /* ── 5. le coffre, puis la confirmation ── */
    const nouvelles: string[] = [];
    const sansVignette: PhotoSansVignette[] = [];
    const s = strategie(candidates.length);
    let presentes: Set<string> | null = null;
    let examiner: Candidate[] = [];
    if (s === "liste") {
      presentes = await outils.liste(editionId);
      if (!presentes) bilan.pannes.coffre++;
    }
    if (s === "tetes" || presentes) {
      const plan = aExaminer(candidates, presentes, CONFIRMATIONS_PAR_PASSAGE);
      examiner = plan.examiner;
      bilan.absentes += plan.absentes;
      bilan.reportees += plan.reportees;
    }
    const maintenantIso = new Date().toISOString();
    let k = 0;
    await Promise.all(
      Array.from({ length: Math.min(TETES_ENSEMBLE, examiner.length) }, async () => {
        for (;;) {
          const i = k++;
          if (i >= examiner.length) return;
          if (Date.now() >= jusqua) {
            bilan.reportees++;
            continue;
          }
          const l = examiner[i];
          const tete = await outils.tete(l.r2_key);
          const issue = issueTete(tete);
          if (issue === "absente") bilan.absentes++;
          else if (issue === "panne") bilan.pannes.coffre++;
          /* Trop lourde : laissée telle quelle (on n'efface pas d'office ce qu'on n'a pas vu arriver). */
          else if (issue === "trop_lourde") bilan.tropLourdes++;
          else if (tete.statut === "presente") {
            const r = await outils.confirmer(supabase, editionId, l, tete.taille, maintenantIso);
            if (r.statut === "erreur") bilan.pannes.ecriture++;
            else if (r.statut === "nouvelle") {
              bilan.retrouvees++;
              nouvelles.push(l.id);
              if (!r.vignette) sansVignette.push({ id: l.id, r2_key: l.r2_key, mime: l.mime, taille: tete.taille, metadonnees_le: null, empreinte: null });
            }
          }
        }
      })
    );

    /* ── 6. les vignettes qui manquent ── */
    bilan.vignettes = await outils.vignettes(supabase, editionId, sansVignette, { autres, exclues, jusqua });

    /* ── 7. la fin, les échecs, les métadonnées ── */
    const f = finDePassage(passage, options.declencheur, bilan);
    await journaliser(supabase, { editionId }, f.type, f.payload, null);
    await noterPannes(supabase, editionId, bilan);
    if (nouvelles.length) await outils.enrichir(supabase, editionId, nouvelles);
    return { statut: "fait", bilan };
  } catch (err) {
    console.error("[collectif] rattrapage : exception", editionId, (err as Error)?.message);
    return { statut: "erreur", bilan };
  }
}

/**
 * Le passage quotidien, depuis la relève de l'atelier : chaque édition en
 * collecte (ou close depuis moins de deux jours), l'une après l'autre, tant
 * que l'échéance le permet. Coupé si `COLLECTIF_OUVERT` est fermé.
 */
export async function rattrapageQuotidien(supabase: SupabaseClient, jusqua: number): Promise<{ editions: number; retrouvees: number; vignettes: number } | null> {
  try {
    if (!collectifOuvert()) return null;
    type E = { id: string; etat: string; cloture_le: string | null; archive_le: string | null; photos_supprimees_le: string | null; etat_maj_le: string | null };
    const { data, error } = await supabase
      .from("collectif_editions")
      .select("id, etat, cloture_le, archive_le, photos_supprimees_le, etat_maj_le")
      .is("archive_le", null)
      .returns<E[]>();
    if (error) {
      console.error("[collectif] rattrapage quotidien : éditions illisibles", error.code);
      return null;
    }
    const total = { editions: 0, retrouvees: 0, vignettes: 0 };
    for (const e of editionsDuPassageQuotidien(data ?? [], new Date())) {
      if (Date.now() >= jusqua) break;
      const r = await rattraperEdition(supabase, e.id, { declencheur: "releve", jusqua });
      total.editions++;
      total.retrouvees += r.bilan.retrouvees;
      total.vignettes += r.bilan.vignettes.faites;
    }
    console.log("[collectif] rattrapage quotidien", JSON.stringify(total));
    return total;
  } catch (err) {
    console.error("[collectif] rattrapage quotidien : exception", (err as Error)?.message);
    return null;
  }
}
