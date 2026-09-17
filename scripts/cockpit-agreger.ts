/**
 * scripts/cockpit-agreger.ts — lance le job du cockpit à la main et relit
 * ce qu'il a écrit.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/cockpit-agreger.ts
 *
 * Même job que le cron du lundi et que le bouton « Recalculer » : réécrit
 * TOUTES les semaines complètes dans `weekly_metrics` (upsert, idempotent),
 * puis affiche les lignes et le verdict tel que l'écran le calcule. Touche
 * la base que `.env.local` désigne, donc la PROD : n'écrit que l'agrégat,
 * jamais un dossier, jamais un mail.
 */

import { readFileSync } from "node:fs";

/* `.env.local` versé dans process.env — même geste que anonymiser-dossiers.ts.
   ⚠️ Les valeurs peuvent être entre guillemets (cf. recette.mjs). */
for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
  const i = ligne.indexOf("=");
  if (i < 1 || ligne.trimStart().startsWith("#")) continue;
  const cle = ligne.slice(0, i).trim();
  const val = ligne.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  if (!(cle in process.env)) process.env[cle] = val;
}

async function main() {
  const { makeSupabase } = await import("@/lib/supabase");
  const { agregerSemaines } = await import("@/lib/cockpit/job");
  const { chargerCockpit } = await import("@/lib/cockpit/donnees");
  const { calculerCockpit, phraseVerdict, LIBELLE_VERDICT } = await import("@/lib/cockpit/modele");

  const r = await agregerSemaines(makeSupabase());
  console.log("job :", JSON.stringify(r));
  if (!r.ok) process.exit(1);

  const d = await chargerCockpit();
  if (d.absent || !d.reglages) {
    console.log("tables absentes ou réglages manquants");
    process.exit(1);
  }
  console.log("\nsemaine   lundi        total  froid  chaud  sans  pages  délai");
  for (const l of d.lignes) {
    console.log(
      `${l.semaine}    ${l.date_debut}   ${String(l.commandes_totales).padStart(3)}   ${String(l.commandes_froides).padStart(3)}    ${String(l.commandes_chaudes).padStart(3)}   ${String(l.commandes_sans_origine).padStart(3)}   ${String(l.pages_moy ?? "—").padStart(4)}   ${l.delai_moy_jours ?? "—"}`,
    );
  }
  const { regle_le, regle_par, ...reglages } = d.reglages;
  const c = calculerCockpit(d.lignes, reglages);
  console.log("\nréglages :", JSON.stringify(reglages), regle_le ? `réglés le ${regle_le} par ${regle_par}` : "(jamais réglés)");
  console.log(`verdict  : ${LIBELLE_VERDICT[c.verdict]} — ${phraseVerdict(c, reglages)}`);
  console.log(`fiable   : ${c.fiabilite.fiable} ${c.fiabilite.raisons.join(" ; ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
