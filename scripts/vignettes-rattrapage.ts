/**
 * D7 — fabriquer les vignettes manquantes des dossiers déjà déposés.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/vignettes-rattrapage.ts --essai
 *   npx tsx --tsconfig tsconfig.json scripts/vignettes-rattrapage.ts
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET POURQUOI IL EXISTE
 *
 * Depuis le 30/08/2026, le navigateur dépose sa vignette de 320 px à côté de
 * l'original : la grille de /admin/atelier sert ~20 Ko par case au lieu de
 * plusieurs Mo. Mais seulement pour les photos déposées APRÈS. Les dossiers
 * antérieurs n'ont pas de vignette, et personne ne va redemander à une
 * cliente de renvoyer ses photos.
 *
 * Ce script fait donc côté serveur ce que le worker fait côté navigateur :
 * télécharger l'original, le réduire à 320 px, le reposer dans le coffre,
 * noter la clé. Il ne touche à RIEN d'autre : ni l'original, ni `taille`, ni
 * l'état du dossier, ni un mail.
 *
 * ⚠️ Il ne se lance pas tout seul. Une relève quotidienne qui téléchargerait
 * des originaux serait une facture de sortie R2 récurrente pour un travail
 * qui, par nature, se termine.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * IDEMPOTENT ET REPRENABLE. Il ne regarde que les photos CONFIRMÉES
 * (`taille` non nulle : l'objet est réellement sur R2) et SANS vignette. Une
 * exécution interrompue se rattrape en le relançant : ce qui est fait n'est
 * pas refait.
 *
 * ⚠️ Les HEIC ne passeront pas, et c'est attendu. `sharp` ne décode le HEIC
 * que si libvips a été compilé avec libheif, ce qui n'est pas le cas du
 * binaire distribué par défaut. Ces photos gardent `vignette_key` à null, la
 * fiche continue de servir leur original — exactement comme aujourd'hui. Le
 * script les compte à part plutôt que de les présenter comme des pannes.
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { makeR2, bucket, cleVignetteR2, MIME_VIGNETTE, MAX_VIGNETTE_BYTES } from "@/lib/atelier/r2";

/* Jumeaux des constantes de `composer/depot/reduire.worker.js`. Les deux
   chemins doivent produire la MÊME vignette : une grille où la moitié des
   cases est plus nette que l'autre se lit comme un défaut d'affichage. */
const COTE_VIGNETTE = 320;
const QUALITE_VIGNETTE = 72;

/* Assez pour tenir le débit sans transformer une console en aspirateur à
   bande passante. Le facteur limitant est la sortie R2, pas le CPU. */
const CONCURRENCE = 4;

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets (cf. recette.mjs). */
function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/**
 * `.env.local` versé dans `process.env`.
 *
 * ⚠️ Lire le fichier à la main NE SUFFIT PAS : `r2.ts` est écrit pour Next, qui
 * charge `.env.local` tout seul, et va chercher `R2_ENDPOINT` &c. directement
 * dans `process.env`. Un script lancé par tsx n'a pas ce service — sans ce
 * versement, le rattrapage annonce ses 49 photos puis s'arrête sur un
 * « R2_ENDPOINT manquant » qui ne dit pas d'où vient le manque.
 *
 * Les variables déjà présentes dans l'environnement GAGNENT : c'est ce qui
 * permet de viser un autre coffre le temps d'un essai, sans toucher au fichier.
 */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

const env = (nom: string): string | undefined => process.env[nom];

type Ligne = {
  id: string;
  numero_id: string;
  r2_key: string;
  nom_origine: string | null;
};

/**
 * Le travail d'une photo. Rend ce qui s'est passé, ne lève jamais : une photo
 * illisible ne doit pas arrêter le rattrapage des huit cents autres.
 */
async function traiter(
  supabase: SupabaseClient,
  l: Ligne,
  essai: boolean,
): Promise<"faite" | "indecodable" | "ratee"> {
  const r2 = makeR2();

  let original: Buffer;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: l.r2_key }));
    if (!obj.Body) return "ratee";
    original = Buffer.from(await obj.Body.transformToByteArray());
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} — lecture du coffre : ${(err as Error)?.message}`);
    return "ratee";
  }

  let vignette: Buffer;
  try {
    vignette = await sharp(original, { failOn: "none" })
      /* `rotate()` sans argument APPLIQUE l'orientation EXIF puis la retire.
         Sans lui, les photos prises en portrait sortent couchées — le worker
         a exactement le même geste (`imageOrientation: 'from-image'`). */
      .rotate()
      .resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITE_VIGNETTE })
      .toBuffer();
  } catch {
    /* HEIC sans libheif, fichier abîmé. Pas une panne : un format que ce
       binaire ne sait pas lire. */
    return "indecodable";
  }

  if (vignette.byteLength > MAX_VIGNETTE_BYTES) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} — vignette anormalement lourde, ignorée`);
    return "ratee";
  }

  const key = cleVignetteR2(l.numero_id, l.id);
  if (essai) return "faite";

  try {
    await r2.send(new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: vignette,
      ContentType: MIME_VIGNETTE,
      ContentLength: vignette.byteLength,
    }));
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} — dépôt : ${(err as Error)?.message}`);
    return "ratee";
  }

  /* La colonne est écrite APRÈS le dépôt, jamais avant : une base qui promet
     une vignette absente produit des cases vides, ce qui est pire que
     l'original lourd qu'on cherchait à remplacer. */
  const { error } = await supabase.from("photos").update({ vignette_key: key }).eq("id", l.id);
  if (error) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} — écriture base : ${error.code}`);
    return "ratee";
  }
  return "faite";
}

async function main(): Promise<void> {
  const essai = process.argv.includes("--essai");

  const url = env("SUPABASE_URL");
  const cle = env("SUPABASE_SERVICE_KEY");
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  const { data, error } = await supabase
    .from("photos")
    .select("id, numero_id, r2_key, nom_origine")
    .not("taille", "is", null)
    .is("vignette_key", null)
    .order("created_at", { ascending: true })
    .returns<Ligne[]>();

  if (error) {
    if (error.code === "42703") {
      console.error("\n  La colonne `vignette_key` n'existe pas encore.");
      console.error("  Applique d'abord supabase/migrations/20260830_atelier_vignettes.sql\n");
      process.exit(1);
    }
    throw new Error(`Lecture des photos échouée : ${error.code} ${error.message}`);
  }

  const lignes = data ?? [];
  if (!lignes.length) {
    console.log("\n  Rien à rattraper : toutes les photos confirmées ont leur vignette.\n");
    return;
  }

  console.log(`\n  ${lignes.length} photo(s) sans vignette.${essai ? "  [essai — rien n'est écrit]" : ""}\n`);

  const compte = { faite: 0, indecodable: 0, ratee: 0 };
  let curseur = 0;

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCE, lignes.length) }, async () => {
      for (;;) {
        const i = curseur++;
        if (i >= lignes.length) return;
        compte[await traiter(supabase, lignes[i], essai)]++;
        if ((compte.faite + compte.indecodable + compte.ratee) % 25 === 0) {
          console.log(`  … ${compte.faite + compte.indecodable + compte.ratee} / ${lignes.length}`);
        }
      }
    }),
  );

  console.log(`\n  ${compte.faite} vignette(s) ${essai ? "fabricable(s)" : "déposée(s)"}.`);
  if (compte.indecodable) {
    console.log(`  ${compte.indecodable} illisible(s) par sharp (HEIC sans libheif) — elles gardent leur original.`);
  }
  if (compte.ratee) {
    console.log(`  ${compte.ratee} en échec — relance le script, ce qui est fait n'est pas refait.`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n  Rattrapage interrompu :", (err as Error)?.message, "\n");
  process.exit(1);
});
