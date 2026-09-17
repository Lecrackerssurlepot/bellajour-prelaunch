/**
 * Ce que la page du cockpit lit : la ligne de réglages et les dernières
 * semaines agrégées. Deux SELECT, aucun calcul sur les commandes brutes.
 *
 * Si la migration 20260917 n'est pas passée, les deux tables manquent
 * (PGRST205) : la page le dit au lieu de tomber.
 */

import { makeSupabase } from "@/lib/supabase";
import type { LigneSemaine, Reglages } from "./modele";
import { tableAbsente } from "./job";

export type ReglagesLus = Reglages & { regle_le: string | null; regle_par: string | null };

export type DonneesCockpit = {
  /** La migration n'est pas passée : rien à afficher. */
  absent: boolean;
  reglages: ReglagesLus | null;
  /** Triées par semaine CROISSANTE, la dernière est la plus récente. */
  lignes: LigneSemaine[];
  /** La dernière écriture du job, ou null. */
  calculeLe: string | null;
};

/* Les 26 dernières semaines : au-delà, la tendance ne dit plus rien du
   trimestre qui vient, et le tableau déborde. */
const SEMAINES_LUES = 26;

const CHAMPS_LIGNE =
  "semaine, date_debut, commandes_totales, commandes_froides, commandes_chaudes, commandes_sans_origine, pages_moy, marge_moy, delai_moy_jours, calcule_le";

type LigneBrute = LigneSemaine & { calcule_le: string };

/* numeric sort en TEXTE chez PostgREST : on ramène en nombre ici. */
function nombreOuNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function chargerCockpit(): Promise<DonneesCockpit> {
  const supabase = makeSupabase();
  const [reglages, lignes] = await Promise.all([
    supabase.from("cockpit_settings").select("*").eq("id", true).maybeSingle<Record<string, unknown>>(),
    supabase
      .from("weekly_metrics")
      .select(CHAMPS_LIGNE)
      .order("semaine", { ascending: false })
      .limit(SEMAINES_LUES)
      .returns<LigneBrute[]>(),
  ]);

  if (tableAbsente(reglages.error?.code) || tableAbsente(lignes.error?.code)) {
    return { absent: true, reglages: null, lignes: [], calculeLe: null };
  }
  if (reglages.error) console.error("[cockpit] lecture cockpit_settings échouée", reglages.error.code, reglages.error.message);
  if (lignes.error) console.error("[cockpit] lecture weekly_metrics échouée", lignes.error.code, lignes.error.message);

  const r = reglages.data;
  const reglagesLus: ReglagesLus | null = r
    ? {
        capacite: Number(r.capacite),
        t_dev: Number(r.t_dev),
        buffer: Number(r.buffer),
        cout_dev: Number(r.cout_dev),
        reinvesti_pct: Number(r.reinvesti_pct),
        marge_defaut: Number(r.marge_defaut),
        volume_mensuel: Number(r.volume_mensuel),
        regle_le: typeof r.regle_le === "string" ? r.regle_le : null,
        regle_par: typeof r.regle_par === "string" ? r.regle_par : null,
      }
    : null;

  const brutes = lignes.data ?? [];
  const propres: LigneSemaine[] = brutes
    .map((l) => ({
      semaine: Number(l.semaine),
      date_debut: String(l.date_debut),
      commandes_totales: Number(l.commandes_totales),
      commandes_froides: Number(l.commandes_froides),
      commandes_chaudes: Number(l.commandes_chaudes),
      commandes_sans_origine: Number(l.commandes_sans_origine),
      pages_moy: nombreOuNull(l.pages_moy),
      marge_moy: nombreOuNull(l.marge_moy),
      delai_moy_jours: nombreOuNull(l.delai_moy_jours),
    }))
    .sort((a, b) => a.semaine - b.semaine);

  const calculeLe = brutes.reduce<string | null>((max, l) => (max === null || l.calcule_le > max ? l.calcule_le : max), null);

  return { absent: false, reglages: reglagesLus, lignes: propres, calculeLe };
}
