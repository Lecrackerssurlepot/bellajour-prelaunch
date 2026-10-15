/**
 * T-150 — fabriquer l'aperçu et l'empreinte des photos HEIC d'une édition collective.
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-heic-rattrapage.ts --edition <uuid>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-heic-rattrapage.ts --edition <uuid> --limite 3 --apercus <dossier>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-heic-rattrapage.ts --edition <uuid> --vraiment
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET POURQUOI IL EXISTE
 * Un HEIC envoyé depuis Chrome (ou Firefox, ou Android) n'avait ni vignette
 * ni empreinte : le navigateur ne sait pas le lire, `sharp` non plus (son
 * libvips n'a pas libheif). Depuis T-150, le moteur d'envoi décode le HEIC
 * avec libheif (WebAssembly) et dépose la vignette. Ce script fait la même
 * chose pour les photos envoyées AVANT : il lit l'original au coffre, le
 * décode avec le MÊME libheif (`libheif-js`, même version que
 * `public/heic/`), pose la vignette de 320 px à sa clé (`cleVignette`), note
 * la clé, puis relit la photo comme l'enrichissement (`lireDepuisCoffre`) :
 * l'empreinte et la luminance viennent de la vignette, exactement comme pour
 * un JPEG.
 * Il ne touche à RIEN d'autre : ni l'original, ni l'état de l'édition, ni un mail.
 *
 * SANS `--vraiment`, il ne fait que LIRE : il décode, mesure, et peut déposer
 * les aperçus dans un dossier local (`--apercus`) pour qu'on les regarde.
 * Accord de Mathias du 15/10/2026 pour « Essai révision (Claude) ».
 *
 * IDEMPOTENT ET REPRENABLE : il ne regarde que les HEIC CONFIRMÉS SANS
 * vignette ; relancé, il reprend où il s'était arrêté.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { makeR2, bucket, MIME_VIGNETTE, MAX_VIGNETTE_BYTES } from "@/lib/atelier/r2";
import { lireDepuisCoffre } from "@/lib/atelier/enrichissement";
import { cleVignette, estUuid } from "@/lib/collectif/cles";

/* Jumeaux de `public/heic/vignette-heic.worker.js` et de `reduire.worker.js` :
   une grille où la moitié des cases est plus nette que l'autre se lit comme
   un défaut d'affichage. */
const COTE_VIGNETTE = 320;
const QUALITE_VIGNETTE = 72;
/* Le décodage tient le processeur et ~100 Mo par photo : deux à la fois. */
const CONCURRENCE = 2;

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/** `.env.local` versé dans `process.env` (r2.ts lit `process.env` directement, cf. vignettes-rattrapage.ts). */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}
chargerEnv();

type Libheif = {
  HeifDecoder: new () => {
    decode(octets: Uint8Array): {
      get_width(): number;
      get_height(): number;
      display(cible: { data: Uint8ClampedArray; width: number; height: number }, rappel: (d: { data: Uint8ClampedArray } | null) => void): void;
      free(): void;
    }[];
  };
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const libheif = require("libheif-js/wasm-bundle") as Libheif;

type Ligne = { id: string; r2_key: string; taille: number | null; nom_origine: string | null; largeur: number | null; hauteur: number | null };

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

/** HEIC → vignette JPEG de 320 px et les dimensions. Un décodeur par appel de `traiter`, libéré à la fin. */
async function vignetteDe(original: Uint8Array): Promise<{ vignette: Buffer; largeur: number; hauteur: number } | null> {
  const decodeur = new libheif.HeifDecoder();
  const images = decodeur.decode(original);
  if (!images.length) return null;
  /* La plus grande image du fichier (`is_primary` n'existe pas dans ce libheif-js) : un iPhone n'en met qu'une. */
  const image = images.reduce((a, b) => (b.get_width() * b.get_height() > a.get_width() * a.get_height() ? b : a));
  const largeur = image.get_width();
  const hauteur = image.get_height();
  try {
    const pixels = await new Promise<Uint8ClampedArray>((ok, ko) =>
      image.display({ data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur }, (d) => (d ? ok(d.data) : ko(new Error("HEIF illisible"))))
    );
    const vignette = await sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), { raw: { width: largeur, height: hauteur, channels: 4 } })
      .resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITE_VIGNETTE })
      .toBuffer();
    return { vignette, largeur, hauteur };
  } finally {
    for (const i of images) {
      try {
        i.free();
      } catch {
        /* déjà libérée */
      }
    }
  }
}

async function traiter(
  supabase: SupabaseClient,
  editionId: string,
  l: Ligne,
  vraiment: boolean,
  apercus: string | null
): Promise<{ issue: "faite" | "indecodable" | "ratee"; ms: number }> {
  const t0 = Date.now();
  const r2 = makeR2();
  let original: Uint8Array;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: l.r2_key }));
    if (!obj.Body) return { issue: "ratee", ms: Date.now() - t0 };
    original = await obj.Body.transformToByteArray();
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : lecture du coffre (${(err as Error)?.message})`);
    return { issue: "ratee", ms: Date.now() - t0 };
  }

  const t1 = Date.now();
  let lu: Awaited<ReturnType<typeof vignetteDe>>;
  try {
    lu = await vignetteDe(original);
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : décodage (${(err as Error)?.message})`);
    lu = null;
  }
  const msDecodage = Date.now() - t1;
  if (!lu) return { issue: "indecodable", ms: msDecodage };
  if (lu.vignette.byteLength > MAX_VIGNETTE_BYTES) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : vignette anormalement lourde, ignorée`);
    return { issue: "ratee", ms: msDecodage };
  }
  if (apercus) writeFileSync(join(apercus, `${l.id}.jpg`), lu.vignette);
  if (!vraiment) return { issue: "faite", ms: msDecodage };

  const key = cleVignette(editionId, l.id);
  try {
    await r2.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: lu.vignette, ContentType: MIME_VIGNETTE, ContentLength: lu.vignette.byteLength }));
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : dépôt (${(err as Error)?.message})`);
    return { issue: "ratee", ms: msDecodage };
  }
  /* La colonne APRÈS le dépôt : une base qui promet une vignette absente fait des cases vides. */
  const { error } = await supabase.from("collectif_photos").update({ vignette_key: key }).eq("id", l.id);
  if (error) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : écriture de la vignette (${error.code})`);
    return { issue: "ratee", ms: msDecodage };
  }
  /* L'empreinte et la luminance, lues comme l'enrichissement les lit : sur la vignette. */
  try {
    const p = await lireDepuisCoffre({ r2_key: l.r2_key, taille: l.taille, vignette_key: key });
    const { error: e } = await supabase
      .from("collectif_photos")
      .update({
        empreinte: p.empreinte,
        luminance: p.luminance,
        ...(l.largeur === null ? { largeur: lu.largeur } : {}),
        ...(l.hauteur === null ? { hauteur: lu.hauteur } : {}),
      })
      .eq("id", l.id);
    if (e) console.error(`  ✗ ${l.nom_origine ?? l.id} : écriture de l'empreinte (${e.code})`);
  } catch (err) {
    console.error(`  ✗ ${l.nom_origine ?? l.id} : relecture (${(err as Error)?.message})`);
  }
  return { issue: "faite", ms: msDecodage };
}

async function main(): Promise<void> {
  const editionId = argument("--edition");
  if (!editionId || !estUuid(editionId)) throw new Error("--edition <uuid> est obligatoire");
  const vraiment = process.argv.includes("--vraiment");
  const limite = Number(argument("--limite")) || null;
  const apercus = argument("--apercus");
  if (apercus) mkdirSync(apercus, { recursive: true });

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase = createClient(url, cle);

  let q = supabase
    .from("collectif_photos")
    .select("id, r2_key, taille, nom_origine, largeur, hauteur")
    .eq("edition_id", editionId)
    .not("confirmee_le", "is", null)
    .is("vignette_key", null)
    .in("mime", ["image/heic", "image/heif"])
    .order("ordre", { ascending: true });
  if (limite) q = q.limit(limite);
  const { data, error } = await q.returns<Ligne[]>();
  if (error) throw new Error(`Lecture des photos échouée : ${error.code} ${error.message}`);
  const lignes = data ?? [];
  if (!lignes.length) {
    console.log("\n  Rien à rattraper : aucun HEIC confirmé sans vignette dans cette édition.\n");
    return;
  }
  console.log(`\n  ${lignes.length} HEIC sans aperçu.${vraiment ? "" : "  [lecture seule : rien n'est écrit, ajouter --vraiment]"}\n`);

  const compte = { faite: 0, indecodable: 0, ratee: 0 };
  const durees: number[] = [];
  let curseur = 0;
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCE, lignes.length) }, async () => {
      for (;;) {
        const i = curseur++;
        if (i >= lignes.length) return;
        const r = await traiter(supabase, editionId, lignes[i], vraiment, apercus);
        compte[r.issue]++;
        if (r.issue === "faite") durees.push(r.ms);
        if ((compte.faite + compte.indecodable + compte.ratee) % 25 === 0) console.log(`  … ${compte.faite + compte.indecodable + compte.ratee} sur ${lignes.length}`);
      }
    })
  );
  durees.sort((a, b) => a - b);
  const mediane = durees.length ? durees[Math.floor(durees.length / 2)] : 0;
  console.log(`\n  ${vraiment ? "Faites" : "Décodables"} : ${compte.faite} · indécodables : ${compte.indecodable} · ratées : ${compte.ratee}`);
  console.log(`  Décodage : médiane ${mediane} ms par photo ; durée totale ${Math.round((Date.now() - t0) / 1000)} s.\n`);
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
