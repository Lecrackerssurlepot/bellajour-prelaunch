// emit-invoices v2 — émetteur paramétrique des faturas-recibo (T-075, 07/10/2026).
//
// Déclenché par pg_cron `emit-invoices-worker` toutes les 5 minutes (le
// déclencheur vit en base, pas dans le dépôt).
//
// CE QUE LA v2 CHANGE : elle ne DÉCIDE plus rien. La série, le taux, le TTC
// réellement encaissé et le client sont décidés côté site
// (`src/lib/atelier/facturation.ts`) et écrits dans le job. Ici on lit, on
// vérifie, on exécute. Un job sans série (ancien format acompte) n'est plus
// émis : il part en `manual_review`. La v1 émettait tout à 23 %, en série par
// défaut ; c'est précisément ce qu'on ne veut plus jamais.
//
// UNE FATURA FINALISÉE EST IRRÉVERSIBLE (transmise au fisc). D'où :
//   - INVOICE_AUTO_FINALIZE !== "true" → on crée le BROUILLON et on s'arrête
//     (statut `draft`). C'est le réglage de mise en service.
//   - série ou taxe introuvable par nom, série interdite, taux de la taxe
//     différent du job, total InvoiceXpress à plus de 0,01 € du montant
//     Stripe → `manual_review` + alerte, rien n'est finalisé.
//   - 3 tentatives ratées → `failed` + alerte.
//   - un job qui a déjà un `fatura_id` ne recrée JAMAIS de document : on
//     reprend celui-là (la v1 recréait un brouillon après un 429).
//
// Les jobs `draft` sont resynchronisés en LECTURE : si Mathias finalise le
// brouillon dans InvoiceXpress, le job passe `emitted` avec numéro et ATCUD.
//
// Cette fonction ne supprime RIEN, nulle part.
//
// Secrets (Edge Function Secrets) :
//   INVOICEXPRESS_API_KEY, INVOICEXPRESS_ACCOUNT   obligatoires
//   INVOICE_AUTO_FINALIZE                          "true" pour finaliser ; absent = brouillon
//   TVA_FR_NUMERO                                  porté en observations sur FR2026 s'il existe
//   BREVO_API_KEY, ALERTE_FACTURATION_EMAIL        alertes ; absents = erreur journalisée
// Auto-injectés : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_LIMIT = 20;
const MAX_TENTATIVES = 3;
const SERIES_INTERDITES = ["A", "INVOICEXPRESSDEMO"];
/** Le nom InvoiceXpress de la taxe, par taux. Seuls les taux de la table de décision. */
const TAXE_PAR_TAUX: Record<string, string> = { "23": "IVA23", "20": "IVA20" };

const CONSUMIDOR_FINAL = {
  name: "Consumidor Final",
  code: "999999990",
  fiscal_id: "999999990",
  country: "Portugal",
} as const;

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

function todayLisbon(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

type IxResult = { ok: boolean; status: number; json: Record<string, unknown> | null; raw: string };

function unwrap(json: Record<string, unknown> | null): Record<string, unknown> {
  if (!json) return {};
  const inner = json["invoice_receipt"];
  if (inner && typeof inner === "object") return inner as Record<string, unknown>;
  return json;
}

type Job = {
  id: string;
  stripe_payment_intent: string;
  numero_id: string | null;
  origine: string | null;
  status: string;
  attempts: number | null;
  serie: string | null;
  taux_tva: number | string | null;
  montant_ttc: number | string | null;
  quantite: number | null;
  description: string | null;
  client: Record<string, unknown> | null;
  fatura_id: string | null;
};

class Revue extends Error {}

Deno.serve(async () => {
  const apiKey = Deno.env.get("INVOICEXPRESS_API_KEY");
  const account = Deno.env.get("INVOICEXPRESS_ACCOUNT");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const autoFinalize = Deno.env.get("INVOICE_AUTO_FINALIZE") === "true";
  const tvaFr = (Deno.env.get("TVA_FR_NUMERO") ?? "").trim();

  if (!apiKey || !account || !supabaseUrl || !serviceKey) {
    console.error("[emit-invoices] config manquante (secrets InvoiceXpress / Supabase)");
    return Response.json({ error: "config" }, { status: 500 });
  }

  const baseUrl = `https://${account}.app.invoicexpress.com`;
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  async function ix(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<IxResult> {
    const url = `${baseUrl}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey!)}`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, raw };
  }

  async function alerte(sujet: string, lignes: Record<string, unknown>) {
    const to = (Deno.env.get("ALERTE_FACTURATION_EMAIL") ?? "").trim();
    const brevo = Deno.env.get("BREVO_API_KEY");
    if (!to || !brevo) {
      console.error(
        `[emit-invoices] ⚠️ ALERTE_FACTURATION_EMAIL ou BREVO_API_KEY absente : alerte NON envoyée (« ${sujet} »)`,
        JSON.stringify(lignes),
      );
      return;
    }
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const corps = Object.entries(lignes)
      .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(String(v ?? ""))}</td></tr>`)
      .join("");
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": brevo },
        body: JSON.stringify({
          sender: { email: "contact@bellajour.com", name: "Bellajour facturation" },
          to: [{ email: to }],
          subject: `[Facturation] ${sujet}`,
          htmlContent: `<p>${esc(sujet)}</p><table cellpadding="4">${corps}</table>
<p>Détail : https://www.bellajour.fr/admin/atelier/factures</p>`,
        }),
      });
      if (!res.ok) console.error("[emit-invoices] Brevo a refusé l'alerte", res.status);
    } catch (e) {
      console.error("[emit-invoices] alerte impossible", (e as Error)?.message);
    }
  }

  async function maj(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase
      .from("invoice_jobs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) console.error("[emit-invoices] ⚠️ UPDATE job échoué", id, error.code, JSON.stringify(patch).slice(0, 300));
    return !error;
  }

  /* ── 0. Resynchronisation des brouillons (lecture seule) ─────────────── */
  const { data: brouillons } = await supabase
    .from("invoice_jobs")
    .select("id, fatura_id")
    .eq("status", "draft")
    .not("fatura_id", "is", null)
    .limit(BATCH_LIMIT);
  let synchronises = 0;
  for (const b of brouillons ?? []) {
    const r = await ix("GET", `/invoice_receipts/${b.fatura_id}.json`);
    if (!r.ok) continue;
    const doc = unwrap(r.json);
    const st = String(doc["status"] ?? "");
    if (st === "final" || st === "settled") {
      await maj(b.id, {
        status: "emitted",
        fatura_numero: doc["sequence_number"] != null ? String(doc["sequence_number"]) : null,
        fatura_atcud: doc["atcud"] != null ? String(doc["atcud"]) : null,
        emitted_at: new Date().toISOString(),
        error_message: null,
      });
      synchronises++;
    }
  }

  /* ── 1. Les jobs à émettre ───────────────────────────────────────────── */
  const { data: jobs, error: selErr } = await supabase
    .from("invoice_jobs")
    .select(
      "id, stripe_payment_intent, numero_id, origine, status, attempts, serie, taux_tva, montant_ttc, quantite, description, client, fatura_id",
    )
    .in("status", ["pending", "error"])
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (selErr) {
    console.error("[emit-invoices] SELECT invoice_jobs échec", selErr.code, selErr.message);
    return Response.json({ error: "select_failed" }, { status: 500 });
  }

  /* Séries et taxes, résolues PAR NOM une fois par passage, seulement s'il y a du travail. */
  let series: Map<string, number> | null = null;
  let taxes: Map<string, number> | null = null;
  async function referentiels() {
    if (series && taxes) return;
    const s = await ix("GET", "/sequences.json");
    const t = await ix("GET", "/taxes.json");
    if (!s.ok || !t.ok) throw new Error(`référentiels InvoiceXpress illisibles (séries ${s.status}, taxes ${t.status})`);
    series = new Map();
    for (const q of (s.json?.["sequences"] as Array<Record<string, unknown>> | undefined) ?? []) {
      series.set(String(q["serie"]), Number(q["id"]));
    }
    taxes = new Map();
    for (const x of (t.json?.["taxes"] as Array<Record<string, unknown>> | undefined) ?? []) {
      taxes.set(String(x["name"]), Number(x["value"]));
    }
  }

  let processed = 0, drafts = 0, emitted = 0, revues = 0, errors = 0;

  for (const job of (jobs ?? []) as Job[]) {
    const attempts = (job.attempts ?? 0) + 1;

    const { data: claimed, error: claimErr } = await supabase
      .from("invoice_jobs")
      .update({ status: "emitting", updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .in("status", ["pending", "error"])
      .select("id");
    if (claimErr || !claimed || claimed.length === 0) continue;
    processed++;

    let docId: string | null = job.fatura_id;
    try {
      /* a. Le job doit tout porter. Sinon : revue, jamais de devinette. */
      if (job.origine !== "atelier" || !job.serie) {
        throw new Revue("job sans série (ancien format) : l'émetteur v2 ne devine plus");
      }
      if (SERIES_INTERDITES.includes(job.serie)) throw new Revue(`série interdite ${job.serie}`);
      const taux = Number(job.taux_tva);
      const taxe = TAXE_PAR_TAUX[String(taux)];
      if (!taxe) throw new Revue(`taux ${job.taux_tva} hors de la table de décision`);
      const ttc = Number(job.montant_ttc);
      if (!Number.isFinite(ttc) || ttc <= 0) throw new Revue("montant TTC illisible");
      const quantite = job.quantite ?? 1;
      if (!Number.isInteger(quantite) || quantite < 1) throw new Revue("quantité illisible");
      const c = job.client ?? {};
      const article = typeof c["article"] === "string" ? (c["article"] as string) : null;
      if (!article || !job.description) throw new Revue("article ou description absents");

      await referentiels();
      const sequenceId = series!.get(job.serie);
      if (!sequenceId) throw new Revue(`série ${job.serie} introuvable chez InvoiceXpress`);
      const valeurTaxe = taxes!.get(taxe);
      if (valeurTaxe === undefined) throw new Revue(`taxe ${taxe} introuvable chez InvoiceXpress`);
      if (Math.abs(valeurTaxe - taux) > 0.001) {
        throw new Revue(`taxe ${taxe} vaut ${valeurTaxe} % chez InvoiceXpress, le job attend ${taux} %`);
      }

      let client: Record<string, unknown>;
      if (c["type"] === "consumidor_final") {
        client = { ...CONSUMIDOR_FINAL };
      } else if (c["type"] === "livraison") {
        if (typeof c["name"] !== "string" || !c["name"]) throw new Revue("nom du client absent");
        client = {
          name: c["name"],
          code: `BJ-${(job.numero_id ?? job.id).slice(0, 8)}`,
          address: c["address"] ?? "",
          postal_code: c["postal_code"] ?? "",
          city: c["city"] ?? "",
          country: c["country"] ?? "France",
        };
      } else {
        throw new Revue("type de client inconnu");
      }

      const observations = [
        `Paiement Stripe ${job.stripe_payment_intent}`,
        job.serie === "FR2026" && tvaFr ? `TVA FR ${tvaFr}` : null,
      ].filter(Boolean).join(". ");

      /* b. Le brouillon, créé UNE seule fois. */
      if (!docId) {
        const today = todayLisbon();
        const payload = {
          invoice_receipt: {
            date: today,
            due_date: today,
            sequence_id: String(sequenceId),
            observations,
            client,
            items: [{
              name: article,
              description: job.description,
              unit_price: round(ttc / quantite / (1 + taux / 100), 4),
              quantity: quantite,
              unit: "unit",
              tax: { name: taxe },
            }],
          },
        };
        const createRes = await ix("POST", "/invoice_receipts.json", payload);
        if (!createRes.ok) {
          throw new Error(`create HTTP ${createRes.status}: ${(createRes.raw || "").slice(0, 500)}`);
        }
        const id = unwrap(createRes.json)["id"];
        if (id == null) throw new Error(`create : id absent : ${createRes.raw.slice(0, 300)}`);
        docId = String(id);
        /* Noté AVANT toute autre étape : une panne plus loin ne recréera pas de document. */
        await maj(job.id, { fatura_id: docId, payload_log: payload, response_log: { create: createRes.json } });
      }

      /* c. Le total, relu chez InvoiceXpress. */
      const lu = await ix("GET", `/invoice_receipts/${docId}.json`);
      if (!lu.ok) throw new Error(`lecture du brouillon HTTP ${lu.status}`);
      const doc = unwrap(lu.json);
      const total = Number(doc["total"]);
      if (!Number.isFinite(total) || Math.abs(total - ttc) > 0.01) {
        throw new Revue(`total InvoiceXpress ${doc["total"]} ≠ encaissé ${ttc.toFixed(2)} : brouillon NON finalisé`);
      }

      /* d. Brouillon seulement, tant que l'interrupteur n'est pas à "true". */
      if (!autoFinalize) {
        await maj(job.id, { status: "draft", attempts, error_message: null });
        drafts++;
        continue;
      }

      const fin = await ix("PUT", `/invoice_receipts/${docId}/change-state.json`, {
        invoice_receipt: { state: "finalized" },
      });
      if (!fin.ok) throw new Error(`finalize HTTP ${fin.status}: ${(fin.raw || "").slice(0, 500)}`);
      const f = unwrap(fin.json);
      const ok = await maj(job.id, {
        status: "emitted",
        fatura_numero: f["sequence_number"] != null ? String(f["sequence_number"]) : null,
        fatura_atcud: f["atcud"] != null ? String(f["atcud"]) : null,
        emitted_at: new Date().toISOString(),
        response_log: { finalize: fin.json },
        error_message: null,
        attempts,
      });
      if (!ok) {
        console.error(`[emit-invoices] ⚠️ job ${job.id} FINALISÉ (fatura id=${docId}) mais UPDATE échoué : NE PAS ré-émettre`);
      }
      emitted++;
    } catch (err) {
      const message = ((err as Error)?.message ?? String(err)).slice(0, 1000);
      if (err instanceof Revue) {
        await maj(job.id, { status: "manual_review", motif_revue: message, attempts, fatura_id: docId });
        await alerte("Facture à traiter à la main", {
          "Payment intent": job.stripe_payment_intent,
          Motif: message,
          "Brouillon InvoiceXpress": docId ? `${baseUrl}/invoice_receipts/${docId}` : "aucun",
        });
        revues++;
      } else {
        const echec = attempts >= MAX_TENTATIVES;
        await maj(job.id, { status: echec ? "failed" : "error", error_message: message, attempts, fatura_id: docId });
        if (echec) {
          await alerte("Facture en échec après 3 tentatives", {
            "Payment intent": job.stripe_payment_intent,
            Erreur: message,
            "Brouillon InvoiceXpress": docId ? `${baseUrl}/invoice_receipts/${docId}` : "aucun",
          });
        }
        console.error(`[emit-invoices] job ${job.id} échec (${attempts}/${MAX_TENTATIVES})`, message);
        errors++;
      }
    }
  }

  const bilan = { autoFinalize, synchronises, processed, drafts, emitted, revues, errors };
  console.log("[emit-invoices] terminé", JSON.stringify(bilan));
  return Response.json(bilan, { status: 200 });
});
