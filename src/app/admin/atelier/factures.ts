import { makeSupabase } from "@/lib/supabase";

/**
 * Les jobs de facture, pour /admin/atelier/factures (T-075, 07/10/2026).
 * Lecture seule. Repli 42703 : avant la migration 20261007, on relit les
 * seules colonnes historiques plutôt que de casser la page.
 */
export type JobFacture = {
  id: string;
  created_at: string;
  stripe_payment_intent: string;
  status: string;
  origine: string | null;
  pays_livraison: string | null;
  code_postal: string | null;
  serie: string | null;
  taux_tva: number | null;
  montant_ttc: number | null;
  montant_ht: number | null;
  montant_tva: number | null;
  fatura_id: string | null;
  fatura_numero: string | null;
  motif_revue: string | null;
  error_message: string | null;
  attempts: number;
  numero_token: string | null;
};

const COLONNES =
  "id, created_at, stripe_payment_intent, status, origine, pays_livraison, code_postal, serie, " +
  "taux_tva, montant_ttc, montant_ht, montant_tva, fatura_id, fatura_numero, motif_revue, " +
  "error_message, attempts, numeros(token)";
const COLONNES_REPLI =
  "id, created_at, stripe_payment_intent, status, montant_ht, montant_tva, fatura_id, " +
  "fatura_numero, error_message, attempts";

/** Ce qui demande un geste humain remonte en tête. */
const PRIORITE: Record<string, number> = {
  manual_review: 0,
  failed: 1,
  error: 2,
  draft: 3,
  pending: 4,
  emitting: 5,
};

export async function chargerFactures(): Promise<{ jobs: JobFacture[]; migrationAbsente: boolean }> {
  const supabase = makeSupabase();
  let migrationAbsente = false;
  let res = await supabase.from("invoice_jobs").select(COLONNES).order("created_at", { ascending: false }).limit(300);
  if (res.error && (res.error.code === "42703" || res.error.code === "PGRST200")) {
    migrationAbsente = true;
    res = await supabase
      .from("invoice_jobs")
      .select(COLONNES_REPLI)
      .order("created_at", { ascending: false })
      .limit(300);
  }
  if (res.error) throw new Error(`invoice_jobs illisible : ${res.error.code} ${res.error.message}`);

  const lignes = (res.data ?? []) as unknown as Array<Record<string, unknown>>;
  const jobs: JobFacture[] = lignes.map((l) => {
    const n = l["numeros"] as { token?: string } | null | undefined;
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    const ttc = num(l["montant_ttc"]) ?? (l["montant_ht"] != null ? (num(l["montant_ht"]) ?? 0) + (num(l["montant_tva"]) ?? 0) : null);
    return {
      id: String(l["id"]),
      created_at: String(l["created_at"]),
      stripe_payment_intent: String(l["stripe_payment_intent"]),
      status: String(l["status"]),
      origine: (l["origine"] as string | null) ?? null,
      pays_livraison: (l["pays_livraison"] as string | null) ?? null,
      code_postal: (l["code_postal"] as string | null) ?? null,
      serie: (l["serie"] as string | null) ?? null,
      taux_tva: num(l["taux_tva"]),
      montant_ttc: ttc,
      montant_ht: num(l["montant_ht"]),
      montant_tva: num(l["montant_tva"]),
      fatura_id: (l["fatura_id"] as string | null) ?? null,
      fatura_numero: (l["fatura_numero"] as string | null) ?? null,
      motif_revue: (l["motif_revue"] as string | null) ?? null,
      error_message: (l["error_message"] as string | null) ?? null,
      attempts: Number(l["attempts"] ?? 0),
      numero_token: n?.token ?? null,
    };
  });

  jobs.sort((a, b) => (PRIORITE[a.status] ?? 9) - (PRIORITE[b.status] ?? 9));
  return { jobs, migrationAbsente };
}
