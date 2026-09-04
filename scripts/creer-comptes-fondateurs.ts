/**
 * creer-comptes-fondateurs — pré-créer EN SILENCE les comptes des fondateurs.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/creer-comptes-fondateurs.ts            (dry-run)
 *   npx tsx --tsconfig tsconfig.json scripts/creer-comptes-fondateurs.ts --vraiment (agit)
 *
 * ⚠️ --vraiment ÉCRIT dans auth.users du projet Supabase de PRODUCTION.
 * Décision de Mathias (04/09) : les quatorze fondateurs ont leur compte
 * pré-créé SANS AUCUN MAIL. Chacun le découvre à son rythme : « mot de
 * passe oublié » (le compte existe, le lien C2 part), ou Google avec la
 * même adresse (email confirmé → Supabase lie tout seul).
 *
 * Pourquoi email_confirm: true — c'est TOUTE la mécanique : le
 * rapprochement des dossiers par email exige un email confirmé (invariant
 * nº2, src/lib/compte/session.ts), et la liaison automatique Google ne
 * joue que sur un email confirmé. Ici l'adresse est déjà prouvée par un
 * paiement Stripe : la confirmer ne déclare rien qu'on ne sache.
 *
 * IDEMPOTENT : un compte déjà existant est un succès, pas une erreur —
 * relancer le script ne casse rien et n'envoie toujours rien.
 */

import { createClient } from "@supabase/supabase-js";

const VRAIMENT = process.argv.includes("--vraiment");

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("waitlist")
    .select("email, prenom, numero_fondateur")
    .eq("offer_type", "founder")
    .eq("status", "confirmed")
    .not("numero_fondateur", "is", null)
    .order("numero_fondateur", { ascending: true });
  if (error) {
    console.error("Lecture waitlist échouée :", error.message);
    process.exit(1);
  }

  const fondateurs = (data ?? []) as Array<{
    email: string;
    prenom: string | null;
    numero_fondateur: number;
  }>;
  console.log(`${fondateurs.length} fondateur(s) confirmé(s) en base.\n`);

  if (!VRAIMENT) {
    for (const f of fondateurs) {
      console.log(`  nº${f.numero_fondateur}  ${f.prenom ?? "—"}  ${f.email}`);
    }
    console.log("\nDry-run : AUCUN compte créé. Relancer avec --vraiment pour agir.");
    return;
  }

  let crees = 0;
  let existants = 0;
  let rates = 0;
  for (const f of fondateurs) {
    const { error: errCreation } = await supabase.auth.admin.createUser({
      email: f.email,
      email_confirm: true,
    });
    if (!errCreation) {
      console.log(`  ✓ nº${f.numero_fondateur}  ${f.email} — compte créé (aucun mail)`);
      crees++;
    } else if (
      errCreation.message.toLowerCase().includes("already") ||
      errCreation.code === "email_exists"
    ) {
      console.log(`  = nº${f.numero_fondateur}  ${f.email} — existait déjà`);
      existants++;
    } else {
      console.error(`  ✗ nº${f.numero_fondateur}  ${f.email} — ${errCreation.message}`);
      rates++;
    }
  }

  console.log(`\n${crees} créé(s), ${existants} existant(s), ${rates} raté(s).`);
  if (rates > 0) process.exit(1);
}

void main();
