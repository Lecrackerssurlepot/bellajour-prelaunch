/**
 * Les templates Brevo et le code disent-ils la même chose ?
 *
 *   npx tsx --tsconfig tsconfig.json scripts/verif-mails-brevo.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA PANNE QU'IL CHERCHE
 *
 * Un template qui écrit `{{ params.SUIVI }}` alors que le code n'envoie pas
 * SUIVI ne produit PAS d'erreur. Brevo remplace par du vide, le mail part,
 * il a l'air normal, et il manque un mot. Personne ne le voit avant qu'une
 * cliente le signale — ou pire, ne le signale pas.
 *
 * L'inverse est bénin (une variable envoyée et non utilisée) mais se signale
 * quand même : c'est souvent le symptôme d'un template qu'on a modifié dans
 * l'interface sans revenir au code.
 *
 * Lecture seule. Aucun mail n'est envoyé, aucun template n'est modifié.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { parametresPour, type CodeMail, type NumeroPourMail } from "@/lib/atelier/mails";

const CODES: Array<{ code: CodeMail; env: string }> = [
  { code: "M1", env: "BREVO_TEMPLATE_M1_ID" },
  { code: "M2", env: "BREVO_TEMPLATE_M2_ID" },
  { code: "M3", env: "BREVO_TEMPLATE_M3_ID" },
  { code: "M3b", env: "BREVO_TEMPLATE_M3B_ID" },
  { code: "M4", env: "BREVO_TEMPLATE_M4_ID" },
  { code: "M5", env: "BREVO_TEMPLATE_M5_ID" },
  { code: "M6", env: "BREVO_TEMPLATE_M6_ID" },
  { code: "M7", env: "BREVO_TEMPLATE_M7_ID" },
  { code: "M8", env: "BREVO_TEMPLATE_M8_ID" },
  { code: "M9", env: "BREVO_TEMPLATE_M9_ID" },
];

/* Un dossier complet : on veut la liste des variables ENVOYABLES, pas le
   comportement sur un dossier incomplet. */
const DOSSIER: NumeroPourMail = {
  id: "x",
  token: "t".repeat(32),
  titre: "Notre été à Séville",
  prenom: "Camille",
  email: "camille@example.com",
  nb_photos: 74,
  nb_pages: 34,
  palier: "p40",
  apercu_urls: { c1: "a", c4: "b", double: "c" },
  // Champs de NumeroPourReleve utilisés par parametresPour :
  ...({ etat_maj_le: new Date().toISOString(), transporteur: "Colissimo", tracking_url: "https://x" } as object),
} as NumeroPourMail;

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets : dotenv les
   retire, un lecteur maison non. */
function env(nom: string): string | undefined {
  const brut = readFileSync(".env.local", "utf8");
  const m = brut.match(new RegExp(`^${nom}=(.*)$`, "m"));
  if (!m) return undefined;
  const t = m[1].trim();
  const v = t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
  return v || undefined;
}

function cleBrevo(): string {
  const k = env("BREVO_API_KEY");
  if (!k) throw new Error("BREVO_API_KEY absente de .env.local");
  return k;
}

async function main() {
  const cle = cleBrevo();
  let problemes = 0;

  for (const { code, env: nomEnv } of CODES) {
    const id = env(nomEnv);
    if (!id) {
      console.log(`  —   ${code.padEnd(4)} template non configuré (${nomEnv})`);
      continue;
    }

    const r = await fetch(`https://api.brevo.com/v3/smtp/templates/${id}`, {
      headers: { "api-key": cle, accept: "application/json" },
    });
    if (!r.ok) {
      console.log(`  ✗   ${code.padEnd(4)} template ${id} illisible (${r.status})`);
      problemes++;
      continue;
    }
    const t = (await r.json()) as { htmlContent?: string; subject?: string; isActive?: boolean };
    const source = `${t.htmlContent ?? ""}\n${t.subject ?? ""}`;

    /* Ce que le TEMPLATE réclame. */
    const attendues = new Set<string>();
    for (const m of source.matchAll(/\{\{\s*params\.([A-Z_]+)\s*\}\}/g)) attendues.add(m[1]);

    /* Ce que le CODE envoie. */
    const envoyees = new Set(Object.keys(parametresPour(code, DOSSIER)));

    const manquantes = [...attendues].filter((v) => !envoyees.has(v));
    const inutiles = [...envoyees].filter((v) => !attendues.has(v));

    if (!t.isActive) {
      console.log(`  ✗   ${code.padEnd(4)} template ${id} INACTIF — l'envoi échouera`);
      problemes++;
    }
    if (manquantes.length) {
      console.log(`  ✗   ${code.padEnd(4)} le template attend ${manquantes.join(", ")} — le code ne l'envoie PAS`);
      problemes++;
    } else if (inutiles.length) {
      console.log(`  ~   ${code.padEnd(4)} envoyées mais non utilisées : ${inutiles.join(", ")}`);
    } else {
      console.log(`  ok  ${code.padEnd(4)} template ${id} · ${[...attendues].sort().join(", ") || "aucune variable"}`);
    }
  }

  console.log(problemes === 0 ? "\nAucun trou de variable.\n" : `\n${problemes} problème(s).\n`);
  process.exit(problemes === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
