/**
 * Supprimer des dossiers de TEST, entièrement : base et coffre R2.
 *   npx tsx --tsconfig tsconfig.json scripts/supprimer-dossiers.ts --email adresse@exemple.com
 *   npx tsx --tsconfig tsconfig.json scripts/supprimer-dossiers.ts --email adresse@exemple.com --vraiment
 * ══════════════════════════════════════════════════════════════════════════
 * CE N'EST PAS LA RÉTENTION. `anonymiser-dossiers.ts` referme les dossiers
 * abandonnés de vraies clientes : il efface les photos et GARDE les lignes,
 * pour que les métriques racontent la même histoire avant et après. Ici, on
 * fait l'inverse, et on ne le fait que pour des dossiers de test : ceux qui
 * n'ont jamais été une cliente, et dont la trace fausserait l'admin et les
 * métriques le jour où les vraies demandes arrivent.
 *
 * Demande de Mathias, 10/09/2026 : « nettoie dans l'admin tous les tests qui
 * correspondent à mon adresse, je vais faire des vraies demandes sous peu. »
 *
 * IL NE FAIT RIEN PAR DÉFAUT. Sans `--vraiment`, il liste ce qu'il
 * supprimerait (dossiers, photos, objets R2) et s'arrête. Il faut taper le
 * mot pour qu'il efface. Il exige une adresse : jamais « tout », jamais une
 * liste vide, jamais un dossier PAYÉ EN VRAI (stripe_payment_intent posé et
 * session Stripe live) sans `--meme-payes`, parce qu'un dossier payé est une
 * facture, et une facture ne se supprime pas.
 *
 * ORDRE, ET POURQUOI CET ORDRE (le même que la rétention) : R2 d'abord, la
 * base ensuite. Un DELETE S3 sur une clé déjà partie répond OK : une reprise
 * est inoffensive. Une base vidée en face d'un coffre encore plein laisserait
 * des photos que plus rien ne rattache à personne. Le préfixe `numeros/<id>/`
 * couvre tout ce qu'un dossier a pu déposer : originaux, vignettes, planches
 * de couverture, PDF souvenir.
 *
 * LA BASE : `delete from numeros` suffit, les tables `photos`, `evenements`,
 * `mails_envoyes`, `dossiers_vus` et `notes` portent `on delete cascade`
 * (vérifié le 10/09 dans information_schema). `waitlist` n'est PAS touchée :
 * la place de fondateur d'une personne n'est pas un dossier.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { makeR2, bucket } from "@/lib/atelier/r2";
import { canonicalizeEmail } from "@/lib/email";

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/* `.env.local` versé dans `process.env` : même geste que anonymiser-dossiers.ts. */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

type Dossier = {
  id: string;
  token: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  etat: string;
  nb_photos: number | null;
  stripe_payment_intent: string | null;
  stripe_session_id: string | null;
  created_at: string;
};

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

/** Toutes les clés sous un préfixe, page après page. */
async function listerCles(prefixe: string): Promise<string[]> {
  const r2 = makeR2();
  const cles: string[] = [];
  let suite: string | undefined;
  do {
    const page = await r2.send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefixe, ContinuationToken: suite }),
    );
    for (const o of page.Contents ?? []) if (o.Key) cles.push(o.Key);
    suite = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (suite);
  return cles;
}

/** Efface des clés par paquets de 1000 (la limite de DeleteObjects). Rend le nombre d'échecs. */
async function effacerCles(cles: string[]): Promise<number> {
  const r2 = makeR2();
  let echecs = 0;
  for (let i = 0; i < cles.length; i += 1000) {
    const lot = cles.slice(i, i + 1000);
    const r = await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: lot.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    echecs += r.Errors?.length ?? 0;
    for (const e of r.Errors ?? []) console.error("      échec R2", e.Key, e.Code, e.Message);
  }
  return echecs;
}

async function main(): Promise<void> {
  const vraiment = process.argv.includes("--vraiment");
  const memePayes = process.argv.includes("--meme-payes");
  const emailBrut = argument("--email");
  if (!emailBrut || !emailBrut.includes("@")) {
    console.error("Usage : --email <adresse> [--vraiment] [--meme-payes]");
    process.exit(1);
  }
  const canon = canonicalizeEmail(emailBrut);

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("numeros")
    .select(
      "id, token, titre, prenom, email, etat, nb_photos, stripe_payment_intent, stripe_session_id, created_at",
    )
    .or(`email_canonical.eq.${canon},email.ilike.${emailBrut}`)
    .order("created_at", { ascending: true })
    .returns<Dossier[]>();
  if (error) throw new Error(`lecture numeros : ${error.code} ${error.message}`);

  const dossiers = data ?? [];
  console.log(`\n  ${dossiers.length} dossier(s) sous ${emailBrut}${vraiment ? "  — SUPPRESSION" : "  — lecture seule"}\n`);
  if (dossiers.length === 0) return;

  /* Un paiement LIVE est une facture : on ne l'efface pas sans le dire deux
     fois. Une session de test (`cs_test_…`) n'engage personne. */
  const estPayeEnVrai = (d: Dossier) =>
    Boolean(d.stripe_payment_intent) && !(d.stripe_session_id ?? "").startsWith("cs_test_");

  let totalObjets = 0;
  const aSupprimer: Array<{ d: Dossier; cles: string[] }> = [];
  for (const d of dossiers) {
    const cles = await listerCles(`numeros/${d.id}/`);
    totalObjets += cles.length;
    const paye = estPayeEnVrai(d);
    const garde = paye && !memePayes;
    console.log(
      `  ${garde ? "GARDÉ " : "      "}${d.created_at.slice(0, 10)}  ${d.etat.padEnd(20)}  « ${d.titre ?? "sans titre"} »  ${d.nb_photos ?? 0} photos, ${cles.length} objets R2${paye ? "  ⚠️ PAYÉ EN VRAI" : d.stripe_payment_intent ? "  (paiement de test)" : ""}`,
    );
    if (!garde) aSupprimer.push({ d, cles });
  }
  console.log(`\n  ${aSupprimer.length} à supprimer, ${totalObjets} objets R2 au total.`);

  if (!vraiment) {
    console.log("\n  Rien n'a été modifié. Relancer avec --vraiment pour supprimer.\n");
    return;
  }

  let supprimes = 0;
  for (const { d, cles } of aSupprimer) {
    /* R2 d'abord. Un seul échec et le dossier est abandonné : la base garde
       la ligne, donc on saura encore quoi effacer à la prochaine tentative. */
    const echecs = cles.length ? await effacerCles(cles) : 0;
    if (echecs > 0) {
      console.error(`  ✗ « ${d.titre} » : ${echecs} objet(s) R2 non effacés, ligne conservée.`);
      continue;
    }
    const { error: errSuppr } = await supabase.from("numeros").delete().eq("id", d.id);
    if (errSuppr) {
      console.error(`  ✗ « ${d.titre} » : suppression en base refusée (${errSuppr.code} ${errSuppr.message}). Le coffre est déjà vide.`);
      continue;
    }
    supprimes += 1;
    console.log(`  ✓ « ${d.titre} » supprimé (${cles.length} objets R2, ligne et cascade).`);
  }
  console.log(`\n  ${supprimes}/${aSupprimer.length} dossier(s) supprimé(s).\n`);
}

main().catch((err) => {
  console.error(String((err as Error)?.message ?? err));
  process.exit(1);
});
