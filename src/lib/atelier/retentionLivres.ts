/**
 * T-203 : les photos téléversées et le fichier HD d'un dossier LIVRÉ, effacés
 * 90 jours après la livraison (la promesse de la politique de confidentialité
 * en ligne, §7). Module À EFFETS (Supabase, R2, service key) : scripts
 * uniquement. Les règles sont dans `retention.ts` (pur, au harnais) ; ici,
 * l'ORDRE des gestes.
 *
 * ⚠️ SEUL APPELANT : `scripts/retention-livres.ts`. Aucune route, aucun cron,
 * aucun interrupteur, aucun passage après la relève : pour les particuliers,
 * l'automatisme attend Mathias (décision du 20/10). Le harnais vérifie que
 * rien d'autre ne l'importe.
 *
 * L'ORDRE D'UN EFFACEMENT (`effacerDossierLivre`, celui de l'audit S7, le même
 * que les éditions) :
 * 1. relire le dossier et SA date de livraison au journal, refaire le verdict ;
 *    sans la colonne `photos_supprimees_le` (migration 20261024), REFUSER :
 *    effacer sans pouvoir le noter, c'est recommencer indéfiniment ;
 * 2. lister le coffre (lecture), décider par `FAMILLES_LIVRE` ;
 * 3. l'INTENTION au journal (`retention_livre_a_effacer`, des clés et rien
 *    d'autre) ; une ligne qui ne s'écrit pas arrête tout ;
 * 4. la BASE : les métadonnées des photos vidées (aucune ligne supprimée), les
 *    clés du fichier HD retirées de `numeros`, et EN DERNIER le marqueur
 *    `photos_supprimees_le` (une seule fois) ; un refus avant le marqueur n'a
 *    rien touché au coffre, et relancer rejoue tout ;
 * 5. le COFFRE, clé par clé, par la seule porte qui l'accepte
 *    (`supprimerPhotosEtHdLivre`, qui relit `FAMILLES_LIVRE`) ;
 * 6. ce qui est réglé (`retention_livre_effacee`), puis le résumé
 *    (`photos_hd_effaces`), dans `evenements` (toute écriture est journalisée).
 * Ce qui résiste reste dans l'intention : `reprendreLivres` (au début de
 * chaque `--vraiment`) le retente, et n'efface jamais la clé d'un dossier non
 * marqué. Ne lève jamais.
 *
 * Ce qui ne bouge JAMAIS : la ligne `numeros` (son état, son prix, son
 * adresse, son token), son journal, ses mails, sa facture (`invoice_jobs`), et
 * au coffre les aperçus de couverture. Ce n'est pas une anonymisation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listerCoffreNumero, supprimerPhotosEtHdLivre } from "./r2";
import {
  clesLibresLivre,
  dateDeLivraison,
  estIdNumero,
  EVT_LIVRE_A_EFFACER,
  EVT_LIVRE_EFFACEE,
  EVT_LIVRE_FAIT,
  FAMILLES_LIVRE,
  LIVRE_CLES_PAR_INTENTION,
  livresEnAttente,
  ORDRE_FAMILLES_LIVRE,
  PATCH_NUMERO_LIVRE_EFFACE,
  PATCH_PHOTO_LIVRE_EFFACEE,
  planEffacementLivre,
  RETENTION_LIVRE_JOURS,
  verdictRetentionLivre,
  type EvenementLivraison,
  type EvenementLivre,
  type MotifEpargneLivre,
  type NumeroLivrePourRetention,
  type ParFamilleLivre,
} from "./retention";

/* ─────────────────────────────── le coffre ─────────────────────────────── */

/** Ce que l'effacement demande au coffre : les deux portes de `r2.ts`, ou celui du harnais (jamais le vrai coffre). */
export type CoffreLivre = {
  lister(numeroId: string): Promise<{ cle: string; taille: number }[] | null>;
  effacer(numeroId: string, cles: readonly string[]): Promise<{ partis: string[]; rates: string[] }>;
};

export const COFFRE_LIVRE_REEL: CoffreLivre = {
  lister: (id) => listerCoffreNumero(id),
  effacer: (id, cles) => supprimerPhotosEtHdLivre(id, cles),
};

/* ─────────────────────────────── les lectures ─────────────────────────────── */

/** Les colonnes du rapport et de la règle. `photos_supprimees_le` est à part : c'est elle qui peut manquer. */
export const CHAMPS_LIVRE = "id, token, titre, etat, nb_photos, anonymise_le";

export type DossierLivre = NumeroLivrePourRetention & {
  id: string;
  token: string;
  titre: string | null;
  etat: string;
  nb_photos: number | null;
};

const colonneInconnue = (code: string | null | undefined) => code === "42703" || code === "PGRST204";

export type LectureDossiers = { ok: true; dossiers: DossierLivre[]; colonnePosee: boolean } | { ok: false; code?: string; message?: string };

/**
 * Les dossiers LIVRÉS (ou le seul dossier de `token`, quel que soit son état :
 * le verdict dira pourquoi il est épargné). Repli 42703 : sans la colonne
 * fraîche, la même lecture sans elle, et `colonnePosee: false` le DIT.
 */
export async function lireDossiersLivres(supabase: SupabaseClient, token: string | null): Promise<LectureDossiers> {
  const requete = (champs: string) => {
    const q = supabase.from("numeros").select(champs);
    return (token ? q.eq("token", token) : q.eq("etat", "livree")).order("created_at", { ascending: true }).limit(1000).returns<DossierLivre[]>();
  };
  const avec = await requete(`${CHAMPS_LIVRE}, photos_supprimees_le`);
  if (!avec.error) return { ok: true, dossiers: avec.data ?? [], colonnePosee: true };
  if (!colonneInconnue(avec.error.code)) return { ok: false, code: avec.error.code, message: avec.error.message };
  const sans = await requete(CHAMPS_LIVRE);
  if (sans.error) return { ok: false, code: sans.error.code, message: sans.error.message };
  return { ok: true, dossiers: sans.data ?? [], colonnePosee: false };
}

function paquets<T>(liste: readonly T[], taille: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) out.push(liste.slice(i, i + taille));
  return out;
}

/**
 * La date de livraison de chaque dossier, lue au JOURNAL (`dateDeLivraison`) :
 * par paquets de 50 dossiers (une dizaine de passages d'état chacun, sous le
 * plafond de 1 000 lignes d'une réponse). `null` : le journal n'a pas répondu.
 */
export async function lireLivraisons(supabase: SupabaseClient, ids: readonly string[]): Promise<Map<string, string | null> | null> {
  const par = new Map<string, EvenementLivraison[]>();
  for (const paquet of paquets(ids, 50)) {
    const { data, error } = await supabase
      .from("evenements")
      .select("numero_id, type, payload, created_at")
      .eq("type", "etat_change")
      .in("numero_id", paquet)
      .returns<(EvenementLivraison & { numero_id: string })[]>();
    if (error) {
      console.error("[retention-livres] journal illisible", error.code);
      return null;
    }
    for (const e of data ?? []) par.set(e.numero_id, [...(par.get(e.numero_id) ?? []), e]);
  }
  return new Map(ids.map((id) => [id, dateDeLivraison(par.get(id) ?? [])]));
}

/** Les intentions et ce qui en est réglé, tous dossiers, par tranches de 1 000. `null` : journal illisible. */
export async function lireIntentionsLivre(supabase: SupabaseClient): Promise<EvenementLivre[] | null> {
  const tout: EvenementLivre[] = [];
  for (let de = 0; de < 100_000; de += 1000) {
    const { data, error } = await supabase
      .from("evenements")
      .select("id, numero_id, type, payload, created_at")
      .in("type", [EVT_LIVRE_A_EFFACER, EVT_LIVRE_EFFACEE])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + 999)
      .returns<EvenementLivre[]>();
    if (error) {
      console.error("[retention-livres] intentions illisibles", error.code);
      return null;
    }
    tout.push(...(data ?? []));
    if ((data ?? []).length < 1000) return tout;
  }
  console.error("[retention-livres] plus de 100 000 intentions : lecture arrêtée");
  return null;
}

/** Une ligne de journal qui rend son id (une intention que la ligne « réglée » désigne). Ne lève jamais. */
async function journalId(supabase: SupabaseClient, numeroId: string, type: string, payload: Record<string, unknown>): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("evenements").insert({ numero_id: numeroId, type, payload }).select("id").maybeSingle<{ id: string }>();
    if (error || !data?.id) {
      console.error(`[retention-livres] journal "${type}" non écrit`, error?.code);
      return null;
    }
    return data.id;
  } catch (err) {
    console.error(`[retention-livres] journal "${type}" exception`, (err as Error)?.message);
    return null;
  }
}

/** Une ligne de journal ; rend `true` si elle est écrite. Ne lève jamais. */
async function journal(supabase: SupabaseClient, numeroId: string, type: string, payload: Record<string, unknown>): Promise<boolean> {
  return (await journalId(supabase, numeroId, type, payload)) !== null;
}

/* ─────────────────────────────── l'effacement ─────────────────────────────── */

export type IssueLivre =
  | { statut: "epargne"; motif: MotifEpargneLivre }
  | { statut: "colonne_absente" }
  | { statut: "illisible"; etape: "dossier" | "journal" | "coffre"; code?: string }
  /* Rien n'est parti du coffre : relancer rejoue tout. */
  | { statut: "refuse"; etape: "intention" | "photos" | "numero" | "marqueur"; code?: string }
  | {
      statut: "efface";
      objets: number;
      restes: number;
      gardes: number;
      parFamille: ParFamilleLivre;
      photos: number | null;
      interrompu: boolean;
      journal: boolean;
    };

type Intention = { id: string; cles: string[] };

async function reglerGardees(supabase: SupabaseClient, numeroId: string, intentions: readonly Intention[]): Promise<void> {
  for (const i of intentions) await journal(supabase, numeroId, EVT_LIVRE_EFFACEE, { evenement: i.id, cles: i.cles, gardees: true });
}

/**
 * Effacer les photos et le fichier HD d'UN dossier livré, dans l'ordre de
 * l'en-tête. Relit tout (jamais sur le rapport du script). Ne lève jamais.
 */
export async function effacerDossierLivre(
  supabase: SupabaseClient,
  numeroId: string,
  o: { maintenant: Date; coffre?: CoffreLivre; jusqua?: number }
): Promise<IssueLivre> {
  const coffre = o.coffre ?? COFFRE_LIVRE_REEL;
  const jusqua = o.jusqua ?? Infinity;
  try {
    if (!estIdNumero(numeroId)) return { statut: "illisible", etape: "dossier" };
    /* 1. relire, avec la colonne fraîche, SANS repli : sans elle, on n'agit pas */
    const { data: d, error } = await supabase.from("numeros").select(`${CHAMPS_LIVRE}, photos_supprimees_le`).eq("id", numeroId).maybeSingle<DossierLivre>();
    if (error && colonneInconnue(error.code)) return { statut: "colonne_absente" };
    if (error || !d) return { statut: "illisible", etape: "dossier", code: error?.code };
    const livraisons = await lireLivraisons(supabase, [numeroId]);
    if (!livraisons) return { statut: "illisible", etape: "journal" };
    const v = verdictRetentionLivre(d, livraisons.get(numeroId), o.maintenant);
    if (!v.effacable) return { statut: "epargne", motif: v.motif };

    /* 2. le coffre, en lecture */
    const objets = await coffre.lister(numeroId);
    if (!objets) return { statut: "illisible", etape: "coffre" };
    const plan = planEffacementLivre(objets, numeroId);

    /* 3. l'intention, AVANT la base */
    const intentions: Intention[] = [];
    for (const paquet of paquets(plan.aEffacer, LIVRE_CLES_PAR_INTENTION)) {
      const id = await journalId(supabase, numeroId, EVT_LIVRE_A_EFFACER, { cles: paquet, n: paquet.length, livre_le: v.livreLe, retention_jours: RETENTION_LIVRE_JOURS, par: "script" });
      if (!id) {
        await reglerGardees(supabase, numeroId, intentions);
        return { statut: "refuse", etape: "intention" };
      }
      intentions.push({ id, cles: paquet });
    }

    /* 4. la base : photos, clés du fichier HD, puis le marqueur EN DERNIER (aucun repli : une colonne
       manquante arrête le dossier, elle ne disparaît pas du patch en silence) */
    const photos = await supabase.from("photos").update(PATCH_PHOTO_LIVRE_EFFACEE, { count: "exact" }).eq("numero_id", numeroId);
    if (photos.error) {
      await reglerGardees(supabase, numeroId, intentions);
      return { statut: "refuse", etape: "photos", code: photos.error.code };
    }
    const numero = Object.keys(PATCH_NUMERO_LIVRE_EFFACE).length
      ? await supabase.from("numeros").update(PATCH_NUMERO_LIVRE_EFFACE).eq("id", numeroId)
      : { error: null };
    if (numero.error) {
      await reglerGardees(supabase, numeroId, intentions);
      return { statut: "refuse", etape: "numero", code: numero.error.code };
    }
    const { data: marque, error: errM } = await supabase
      .from("numeros")
      .update({ photos_supprimees_le: o.maintenant.toISOString() })
      .eq("id", numeroId)
      .is("photos_supprimees_le", null)
      .select("id");
    if (errM || !marque?.length) {
      await reglerGardees(supabase, numeroId, intentions);
      return { statut: "refuse", etape: "marqueur", code: errM?.code };
    }

    /* 5. le coffre, par la porte qui relit FAMILLES_LIVRE ; 6. ce qui est réglé */
    let partis = 0;
    let restes = 0;
    let interrompu = false;
    let ecrit = true;
    for (const i of intentions) {
      if (Date.now() >= jusqua) {
        interrompu = true;
        restes += i.cles.length;
        continue;
      }
      const r = await coffre.effacer(numeroId, i.cles);
      partis += r.partis.length;
      restes += i.cles.length - r.partis.length;
      if (r.partis.length) ecrit = (await journal(supabase, numeroId, EVT_LIVRE_EFFACEE, { evenement: i.id, cles: r.partis })) && ecrit;
    }

    const parFamille = Object.fromEntries(ORDRE_FAMILLES_LIVRE.filter((f) => FAMILLES_LIVRE[f].efface).map((f) => [f, plan.parFamille[f].n]));
    ecrit =
      (await journal(supabase, numeroId, EVT_LIVRE_FAIT, {
        motif: "retention_livre",
        retention_jours: RETENTION_LIVRE_JOURS,
        jours_depuis_livraison: Math.floor(v.jours),
        livre_le: v.livreLe,
        objets_effaces: partis,
        objets_restes: restes,
        objets_gardes: plan.gardes,
        par_famille: parFamille,
        photos_lignes: photos.count ?? null,
        par: "script",
      })) && ecrit;

    return { statut: "efface", objets: partis, restes, gardes: plan.gardes, parFamille: plan.parFamille, photos: photos.count ?? null, interrompu, journal: ecrit };
  } catch (err) {
    console.error("[retention-livres] exception", (err as Error)?.message);
    return { statut: "illisible", etape: "dossier" };
  }
}

/* ─────────────────────────────── la reprise ─────────────────────────────── */

export type BilanRepriseLivre = { intentions: number; effaces: number; gardes: number; restes: number };

/**
 * Retenter ce qu'un effacement n'a pas pu retirer du coffre (intentions vieilles
 * de 15 minutes au moins, clés non réglées). Un dossier NON marqué garde tout ;
 * un dossier marqué voit ses clés effacées par la porte. Sans la colonne
 * fraîche, rien n'est marqué : rien ne part. Ne lève jamais.
 */
export async function reprendreLivres(
  supabase: SupabaseClient,
  jusqua: number,
  maintenant: Date = new Date(),
  coffre: CoffreLivre = COFFRE_LIVRE_REEL
): Promise<BilanRepriseLivre | null> {
  try {
    const evenements = await lireIntentionsLivre(supabase);
    if (!evenements) return null;
    const enAttente = livresEnAttente(evenements, maintenant);
    const bilan: BilanRepriseLivre = { intentions: 0, effaces: 0, gardes: 0, restes: 0 };
    if (!enAttente.length) return bilan;
    const marques = new Map<string, string | null>();
    for (const paquet of paquets([...new Set(enAttente.map((a) => a.numeroId))], 100)) {
      const { data, error } = await supabase.from("numeros").select("id, photos_supprimees_le").in("id", paquet).returns<{ id: string; photos_supprimees_le: string | null }[]>();
      if (error) {
        console.error("[retention-livres] marqueurs illisibles", error.code);
        return null;
      }
      for (const l of data ?? []) marques.set(l.id, l.photos_supprimees_le);
    }
    for (const a of enAttente) {
      if (Date.now() >= jusqua) break;
      bilan.intentions++;
      const libres = clesLibresLivre(a.cles, a.numeroId, marques.get(a.numeroId));
      const gardees = a.cles.filter((k) => !libres.includes(k));
      const r = libres.length ? await coffre.effacer(a.numeroId, libres) : { partis: [], rates: [] };
      const reglees = [...gardees, ...r.partis];
      bilan.gardes += gardees.length;
      bilan.effaces += r.partis.length;
      bilan.restes += libres.length - r.partis.length;
      if (reglees.length) await journal(supabase, a.numeroId, EVT_LIVRE_EFFACEE, { evenement: a.evenement, cles: reglees, reprise: true, ...(gardees.length ? { gardees: true } : {}) });
    }
    return bilan;
  } catch (err) {
    console.error("[retention-livres] reprise : exception", (err as Error)?.message);
    return null;
  }
}
