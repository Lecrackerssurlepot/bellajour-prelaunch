/**
 * 5A — fabriquer la version moyenne d'« Agrandir » des photos d'une édition collective envoyées AVANT.
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-moyennes-rattrapage.ts --edition <uuid>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-moyennes-rattrapage.ts --edition <uuid> --limite 5 --apercus <dossier>
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-moyennes-rattrapage.ts --edition <uuid> --vraiment
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET POURQUOI IL EXISTE
 * Depuis le 26/10 (décision de Mathias), le navigateur dépose à l'envoi une
 * version d'environ 1 600 px à côté de la vignette (`cleMoyenne`), et la
 * visionneuse la montre à la place de l'original. Les photos envoyées AVANT
 * n'en ont pas : « Agrandir » charge leur original (3 Mo en moyenne). Ce
 * script fait pour elles ce que fait le navigateur :
 *   1. une TÊTE au coffre d'abord : la moyenne y est peut-être déjà (déposée
 *      par le navigateur pendant que la migration 20261026 manquait, le repli
 *      a effacé sa clé en silence) ; retrouvée, seule la clé est notée ;
 *   2. sinon il lit l'original, le décode (`sharp` ; un HEIC par libheif, le
 *      MÊME que `public/heic/`), le réduit à 1 600 px de grand côté, droit
 *      (orientation EXIF appliquée), en JPEG à la qualité du navigateur ;
 *   3. il la dépose à sa clé, PUIS note `moyenne_key` (une base qui promet une
 *      image absente montrerait une visionneuse vide) ;
 *   4. une photo plus petite que 1 600 px n'en reçoit pas : son original suffit.
 * Il ne touche à RIEN d'autre : ni l'original, ni la vignette, ni l'état de
 * l'édition, ni un mail. Avec `--vraiment`, une ligne `moyennes_rattrapees`
 * va au journal de l'édition (`collectif_evenements`).
 *
 * SANS `--vraiment`, il ne fait que LIRE (têtes, originaux) : il dit ce qu'il
 * ferait, mesure le poids des moyennes, et peut les déposer dans un dossier
 * local (`--apercus`) pour qu'on les regarde.
 * ⚠️ AVEC `--vraiment`, il REFUSE d'agir sans la colonne (migration
 * 20261026 pas appliquée) : il déposerait des moyennes que rien ne noterait.
 *
 * IDEMPOTENT ET REPRENABLE : il ne regarde que les photos CONFIRMÉES SANS
 * `moyenne_key` ; relancé, il reprend où il s'était arrêté.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { makeR2, bucket } from "@/lib/atelier/r2";
import { cleMoyenne, estUuid } from "@/lib/collectif/cles";
import { COTE_MOYENNE, MAX_MOYENNE_BYTES, MIME_MOYENNE, moyenneUtile, QUALITE_MOYENNE } from "@/lib/collectif/depot";
import { journaliser } from "@/lib/collectif/journal";
import { MIGRATION_MOYENNE, moyenneAbsente } from "@/lib/collectif/migration";
import { fabriquePour } from "@/lib/collectif/rattrapage";
import { teteObjet } from "@/lib/collectif/rattrapageCoffre";

/* Le décodage tient le processeur et ~100 Mo par photo : deux à la fois. */
const CONCURRENCE = 2;

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/** `.env.local` versé dans `process.env` (r2.ts lit `process.env` directement, cf. collectif-heic-rattrapage.ts). */
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

type Ligne = { id: string; r2_key: string; taille: number | null; nom_origine: string | null; mime: string | null };
type Issue = "retrouvee" | "faite" | "petite" | "illisible" | "ratee";

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

type Entree = { image: ReturnType<typeof sharp>; largeur: number; hauteur: number };

/** L'image décodée, prête pour sharp, et ses dimensions : un HEIC par libheif (pixels bruts), le reste tel quel (orientation EXIF appliquée). */
async function entree(original: Uint8Array, mime: string | null): Promise<Entree | null> {
  const fabrique = fabriquePour(original, mime);
  if (fabrique === "sharp") {
    const meta = await sharp(Buffer.from(original)).metadata();
    if (!meta.width || !meta.height) return null;
    return { image: sharp(Buffer.from(original)).rotate(), largeur: meta.width, hauteur: meta.height };
  }
  if (fabrique !== "heic") return null;
  const decodeur = new libheif.HeifDecoder();
  const images = decodeur.decode(original);
  if (!images.length) return null;
  /* La plus grande image du fichier (`is_primary` n'existe pas dans ce libheif-js). */
  const image = images.reduce((a, b) => (b.get_width() * b.get_height() > a.get_width() * a.get_height() ? b : a));
  const largeur = image.get_width();
  const hauteur = image.get_height();
  try {
    const pixels = await new Promise<Uint8ClampedArray>((ok, ko) =>
      image.display({ data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur }, (d) => (d ? ok(d.data) : ko(new Error("HEIF illisible"))))
    );
    return { image: sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), { raw: { width: largeur, height: hauteur, channels: 4 } }), largeur, hauteur };
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
): Promise<{ issue: Issue; octets: number; original: number }> {
  const nom = l.nom_origine ?? l.id;
  const key = cleMoyenne(editionId, l.id);
  const noter = async (): Promise<boolean> => {
    const { error } = await supabase.from("collectif_photos").update({ moyenne_key: key }).eq("id", l.id).is("moyenne_key", null);
    if (error) console.error(`  ✗ ${nom} : écriture de la clé (${error.code})`);
    return !error;
  };

  /* 1. Déjà au coffre (déposée par le navigateur, clé perdue par le repli) : seule la clé manque. */
  const tete = await teteObjet(key);
  if (tete.statut === "presente" && tete.taille > 0 && tete.taille <= MAX_MOYENNE_BYTES) {
    if (vraiment && !(await noter())) return { issue: "ratee", octets: 0, original: l.taille ?? 0 };
    return { issue: "retrouvee", octets: tete.taille, original: l.taille ?? 0 };
  }

  /* 2. Fabriquer depuis l'original. */
  const r2 = makeR2();
  let original: Uint8Array;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: bucket(), Key: l.r2_key }));
    if (!obj.Body) return { issue: "ratee", octets: 0, original: 0 };
    original = await obj.Body.transformToByteArray();
  } catch (err) {
    console.error(`  ✗ ${nom} : lecture du coffre (${(err as Error)?.message})`);
    return { issue: "ratee", octets: 0, original: 0 };
  }
  let moyenne: Buffer;
  let largeur = 0;
  let hauteur = 0;
  try {
    const lu = await entree(original, l.mime);
    if (!lu) return { issue: "illisible", octets: 0, original: original.byteLength };
    largeur = lu.largeur;
    hauteur = lu.hauteur;
    /* Plus petite que le côté : l'original suffit, rien à décoder de plus. */
    if (Math.max(largeur, hauteur) <= COTE_MOYENNE) return { issue: "petite", octets: 0, original: original.byteLength };
    moyenne = await lu.image
      .resize(COTE_MOYENNE, COTE_MOYENNE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: Math.round(QUALITE_MOYENNE * 100) })
      .toBuffer();
  } catch (err) {
    console.error(`  ✗ ${nom} : décodage (${(err as Error)?.message})`);
    return { issue: "illisible", octets: 0, original: original.byteLength };
  }
  if (!moyenneUtile({ largeur, hauteur, taille: moyenne.byteLength, tailleOriginal: original.byteLength })) {
    return { issue: "petite", octets: 0, original: original.byteLength };
  }
  if (apercus) writeFileSync(join(apercus, `${l.id}-moyenne.jpg`), moyenne);
  if (!vraiment) return { issue: "faite", octets: moyenne.byteLength, original: original.byteLength };

  /* 3. Le dépôt D'ABORD, la clé ENSUITE. */
  try {
    await r2.send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: moyenne, ContentType: MIME_MOYENNE, ContentLength: moyenne.byteLength }));
  } catch (err) {
    console.error(`  ✗ ${nom} : dépôt (${(err as Error)?.message})`);
    return { issue: "ratee", octets: 0, original: original.byteLength };
  }
  if (!(await noter())) return { issue: "ratee", octets: 0, original: original.byteLength };
  return { issue: "faite", octets: moyenne.byteLength, original: original.byteLength };
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

  const lire = (avecColonne: boolean) => {
    let q = supabase.from("collectif_photos").select("id, r2_key, taille, nom_origine, mime").eq("edition_id", editionId).not("confirmee_le", "is", null);
    if (avecColonne) q = q.is("moyenne_key", null);
    q = q.order("ordre", { ascending: true });
    return (limite ? q.limit(limite) : q).returns<Ligne[]>();
  };
  let lu = await lire(true);
  let colonne = true;
  if (lu.error && moyenneAbsente(lu.error)) {
    colonne = false;
    if (vraiment) throw new Error(`La colonne moyenne_key manque (${MIGRATION_MOYENNE} pas appliquée) : rien n'est fait. Lecture seule possible sans --vraiment.`);
    console.log(`\n  ⚠️ ${MIGRATION_MOYENNE} pas appliquée : toutes les photos confirmées sont lues (lecture seule).`);
    lu = await lire(false);
  }
  if (lu.error) throw new Error(`Lecture des photos échouée : ${lu.error.code} ${lu.error.message}`);
  const lignes = lu.data ?? [];
  if (!lignes.length) {
    console.log("\n  Rien à rattraper : aucune photo confirmée sans version moyenne dans cette édition.\n");
    return;
  }
  console.log(`\n  ${lignes.length} photo(s) sans version moyenne${colonne ? "" : " (colonne absente)"}.${vraiment ? "" : "  [lecture seule : rien n'est écrit, ajouter --vraiment]"}\n`);

  const compte: Record<Issue, number> = { retrouvee: 0, faite: 0, petite: 0, illisible: 0, ratee: 0 };
  let octets = 0;
  let originaux = 0;
  let curseur = 0;
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCE, lignes.length) }, async () => {
      for (;;) {
        const i = curseur++;
        if (i >= lignes.length) return;
        const r = await traiter(supabase, editionId, lignes[i], vraiment, apercus);
        compte[r.issue]++;
        if (r.issue === "faite" || r.issue === "retrouvee") {
          octets += r.octets;
          originaux += r.original;
        }
        const n = Object.values(compte).reduce((a, b) => a + b, 0);
        if (n % 25 === 0) console.log(`  … ${n} sur ${lignes.length}`);
      }
    })
  );
  const avec = compte.faite + compte.retrouvee;
  console.log(`\n  ${vraiment ? "Faites" : "À faire"} : ${compte.faite} · retrouvées au coffre : ${compte.retrouvee} · trop petites (l'original suffit) : ${compte.petite} · illisibles : ${compte.illisible} · ratées : ${compte.ratee}`);
  if (avec) {
    console.log(`  Poids des moyennes : ${(octets / 1024 / 1024).toFixed(1)} Mo pour ${avec} photo(s), ${Math.round(octets / avec / 1024)} Ko en moyenne ; originaux de ces photos : ${(originaux / 1024 / 1024).toFixed(1)} Mo (+${originaux ? ((100 * octets) / originaux).toFixed(1) : "?"} %).`);
  }
  console.log(`  Durée totale ${Math.round((Date.now() - t0) / 1000)} s.\n`);
  if (vraiment && (compte.faite || compte.retrouvee)) {
    await journaliser(supabase, { editionId }, "moyennes_rattrapees", { faites: compte.faite, retrouvees: compte.retrouvee, petites: compte.petite, illisibles: compte.illisible, ratees: compte.ratee, octets }, "script");
  }
}

main().catch((err) => {
  console.error(`\n  ${(err as Error).message}\n`);
  process.exit(1);
});
