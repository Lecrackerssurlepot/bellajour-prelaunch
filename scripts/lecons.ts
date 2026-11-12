/**
 * Le bilan de la mémoire de l'éditeur (lot 2, G4) : ce que les leçons disent, par règle et par réglage.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/lecons.ts [--depuis AAAA-MM-JJ] [--cle <cle>]
 *
 * LECTURE SEULE sur `mep_lecons` et `mep_instantanes` (PROD : la base est unique). Aucune écriture, aucun mail.
 * C'est ce que Claude lit à chaque séance (/point, /travailler) avant de proposer un réglage, avec la preuve chiffrée.
 * Sans la migration 20261110, le script le dit et s'arrête.
 */

import { readFileSync } from "node:fs";
for (const l of (() => { try { return readFileSync(".env.local", "utf8").split("\n"); } catch { return []; } })()) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

type Ligne = { cle: string; type: string; regle: string; photos: string[]; proposition: string; geste: string; reglages: Record<string, number>; version: string; qui: string | null; quand: string };

const arg = (n: string): string | null => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] ?? null : null; };

async function main(): Promise<void> {
  const { makeSupabase } = await import("@/lib/supabase");
  const sb = makeSupabase();
  let q = sb.from("mep_lecons").select("cle, type, regle, photos, proposition, geste, reglages, version, qui, quand").order("quand", { ascending: true }).limit(5000);
  const depuis = arg("--depuis"); if (depuis) q = q.gte("quand", depuis);
  const cle = arg("--cle"); if (cle) q = q.eq("cle", cle);
  const { data, error } = await q;
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") { console.log("La table mep_lecons n'existe pas encore : appliquer supabase/migrations/20261110_mep_lecons.sql."); return; }
    throw new Error(`${error.code} ${error.message}`);
  }
  const l = (data ?? []) as Ligne[];
  const { count } = await sb.from("mep_instantanes").select("id", { count: "exact" }).limit(0);
  console.log(`\n${l.length} leçon(s)${depuis ? ` depuis le ${depuis}` : ""}${cle ? ` pour ${cle}` : ""} · ${count ?? 0} instantané(s)\n`);

  /* G6 : le temps par magazine, de l'ouverture au dernier export */
  const parCle = new Map<string, Ligne[]>();
  for (const x of l) { const t = parCle.get(x.cle) ?? []; t.push(x); parCle.set(x.cle, t); }
  console.log("— Par magazine —");
  for (const [k, lignes] of parCle) {
    const ouv = lignes.find((x) => x.type === "ouverture"), exp = [...lignes].reverse().find((x) => x.type === "export");
    const contraires = lignes.filter((x) => x.type !== "ouverture" && x.type !== "export").length;
    const duree = ouv && exp ? Math.round((Date.parse(exp.quand) - Date.parse(ouv.quand)) / 60000) : null;
    console.log(`  ${k.padEnd(48)} ${String(contraires).padStart(3)} geste(s) contraire(s)${duree !== null ? ` · ${duree} min de l'ouverture à l'export` : exp ? "" : " · pas encore exporté"}`);
  }

  /* G1 : les désaccords par règle et par version de réglages */
  console.log("\n— Par règle —");
  const parRegle = new Map<string, Map<string, number>>();
  for (const x of l) {
    if (x.type === "ouverture" || x.type === "export") continue;
    const m = parRegle.get(`${x.regle} · ${x.type}`) ?? new Map<string, number>();
    m.set(x.version, (m.get(x.version) ?? 0) + 1);
    parRegle.set(`${x.regle} · ${x.type}`, m);
  }
  if (!parRegle.size) console.log("  aucun geste contraire : rien à apprendre encore");
  for (const [k, m] of [...parRegle].sort((a, b) => [...b[1].values()].reduce((s, n) => s + n, 0) - [...a[1].values()].reduce((s, n) => s + n, 0))) {
    const total = [...m.values()].reduce((s, n) => s + n, 0);
    console.log(`  ${k.padEnd(32)} ${String(total).padStart(4)}   ${[...m].map(([v, n]) => `${v}: ${n}`).join("  ")}`);
  }
  console.log("\nCe bilan ne change aucun réglage : il sert à en proposer un, avec ces chiffres, à Mathias.\n");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
