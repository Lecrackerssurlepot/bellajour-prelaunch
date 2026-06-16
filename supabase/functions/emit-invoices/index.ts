// emit-invoices — worker d'émission des factures InvoiceXpress.
//
// Ramasse les jobs invoice_jobs en 'pending'/'error' (LIMIT 20, plus anciens
// d'abord), émet pour chacun une fatura-recibo certifiée (POST création brouillon
// puis PUT change-state -> finalized qui génère l'ATCUD), puis écrit le résultat.
//
// Sera déclenchée par pg_cron (étape suivante). N'émet AUCUNE facture tant qu'elle
// n'est pas invoquée. Verrou anti-double-émission : claim atomique 'pending'/'error'
// -> 'emitting' avant tout appel réseau. Chaque job est isolé dans son try/catch :
// un échec n'interrompt jamais le reste du lot.
//
// Secrets requis (Edge Function Secrets) :
//   INVOICEXPRESS_API_KEY, INVOICEXPRESS_ACCOUNT
// Auto-injectés par Supabase :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_LIMIT = 20;

// Client par défaut Consumidor Final (NIF générique PT).
const CLIENT = {
  name: "Consumidor Final",
  code: "999999990",
  fiscal_id: "999999990",
  country: "Portugal",
} as const;

// Arrondi à n décimales, robuste aux erreurs binaires (ex. 1.005 -> 1.01).
function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

// Date du jour au format dd/mm/yyyy, fuseau Europe/Lisbon (en-GB => dd/mm/yyyy).
function todayLisbon(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

type IxResult = {
  ok: boolean;
  status: number;
  // Réponse parsée si JSON, sinon null. `raw` conserve toujours le texte brut.
  json: Record<string, unknown> | null;
  raw: string;
};

// Réponses InvoiceXpress enveloppées sous la clé du type de document
// (ex. { "invoice_receipt": { ... } }). On déballe proprement.
function unwrap(json: Record<string, unknown> | null): Record<string, unknown> {
  if (!json) return {};
  const inner = json["invoice_receipt"];
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return json;
}

Deno.serve(async () => {
  const apiKey = Deno.env.get("INVOICEXPRESS_API_KEY");
  const account = Deno.env.get("INVOICEXPRESS_ACCOUNT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !account || !supabaseUrl || !serviceKey) {
    console.error("[emit-invoices] config manquante (secrets InvoiceXpress / Supabase)");
    return Response.json({ error: "config" }, { status: 500 });
  }

  const baseUrl = `https://${account}.app.invoicexpress.com`;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Appel InvoiceXpress : api_key en query string sur TOUTES les requêtes.
  async function ix(
    method: "POST" | "PUT",
    path: string,
    body: unknown,
  ): Promise<IxResult> {
    const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      json = null; // page d'erreur HTML / texte : on garde `raw`.
    }
    return { ok: res.ok, status: res.status, json, raw };
  }

  // 1. Jobs à traiter : pending ou error, plus anciens d'abord.
  const { data: jobs, error: selErr } = await supabase
    .from("invoice_jobs")
    .select("id, stripe_payment_intent, montant_ht, montant_tva, attempts, status")
    .in("status", ["pending", "error"])
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (selErr) {
    console.error("[emit-invoices] SELECT invoice_jobs échec", selErr.code, selErr.message);
    return Response.json({ error: "select_failed" }, { status: 500 });
  }

  let processed = 0;
  let emitted = 0;
  let errors = 0;

  for (const job of jobs ?? []) {
    const attempts = (job.attempts ?? 0) + 1;

    // 2. Claim atomique : pending/error -> emitting. 0 ligne = déjà pris -> skip.
    const { data: claimed, error: claimErr } = await supabase
      .from("invoice_jobs")
      .update({ status: "emitting", updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .in("status", ["pending", "error"])
      .select("id");

    if (claimErr) {
      console.error("[emit-invoices] claim échec", job.id, claimErr.code);
      continue;
    }
    if (!claimed || claimed.length === 0) {
      console.log(`[emit-invoices] job ${job.id} déjà pris (course perdue) — skip`);
      continue;
    }

    processed++;

    try {
      // a. Montants. unit_price HT à 4 décimales recalculé depuis le TTC.
      const montantTtc = Number(job.montant_ht ?? 0) + Number(job.montant_tva ?? 0);
      const unitPriceHt = round(montantTtc / 1.23, 4);

      // b. Création de la fatura-recibo (brouillon, pas encore d'ATCUD).
      //    Pas de sequence_id : la série par défaut FAT2026 (registada) s'applique.
      const today = todayLisbon();
      const createBody = {
        invoice_receipt: {
          date: today,
          due_date: today,
          client: CLIENT,
          items: [
            {
              name: "Acompte album Bellajour",
              description: "Acompte de pré-commande",
              unit_price: unitPriceHt,
              quantity: 1,
              tax: { name: "IVA23" },
            },
          ],
        },
      };

      const createRes = await ix("POST", "/invoice_receipts.json", createBody);

      // Rate limit : on relâche le job pour le prochain passage, sans le brûler.
      if (createRes.status === 429) {
        console.warn(`[emit-invoices] 429 rate limit (create) — job ${job.id} relâché`);
        await supabase
          .from("invoice_jobs")
          .update({
            status: "error",
            error_message: "rate_limited (429) on create",
            response_log: { create: createRes.json ?? createRes.raw },
            attempts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        errors++;
        continue;
      }

      if (!createRes.ok) {
        throw new Error(
          `create HTTP ${createRes.status}: ${JSON.stringify(createRes.json ?? createRes.raw).slice(0, 500)}`,
        );
      }

      // c. id du document créé.
      const created = unwrap(createRes.json);
      const docId = created["id"];
      if (docId == null) {
        throw new Error(`create: id absent de la réponse: ${createRes.raw.slice(0, 500)}`);
      }

      // d. Finalisation : génère le numéro fiscal + l'ATCUD.
      const finalizeRes = await ix(
        "PUT",
        `/invoice_receipts/${docId}/change-state.json`,
        { invoice_receipt: { state: "finalized" } },
      );

      if (finalizeRes.status === 429) {
        console.warn(`[emit-invoices] 429 rate limit (finalize) — job ${job.id} relâché`);
        await supabase
          .from("invoice_jobs")
          .update({
            status: "error",
            error_message: "rate_limited (429) on finalize",
            fatura_id: String(docId),
            response_log: { create: createRes.json, finalize: finalizeRes.json ?? finalizeRes.raw },
            attempts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        errors++;
        continue;
      }

      if (!finalizeRes.ok) {
        throw new Error(
          `finalize HTTP ${finalizeRes.status}: ${JSON.stringify(finalizeRes.json ?? finalizeRes.raw).slice(0, 500)}`,
        );
      }

      // e. Numéro fatura + ATCUD + total.
      const fin = unwrap(finalizeRes.json);
      const sequenceNumber = fin["sequence_number"] != null ? String(fin["sequence_number"]) : null;
      const atcud = fin["atcud"] != null ? String(fin["atcud"]) : null;
      const totalRaw = fin["total"];
      const totalNum = typeof totalRaw === "number" ? totalRaw : Number(totalRaw);

      // f. Contrôle d'écart (toléré <= 1 cent), non bloquant.
      if (Number.isFinite(totalNum)) {
        const diff = round(totalNum - montantTtc, 2);
        if (diff !== 0) {
          console.warn(
            `[emit-invoices] écart total job ${job.id} : InvoiceXpress=${totalNum} vs attendu=${montantTtc} (diff=${diff})`,
          );
        }
      }

      // g. Job émis.
      const { error: updErr } = await supabase
        .from("invoice_jobs")
        .update({
          status: "emitted",
          fatura_id: String(docId),
          fatura_numero: sequenceNumber,
          fatura_atcud: atcud,
          emitted_at: new Date().toISOString(),
          response_log: { create: createRes.json, finalize: finalizeRes.json },
          error_message: null,
          attempts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (updErr) {
        // Facture émise côté InvoiceXpress mais écriture DB ratée : on log fort.
        // Le job reste en 'emitting' ; à reprendre manuellement (NE PAS ré-émettre
        // aveuglément — la fatura existe déjà chez InvoiceXpress, id=docId).
        console.error(
          `[emit-invoices] ⚠️ job ${job.id} ÉMIS (fatura id=${docId} num=${sequenceNumber}) mais UPDATE DB échoué`,
          updErr.code,
        );
        errors++;
        continue;
      }

      emitted++;
      console.log(`[emit-invoices] job ${job.id} émis — fatura ${sequenceNumber} (ATCUD ${atcud})`);
    } catch (err) {
      // 3. Échec isolé : status='error', on continue le lot.
      const message = (err as Error)?.message ?? String(err);
      console.error(`[emit-invoices] job ${job.id} échec`, message);
      await supabase
        .from("invoice_jobs")
        .update({
          status: "error",
          error_message: message.slice(0, 1000),
          response_log: { error: message },
          attempts,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      errors++;
    }
  }

  console.log(`[emit-invoices] terminé — processed=${processed} emitted=${emitted} errors=${errors}`);
  return Response.json({ processed, emitted, errors }, { status: 200 });
});
