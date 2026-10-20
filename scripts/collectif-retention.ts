/**
 * T-159 : effacer le coffre des éditions collectives livrées depuis 30 jours.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts --edition <uuid>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts --jours <N>      (lecture seule : voir ce qui viendrait)
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts [--edition <uuid>] --vraiment
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IL NE FAIT RIEN PAR DÉFAUT, ET CE N'EST PAS UNE POLITESSE
 *
 * Sans `--vraiment`, il LIT (la base, le journal et le listage du coffre) et
 * il RACONTE : quelles éditions, quels objets partiraient, lesquels
 * resteraient, combien de personnes et de téléphones seraient supprimés, et ce
 * qu'une reprise retenterait. Il faut taper le mot pour qu'il efface.
 *
 * LE DÉLAI est la décision de Mathias du 20/10 (question 4) :
 * `DELAI_RETENTION_JOURS` (30 jours après « Marquer livrée »). `--jours N` ne
 * sert qu'à REGARDER plus tôt ou plus tard ; avec `--vraiment`, un délai plus
 * court que la décision est refusé (`delaiDuScript`) : on n'efface jamais
 * avant la date promise.
 *
 * C'EST LE GESTE MANUEL, CELUI DES PREMIÈRES FOIS. Mathias, 20/10 : « les
 * premières fois je le lance avec toi, ensuite il passe tout seul chaque jour,
 * comme la corbeille ». Le passage quotidien existe (`retentionQuotidienne`,
 * après la relève) et suit EXACTEMENT le même chemin (`effacerEdition`), mais
 * il est COUPÉ tant que `COLLECTIF_RETENTION_AUTO` n'est pas posé sur Vercel.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT AVEC --vraiment, DANS CET ORDRE (l'ordre sûr de l'audit S7)
 *
 * 0. Il REPREND d'abord ce qu'un passage précédent n'a pas pu retirer du
 *    coffre (`reprendreRetention`).
 * Puis, pour chaque édition, par `effacerEdition` (retentionServeur.ts) :
 * 1. il relit l'édition et refait le verdict ;
 * 2. il écrit l'INTENTION au journal (`retention_a_effacer`, les clés du
 *    coffre) ; sans elle, rien ne part ;
 * 3. la BASE : téléphones puis personnes supprimés (Q6 : l'adresse part avec
 *    les photos), métadonnées des photos vidées (aucune ligne de photo
 *    supprimée : le nom, la version et l'heure de l'accord restent, Q7), et
 *    en DERNIER le marqueur `photos_supprimees_le` ;
 * 4. le COFFRE, clé par clé, par la porte qui relit `FAMILLES`
 *    (`supprimerClesEdition`) : partent photos, rendus du BAT, contenus,
 *    pièces jointes ; restent le PDF de chaque tour (Q5) et les documents ;
 * 5. ce qui est réglé (`retention_effacee`), puis le résumé (`coffre_efface`),
 *    dans `collectif_evenements`, jamais dans `evenements`.
 * Aucune colonne fraîche : tout ce qu'il lit et écrit est dans la migration
 * 20261013 (appliquée), sauf les deux tables des personnes (20261023) : sans
 * elles, il n'y a personne à supprimer et il le dit.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ AVANT LE PREMIER `--vraiment` : les lots que l'atelier a TÉLÉCHARGÉS sur
 * ses ordinateurs (route `lot`) ne sont pas dans le coffre : ce script ne les
 * voit pas. Le versioning du bucket et les sauvegardes Supabase ne sont pas
 * vérifiés (un objet effacé y survivrait).
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { estUuid, prefixeEdition } from "@/lib/collectif/cles";
import { colonneAbsente } from "@/lib/collectif/migration";
import {
  delaiDuScript,
  FAMILLES,
  ORDRE_FAMILLES,
  PATCH_PHOTO_EFFACEE,
  planEffacement,
  retentionsEnAttente,
  TEXTE_MOTIF,
  verdictRetention,
  type MotifEpargne,
  type PlanEffacement,
} from "@/lib/collectif/retention";
import {
  COFFRE_REEL,
  effacerEdition,
  lireEditionsRetention,
  lireIntentionsRetention,
  reprendreRetention,
  type EditionRetention,
} from "@/lib/collectif/retentionServeur";

/* ─────────────────────────────── l'environnement ─────────────────────────────── */

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/** `.env.local` versé dans `process.env` (r2.ts lit `process.env`, cf. anonymiser-dossiers.ts). */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

/* ─────────────────────────────── les arguments ─────────────────────────────── */

/**
 * Un argument mal tapé ne doit pas passer en silence (« --vraiement » ferait
 * un dry-run, « --jour 30 » un refus : les deux sont sûrs, mais on le DIT).
 */
function argumentsInconnus(argv: readonly string[]): string[] {
  const inconnus: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--vraiment" || a.startsWith("--jours=") || a.startsWith("--edition=")) continue;
    if (a === "--jours" || a === "--edition") {
      i++;
      continue;
    }
    inconnus.push(a);
  }
  return inconnus;
}

function editionDemandee(argv: readonly string[]): string | null | "invalide" {
  let brut: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--edition") brut = argv[i + 1];
    else if (argv[i].startsWith("--edition=")) brut = argv[i].slice("--edition=".length);
  }
  if (brut === undefined) return null;
  return estUuid(brut) ? brut.toLowerCase() : "invalide";
}

/* ─────────────────────────────── les comptes (lecture) ─────────────────────────────── */

/** Un compte en `head` sur des colonnes de 20261013 (aucune fraîche) : jamais les lignes. */
async function compter(supabase: SupabaseClient, table: string, editionId: string, colonneNonNulle: string | null): Promise<number | "colonne_absente"> {
  let q = supabase.from(table).select("id", { count: "exact", head: true }).eq("edition_id", editionId);
  if (colonneNonNulle) q = q.not(colonneNonNulle, "is", null);
  const { count, error } = await q;
  if (error) {
    if (colonneAbsente(error.code)) return "colonne_absente";
    throw new Error(`Compte de ${table} échoué : ${error.code} ${error.message}`);
  }
  if (count === null) throw new Error(`Compte de ${table} absent de la réponse`);
  return count;
}

/**
 * Les personnes et les téléphones (migration 20261023, pas forcément appliquée) :
 * un compte en GET `limit(0)`, jamais `head` (un HEAD sur une table absente
 * rend une erreur sans code). `"table_absente"` : il n'y a personne à supprimer.
 */
async function compterPersonnes(supabase: SupabaseClient, table: "collectif_participants" | "collectif_participants_appareils", editionId: string): Promise<number | "table_absente"> {
  const colonne = table === "collectif_participants" ? "id" : "appareil_id";
  const { count, error } = await supabase.from(table).select(colonne, { count: "exact" }).eq("edition_id", editionId).limit(0);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return "table_absente";
    throw new Error(`Compte de ${table} échoué : ${error.code} ${error.message}`);
  }
  return count ?? 0;
}

type Lignes = {
  photos: number;
  contenus: number;
  documents: number;
  piecesJointes: number | "colonne_absente";
  personnes: number | "table_absente";
  telephones: number | "table_absente";
};

async function compterLignes(supabase: SupabaseClient, editionId: string): Promise<Lignes> {
  const [photos, contenus, documents, piecesJointes, personnes, telephones] = await Promise.all([
    compter(supabase, "collectif_photos", editionId, null),
    compter(supabase, "collectif_contenus", editionId, "r2_key"),
    compter(supabase, "collectif_documents", editionId, "r2_key"),
    /* 20261014 (appliquée le 14/10) : repli si la colonne manquait. */
    compter(supabase, "collectif_messages", editionId, "piece_jointe_key"),
    compterPersonnes(supabase, "collectif_participants", editionId),
    compterPersonnes(supabase, "collectif_participants_appareils", editionId),
  ]);
  const nombre = (v: number | "colonne_absente") => (typeof v === "number" ? v : 0);
  return { photos: nombre(photos), contenus: nombre(contenus), documents: nombre(documents), piecesJointes, personnes, telephones };
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */

function taille(octets: number): string {
  if (octets >= 1e9) return `${(octets / 1e9).toFixed(2).replace(".", ",")} Go`;
  if (octets >= 1e6) return `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`;
  if (octets >= 1e3) return `${Math.round(octets / 1e3)} Ko`;
  return `${octets} o`;
}

function nomEdition(e: EditionRetention): string {
  return `${e.organisation} · ${e.evenement}`.slice(0, 60);
}

type Candidate = { e: EditionRetention; jours: number; livreeLe: string; plan: PlanEffacement; vide: boolean; lignes: Lignes };

/* ─────────────────────────────── main ─────────────────────────────── */

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inconnus = argumentsInconnus(argv);
  if (inconnus.length) throw new Error(`argument(s) inconnu(s) : ${inconnus.join(" ")} (attendus : --jours N, --edition <uuid>, --vraiment)`);

  const vraiment = argv.includes("--vraiment");
  const delaiLu = delaiDuScript(argv, vraiment);
  if (!delaiLu.ok) throw new Error(delaiLu.erreur);
  const delai = delaiLu.jours;
  const seule = editionDemandee(argv);
  if (seule === "invalide") throw new Error("--edition attend un uuid.");
  const maintenant = new Date();

  chargerEnv();
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  console.log(
    `\n  Fin de conservation des éditions collectives : ${delai} jour(s) après « Marquer livrée » (T-159, ${delaiLu.source === "decision" ? "décision de Mathias du 20/10" : "--jours tapé"}).`
  );
  console.log(vraiment ? "  MODE : --vraiment (le coffre sera effacé)." : "  MODE : lecture seule (rien ne sera modifié).");

  /* Ce qu'une reprise retenterait (des passages précédents) : lu, jamais rejoué sans --vraiment. */
  const intentions = await lireIntentionsRetention(supabase);
  if (intentions === null) throw new Error("journal des intentions illisible : rien n'est décidé sans lui.");
  const enAttente = retentionsEnAttente(intentions, maintenant);
  console.log(
    enAttente.length
      ? `  Reprise : ${enAttente.length} intention(s), ${enAttente.reduce((s, a) => s + a.cles.length, 0)} clé(s) restée(s) au coffre d'un passage précédent.`
      : "  Reprise : rien de resté au coffre d'un passage précédent."
  );

  const lu = await lireEditionsRetention(supabase, seule);
  if (!lu.ok) {
    if (lu.absente) throw new Error("Tables collectif absentes (migration 20261013 non appliquée) : rien à lire.");
    throw new Error(`Lecture des éditions échouée : ${lu.code ?? "?"} ${lu.message ?? ""}`);
  }
  const editions = lu.editions;
  if (seule && !editions.length) throw new Error(`aucune édition ${seule}`);
  console.log(`  ${editions.length} édition(s) lue(s).`);

  const epargnees = new Map<MotifEpargne, EditionRetention[]>();
  const candidates: Candidate[] = [];
  for (const e of editions) {
    const v = verdictRetention(e, maintenant, delai);
    if (!v.effacable) {
      epargnees.set(v.motif, [...(epargnees.get(v.motif) ?? []), e]);
      continue;
    }
    const objets = await COFFRE_REEL.lister(prefixeEdition(e.id));
    if (!objets) throw new Error(`listage du coffre de ${e.id} impossible : rien n'est décidé sans lui.`);
    candidates.push({ e, jours: v.jours, livreeLe: v.livreeLe, plan: planEffacement(objets, e.id), vide: objets.length === 0, lignes: await compterLignes(supabase, e.id) });
  }

  if (epargnees.size) {
    console.log("\n  Épargnées :");
    for (const [motif, liste] of epargnees) {
      console.log(`    ${String(liste.length).padStart(4)} : ${TEXTE_MOTIF[motif]}`);
      /* « dans le délai » et « sans date » sont celles qu'on veut voir nommées. */
      if (motif === "dans_le_delai" || motif === "livree_sans_date") {
        for (const e of liste) {
          const v = verdictRetention(e, maintenant, delai);
          const age = !v.effacable && v.jours !== null ? `, livrée il y a ${Math.floor(v.jours)} j` : "";
          console.log(`           ${nomEdition(e)}  (${e.id}${age})`);
        }
      }
    }
  }

  if (!candidates.length) {
    console.log("\n  Aucune édition à effacer aujourd'hui.");
  } else {
    console.log(`\n  ${candidates.length} édition(s) dont le coffre partirait :`);
    for (const c of candidates) {
      const marques = [c.e.archive_le ? "archivée" : null, c.e.demo ? "démonstration" : null].filter(Boolean).join(", ");
      console.log(`\n  ${nomEdition(c.e)}${marques ? `  [${marques}]` : ""}`);
      console.log(`    /admin/collectif/${c.e.id}  livrée le ${c.livreeLe.slice(0, 10)}, il y a ${Math.floor(c.jours)} j`);
      for (const f of ORDRE_FAMILLES) {
        const { n, octets } = c.plan.parFamille[f];
        if (!n) continue;
        console.log(`    ${FAMILLES[f].libelle.padEnd(72)} ${String(n).padStart(6)}  ${taille(octets).padStart(9)}  ${FAMILLES[f].efface ? "EFFACÉ" : "gardé"}`);
      }
      if (c.vide) console.log("    (coffre vide)");
      const pj = c.lignes.piecesJointes === "colonne_absente" ? "colonne absente" : String(c.lignes.piecesJointes);
      const pers = (v: number | "table_absente") => (v === "table_absente" ? "table absente (migration 20261023 non appliquée)" : String(v));
      console.log(
        `    Lignes : ${c.lignes.photos} photo(s) gardées, métadonnées vidées (${Object.keys(PATCH_PHOTO_EFFACEE).join(", ")}) ;` +
          ` ${c.lignes.contenus} contenu(s), ${c.lignes.documents} document(s), ${pj} pièce(s) jointe(s) : lignes inchangées.`
      );
      console.log(`    Personnes supprimées (adresse, Q6) : ${pers(c.lignes.personnes)} ; téléphones : ${pers(c.lignes.telephones)}.`);
    }
  }

  if (!vraiment) {
    console.log("\n  Rien n'a été modifié. Relancer avec --vraiment pour effacer ces coffres (et reprendre ce qui est resté).");
    console.log("  Avec --vraiment : l'intention au journal, la base (personnes, photos, marqueur), puis le coffre ; aucune ligne de photo supprimée.\n");
    return;
  }

  console.log("\n  Effacement en cours…\n");
  const jusqua = Date.now() + 60 * 60 * 1000;
  const reprise = await reprendreRetention(supabase, jusqua, maintenant);
  if (reprise === null) throw new Error("reprise impossible (journal ou éditions illisibles) : rien d'autre n'est tenté.");
  if (reprise.intentions) console.log(`  Reprise : ${reprise.effaces} objet(s) effacé(s), ${reprise.gardes} gardé(s), ${reprise.restes} encore au coffre.`);

  let faits = 0;
  let rates = 0;
  for (const c of candidates) {
    const r = await effacerEdition(supabase, c.e.id, { delai, maintenant, par: "script", jusqua });
    if (r.statut === "effacee") {
      faits++;
      const pers = r.personnes === null ? "aucune table des personnes" : `${r.personnes} personne(s), ${r.telephones ?? 0} téléphone(s) supprimé(s)`;
      console.log(`  ✓ ${nomEdition(c.e).padEnd(60)} ${r.objets} objet(s) effacé(s), ${r.gardes} gardé(s), ${r.restes} resté(s) ; ${pers}${r.journal ? "" : " ; ⚠️ journal incomplet"}`);
      if (r.restes) console.log("     Des objets ont résisté : ils sont dans l'intention, relancer le script (ou le passage quotidien) les retentera.");
    } else if (r.statut === "epargnee") {
      console.log(`  · ${nomEdition(c.e).padEnd(60)} épargnée au dernier moment : ${TEXTE_MOTIF[r.motif]}`);
    } else {
      rates++;
      console.error(`  ✗ ${nomEdition(c.e)} : ${r.statut} à l'étape « ${r.etape} »${r.code ? ` (${r.code})` : ""}. Rien n'a quitté le coffre : relancer le script.`);
    }
  }
  console.log(`\n  ${faits} édition(s) effacée(s).`);
  if (rates) {
    console.log(`  ${rates} en échec : relancer le script, ce qui est fait n'est pas refait.\n`);
    process.exit(1);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n  Rétention interrompue :", (err as Error)?.message, "\n");
  process.exit(1);
});
