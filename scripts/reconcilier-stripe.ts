/**
 * T-081 — rapprocher les paiements Stripe des dossiers de la base.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/reconcilier-stripe.ts
 *   npx tsx --tsconfig tsconfig.json scripts/reconcilier-stripe.ts --jours=90
 *   npx tsx --tsconfig tsconfig.json scripts/reconcilier-stripe.ts --avec-test
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IL NE MODIFIE RIEN, JAMAIS. C'est un LECTEUR.
 *
 * Il n'a pas de `--vraiment` parce qu'il n'écrit nulle part : ni base, ni
 * Stripe, ni R2, ni mail. Il lit les deux côtés et il RACONTE l'écart. On peut
 * le lancer autant qu'on veut sans conséquence.
 *
 * POURQUOI IL EXISTE (T-081). C'est la seule famille de bug où l'argent est
 * DÉJÀ pris : une cliente paie réellement chez Stripe, mais son dossier ne
 * passe jamais en « payée » — parce que le point d'écoute Stripe pointe
 * ailleurs, ou que les trois jours de rejeu se sont épuisés sur une panne.
 * Personne ne le voit : ni elle (elle a payé), ni l'admin (/admin/atelier/sante
 * ne regarde que la base). Ce script est le filet qui manquait.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * CE QU'IL COMPARE, ET DANS QUEL SENS.
 *
 * Sens principal — STRIPE → BASE (le dangereux) : pour chaque session de
 * paiement Stripe RÉGLÉE et estampillée `kind: atelier`, il vérifie qu'un
 * dossier existe pour son token ET qu'il a atteint un état ENGAGÉ (payée ou
 * au-delà, `ETATS_ENGAGES`). Sinon, c'est une alerte : l'argent est pris, le
 * dossier n'a pas suivi.
 *
 * Sens léger — BASE → STRIPE : un dossier « payée » sans AUCUN lien Stripe
 * (ni session, ni payment_intent) est anormal et signalé. On ne fait pas plus
 * dans ce sens : un dossier payé par une session plus vieille que la fenêtre
 * regardée produirait de faux positifs. Le sens principal suffit à attraper
 * ce que T-081 vise.
 *
 * ⚠️ LE CAS FONDATRICE. Au palier 30 €, le crédit couvre tout : la session se
 * solde en `no_payment_required`, sans `payment_intent`. C'est un paiement
 * VALIDE — on le compte comme réglé (le dossier doit quand même être en
 * « payée »). La garde `livemode` reproduit celle du webhook : par défaut on
 * ignore les paiements en mode test (`--avec-test` pour les inclure).
 */

import { readFileSync } from "node:fs";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { KIND_ATELIER } from "@/lib/atelier/paiement";
import { ETATS_ENGAGES } from "@/lib/atelier/retention";

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/* `.env.local` versé dans process.env — même geste que anonymiser-dossiers.ts :
   un script lancé par tsx n'a pas le chargement automatique de Next. */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

const ENGAGES = new Set<string>(ETATS_ENGAGES as readonly string[]);

/** Un paiement Stripe réduit à ce que le rapprochement lit. */
type PaiementStripe = {
  sessionId: string;
  token: string | null;
  paymentIntent: string | null;
  montant: number | null;
  livemode: boolean;
  cree: number;
};

/** Un dossier réduit à ce que le rapprochement lit. */
type Dossier = {
  token: string;
  etat: string;
  titre: string | null;
  prenom: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
};

function arg(nom: string): string | null {
  const p = process.argv.find((a) => a.startsWith(`--${nom}=`));
  return p ? p.slice(nom.length + 3) : null;
}

/**
 * Toutes les sessions Stripe RÉGLÉES et estampillées atelier depuis N jours.
 * L'itérateur asynchrone du SDK pagine tout seul.
 */
async function lirePaiementsAtelier(
  stripe: Stripe,
  depuis: number,
  avecTest: boolean,
): Promise<PaiementStripe[]> {
  const out: PaiementStripe[] = [];
  for await (const s of stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: depuis },
  })) {
    if ((s.metadata as Record<string, string> | null)?.kind !== KIND_ATELIER) continue;
    if (s.status !== "complete") continue;
    /* « payé » OU « couvert par le crédit fondatrice » (no_payment_required). */
    if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") continue;
    if (!avecTest && !s.livemode) continue;

    const token =
      (s.metadata as Record<string, string> | null)?.token ?? s.client_reference_id ?? null;
    out.push({
      sessionId: s.id,
      token,
      paymentIntent: typeof s.payment_intent === "string" ? s.payment_intent : null,
      montant: s.amount_total,
      livemode: s.livemode,
      cree: s.created,
    });
  }
  return out;
}

/** Les dossiers correspondant à un lot de tokens. */
async function lireDossiers(supabase: SupabaseClient, tokens: string[]): Promise<Map<string, Dossier>> {
  const par = new Map<string, Dossier>();
  if (!tokens.length) return par;
  const { data, error } = await supabase
    .from("numeros")
    .select("token, etat, titre, prenom, stripe_session_id, stripe_payment_intent")
    .in("token", tokens)
    .returns<Dossier[]>();
  if (error) throw new Error(`Lecture des dossiers échouée : ${error.code} ${error.message}`);
  for (const d of data ?? []) par.set(d.token, d);
  return par;
}

/** Sens léger BASE → STRIPE : un « payée » sans aucun lien Stripe est anormal. */
async function lireEngagesSansLienStripe(supabase: SupabaseClient): Promise<Dossier[]> {
  const { data, error } = await supabase
    .from("numeros")
    .select("token, etat, titre, prenom, stripe_session_id, stripe_payment_intent")
    .eq("etat", "payee")
    .is("stripe_session_id", null)
    .is("stripe_payment_intent", null)
    .returns<Dossier[]>();
  if (error) throw new Error(`Lecture des dossiers payée échouée : ${error.code} ${error.message}`);
  return data ?? [];
}

function euros(centimes: number | null): string {
  return centimes == null ? "?" : `${(centimes / 100).toFixed(2)} €`;
}

function nom(d: Dossier | undefined): string {
  if (!d) return "—";
  return `${d.titre ?? d.prenom ?? "sans titre"}`;
}

async function main(): Promise<void> {
  const jours = Number(arg("jours") ?? "30");
  const avecTest = process.argv.includes("--avec-test");
  if (!Number.isFinite(jours) || jours <= 0) throw new Error("--jours doit être un nombre de jours positif");

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("STRIPE_SECRET_KEY absente de .env.local");
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");

  const stripe = new Stripe(stripeKey);
  const supabase = createClient(url, cle);
  const depuis = Math.floor(Date.now() / 1000) - jours * 86_400;

  console.log(`\n  Rapprochement Stripe ↔ base — ${jours} derniers jours` + (avecTest ? " (mode test INCLUS)" : " (livemode seul)"));
  console.log("  ────────────────────────────────────────────────────────────\n");

  const paiements = await lirePaiementsAtelier(stripe, depuis, avecTest);
  const tokens = paiements.map((p) => p.token).filter((t): t is string => !!t);
  const dossiers = await lireDossiers(supabase, tokens);

  const alertes: string[] = [];
  let ok = 0;

  for (const p of paiements) {
    if (!p.token) {
      alertes.push(`  ⚠️  Session ${p.sessionId} (${euros(p.montant)}) réglée SANS token — impossible de retrouver le dossier.`);
      continue;
    }
    const d = dossiers.get(p.token);
    if (!d) {
      alertes.push(`  🔴 Payé ${euros(p.montant)} (session ${p.sessionId}) — AUCUN dossier pour ce token. L'argent est pris, rien en base.`);
      continue;
    }
    if (!ENGAGES.has(d.etat)) {
      alertes.push(`  🔴 « ${nom(d)} » payé ${euros(p.montant)} mais état = « ${d.etat} » (pas engagé). Le paiement n'a pas fait avancer le dossier. token ${p.token}`);
      continue;
    }
    if (d.stripe_session_id && d.stripe_session_id !== p.sessionId) {
      alertes.push(`  🟠 « ${nom(d)} » engagé, mais sa session en base (${d.stripe_session_id}) diffère de la session réglée (${p.sessionId}) — double session ? à vérifier.`);
      continue;
    }
    ok += 1;
  }

  const payeesSansLien = await lireEngagesSansLienStripe(supabase);

  console.log(`  ${paiements.length} paiement(s) atelier réglé(s) chez Stripe sur la fenêtre.`);
  console.log(`  ${ok} rapproché(s) proprement à un dossier engagé.\n`);

  if (alertes.length) {
    console.log(`  ${alertes.length} ÉCART(S) — argent pris, dossier pas à jour :\n`);
    for (const a of alertes) console.log(a);
    console.log("");
  } else {
    console.log("  Aucun écart Stripe → base. Chaque paiement a un dossier engagé.\n");
  }

  if (payeesSansLien.length) {
    console.log(`  ${payeesSansLien.length} dossier(s) « payée » SANS aucun lien Stripe (ni session ni payment_intent) — anormal :`);
    for (const d of payeesSansLien) console.log(`  🟠 « ${nom(d)} » (token ${d.token}) est « payée » mais n'a aucune trace Stripe.`);
    console.log("");
  }

  if (alertes.length || payeesSansLien.length) {
    process.exitCode = 1;
    console.log("  → Des écarts demandent un regard. Ce script n'a RIEN modifié.\n");
  } else {
    console.log("  → Tout concorde. Ce script n'a RIEN modifié.\n");
  }
}

main().catch((e) => {
  console.error("\n  Le rapprochement a échoué :", e instanceof Error ? e.message : e, "\n");
  process.exitCode = 1;
});
