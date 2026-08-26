/**
 * Le catalogue Cloudprinter — lecture seule, pour régler la table produit.
 *
 *   node scripts/cloudprinter-produits.mjs produit magazine_pb_a4_p_fc
 *   node scripts/cloudprinter-produits.mjs devis magazine_pb_a4_p_fc FR 32
 *
 * `produit` liste les OPTIONS d'une référence (grammages, pelliculages…)
 * avec, pour chacune, les FICHIERS qu'elle attend : c'est la vérité qui
 * remplit la table PRODUIT_IMPRESSION de src/lib/atelier/impression.ts.
 * `devis` interroge prices/lookup avec les mêmes options que la commande
 * réelle — pour vérifier un prix avant d'imprimer quoi que ce soit.
 *
 * Ne passe AUCUNE commande. La clé vient de .env.local, jamais d'ici.
 * ⚠️ L'API rationne sévèrement (« Requests limit reached ») : un appel à la
 * fois, et on attend entre deux.
 */

import { readFileSync } from "node:fs";

function sansGuillemets(v) {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

const env = (nom) => {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${nom}=(.*)$`, "m"));
  return m ? sansGuillemets(m[1]) : undefined;
};

const BASE = "https://api.cloudprinter.com/cloudcore/1.0";

async function poster(chemin, corps) {
  const apikey = env("CLOUDPRINTER_API_KEY");
  if (!apikey) throw new Error("CLOUDPRINTER_API_KEY absente de .env.local");
  const r = await fetch(`${BASE}/${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...corps, apikey }),
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${chemin} : ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function produit(ref) {
  const d = await poster("products/info", { reference: ref });
  console.log(`\n${d.name ?? ref} (${ref})`);
  const parType = new Map();
  for (const o of d.options ?? []) {
    const liste = parType.get(o.type) ?? [];
    liste.push(o);
    parType.set(o.type, liste);
  }
  for (const [type, options] of parType) {
    console.log(`\n  ${type}`);
    for (const o of options) {
      const fichiers = (o.files ?? []).map((f) => `${f.type}.${f.format}`).join(", ");
      console.log(
        `    ${o.reference}${o.default ? "  (défaut)" : ""}  — ${o.note ?? ""}${fichiers ? `  [fichiers : ${fichiers}]` : ""}`,
      );
    }
  }
  console.log();
}

async function devis(ref, pays, pages) {
  /* Les MÊMES options que payloadCommande (impression.ts) : si le devis
     passe, la commande passera. */
  const d = await poster("prices/lookup", {
    country: pays,
    currency: "EUR",
    items: [
      {
        reference: "devis",
        product: ref,
        count: "1",
        options: [
          { type: "total_pages", count: String(pages) },
          { type: "pageblock_130mcs", count: String(pages) },
          { type: "cover_250mcs", count: "1" },
        ],
      },
    ],
  });
  console.log(JSON.stringify(d, null, 2));
}

const [, , commande, ...args] = process.argv;
try {
  if (commande === "produit" && args[0]) await produit(args[0]);
  else if (commande === "devis" && args.length >= 3) await devis(args[0], args[1], Number(args[2]));
  else {
    console.log("Usage :");
    console.log("  node scripts/cloudprinter-produits.mjs produit <reference>");
    console.log("  node scripts/cloudprinter-produits.mjs devis <reference> <pays> <pages>");
    process.exit(1);
  }
} catch (err) {
  console.error(String(err?.message ?? err));
  process.exit(1);
}
