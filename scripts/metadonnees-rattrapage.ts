/**
 * T-123 — lire les métadonnées et les lieux des photos déjà déposées.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/metadonnees-rattrapage.ts --essai
 *   npx tsx --tsconfig tsconfig.json scripts/metadonnees-rattrapage.ts
 *   npx tsx --tsconfig tsconfig.json scripts/metadonnees-rattrapage.ts --dossier <token> [--sans-lieux]
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET POURQUOI IL EXISTE
 *
 * Depuis le 21/09/2026, chaque lot confirmé est lu en tâche de fond (date,
 * GPS, appareil, dimensions, empreinte), et les lieux le sont à la fin du
 * dépôt. Les dossiers antérieurs, eux, n'ont rien. Ce script fait le même
 * travail, avec le même module (`@/lib/atelier/enrichissement`), sur tout
 * ce qui n'a pas encore été lu. Il ne touche à RIEN d'autre : ni l'objet,
 * ni `taille`, ni l'état du dossier, ni un mail.
 *
 * IDEMPOTENT ET REPRENABLE : `metadonnees_le` et `lieu_le` marquent ce qui
 * est fait. Un passage interrompu se rattrape en relançant.
 *
 * `--essai` lit le coffre (sortie R2 gratuite) et appelle Geoapify (compté
 * dans le quota gratuit) mais n'écrit RIEN en base. `--sans-lieux` saute
 * Geoapify. Les dossiers anonymisés (photos effacées) sont ignorés.
 *
 * ⚠️ Il ne se lance pas tout seul, et exige `GEOAPIFY_API_KEY` dans
 * `.env.local` pour les lieux : sans elle, il lit les métadonnées et le dit.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { enrichirDossier } from "@/lib/atelier/enrichissement";
import { cleGeoapify } from "@/lib/atelier/geocodage";

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/** `.env.local` versé dans `process.env` : `r2.ts` est écrit pour Next, qui
 *  le charge tout seul. Les variables déjà présentes GAGNENT. */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}

async function main(): Promise<void> {
  const essai = process.argv.includes("--essai");
  const sansLieux = process.argv.includes("--sans-lieux");
  const dossier = argument("--dossier");

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  if (!sansLieux && !cleGeoapify()) {
    console.log("\n  GEOAPIFY_API_KEY absente de .env.local : les métadonnées seront lues, pas les lieux.");
  }

  let requete = supabase
    .from("numeros")
    .select("id, token, titre, prenom, nb_photos, anonymise_le")
    .is("anonymise_le", null)
    .gt("nb_photos", 0)
    .order("created_at", { ascending: true });
  if (dossier) requete = requete.eq("token", dossier);

  const { data, error } = await requete.returns<Array<{ id: string; token: string; titre: string | null; prenom: string | null; nb_photos: number }>>();
  if (error) throw new Error(`Lecture des dossiers échouée : ${error.code} ${error.message}`);
  const numeros = data ?? [];
  if (!numeros.length) { console.log("\n  Aucun dossier à lire.\n"); return; }

  console.log(`\n  ${numeros.length} dossier(s) avec des photos.${essai ? "  [essai — rien n'est écrit]" : ""}\n`);

  const total = { photos: 0, datees: 0, geolocalisees: 0, ratees: 0, demandes: 0 };
  for (const n of numeros) {
    const nom = [n.prenom, n.titre].filter(Boolean).join(" · ") || n.token.slice(0, 8);
    const bilan = await enrichirDossier(supabase, n.id, {
      essai,
      geocoder: !sansLieux,
      journal: (l) => console.log(l),
    });
    const m = bilan.metadonnees;
    if (m.colonnesAbsentes || bilan.lieux?.colonnesAbsentes) {
      console.error("\n  Les colonnes n'existent pas encore.");
      console.error("  Applique d'abord supabase/migrations/20260921_atelier_photos_metadonnees.sql\n");
      process.exit(1);
    }
    const l = bilan.lieux;
    console.log(
      `  ${nom} (${n.nb_photos} photos) : ${m.traitees} lue(s)${m.candidates ? "" : " (déjà lues)"}, ${m.datees} datée(s), ${m.geolocalisees} avec GPS` +
      (l ? `, ${l.demandes} appel(s) Geoapify → ${l.lieux} lieu(x)${l.sansCle ? " (SANS CLÉ)" : ""}` : "") +
      (m.ratees || l?.ratees ? `, ${m.ratees + (l?.ratees ?? 0)} ratée(s)` : "") + "\n",
    );
    total.photos += m.traitees; total.datees += m.datees; total.geolocalisees += m.geolocalisees;
    total.ratees += m.ratees + (l?.ratees ?? 0); total.demandes += l?.demandes ?? 0;
  }

  console.log(`\n  ${total.photos} photo(s) ${essai ? "lisible(s)" : "lue(s)"}, ${total.datees} datée(s), ${total.geolocalisees} avec GPS, ${total.demandes} appel(s) Geoapify.`);
  if (total.ratees) console.log(`  ${total.ratees} en échec — relance le script, ce qui est fait n'est pas refait.`);
  console.log("");
}

main().catch((err) => {
  console.error("\n  Rattrapage interrompu :", (err as Error)?.message, "\n");
  process.exit(1);
});
