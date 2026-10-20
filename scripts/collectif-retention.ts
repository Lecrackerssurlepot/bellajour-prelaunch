/**
 * T-159 : effacer le coffre des éditions collectives livrées depuis au moins N jours.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts --jours <N>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts --jours <N> --edition <uuid>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-retention.ts --jours <N> [--edition <uuid>] --vraiment
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IL NE FAIT RIEN PAR DÉFAUT, ET CE N'EST PAS UNE POLITESSE
 *
 * Sans `--vraiment`, il LIT (la base et le listage du coffre) et il RACONTE :
 * quelles éditions, quels objets partiraient, lesquels resteraient, quelles
 * lignes seraient touchées. Il faut taper le mot pour qu'il efface.
 *
 * ⚠️ `--jours` EST OBLIGATOIRE ET N'A AUCUNE VALEUR PAR DÉFAUT. La décision de
 * Mathias du 20/10/2026 dit « 30 jours, un truc comme ça, après la réception
 * de la livraison » ; le chiffre sera fixé par la politique de confidentialité
 * (projet : docs/produit/collectif/PROJET-CONFIDENTIALITE-B2B.md). Tant qu'il
 * ne l'est pas, c'est à celui qui lance le script de le taper.
 *
 * ⚠️ ET IL N'A PAS DE CRON, VOLONTAIREMENT (même raison que T-076) : une tâche
 * planifiée qui efface des photos sans que personne ne regarde est exactement
 * la mécanique dont on découvre le défaut après.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, DANS CET ORDRE, ET POURQUOI CET ORDRE
 *
 * 1. Il n'invente AUCUNE règle. Qui est éligible (livrée, date lisible, délai
 *    écoulé, pas déjà effacée ; jamais en impression ni expédiée), ce qui part
 *    et ce qui reste (`FAMILLES`), ce que deviennent les lignes
 *    (`PATCH_PHOTO_EFFACEE`) : tout vient de `@/lib/collectif/retention`,
 *    module pur éprouvé par `scripts/verif-collectif.ts`.
 *
 * 2. Il efface le COFFRE d'abord, par la seule porte qui l'accepte
 *    (`supprimerCoffreEdition`, garde `collectif/<uuid>/`), et abandonne
 *    l'édition entière si un seul objet résiste : un DELETE sur une clé déjà
 *    partie répond OK, donc relancer est inoffensif ; une base nettoyée en
 *    face d'un coffre encore plein ferait des objets que plus rien ne
 *    rattache à personne.
 *
 * 3. Il ne supprime AUCUNE LIGNE. Les photos gardent leur ligne (les comptes de
 *    l'édition restent vrais) ; seules les colonnes qui décrivent l'image, son
 *    lieu et son appareil sont vidées. Puis il pose `photos_supprimees_le`
 *    (le marqueur de la migration 20261013 : jamais deux fois).
 *
 * 4. Il journalise dans `collectif_evenements` (`coffre_efface`), jamais dans
 *    `evenements` (clé étrangère vers `numeros`).
 *
 * Aucune colonne fraîche : tout ce qu'il lit et écrit est dans la migration
 * 20261013 (appliquée le 13/10), sauf `collectif_messages.piece_jointe_key`
 * (20261014, appliquée le 14/10) qu'il ne fait que COMPTER, avec un repli.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ AVANT LE PREMIER `--vraiment` (voir T-159) : les écrans de l'espace et de
 * la fiche ne lisent pas encore `photos_supprimees_le` ; une édition effacée y
 * montrerait des vignettes vides. Et les lots que l'atelier a TÉLÉCHARGÉS sur
 * ses ordinateurs (route `lot`) ne sont pas dans le coffre : ce script ne les
 * voit pas.
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { bucket, makeR2, racineEffacable, supprimerCoffreEdition } from "@/lib/atelier/r2";
import { estUuid, prefixeEdition } from "@/lib/collectif/cles";
import { journaliser } from "@/lib/collectif/journal";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { colonneAbsente, tableAbsente } from "@/lib/collectif/migration";
import {
  cleEffacee,
  FAMILLES,
  familleDeCle,
  lireDelaiJours,
  ORDRE_FAMILLES,
  PATCH_PHOTO_EFFACEE,
  TEXTE_MOTIF,
  TYPE_JOURNAL_RETENTION,
  verdictRetention,
  type EditionPourRetention,
  type FamilleCoffre,
  type MotifEpargne,
} from "@/lib/collectif/retention";

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

/* ─────────────────────────────── les lectures ─────────────────────────────── */

type Edition = EditionPourRetention & {
  id: string;
  organisation: string;
  evenement: string;
  archive_le: string | null;
  demo: boolean;
  created_at: string;
};

/* Toutes de la migration 20261013 : rien à replier. */
const COLONNES_EDITION =
  "id, organisation, evenement, etat, cloture_le, livraison, archive_le, photos_supprimees_le, demo, created_at";

async function lireEditions(supabase: SupabaseClient, seule: string | null): Promise<Edition[]> {
  const lu = await lireToutesLesLignes<Edition>(
    () => {
      const q = supabase.from("collectif_editions").select(COLONNES_EDITION);
      return (seule ? q.eq("id", seule) : q).returns<Edition[]>();
    },
    { colonne: "created_at", croissant: true },
    "éditions (rétention)",
  );
  if (lu.error) {
    if (tableAbsente(lu.error.code)) throw new Error("Tables collectif absentes (migration 20261013 non appliquée) : rien à lire.");
    throw new Error(`Lecture des éditions échouée : ${lu.error.code ?? "?"} ${lu.error.message}`);
  }
  return lu.data;
}

type Objet = { cle: string; taille: number };

/** Le listage du coffre d'une édition : LECTURE seule, borné par la même garde que l'effaceur. */
async function listerCoffre(editionId: string): Promise<Objet[]> {
  const prefixe = prefixeEdition(editionId);
  if (racineEffacable(prefixe) !== "collectif") throw new Error(`préfixe refusé : ${prefixe}`);
  const r2 = makeR2();
  const objets: Objet[] = [];
  let suite: string | undefined;
  do {
    const page = await r2.send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefixe, ContinuationToken: suite }));
    for (const o of page.Contents ?? []) if (o.Key) objets.push({ cle: o.Key, taille: o.Size ?? 0 });
    suite = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (suite);
  return objets;
}

/** Un compte en `head` : jamais les lignes (le plafond de 1 000 de l'API ne s'applique pas). */
async function compter(
  supabase: SupabaseClient,
  table: string,
  editionId: string,
  colonneNonNulle: string | null,
): Promise<number | "colonne_absente"> {
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

type Lignes = {
  photos: number;
  contenus: number;
  documents: number;
  piecesJointes: number | "colonne_absente";
};

async function compterLignes(supabase: SupabaseClient, editionId: string): Promise<Lignes> {
  const [photos, contenus, documents, piecesJointes] = await Promise.all([
    compter(supabase, "collectif_photos", editionId, null),
    compter(supabase, "collectif_contenus", editionId, "r2_key"),
    compter(supabase, "collectif_documents", editionId, "r2_key"),
    /* 20261014 (appliquée le 14/10) : repli si la colonne manquait. */
    compter(supabase, "collectif_messages", editionId, "piece_jointe_key"),
  ]);
  const nombre = (v: number | "colonne_absente") => (typeof v === "number" ? v : 0);
  return { photos: nombre(photos), contenus: nombre(contenus), documents: nombre(documents), piecesJointes };
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */

function taille(octets: number): string {
  if (octets >= 1e9) return `${(octets / 1e9).toFixed(2).replace(".", ",")} Go`;
  if (octets >= 1e6) return `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`;
  if (octets >= 1e3) return `${Math.round(octets / 1e3)} Ko`;
  return `${octets} o`;
}

type ParFamille = Record<FamilleCoffre, { n: number; octets: number }>;

function grouper(objets: readonly Objet[], editionId: string): ParFamille {
  const par = Object.fromEntries(ORDRE_FAMILLES.map((f) => [f, { n: 0, octets: 0 }])) as ParFamille;
  for (const o of objets) {
    const f = familleDeCle(o.cle, editionId);
    par[f].n++;
    par[f].octets += o.taille;
  }
  return par;
}

function nomEdition(e: Edition): string {
  return `${e.organisation} · ${e.evenement}`.slice(0, 60);
}

/* ─────────────────────────────── l'action ─────────────────────────────── */

type Candidate = { e: Edition; jours: number; livreeLe: string; objets: Objet[]; par: ParFamille; lignes: Lignes };

async function effacer(supabase: SupabaseClient, c: Candidate, delai: number, maintenant: Date): Promise<boolean> {
  /* 1. Le coffre d'abord, par sa seule porte. */
  const coffre = await supprimerCoffreEdition(prefixeEdition(c.e.id), (cle) => !cleEffacee(cle, c.e.id));
  if (coffre.echecs > 0) {
    console.error(`  ✗ ${nomEdition(c.e)} : ${coffre.echecs} objet(s) du coffre en échec, ${coffre.supprimes} effacé(s).`);
    console.error("     Rien n'a été touché en base : relancer le script réessaiera.");
    return false;
  }

  /* 2. Les lignes : aucune supprimée, les métadonnées de l'image vidées. */
  const { error: errPhotos } = await supabase.from("collectif_photos").update(PATCH_PHOTO_EFFACEE).eq("edition_id", c.e.id);
  if (errPhotos) {
    console.error(`  ✗ ${nomEdition(c.e)} : coffre effacé (${coffre.supprimes} objet(s)), lignes non vidées : ${errPhotos.code} ${errPhotos.message}`);
    console.error("     Le marqueur n'est PAS posé : relancer le script terminera.");
    return false;
  }

  /* 3. Le marqueur : jamais deux fois. */
  const { data: marquee, error: errMarqueur } = await supabase
    .from("collectif_editions")
    .update({ photos_supprimees_le: maintenant.toISOString() })
    .eq("id", c.e.id)
    .is("photos_supprimees_le", null)
    .select("id");
  if (errMarqueur || !marquee?.length) {
    console.error(`  ✗ ${nomEdition(c.e)} : marqueur non posé (${errMarqueur?.code ?? "aucune ligne"}) : relancer le script.`);
    return false;
  }

  /* 4. Le journal : la seule trace lisible de ce qui a disparu. */
  const parFamille = Object.fromEntries(ORDRE_FAMILLES.filter((f) => FAMILLES[f].efface).map((f) => [f, c.par[f].n]));
  const journal = await journaliser(
    supabase,
    { editionId: c.e.id },
    TYPE_JOURNAL_RETENTION,
    {
      motif: "retention",
      delai_jours: delai,
      jours_depuis_livraison: Math.floor(c.jours),
      livree_le: c.livreeLe,
      objets_effaces: coffre.supprimes,
      objets_gardes: coffre.gardes,
      par_famille: parFamille,
      lignes_photos: c.lignes.photos,
      par: "script",
    },
    "script collectif-retention",
  );
  if (!journal) console.error(`  ! ${nomEdition(c.e)} : coffre effacé et marqueur posé, mais le JOURNAL n'est pas écrit.`);

  console.log(`  ✓ ${nomEdition(c.e).padEnd(60)} ${coffre.supprimes} objet(s) effacé(s), ${coffre.gardes} gardé(s)`);
  return true;
}

/* ─────────────────────────────── main ─────────────────────────────── */

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inconnus = argumentsInconnus(argv);
  if (inconnus.length) throw new Error(`argument(s) inconnu(s) : ${inconnus.join(" ")} (attendus : --jours N, --edition <uuid>, --vraiment)`);

  const delai = lireDelaiJours(argv);
  if (delai === null) {
    throw new Error("--jours N est OBLIGATOIRE (un entier d'au moins 1) : aucun délai par défaut, voir T-159.");
  }
  const seule = editionDemandee(argv);
  if (seule === "invalide") throw new Error("--edition attend un uuid.");
  const vraiment = argv.includes("--vraiment");
  const maintenant = new Date();

  chargerEnv();
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  console.log(`\n  Rétention des éditions collectives : ${delai} jour(s) après « Marquer livrée » (T-159).`);
  console.log(vraiment ? "  MODE : --vraiment (le coffre sera effacé)." : "  MODE : lecture seule (rien ne sera modifié).");

  const editions = await lireEditions(supabase, seule);
  if (seule && !editions.length) throw new Error(`aucune édition ${seule}`);
  console.log(`  ${editions.length} édition(s) lue(s).`);

  const epargnees = new Map<MotifEpargne, Edition[]>();
  const candidates: Candidate[] = [];
  for (const e of editions) {
    const v = verdictRetention(e, maintenant, delai);
    if (!v.effacable) {
      epargnees.set(v.motif, [...(epargnees.get(v.motif) ?? []), e]);
      continue;
    }
    const objets = await listerCoffre(e.id);
    candidates.push({ e, jours: v.jours, livreeLe: v.livreeLe, objets, par: grouper(objets, e.id), lignes: await compterLignes(supabase, e.id) });
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
    console.log("\n  Aucune édition à effacer aujourd'hui.\n");
    return;
  }

  console.log(`\n  ${candidates.length} édition(s) dont le coffre partirait :`);
  for (const c of candidates) {
    const marques = [c.e.archive_le ? "archivée" : null, c.e.demo ? "démonstration" : null].filter(Boolean).join(", ");
    console.log(`\n  ${nomEdition(c.e)}${marques ? `  [${marques}]` : ""}`);
    console.log(`    /admin/collectif/${c.e.id}  livrée le ${c.livreeLe.slice(0, 10)}, il y a ${Math.floor(c.jours)} j`);
    for (const f of ORDRE_FAMILLES) {
      const { n, octets } = c.par[f];
      if (!n) continue;
      console.log(`    ${FAMILLES[f].libelle.padEnd(72)} ${String(n).padStart(6)}  ${taille(octets).padStart(9)}  ${FAMILLES[f].efface ? "EFFACÉ" : "gardé"}`);
    }
    if (!c.objets.length) console.log("    (coffre vide)");
    const pj = c.lignes.piecesJointes === "colonne_absente" ? "colonne absente" : String(c.lignes.piecesJointes);
    console.log(
      `    Lignes : ${c.lignes.photos} photo(s) gardées, métadonnées vidées (${Object.keys(PATCH_PHOTO_EFFACEE).join(", ")}) ;` +
        ` ${c.lignes.contenus} contenu(s), ${c.lignes.documents} document(s), ${pj} pièce(s) jointe(s) : lignes inchangées.`,
    );
  }

  if (!vraiment) {
    console.log("\n  Rien n'a été modifié. Relancer avec --vraiment pour effacer ces coffres.");
    console.log("  Avec --vraiment : aucune ligne supprimée, le marqueur photos_supprimees_le posé, le journal coffre_efface écrit.\n");
    return;
  }

  console.log("\n  Effacement en cours…\n");
  let faits = 0;
  let rates = 0;
  for (const c of candidates) {
    if (await effacer(supabase, c, delai, maintenant)) faits++;
    else rates++;
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
