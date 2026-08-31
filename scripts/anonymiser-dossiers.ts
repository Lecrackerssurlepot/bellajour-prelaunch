/**
 * T-076 — refermer les dossiers abandonnés, sans jamais les supprimer.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/anonymiser-dossiers.ts
 *   npx tsx --tsconfig tsconfig.json scripts/anonymiser-dossiers.ts --vraiment
 *
 * ══════════════════════════════════════════════════════════════════════════
 * IL NE FAIT RIEN PAR DÉFAUT, ET CE N'EST PAS UNE POLITESSE
 *
 * Sans `--vraiment`, il LIT et il RACONTE. C'est son mode normal, celui qu'on
 * lance pour savoir où on en est. Il faut taper le mot pour qu'il efface,
 * comme `recette.mjs nettoyer`.
 *
 * ⚠️ ET IL N'A PAS DE CRON, VOLONTAIREMENT. Une tâche planifiée qui efface
 * des photos de clientes tous les matins sans que personne ne regarde est
 * exactement le genre de mécanique dont on ne découvre le défaut qu'après.
 * Le jour où la rétention sera éprouvée sur plusieurs passages réels, on
 * pourra en discuter. Pas avant, et pas de ma propre initiative.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, DANS CET ORDRE, ET POURQUOI CET ORDRE
 *
 * 1. Il n'invente AUCUNE règle. Qui est éligible, à partir de quand, et qui
 *    est épargné : tout vient de `@/lib/atelier/retention`, module pur
 *    éprouvé par `scripts/verif-atelier.ts`. Ce fichier ne fait qu'obéir.
 *
 * 2. Il exige que le PRÉAVIS soit parti depuis 7 jours (M10). Un dossier qui
 *    a dépassé 90 jours mais n'a jamais été prévenu n'est PAS refermé : il
 *    attend son mail. C'est la décision de Mathias prise au mot.
 *
 * 3. Il efface R2 AVANT de toucher la base, et il abandonne le dossier en
 *    entier si une seule suppression échoue. La raison est l'idempotence :
 *    un DELETE S3 sur une clé déjà partie répond OK, donc une reprise est
 *    inoffensive ; alors qu'une base vidée en face d'un coffre encore plein
 *    produirait des photos que plus RIEN ne rattache à personne, donc que
 *    plus rien ne pourra jamais effacer.
 *
 * 4. Il ne supprime AUCUNE LIGNE. Ni `numeros`, ni `photos`, ni `evenements`.
 *    Les horodatages et les compteurs restent : /admin/atelier/metriques doit
 *    lire exactement la même histoire du produit avant et après.
 *
 * 5. Il journalise dans `evenements`, comme toute écriture de l'atelier.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LA COLONNE `anonymise_le` (migration 20260901_atelier_retention) :
 * en lecture, son absence est rattrapée (repli 42703) et le script continue
 * de raconter. En écriture, il REFUSE d'agir sans elle. Voir le commentaire
 * de la migration : c'est le seul repli asymétrique du dépôt, et il l'est
 * parce que le revers habituel du repli (le champ disparaît en silence)
 * effacerait ici des photos sans laisser la moindre trace de l'avoir fait.
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { makeR2, bucket } from "@/lib/atelier/r2";
import {
  PREAVIS_JOURS,
  RETENTION_JOURS,
  TEXTE_MOTIF,
  meriteUnRegardDeRetention,
  patchAnonymisation,
  preavisRespecte,
  verdictRetention,
  type Jalons,
  type MotifEpargne,
  type NumeroPourRetention,
} from "@/lib/atelier/retention";

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/**
 * `.env.local` versé dans `process.env`.
 *
 * Même geste que `vignettes-rattrapage.ts`, et pour la même raison : `r2.ts`
 * est écrit pour Next, qui charge `.env.local` tout seul. Un script lancé par
 * tsx n'a pas ce service et s'arrêterait sur un « R2_ENDPOINT manquant » qui
 * ne dit pas d'où vient le manque.
 */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

/* Les colonnes que la règle et le rapport ont besoin de lire. `anonymise_le`
   est à part : c'est elle qui peut manquer. */
const CHAMPS_BASE =
  "id, token, titre, prenom, email, etat, nb_photos, consent_photos, " +
  "stripe_payment_intent, created_at, etat_maj_le";

type Dossier = NumeroPourRetention & {
  id: string;
  token: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  nb_photos: number | null;
};

type Photo = {
  id: string;
  numero_id: string;
  r2_key: string;
  vignette_key: string | null;
  created_at: string;
};

/**
 * Lecture des dossiers, avec le repli 42703.
 *
 * Rend aussi si la colonne était là : le rapport doit le DIRE. Un dry-run qui
 * se déroulerait normalement en passant sous silence l'absence de la colonne
 * laisserait croire que tout est en place.
 */
async function lireDossiers(
  supabase: SupabaseClient,
): Promise<{ dossiers: Dossier[]; colonnePosee: boolean }> {
  const avec = await supabase
    .from("numeros")
    .select(`${CHAMPS_BASE}, anonymise_le`)
    .order("created_at", { ascending: true })
    .returns<Dossier[]>();

  if (!avec.error) return { dossiers: avec.data ?? [], colonnePosee: true };
  if (avec.error.code !== "42703") {
    throw new Error(`Lecture des dossiers échouée : ${avec.error.code} ${avec.error.message}`);
  }

  const sans = await supabase
    .from("numeros")
    .select(CHAMPS_BASE)
    .order("created_at", { ascending: true })
    .returns<Dossier[]>();
  if (sans.error) {
    throw new Error(`Lecture des dossiers échouée : ${sans.error.code} ${sans.error.message}`);
  }
  return { dossiers: sans.data ?? [], colonnePosee: false };
}

/** Les photos d'un lot de dossiers, groupées. */
async function lirePhotos(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Photo[]>> {
  const parDossier = new Map<string, Photo[]>();
  if (!ids.length) return parDossier;

  const { data, error } = await supabase
    .from("photos")
    .select("id, numero_id, r2_key, vignette_key, created_at")
    .in("numero_id", ids)
    .order("created_at", { ascending: true })
    .returns<Photo[]>();
  if (error) throw new Error(`Lecture des photos échouée : ${error.code} ${error.message}`);

  for (const p of data ?? []) {
    parDossier.set(p.numero_id, [...(parDossier.get(p.numero_id) ?? []), p]);
  }
  return parDossier;
}

/**
 * T-076 (01/09) — LA DATE DU DÉPÔT, pour la population B.
 *
 * Elle n'est pas sur `numeros` et ce n'est pas un oubli : `consent_photos`
 * n'a délibérément pas de colonne d'horodatage, « la date fait foi par le
 * journal » (PATCH /api/atelier/numero). Même source que `donnees.ts` (T2-5)
 * et `mesure.ts`.
 *
 * ⚠️ On prend le PLUS RÉCENT (tri croissant, on écrase), là où `donnees.ts`
 * prend le premier. Chacun a raison pour sa question : T2-5 cherche où finit
 * le PREMIER dépôt, la rétention cherche la DERNIÈRE activité — et un retour
 * de 1b qui redépose est une activité qui remet le compteur à zéro.
 *
 * ⚠️ Le type `consentements` sert aussi aux cases du paiement et à
 * `consent_communication` : seules les lignes portant `consent_photos: true`
 * datent un dépôt.
 */
async function lireDepots(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const par = new Map<string, string>();
  if (!ids.length) return par;

  const { data, error } = await supabase
    .from("evenements")
    .select("numero_id, payload, created_at")
    .eq("type", "consentements")
    .in("numero_id", ids)
    .order("created_at", { ascending: true })
    .returns<Array<{ numero_id: string; payload: Record<string, unknown>; created_at: string }>>();
  if (error) throw new Error(`Lecture des dépôts échouée : ${error.code} ${error.message}`);

  for (const e of data ?? []) {
    if (e.payload?.consent_photos === true) par.set(e.numero_id, e.created_at);
  }
  return par;
}

/** La date d'envoi de M10 pour chaque dossier, s'il est parti. */
async function lirePreavis(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const parDossier = new Map<string, string>();
  if (!ids.length) return parDossier;

  const { data, error } = await supabase
    .from("mails_envoyes")
    .select("numero_id, envoye_le")
    .eq("code", "M10")
    .in("numero_id", ids)
    .returns<Array<{ numero_id: string; envoye_le: string }>>();
  if (error) throw new Error(`Lecture des préavis échouée : ${error.code} ${error.message}`);

  for (const m of data ?? []) parDossier.set(m.numero_id, m.envoye_le);
  return parDossier;
}

/**
 * Efface du coffre l'original ET la vignette de chaque photo.
 *
 * ⚠️ N'utilise PAS `r2.supprimer()` : cette fonction avale l'échec (c'est
 * T-048, et c'est ce qui produit les orphelins de T-023). Ici l'échec DOIT
 * remonter, parce qu'il décide si l'on continue ou non.
 *
 * Un DELETE S3 sur une clé absente répond OK : relancer le script après une
 * interruption ne casse rien.
 */
async function effacerDuCoffre(photos: Photo[]): Promise<{ effaces: number; echec: string | null }> {
  const r2 = makeR2();
  let effaces = 0;
  for (const p of photos) {
    for (const cle of [p.r2_key, p.vignette_key].filter((c): c is string => Boolean(c))) {
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: bucket(), Key: cle }));
        effaces++;
      } catch (err) {
        return { effaces, echec: `${cle} : ${(err as Error)?.message}` };
      }
    }
  }
  return { effaces, echec: null };
}

/* ─────────────────────────────── le rapport ─────────────────────────────── */

const jours = (n: number | null) => (n === null ? "  ?  " : n.toFixed(0).padStart(4));

function ligne(d: Dossier, n: number | null, suffixe = ""): string {
  const titre = (d.titre ?? "(sans titre)").slice(0, 26).padEnd(26);
  const photos = String(d.nb_photos ?? 0).padStart(3);
  return `  ${titre} ${d.etat.padEnd(21)} ${photos} ph  ${jours(n)} j${suffixe}`;
}

async function main(): Promise<void> {
  const vraiment = process.argv.includes("--vraiment");
  const maintenant = new Date();

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  const { dossiers, colonnePosee } = await lireDossiers(supabase);

  console.log(`\n  Rétention : ${RETENTION_JOURS} jours, préavis ${PREAVIS_JOURS} jours avant (T-076).`);
  console.log(`  ${dossiers.length} dossier(s) en base.`);
  if (!colonnePosee) {
    console.log("\n  ⚠️  La colonne `anonymise_le` n'existe pas encore.");
    console.log("      supabase/migrations/20260901_atelier_retention.sql n'a pas été appliquée.");
    console.log("      La lecture continue (repli 42703), mais --vraiment REFUSERA d'agir :");
    console.log("      anonymiser sans pouvoir le noter, c'est recommencer indéfiniment.");
  }

  /* ── premier tri, BON MARCHÉ ─────────────────────────────────────────
     Les jalons coûtent deux requêtes ; on ne les paie que pour les dossiers
     qui approchent de l'échéance. Le pré-tri calcule l'âge SANS eux, ce qui
     en fait un majorant : un dossier écarté ici ne peut pas redevenir
     éligible une fois les jalons connus. Rien ne passe au travers. */
  const presque = dossiers.filter((d) => meriteUnRegardDeRetention(d, maintenant));
  const ids = presque.map((d) => d.id);

  const photosPar = await lirePhotos(supabase, ids);
  const depotPar = await lireDepots(supabase, ids);
  const preavisPar = await lirePreavis(supabase, ids);

  /* Les jalons de chaque candidat, sous la forme qu'attend le module pur. */
  const jalonsPar = new Map<string, Jalons>(
    presque.map((d) => {
      const photos = photosPar.get(d.id) ?? [];
      return [
        d.id,
        {
          depotLe: depotPar.get(d.id) ?? null,
          dernierePhotoLe: photos.length ? photos[photos.length - 1].created_at : null,
        },
      ];
    }),
  );

  const aRefermer: Array<{ d: Dossier; jours: number; photos: Photo[]; preavis: string }> = [];
  const retenus: Array<{ d: Dossier; jours: number | null; pourquoi: string }> = [];

  for (const d of presque) {
    const photos = photosPar.get(d.id) ?? [];
    const v = verdictRetention(d, maintenant, jalonsPar.get(d.id));

    if (!v.anonymisable) {
      /* Ce que le pré-tri ne pouvait pas voir : une photo déposée depuis (elle
         est revenue, le compteur repart), ou un dépôt terminé dont le journal
         ne porte pas la date. */
      retenus.push({ d, jours: v.jours, pourquoi: TEXTE_MOTIF[v.motif] });
      continue;
    }

    const preavis = preavisPar.get(d.id) ?? null;
    if (!preavisRespecte(preavis, Boolean(d.email), maintenant)) {
      retenus.push({
        d,
        jours: v.jours,
        pourquoi: preavis
          ? `préavis M10 parti le ${preavis.slice(0, 10)}, moins de ${PREAVIS_JOURS} jours`
          : "préavis M10 jamais parti (jamais de fermeture sans avertissement)",
      });
      continue;
    }
    aRefermer.push({ d, jours: v.jours, photos, preavis: preavis ?? "aucune adresse" });
  }

  /* ── ce qui est épargné, par motif ───────────────────────────────────
     Le compte par motif est la vraie preuve que le script ne mord pas :
     « 4 dossiers, 0 à refermer » ne dit pas POURQUOI. */
  const parMotif = new Map<MotifEpargne, number>();
  for (const d of dossiers) {
    /* Les jalons quand on les a. Pour les dossiers récents on ne les a pas,
       et on n'en a pas besoin : `verdictRetention` teste l'âge AVANT la date
       du dépôt, donc ils ressortent « encore dans les 90 jours » et non
       « sans date », ce qui serait un faux signal de panne. */
    const v = verdictRetention(d, maintenant, jalonsPar.get(d.id));
    if (!v.anonymisable) parMotif.set(v.motif, (parMotif.get(v.motif) ?? 0) + 1);
  }
  if (parMotif.size) {
    console.log("\n  Épargnés :");
    for (const [motif, n] of parMotif) {
      console.log(`    ${String(n).padStart(4)} — ${TEXTE_MOTIF[motif]}`);
    }
  }
  for (const r of retenus) {
    console.log(`\n  Retenu au dernier moment :\n${ligne(r.d, r.jours, `  ${r.pourquoi}`)}`);
  }

  if (!aRefermer.length) {
    console.log("\n  Aucun dossier à refermer aujourd'hui.\n");
    return;
  }

  const nbPhotos = aRefermer.reduce((s, x) => s + x.photos.length, 0);
  console.log(
    `\n  ${aRefermer.length} dossier(s) à refermer, ${nbPhotos} photo(s) à effacer du coffre :\n`,
  );
  for (const x of aRefermer) {
    console.log(ligne(x.d, x.jours));
    /* Le token ENTIER, et seulement pour ceux-là : c'est la seule façon
       d'ouvrir /admin/atelier/<token> et de regarder avant de dire oui. La
       console est locale, ce n'est pas un log Vercel (T-041). */
    console.log(`  ${"".padEnd(26)} ${x.d.token}  préavis : ${x.preavis.slice(0, 10)}`);
  }

  if (!vraiment) {
    console.log("\n  Rien n'a été modifié. Relancer avec --vraiment pour refermer ces dossiers.");
    console.log("  Ce qui partira : email, prénom, téléphone, occasion, histoire, titre,");
    console.log("  adresse, et toutes les photos du coffre. Ce qui reste : la ligne, ses");
    console.log("  dates, ses compteurs, son journal. Aucune ligne n'est supprimée.\n");
    return;
  }

  if (!colonnePosee) {
    console.log("\n  REFUS. La colonne `anonymise_le` manque : appliquer d'abord");
    console.log("  supabase/migrations/20260901_atelier_retention.sql.\n");
    process.exit(1);
  }

  console.log("\n  Fermeture en cours…\n");
  let faits = 0;
  let rates = 0;

  for (const x of aRefermer) {
    /* R2 d'abord, la base ensuite. Voir l'en-tête, point 3. */
    const { effaces, echec } = await effacerDuCoffre(x.photos);
    if (echec) {
      console.error(`  ✗ ${x.d.titre ?? x.d.token} — coffre : ${echec}`);
      console.error(`     rien n'a été touché en base, relancer le script réessaiera.`);
      rates++;
      continue;
    }

    const { error } = await supabase
      .from("numeros")
      .update({ ...patchAnonymisation(), anonymise_le: maintenant.toISOString() })
      .eq("id", x.d.id);
    if (error) {
      console.error(`  ✗ ${x.d.titre ?? x.d.token} — base : ${error.code} ${error.message}`);
      console.error(`     ${effaces} objet(s) déjà effacé(s) du coffre : relancer le script.`);
      rates++;
      continue;
    }

    /* Le nom de fichier d'origine est de la donnée personnelle comme le
       reste (« mariage-julie-2024.jpg »). Les LIGNES restent : elles disent
       combien de photos il y avait, et `r2_key` documente ce qui a été
       effacé. ⚠️ C'est pour ça que T-023 devra ignorer ces dossiers : une
       ligne sans objet y est normale, alors qu'ailleurs c'est un bug grave. */
    const { error: errPhotos } = await supabase
      .from("photos")
      .update({ nom_origine: null })
      .eq("numero_id", x.d.id);
    if (errPhotos) {
      console.error(`  ! ${x.d.token} — noms de fichiers non effacés : ${errPhotos.code}`);
    }

    /* Invariant nº6 : toute écriture est journalisée. Ici c'est même la
       seule trace lisible de ce qui a disparu, puisque la ligne, elle, ne
       dit plus rien. */
    const { error: errJournal } = await supabase.from("evenements").insert({
      numero_id: x.d.id,
      type: "dossier_anonymise",
      payload: {
        motif: "retention",
        retention_jours: RETENTION_JOURS,
        jours_inactivite: Math.round(x.jours),
        photos_effacees: effaces,
        preavis_le: x.preavis,
        par: "script",
      },
    });
    if (errJournal) console.error(`  ! ${x.d.token} — journal : ${errJournal.code}`);

    console.log(`  ✓ ${(x.d.titre ?? x.d.token).slice(0, 26).padEnd(26)} ${effaces} objet(s) effacé(s)`);
    faits++;
  }

  console.log(`\n  ${faits} dossier(s) refermé(s).`);
  if (rates) console.log(`  ${rates} en échec — relancer le script, ce qui est fait n'est pas refait.`);
  console.log("");
}

main().catch((err) => {
  console.error("\n  Anonymisation interrompue :", (err as Error)?.message, "\n");
  process.exit(1);
});
