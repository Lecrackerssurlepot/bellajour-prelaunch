/**
 * T-203 : effacer les photos téléversées et le fichier HD des dossiers LIVRÉS
 * depuis 90 jours (politique de confidentialité en ligne, §7).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/retention-livres.ts
 *   npx tsx --tsconfig tsconfig.json scripts/retention-livres.ts --dossier <token>
 *   npx tsx --tsconfig tsconfig.json scripts/retention-livres.ts [--dossier <token>] --vraiment
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IL NE FAIT RIEN PAR DÉFAUT, ET CE N'EST PAS UNE POLITESSE
 *
 * Sans `--vraiment`, il LIT (la base, le journal, le listage du coffre) et il
 * RACONTE : combien de dossiers livrés, lesquels ont passé 90 jours, ce qui
 * partirait de chacun (par famille), ce qui resterait, et ce qu'une reprise
 * retenterait. Il faut taper le mot pour qu'il efface.
 *
 * ⚠️ AUCUN AUTOMATISME, VOLONTAIREMENT : ni cron, ni route, ni passage après
 * la relève, ni interrupteur. Pour les particuliers, l'automatisme attend
 * Mathias (décision du 20/10). Le module qui agit (`retentionLivres.ts`) n'a
 * pas d'autre appelant que ce script, et le harnais le vérifie.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT ET NE FAIT PAS
 *
 * 1. Il n'invente AUCUNE règle : qui (livré, date de livraison au journal,
 *    90 jours pleins, jamais deux fois, jamais un dossier anonymisé), ce qui
 *    part (`FAMILLES_LIVRE` : photos téléversées, PDF d'impression, PDF
 *    souvenir) et ce qui reste (les aperçus de couverture, toute clé
 *    inconnue) : tout vient de `@/lib/atelier/retention`, éprouvé par
 *    `scripts/verif-atelier.ts`.
 * 2. Il REFUSE un dossier qui n'est pas `livree` (`--dossier` le dit), un
 *    dossier livré dont le journal ne porte pas la date (on ne devine pas), et
 *    agir sans la colonne `photos_supprimees_le` (migration 20261024).
 * 3. Avec `--vraiment` : la reprise d'abord, puis, dossier par dossier,
 *    l'intention au journal, la base (métadonnées des photos vidées, clés du
 *    fichier HD retirées, le marqueur EN DERNIER), puis le coffre par la seule
 *    porte qui n'efface QUE photos et fichier HD (`supprimerPhotosEtHdLivre`),
 *    puis le journal (`photos_hd_effaces`). L'ordre de l'audit S7.
 * 4. Il ne supprime AUCUNE ligne et ne touche ni à l'état, ni au prix, ni à
 *    l'adresse, ni au token, ni à la facture (`invoice_jobs`), ni aux mails.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ AVANT LE PREMIER `--vraiment` (T-203) : les écrans des particuliers ne
 * lisent pas encore `photos_supprimees_le` (la fiche de l'atelier montrerait
 * des vignettes cassées ; `/numero` et `/compte` perdraient le bouton
 * « Télécharger » sans un mot) ; le client perd sa version digitale HD au 90e
 * jour (ni les CGV ni M7b ne le disent) ; les copies hors du coffre (lots
 * téléchargés, Canva, l'imprimeur) ne sont pas touchées.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  FAMILLES_LIVRE,
  ORDRE_FAMILLES_LIVRE,
  PATCH_NUMERO_LIVRE_EFFACE,
  PATCH_PHOTO_LIVRE_EFFACEE,
  planEffacementLivre,
  RETENTION_LIVRE_JOURS,
  TEXTE_MOTIF_LIVRE,
  livresEnAttente,
  verdictRetentionLivre,
  type MotifEpargneLivre,
} from "@/lib/atelier/retention";
import {
  COFFRE_LIVRE_REEL,
  effacerDossierLivre,
  lireDossiersLivres,
  lireIntentionsLivre,
  lireLivraisons,
  reprendreLivres,
  type DossierLivre,
} from "@/lib/atelier/retentionLivres";
import { isValidNumeroToken } from "@/lib/atelier/tokenForme";

/* ─────────────────────────────── l'environnement ─────────────────────────────── */

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

/* ─────────────────────────────── les arguments ─────────────────────────────── */

function argumentsInconnus(argv: readonly string[]): string[] {
  const inconnus: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--vraiment" || a.startsWith("--dossier=")) continue;
    if (a === "--dossier") {
      i++;
      continue;
    }
    inconnus.push(a);
  }
  return inconnus;
}

function dossierDemande(argv: readonly string[]): string | null | "invalide" {
  let brut: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dossier") brut = argv[i + 1];
    else if (argv[i].startsWith("--dossier=")) brut = argv[i].slice("--dossier=".length);
  }
  if (brut === undefined) return null;
  return isValidNumeroToken(brut) ? brut : "invalide";
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */

function taille(octets: number): string {
  if (octets >= 1e9) return `${(octets / 1e9).toFixed(2).replace(".", ",")} Go`;
  if (octets >= 1e6) return `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`;
  if (octets >= 1e3) return `${Math.round(octets / 1e3)} Ko`;
  return `${octets} o`;
}

/* Le token ABRÉGÉ seulement (T-041) : six caractères rapprochent une ligne d'un dossier, ils n'y font pas entrer. */
const abrege = (t: string) => `${t.slice(0, 6)}…`;
const nom = (d: DossierLivre) => `${(d.titre ?? "(sans titre)").slice(0, 26).padEnd(26)} ${abrege(d.token)}`;

/* ─────────────────────────────── main ─────────────────────────────── */

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const inconnus = argumentsInconnus(argv);
  if (inconnus.length) throw new Error(`argument(s) inconnu(s) : ${inconnus.join(" ")} (attendus : --dossier <token>, --vraiment)`);
  const vraiment = argv.includes("--vraiment");
  const seul = dossierDemande(argv);
  if (seul === "invalide") throw new Error("--dossier attend un token de dossier (32 caractères).");
  const maintenant = new Date();

  chargerEnv();
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  console.log(`\n  Dossiers livrés : photos téléversées supprimées ${RETENTION_LIVRE_JOURS} jours après la livraison (politique §7, T-203) ; le fichier HD reste 10 ans (Mathias, 21/10).`);
  console.log(vraiment ? "  MODE : --vraiment (le coffre sera effacé)." : "  MODE : lecture seule (rien ne sera modifié).");

  const lu = await lireDossiersLivres(supabase, seul);
  if (!lu.ok) throw new Error(`Lecture des dossiers échouée : ${lu.code ?? "?"} ${lu.message ?? ""}`);
  const { dossiers, colonnePosee } = lu;
  if (seul && !dossiers.length) throw new Error("aucun dossier pour ce token.");
  if (!colonnePosee) {
    console.log("\n  ⚠️  La colonne `numeros.photos_supprimees_le` n'existe pas encore.");
    console.log("      supabase/migrations/20261024_atelier_retention_livres.sql n'a pas été appliquée.");
    console.log("      La lecture continue (repli 42703), mais --vraiment REFUSERA d'agir.");
  }
  console.log(`  ${dossiers.length} dossier(s) ${seul ? "demandé(s)" : "à l'état « livrée »"}.`);

  const livraisons = await lireLivraisons(supabase, dossiers.map((d) => d.id));
  if (!livraisons) throw new Error("journal illisible : aucune date de livraison, rien n'est décidé.");

  const intentions = await lireIntentionsLivre(supabase);
  if (intentions === null) throw new Error("intentions illisibles : rien n'est décidé sans elles.");
  const enAttente = livresEnAttente(intentions, maintenant);
  console.log(
    enAttente.length
      ? `  Reprise : ${enAttente.length} intention(s), ${enAttente.reduce((s, a) => s + a.cles.length, 0)} clé(s) restée(s) au coffre d'un passage précédent.`
      : "  Reprise : rien de resté au coffre d'un passage précédent."
  );

  const epargnes = new Map<MotifEpargneLivre, { d: DossierLivre; jours: number | null }[]>();
  const candidats: { d: DossierLivre; jours: number; livreLe: string; plan: ReturnType<typeof planEffacementLivre> }[] = [];
  for (const d of dossiers) {
    const v = verdictRetentionLivre(d, livraisons.get(d.id), maintenant);
    if (!v.effacable) {
      epargnes.set(v.motif, [...(epargnes.get(v.motif) ?? []), { d, jours: v.jours }]);
      continue;
    }
    const objets = await COFFRE_LIVRE_REEL.lister(d.id);
    if (!objets) throw new Error(`listage du coffre du dossier ${abrege(d.token)} impossible : rien n'est décidé sans lui.`);
    candidats.push({ d, jours: v.jours, livreLe: v.livreLe, plan: planEffacementLivre(objets, d.id) });
  }

  if (epargnes.size) {
    console.log("\n  Épargnés :");
    for (const [motif, liste] of epargnes) {
      console.log(`    ${String(liste.length).padStart(4)} : ${TEXTE_MOTIF_LIVRE[motif]}`);
      if (motif === "dans_le_delai" || motif === "livre_sans_date" || (seul && motif === "non_livre")) {
        for (const { d, jours } of liste) {
          const age = jours !== null ? `, livré il y a ${Math.floor(jours)} j (effaçable dans ${Math.max(0, Math.ceil(RETENTION_LIVRE_JOURS - jours))} j)` : "";
          console.log(`           ${nom(d)}  état ${d.etat}${age}`);
        }
      }
    }
  }

  if (!candidats.length) {
    console.log("\n  Aucun dossier livré à effacer aujourd'hui.");
  } else {
    console.log(`\n  ${candidats.length} dossier(s) dont les photos et le fichier HD partiraient :`);
    for (const c of candidats) {
      console.log(`\n  ${nom(c.d)}  livré le ${c.livreLe.slice(0, 10)}, il y a ${Math.floor(c.jours)} j, ${c.d.nb_photos ?? 0} photo(s) au dossier`);
      for (const f of ORDRE_FAMILLES_LIVRE) {
        const { n, octets } = c.plan.parFamille[f];
        if (!n) continue;
        console.log(`    ${FAMILLES_LIVRE[f].libelle.padEnd(66)} ${String(n).padStart(6)}  ${taille(octets).padStart(9)}  ${FAMILLES_LIVRE[f].efface ? "EFFACÉ" : "gardé"}`);
      }
      if (!c.plan.aEffacer.length && !c.plan.gardes) console.log("    (coffre vide)");
    }
    console.log(`\n  En base : lignes photos gardées, vidées de ${Object.keys(PATCH_PHOTO_LIVRE_EFFACEE).join(", ")} ;`);
    console.log(`  sur le dossier : ${Object.keys(PATCH_NUMERO_LIVRE_EFFACE).length ? `${Object.keys(PATCH_NUMERO_LIVRE_EFFACE).join(", ")} remis à vide, puis ` : "le fichier HD reste (10 ans) ; "}photos_supprimees_le posé.`);
  }

  if (!vraiment) {
    console.log("\n  Rien n'a été modifié. Relancer avec --vraiment pour effacer (accord de Mathias).\n");
    return;
  }
  if (!colonnePosee) {
    console.log("\n  REFUS. La colonne `photos_supprimees_le` manque : appliquer d'abord");
    console.log("  supabase/migrations/20261024_atelier_retention_livres.sql.\n");
    process.exit(1);
  }

  console.log("\n  Effacement en cours…\n");
  const jusqua = Date.now() + 60 * 60 * 1000;
  const reprise = await reprendreLivres(supabase, jusqua, maintenant);
  if (reprise === null) throw new Error("reprise impossible (journal ou marqueurs illisibles) : rien d'autre n'est tenté.");
  if (reprise.intentions) console.log(`  Reprise : ${reprise.effaces} objet(s) effacé(s), ${reprise.gardes} gardé(s), ${reprise.restes} encore au coffre.`);

  let faits = 0;
  let rates = 0;
  for (const c of candidats) {
    const r = await effacerDossierLivre(supabase, c.d.id, { maintenant, jusqua });
    if (r.statut === "efface") {
      faits++;
      console.log(`  ✓ ${nom(c.d)} ${r.objets} objet(s) effacé(s), ${r.gardes} gardé(s), ${r.restes} resté(s)${r.journal ? "" : " ; ⚠️ journal incomplet"}`);
      if (r.restes) console.log("     Des objets ont résisté : ils sont dans l'intention, relancer le script les retentera.");
    } else if (r.statut === "epargne") {
      console.log(`  · ${nom(c.d)} épargné au dernier moment : ${TEXTE_MOTIF_LIVRE[r.motif]}`);
    } else {
      rates++;
      const etape = "etape" in r ? ` à l'étape « ${r.etape} »` : "";
      const code = "code" in r && r.code ? ` (${r.code})` : "";
      console.error(`  ✗ ${nom(c.d)} : ${r.statut}${etape}${code}. Rien n'a quitté le coffre : relancer le script.`);
    }
  }
  console.log(`\n  ${faits} dossier(s) traité(s).`);
  if (rates) {
    console.log(`  ${rates} en échec : relancer le script, ce qui est fait n'est pas refait.\n`);
    process.exit(1);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n  Rétention des dossiers livrés interrompue :", (err as Error)?.message, "\n");
  process.exit(1);
});
