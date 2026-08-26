/**
 * La console de recette — l'outillage de la séance de test.
 *
 *   node scripts/recette.mjs etat                    # tous les dossiers de test
 *   node scripts/recette.mjs etat "Test 1"           # un seul, en détail
 *   node scripts/recette.mjs pousser "Test 1" M2     # force un mail à retardement
 *   node scripts/recette.mjs relever                 # déclenche la relève
 *   node scripts/recette.mjs nettoyer --vraiment     # supprime les dossiers TEST
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CET OUTIL EXISTE
 *
 * Quatre choses du parcours ne se testent pas en une réunion : M2 attend
 * 24 h, M3b attend 3 jours, M8 attend 3 jours, l'auto-validation attend
 * 7 jours. On ne va pas raccourcir les délais du produit pour autant : un
 * réglage « mode test » dans le code métier, c'est un chemin d'exécution que
 * personne ne relit et qui finit par diverger de la production.
 *
 * On VIEILLIT donc le dossier. Ce script recule la date dont dépend la règle,
 * puis déclenche la relève. La règle d'envoi n'est pas contournée : elle est
 * satisfaite. C'est exactement ce qui se produira dans trois jours pour de
 * vrai, en accéléré.
 *
 * ⚠️ IL AGIT SUR LA BASE DE PRODUCTION — c'est la même que celle de la
 * preview. D'où la convention de titre : `nettoyer` ne touche QUE les
 * dossiers dont le titre commence par « test ».
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets : dotenv les
   retire, un `split("=")` maison non. Une clé lue avec ses guillemets produit
   une erreur incompréhensible loin d'ici (« Invalid supabaseUrl »). */
function sansGuillemets(v) {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

const env = (nom) => {
  const m = readFileSync(".env.local", "utf8").match(new RegExp(`^${nom}=(.*)$`, "m"));
  return m ? sansGuillemets(m[1]) : undefined;
};

/* La preview : Stripe y est en mode test, et elle fait tourner le même code
   que la production. C'est là que la séance se déroule. */
const CIBLES = {
  preview: "https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app",
  local: "http://localhost:3000",
  prod: "https://www.bellajour.fr",
};

const H = 3_600_000;
const J = 24 * H;

/**
 * Ce que chaque mail attend du temps, et comment on le lui donne.
 *
 * `verifier` dit ce qui manque AVANT de vieillir quoi que ce soit : « pousse
 * le M8 » sur un dossier qui n'est pas livré doit répondre pourquoi, pas
 * rester muet.
 */
const LEVIERS = {
  M2: {
    quoi: "relance « il manque les photos », normalement à J+1",
    verifier: (n) =>
      n.nb_photos > 0 ? "le dépôt est déjà fait : M2 ne concerne que les dossiers sans photo" : null,
    vieillir: async (sb, n) =>
      sb.from("numeros").update({ created_at: new Date(Date.now() - 26 * H).toISOString() }).eq("id", n.id),
    note: "⚠️ La borne de mise en service doit être antérieure : poser ATELIER_M2_DEPUIS sur Preview.",
  },
  M2b: {
    quoi: "relance « vos photos sont arrivées », normalement à J+1",
    /* Le cas du 25/08 : les photos sont montées, le dernier bouton jamais
       cliqué. C'est `consent_photos` qui tranche, jamais le compteur. */
    verifier: (n) =>
      !n.nb_photos
        ? "aucune photo déposée : c'est M2 qui relance, pas M2b"
        : n.consent_photos
          ? "le dépôt est terminé : M2b ne concerne que les dépôts restés en plan"
          : null,
    vieillir: async (sb, n) =>
      sb.from("numeros").update({ created_at: new Date(Date.now() - 26 * H).toISOString() }).eq("id", n.id),
    note: "⚠️ Même borne que M2 : ATELIER_M2_DEPUIS doit être antérieure sur Preview.",
  },
  M3b: {
    quoi: "relance « votre numéro vous attend », normalement à J+3 après M3",
    verifier: (n) =>
      n.etat !== "apercu_pret"
        ? `le dossier est en « ${n.etat} », M3b ne concerne que l'aperçu publié`
        : n.stripe_payment_intent
          ? "le numéro est déjà payé : on ne relance pas une cliente qui a payé"
          : !n.mails.M3
            ? "M3 n'est jamais parti : il n'y a rien à relancer"
            : null,
    vieillir: async (sb, n) =>
      sb.from("mails_envoyes")
        .update({ envoye_le: new Date(Date.now() - 4 * J).toISOString() })
        .eq("numero_id", n.id)
        .eq("code", "M3"),
  },
  M8: {
    quoi: "« et le prochain moment ? », normalement à J+3 après la livraison",
    verifier: (n) =>
      n.etat !== "livree"
        ? `le dossier est en « ${n.etat} », M8 attend la livraison`
        : !n.mails.M7
          ? "M7 n'est jamais parti : la chaîne est rompue"
          : null,
    vieillir: async (sb, n) =>
      sb.from("numeros").update({ etat_maj_le: new Date(Date.now() - 4 * J).toISOString() }).eq("id", n.id),
  },
  auto: {
    quoi: "l'auto-validation à J+7 (le dossier passe seul en « validée »)",
    verifier: (n) =>
      n.etat !== "maquette_prete"
        ? `le dossier est en « ${n.etat} », l'auto-validation attend l'état « maquette prête »`
        : !n.mails.M5
          ? "M5 n'est jamais parti : on ne valide pas d'office un numéro jamais annoncé"
          : n.retouches_demandees_le
            ? "des retouches sont demandées : l'auto-validation est suspendue (republier la maquette pour reprendre)"
            : null,
    vieillir: async (sb, n) =>
      sb.from("numeros").update({ etat_maj_le: new Date(Date.now() - 8 * J).toISOString() }).eq("id", n.id),
  },
};

function sb() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  return createClient(url, key);
}

async function lire(client, titre) {
  let q = client
    .from("numeros")
    .select("id, token, titre, prenom, email, etat, nb_photos, consent_photos, nb_pages, palier, created_at, etat_maj_le, stripe_payment_intent, retouches_demandees_le")
    .order("created_at", { ascending: false });
  if (titre) q = q.ilike("titre", titre);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const ids = (data ?? []).map((d) => d.id);
  const parDossier = new Map();
  if (ids.length) {
    const { data: envois } = await client
      .from("mails_envoyes")
      .select("numero_id, code, envoye_le")
      .in("numero_id", ids);
    for (const e of envois ?? []) {
      const m = parDossier.get(e.numero_id) ?? {};
      m[e.code] = e.envoye_le;
      parDossier.set(e.numero_id, m);
    }
  }
  return (data ?? []).map((d) => ({ ...d, mails: parDossier.get(d.id) ?? {} }));
}

async function relever(cible) {
  const secret = env("ATELIER_MAILS_SECRET");
  if (!secret) throw new Error("ATELIER_MAILS_SECRET absente de .env.local");
  const r = await fetch(`${cible}/api/atelier/mails/relever`, {
    method: "POST",
    headers: { "x-atelier-secret": secret },
  });
  return r.json().catch(() => ({ error: `réponse illisible (${r.status})` }));
}

function afficher(n) {
  const mails = Object.keys(n.mails).sort().join(", ") || "aucun";
  const age = ((Date.now() - Date.parse(n.etat_maj_le)) / H).toFixed(0);
  console.log(`  ${(n.titre ?? "(sans titre)").padEnd(22)} ${n.etat.padEnd(22)} ${String(n.nb_photos).padStart(3)} ph  ${age.padStart(4)} h  mails: ${mails}`);
  console.log(`  ${"".padEnd(22)} ${n.token}`);
}

/* ─────────────────────────────── commandes ─────────────────────────────── */

const [commande, ...args] = process.argv.slice(2);
const cible = CIBLES[(args.find((a) => a.startsWith("--sur="))?.split("=")[1]) ?? "preview"] ?? CIBLES.preview;

const client = sb();

if (commande === "etat") {
  const titre = args.find((a) => !a.startsWith("--"));
  const dossiers = await lire(client, titre ? `%${titre}%` : null);
  console.log(`\n${dossiers.length} dossier(s) :\n`);
  dossiers.forEach(afficher);
  console.log();
} else if (commande === "pousser") {
  const [titre, code] = args.filter((a) => !a.startsWith("--"));
  const levier = LEVIERS[code];
  if (!levier) {
    console.error(`Mail inconnu : ${code}. Disponibles : ${Object.keys(LEVIERS).join(", ")}`);
    process.exit(1);
  }
  const [n] = await lire(client, `%${titre}%`);
  if (!n) {
    console.error(`Aucun dossier ne correspond à « ${titre} ».`);
    process.exit(1);
  }

  const empeche = levier.verifier(n);
  if (empeche) {
    console.error(`\n  Impossible de pousser ${code} sur « ${n.titre} » :\n  ${empeche}\n`);
    process.exit(1);
  }
  if (n.mails[code]) {
    console.log(`\n  ${code} est DÉJÀ parti pour « ${n.titre} » le ${n.mails[code].slice(0, 16).replace("T", " ")}.`);
    console.log(`  Pour le renvoyer, retirer son verrou dans mails_envoyes.\n`);
    process.exit(0);
  }

  console.log(`\n  ${code} — ${levier.quoi}`);
  if (levier.note) console.log(`  ${levier.note}`);
  const { error } = await levier.vieillir(client, n);
  if (error) {
    console.error(`  Vieillissement échoué : ${error.message}`);
    process.exit(1);
  }
  console.log(`  Dossier vieilli. Déclenchement de la relève sur ${cible}…`);
  const r = await relever(cible);
  console.log(`  ${JSON.stringify(r)}\n`);
} else if (commande === "relever") {
  console.log(`\n  Relève sur ${cible} :`);
  console.log(`  ${JSON.stringify(await relever(cible))}\n`);
} else if (commande === "signal") {
  /* Forge un signal CloudSignal et le poste sur notre webhook — la recette
     du RETOUR Cloudprinter sans dépendre de leur sandbox. Le payload a la
     forme documentée (apikey, type, order, item, datetime + tracking pour
     ItemShipped) ; `order` = l'id du dossier, le chemin de résolution nº1. */
  const [titre, type = "ItemShipped"] = args.filter((a) => !a.startsWith("--"));
  const cle = env("CLOUDPRINTER_WEBHOOK_KEY");
  if (!cle) {
    console.error("\n  CLOUDPRINTER_WEBHOOK_KEY absente de .env.local — le webhook répondrait 404.\n");
    process.exit(1);
  }
  const [n] = await lire(client, `%${titre}%`);
  if (!n) {
    console.error(`\n  Aucun dossier ne correspond à « ${titre} ».\n`);
    process.exit(1);
  }
  const corps = {
    apikey: cle,
    type,
    order: n.id,
    item: `${n.id}-1`,
    datetime: new Date().toISOString(),
    ...(type === "ItemShipped" ? { tracking: "TEST123456789FR", shipping_option: "Colissimo suivi" } : {}),
    ...(type === "ItemError" ? { cause: "recette", message: "Signal forge par scripts/recette.mjs" } : {}),
  };
  console.log(`\n  ${type} → ${cible}/api/cloudprinter/webhook pour « ${n.titre} » (${n.etat})`);
  const r = await fetch(`${cible}/api/cloudprinter/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps),
  });
  const texte = await r.text();
  console.log(`  HTTP ${r.status} ${texte.slice(0, 200)}\n`);
} else if (commande === "nettoyer") {
  /* Deux façons de désigner ce qu'on efface, parce que la convention de
     titre ne survit pas au contact du réel : en pleine séance, on tape ce
     qui passe par la tête, pas « Test 1 ».
       par défaut   : les titres commençant par « test »
       --depuis=... : tout ce qui a été créé depuis cette date (ISO ou AAAA-MM-JJ)
     La seconde est la plus sûre pour une séance : elle ne dépend d'aucune
     discipline de nommage. */
  const depuis = args.find((a) => a.startsWith("--depuis="))?.split("=")[1];
  let dossiers;
  if (depuis) {
    const t = Date.parse(depuis.length <= 10 ? `${depuis}T00:00:00Z` : depuis);
    if (Number.isNaN(t)) {
      console.error(`\n  Date illisible : ${depuis}. Exemple : --depuis=2026-08-25\n`);
      process.exit(1);
    }
    dossiers = (await lire(client, null)).filter((d) => Date.parse(d.created_at) >= t);
  } else {
    dossiers = await lire(client, "test%");
  }
  if (!dossiers.length) {
    console.log("\n  Aucun dossier « test… » à supprimer.\n");
    process.exit(0);
  }
  console.log(`\n  ${dossiers.length} dossier(s) seront SUPPRIMÉS (photos, journal, notes, verrous compris) :\n`);
  dossiers.forEach(afficher);
  if (!args.includes("--vraiment")) {
    console.log(`\n  Rien n'a été supprimé. Relancer avec --vraiment pour confirmer.\n`);
    process.exit(0);
  }
  const { error } = await client.from("numeros").delete().in("id", dossiers.map((d) => d.id));
  console.log(error ? `\n  Échec : ${error.message}\n` : `\n  ${dossiers.length} dossier(s) supprimé(s).\n`);
} else {
  console.log(`
  node scripts/recette.mjs etat [titre]              état des dossiers
  node scripts/recette.mjs pousser <titre> <code>    force un mail à retardement
  node scripts/recette.mjs relever                   déclenche la relève
  node scripts/recette.mjs signal <titre> [type]     forge un webhook Cloudprinter
                                                     (types : ItemShipped, ItemProduced, ItemError…)
  node scripts/recette.mjs nettoyer [--vraiment]     supprime les dossiers « test… »

  Codes poussables : ${Object.keys(LEVIERS).join(", ")}
  Cible : --sur=preview (défaut) | local | prod
`);
}
