/**
 * T-159 : la fin de conservation d'une édition livrée, côté base et coffre.
 * Module À EFFETS (Supabase, R2, service key) : serveur et scripts uniquement.
 * Les règles sont dans `retention.ts` (pur, au harnais) ; ici, l'ORDRE des
 * gestes, et lui seul. Deux appelants, une seule façon d'effacer :
 * - `scripts/collectif-retention.ts --vraiment` (le geste manuel, les
 *   premières fois avec Mathias) ;
 * - `retentionQuotidienne`, APRÈS la réponse de la relève de l'atelier
 *   (`/api/atelier/mails/relever`, aucun cron de plus), COUPÉE par défaut
 *   derrière `COLLECTIF_RETENTION_AUTO` (interrupteur.ts) et `COLLECTIF_OUVERT`.
 *
 * L'ORDRE D'UN EFFACEMENT (`effacerEdition`, l'ordre sûr de l'audit S7) :
 * 1. relire l'édition et refaire le verdict (jamais sur une lecture ancienne) ;
 * 2. lister le coffre (lecture), décider par `FAMILLES` (`planEffacement`) ;
 * 3. l'INTENTION au journal, par lignes de 500 clés ; une ligne qui ne s'écrit
 *    pas arrête tout, rien n'est touché ;
 * 4. la BASE : téléphones puis personnes supprimés (Q6), métadonnées des
 *    photos vidées, et EN DERNIER le marqueur `photos_supprimees_le` (posé
 *    une seule fois) ; un refus avant le marqueur arrête tout, le coffre est
 *    intact, l'édition reste candidate et tout se rejoue au passage suivant ;
 * 5. le COFFRE : les clés de l'intention, par la porte qui relit `FAMILLES`
 *    (`supprimerClesEdition`) ;
 * 6. ce qui est réglé (`retention_effacee`), puis le résumé (`coffre_efface`).
 * Ce qui résiste reste dans l'intention : `reprendreRetention` le retente
 * (passage quotidien ouvert, ou script suivant) jusqu'à réussite, et
 * n'efface jamais une clé d'une édition non marquée.
 *
 * Ne lève jamais : chaque fonction rend une issue que l'appelant LIT.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listerCoffreEdition, supprimerClesEdition } from "@/lib/atelier/r2";
import { prefixeEdition } from "./cles";
import { noterEchec } from "./echecsJournal";
import { collectifOuvert, retentionAutoOuverte } from "./interrupteur";
import { journaliser, journaliserId } from "./journal";
import { enPaquets, lireToutesLesLignes } from "./lignes";
import { personnesAbsentes, tableAbsente } from "./migration";
import {
  clesLibresRetention,
  DELAI_RETENTION_JOURS,
  EVT_RETENTION_A_EFFACER,
  EVT_RETENTION_EFFACEE,
  FAMILLES,
  ORDRE_FAMILLES,
  PATCH_PHOTO_EFFACEE,
  planEffacement,
  RETENTION_AUTO_MAX_EDITIONS,
  RETENTION_CLES_PAR_INTENTION,
  RETENTION_REPRISE_MAX_CLES,
  retentionsEnAttente,
  TYPE_JOURNAL_RETENTION,
  verdictRetention,
  type EditionPourRetention,
  type EvenementRetention,
  type MotifEpargne,
  type ParFamille,
} from "./retention";

/* ─────────────────────────────── le coffre ─────────────────────────────── */

/**
 * Ce que l'effacement demande au coffre. Le vrai passe par les deux portes de
 * `r2.ts` ; le harnais passe le sien (un coffre en mémoire) et ne touche jamais
 * le vrai.
 */
export type CoffreRetention = {
  lister(prefixe: string): Promise<{ cle: string; taille: number }[] | null>;
  effacer(prefixe: string, cles: readonly string[]): Promise<{ partis: string[]; rates: string[] }>;
};

export const COFFRE_REEL: CoffreRetention = {
  lister: (prefixe) => listerCoffreEdition(prefixe),
  effacer: (prefixe, cles) => supprimerClesEdition(prefixe, cles),
};

/* ─────────────────────────────── les lectures ─────────────────────────────── */

/** Toutes de la migration 20261013 : rien à replier. */
export const COLONNES_EDITION_RETENTION = "id, organisation, evenement, etat, cloture_le, livraison, archive_le, photos_supprimees_le, demo, created_at";

export type EditionRetention = EditionPourRetention & {
  id: string;
  organisation: string;
  evenement: string;
  archive_le: string | null;
  demo: boolean;
  created_at: string;
};

export type LectureEditions = { ok: true; editions: EditionRetention[] } | { ok: false; absente: boolean; code?: string; message?: string };

/** Les éditions (toutes, ou une seule), par tranches de 1 000. */
export async function lireEditionsRetention(supabase: SupabaseClient, seule: string | null): Promise<LectureEditions> {
  const lu = await lireToutesLesLignes<EditionRetention>(
    () => {
      const q = supabase.from("collectif_editions").select(COLONNES_EDITION_RETENTION);
      return (seule ? q.eq("id", seule) : q).returns<EditionRetention[]>();
    },
    { colonne: "created_at", croissant: true },
    "éditions (rétention)"
  );
  if (lu.error) return { ok: false, absente: tableAbsente(lu.error.code), code: lu.error.code, message: lu.error.message };
  return { ok: true, editions: lu.data };
}

/* ─────────────────────────────── l'effacement ─────────────────────────────── */

export type ParQui = "script" | "auto";

export type IssueEffacement =
  | { statut: "epargnee"; motif: MotifEpargne }
  | { statut: "illisible"; etape: "edition" | "coffre"; code?: string }
  /* Rien n'est parti du coffre : l'édition reste candidate, le passage suivant rejoue tout. */
  | { statut: "refusee"; etape: "journal" | "photos" | "personnes" | "marqueur"; code?: string }
  | {
      statut: "effacee";
      objets: number;
      /** Restés au coffre (refus du coffre, ou échéance atteinte) : la reprise les retente. */
      restes: number;
      gardes: number;
      parFamille: ParFamille;
      photos: number | null;
      /** `null` : les tables de la migration 20261023 n'existent pas (aucune personne à effacer). */
      personnes: number | null;
      telephones: number | null;
      interrompu: boolean;
      journal: boolean;
    };

export type OptionsEffacement = {
  delai: number;
  maintenant: Date;
  par: ParQui;
  coffre?: CoffreRetention;
  /** L'échéance (ms) : passée, le coffre s'arrête entre deux paquets ; la reprise finira. */
  jusqua?: number;
  qui?: string | null;
};

/** Une intention écrite et ses clés. */
type Intention = { id: string; cles: string[] };

/** Régler des intentions comme GARDÉES (rien ne part) : la base n'a pas fini, l'édition reste candidate. */
async function reglerGardees(supabase: SupabaseClient, editionId: string, intentions: readonly Intention[]): Promise<void> {
  for (const i of intentions) {
    await journaliser(supabase, { editionId }, EVT_RETENTION_EFFACEE, { evenement: i.id, cles: i.cles, gardees: true }, null);
  }
}

/** Supprimer les lignes d'une table des personnes. `null` : la table n'existe pas (migration 20261023 absente). */
async function supprimerPersonnes(
  supabase: SupabaseClient,
  table: "collectif_participants_appareils" | "collectif_participants",
  editionId: string
): Promise<{ ok: true; n: number | null } | { ok: false; code?: string }> {
  const colonne = table === "collectif_participants" ? "id" : "appareil_id";
  const { data, error } = await supabase.from(table).delete().eq("edition_id", editionId).select(colonne);
  if (error) {
    if (personnesAbsentes(error) || tableAbsente(error.code)) return { ok: true, n: null };
    return { ok: false, code: error.code };
  }
  return { ok: true, n: (data ?? []).length };
}

/**
 * Effacer le coffre d'UNE édition livrée, dans l'ordre de l'en-tête. Relit
 * l'édition et refait le verdict avec `delai` : une lecture ancienne (le
 * rapport du script) ne décide jamais. Ne lève jamais.
 */
export async function effacerEdition(supabase: SupabaseClient, editionId: string, o: OptionsEffacement): Promise<IssueEffacement> {
  const coffre = o.coffre ?? COFFRE_REEL;
  const jusqua = o.jusqua ?? Infinity;
  const qui = o.qui ?? (o.par === "auto" ? null : "script collectif-retention");
  try {
    /* 1. relire, refaire le verdict */
    const { data: e, error: errE } = await supabase.from("collectif_editions").select(COLONNES_EDITION_RETENTION).eq("id", editionId).maybeSingle<EditionRetention>();
    if (errE || !e) return { statut: "illisible", etape: "edition", code: errE?.code };
    const v = verdictRetention(e, o.maintenant, o.delai);
    if (!v.effacable) return { statut: "epargnee", motif: v.motif };

    /* 2. le coffre, en lecture */
    const prefixe = prefixeEdition(editionId);
    const objets = await coffre.lister(prefixe);
    if (!objets) return { statut: "illisible", etape: "coffre" };
    const plan = planEffacement(objets, editionId);

    /* 3. l'intention, AVANT la base */
    const intentions: Intention[] = [];
    for (const paquet of enPaquets(plan.aEffacer, RETENTION_CLES_PAR_INTENTION)) {
      const id = await journaliserId(
        supabase,
        { editionId },
        EVT_RETENTION_A_EFFACER,
        { cles: paquet, n: paquet.length, delai_jours: o.delai, livree_le: v.livreeLe, par: o.par },
        qui
      );
      if (!id) {
        await reglerGardees(supabase, editionId, intentions);
        return { statut: "refusee", etape: "journal" };
      }
      intentions.push({ id, cles: paquet });
    }

    /* 4. la base : téléphones, personnes (Q6, l'adresse part), photos, puis le marqueur EN DERNIER.
       Les personnes d'abord : un refus plus loin laisse l'édition intacte à l'écran (ses vignettes),
       et l'adresse, elle, est déjà partie. */
    const telephones = await supprimerPersonnes(supabase, "collectif_participants_appareils", editionId);
    if (!telephones.ok) {
      await reglerGardees(supabase, editionId, intentions);
      return { statut: "refusee", etape: "personnes", code: telephones.code };
    }
    const personnes = await supprimerPersonnes(supabase, "collectif_participants", editionId);
    if (!personnes.ok) {
      await reglerGardees(supabase, editionId, intentions);
      return { statut: "refusee", etape: "personnes", code: personnes.code };
    }
    const photos = await supabase.from("collectif_photos").update(PATCH_PHOTO_EFFACEE, { count: "exact" }).eq("edition_id", editionId);
    if (photos.error) {
      await reglerGardees(supabase, editionId, intentions);
      return { statut: "refusee", etape: "photos", code: photos.error.code };
    }
    /* Le cache des doublons (20261022) portait sur des empreintes qui viennent d'être vidées. Best-effort :
       sans la table (PGRST205), rien à vider ; une panne ne retient pas l'effacement. */
    const doublons = await supabase.from("collectif_doublons").delete().eq("edition_id", editionId);
    if (doublons.error && !tableAbsente(doublons.error.code)) console.error("[collectif] fin de conservation : cache des doublons non vidé", doublons.error.code);
    const { data: marquee, error: errM } = await supabase
      .from("collectif_editions")
      .update({ photos_supprimees_le: o.maintenant.toISOString() })
      .eq("id", editionId)
      .is("photos_supprimees_le", null)
      .select("id");
    if (errM || !marquee?.length) {
      /* Sans marqueur, la reprise n'effacerait rien de toute façon (`clesLibresRetention`) : on règle. */
      await reglerGardees(supabase, editionId, intentions);
      return { statut: "refusee", etape: "marqueur", code: errM?.code };
    }

    /* 5. le coffre, clé par clé, par la porte qui relit FAMILLES ; 6. ce qui est réglé */
    let partis = 0;
    let restes = 0;
    let interrompu = false;
    let journal = true;
    for (const i of intentions) {
      if (Date.now() >= jusqua) {
        interrompu = true;
        restes += i.cles.length;
        continue;
      }
      const r = await coffre.effacer(prefixe, i.cles);
      partis += r.partis.length;
      restes += i.cles.length - r.partis.length;
      if (r.partis.length) journal = (await journaliser(supabase, { editionId }, EVT_RETENTION_EFFACEE, { evenement: i.id, cles: r.partis }, qui)) && journal;
    }
    if (restes && !interrompu) await noterEchec(supabase, editionId, "retention", { etape: "coffre", n: restes });

    const parFamille = Object.fromEntries(ORDRE_FAMILLES.filter((f) => FAMILLES[f].efface).map((f) => [f, plan.parFamille[f].n]));
    journal =
      (await journaliser(
        supabase,
        { editionId },
        TYPE_JOURNAL_RETENTION,
        {
          motif: "retention",
          delai_jours: o.delai,
          jours_depuis_livraison: Math.floor(v.jours),
          livree_le: v.livreeLe,
          objets_effaces: partis,
          objets_restes: restes,
          objets_gardes: plan.gardes,
          par_famille: parFamille,
          lignes_photos: photos.count ?? null,
          personnes_effacees: personnes.n,
          telephones_effaces: telephones.n,
          par: o.par,
        },
        qui
      )) && journal;

    return {
      statut: "effacee",
      objets: partis,
      restes,
      gardes: plan.gardes,
      parFamille: plan.parFamille,
      photos: photos.count ?? null,
      personnes: personnes.n,
      telephones: telephones.n,
      interrompu,
      journal,
    };
  } catch (err) {
    console.error("[collectif] fin de conservation : exception", (err as Error)?.message);
    return { statut: "illisible", etape: "edition" };
  }
}

/* ─────────────────────────────── la reprise ─────────────────────────────── */

export type BilanReprise = { intentions: number; effaces: number; gardes: number; restes: number };

/** Lire les intentions et ce qui en est réglé (toutes éditions). `null` : journal illisible. */
export async function lireIntentionsRetention(supabase: SupabaseClient): Promise<EvenementRetention[] | null> {
  const lu = await lireToutesLesLignes<EvenementRetention>(
    () =>
      supabase
        .from("collectif_evenements")
        .select("id, edition_id, type, payload, created_at")
        .in("type", [EVT_RETENTION_A_EFFACER, EVT_RETENTION_EFFACEE])
        .returns<EvenementRetention[]>(),
    { colonne: "created_at", croissant: true },
    "intentions de fin de conservation"
  );
  if (lu.error) {
    console.error("[collectif] fin de conservation : journal illisible", lu.error.code);
    return null;
  }
  return lu.data;
}

/**
 * Retenter ce qu'un effacement n'a pas pu retirer du coffre : les intentions
 * vieilles de 15 minutes au moins dont des clés ne sont pas réglées. Une
 * édition NON marquée garde tout (la base n'a pas fini) ; une édition marquée
 * voit ses clés effacées par la porte. Ce qui résiste attend le passage
 * suivant. Borné par `RETENTION_REPRISE_MAX_CLES` et l'échéance. Ne lève jamais.
 */
export async function reprendreRetention(
  supabase: SupabaseClient,
  jusqua: number,
  maintenant: Date = new Date(),
  coffre: CoffreRetention = COFFRE_REEL
): Promise<BilanReprise | null> {
  try {
    const evenements = await lireIntentionsRetention(supabase);
    if (!evenements) return null;
    const enAttente = retentionsEnAttente(evenements, maintenant);
    const bilan: BilanReprise = { intentions: 0, effaces: 0, gardes: 0, restes: 0 };
    if (!enAttente.length) return bilan;

    const ids = [...new Set(enAttente.map((a) => a.editionId))];
    const marques = new Map<string, string | null>();
    for (const paquet of enPaquets(ids)) {
      const { data, error } = await supabase.from("collectif_editions").select("id, photos_supprimees_le").in("id", paquet).returns<{ id: string; photos_supprimees_le: string | null }[]>();
      /* Sans savoir si l'édition est marquée, on n'efface rien. */
      if (error) {
        console.error("[collectif] fin de conservation : éditions illisibles", error.code);
        return null;
      }
      for (const l of data ?? []) marques.set(l.id, l.photos_supprimees_le);
    }

    let budget = RETENTION_REPRISE_MAX_CLES;
    for (const a of enAttente) {
      if (Date.now() >= jusqua || budget <= 0) break;
      const cles = a.cles.slice(0, budget);
      budget -= cles.length;
      bilan.intentions++;
      const libres = clesLibresRetention(cles, a.editionId, marques.get(a.editionId));
      const gardees = cles.filter((k) => !libres.includes(k));
      const r = libres.length ? await coffre.effacer(prefixeEdition(a.editionId), libres) : { partis: [], rates: [] };
      const reglees = [...gardees, ...r.partis];
      bilan.gardes += gardees.length;
      bilan.effaces += r.partis.length;
      bilan.restes += libres.length - r.partis.length;
      if (reglees.length) {
        await journaliser(supabase, { editionId: a.editionId }, EVT_RETENTION_EFFACEE, { evenement: a.evenement, cles: reglees, reprise: true, ...(gardees.length ? { gardees: true } : {}) }, null);
      }
      if (libres.length > r.partis.length) await noterEchec(supabase, a.editionId, "retention", { etape: "coffre", n: libres.length - r.partis.length });
    }
    if (bilan.intentions) console.log("[collectif] fin de conservation, reprise", JSON.stringify(bilan));
    return bilan;
  } catch (err) {
    console.error("[collectif] fin de conservation, reprise : exception", (err as Error)?.message);
    return null;
  }
}

/* ─────────────────────────────── le passage quotidien ─────────────────────────────── */

export type BilanQuotidien = {
  reprise: BilanReprise | null;
  candidates: number;
  effacees: number;
  refusees: number;
  objets: number;
  restes: number;
};

/**
 * Le passage quotidien, APRÈS la relève de l'atelier (comme `purgeQuotidienne`,
 * aucun cron de plus) : la reprise d'abord, puis au plus
 * `RETENTION_AUTO_MAX_EDITIONS` éditions livrées depuis `DELAI_RETENTION_JOURS`
 * jours (la plus ancienne livraison d'abord), bornées par l'échéance de la
 * relève. ⚠️ COUPÉ PAR DÉFAUT : sans `COLLECTIF_RETENTION_AUTO` ouvert (et
 * `COLLECTIF_OUVERT`), il rend `null` sans même lire la base. Journalisé
 * (`par: "auto"`). Ne lève jamais.
 */
export async function retentionQuotidienne(
  supabase: SupabaseClient,
  jusqua: number,
  coffre: CoffreRetention = COFFRE_REEL,
  maintenant: Date = new Date()
): Promise<BilanQuotidien | null> {
  try {
    if (!collectifOuvert() || !retentionAutoOuverte()) return null;
    const reprise = await reprendreRetention(supabase, jusqua, maintenant, coffre);
    const lu = await lireEditionsRetention(supabase, null);
    if (!lu.ok) {
      if (!lu.absente) console.error("[collectif] fin de conservation : éditions illisibles", lu.code);
      return null;
    }
    const candidates = lu.editions
      .map((e) => ({ e, v: verdictRetention(e, maintenant, DELAI_RETENTION_JOURS) }))
      .filter((x): x is { e: EditionRetention; v: { effacable: true; jours: number; livreeLe: string } } => x.v.effacable)
      .sort((a, b) => b.v.jours - a.v.jours)
      .slice(0, RETENTION_AUTO_MAX_EDITIONS);
    const bilan: BilanQuotidien = { reprise, candidates: candidates.length, effacees: 0, refusees: 0, objets: 0, restes: 0 };
    for (const c of candidates) {
      if (Date.now() >= jusqua) break;
      const r = await effacerEdition(supabase, c.e.id, { delai: DELAI_RETENTION_JOURS, maintenant, par: "auto", coffre, jusqua });
      if (r.statut === "effacee") {
        bilan.effacees++;
        bilan.objets += r.objets;
        bilan.restes += r.restes;
      } else if (r.statut !== "epargnee") {
        bilan.refusees++;
        console.error("[collectif] fin de conservation : édition non effacée", c.e.id, r.statut, r.etape, r.code ?? "");
      }
    }
    if (bilan.candidates || reprise?.intentions) console.log("[collectif] fin de conservation", JSON.stringify(bilan));
    return bilan;
  } catch (err) {
    console.error("[collectif] fin de conservation : exception", (err as Error)?.message);
    return null;
  }
}
