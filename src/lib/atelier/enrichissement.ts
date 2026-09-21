/**
 * Lire ce qu'une photo sait d'elle-même, et l'écrire en base.
 * Module à EFFETS (R2, exifr, sharp, Supabase, Geoapify), T-123, 21/09/2026.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CÔTÉ SERVEUR, ET POURQUOI SANS FILE D'ATTENTE
 *
 * L'ancien projet (bellajour-project) faisait ce travail dans un worker
 * BullMQ derrière Redis. L'atelier n'a ni l'un ni l'autre, et n'en a pas
 * besoin : un dossier fait cent photos, l'EXIF tient dans les premiers
 * 512 Ko d'un JPEG, et la sortie R2 est gratuite. Mesuré le 21/09 sur le
 * coffre réel : 250 ms par photo pour lire l'en-tête, la date, le GPS,
 * l'appareil et les dimensions. Cent photos à quatre de front, c'est moins
 * de dix secondes, dans le temps que Vercel laisse à une fonction APRÈS sa
 * réponse (`after()`).
 *
 * Trois appelants, une seule logique :
 *   · `/api/atelier/photos/complete`, à chaque lot confirmé (tâche de fond,
 *     métadonnées seulement : les lieux attendent que le dépôt soit fini,
 *     sinon on paierait un appel Geoapify par lot pour des groupes qui
 *     changent à chaque lot) ;
 *   · `/api/atelier/numero` (PATCH consent_photos, le dépôt est terminé) :
 *     ce qui manque, puis les lieux ;
 *   · `/api/admin/atelier/metadonnees` et `scripts/metadonnees-rattrapage.ts`
 *     pour les dossiers antérieurs et les ratés.
 *
 * IDEMPOTENT : `metadonnees_le` et `lieu_le` sont les marqueurs. Ce qui est
 * lu n'est pas relu ; un passage interrompu se rattrape en relançant.
 *
 * ⚠️ NE THROW JAMAIS vers l'appelant : une métadonnée qu'on n'arrive pas à
 * lire ne doit jamais empêcher une photo d'être confirmée ni un dépôt d'être
 * terminé. Les colonnes absentes (migration pas encore passée : 42703 en
 * lecture, PGRST204 en écriture) arrêtent le passage et le disent, sans
 * boucler.
 * ══════════════════════════════════════════════════════════════════════════
 */

import exifr from "exifr";
import sharp from "sharp";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeR2, bucket } from "./r2";
import { logEvenement } from "./evenements";
import {
  dimensionsDroites,
  formatDepuisOctets,
  nommerAppareil,
  normaliserDateExif,
  type FormatImage,
} from "./metadonnees";
import { empreinteDepuisGris, TAILLE_DCT } from "./empreinte";
import { planGeocodage } from "./lieux";
import { geocoderInverse } from "./geocodage";

/** Ce qu'on lit d'un JPEG pour trouver son EXIF : le segment APP1 est en
 *  tête et fait 64 Ko au plus. 512 Ko couvrent aussi les PNG d'iPhone (eXIf
 *  après quelques chunks) et laissent sharp lire l'en-tête. Un HEIC range
 *  ses métadonnées n'importe où : on le relit en entier s'il le faut. */
export const TETE_OCTETS = 512 * 1024;
/** Le facteur limitant est la latence R2, pas le CPU. */
const CONCURRENCE = 4;

const CODES_COLONNE_ABSENTE = new Set(["42703", "PGRST204"]);
const colonneAbsente = (code: string | undefined) => Boolean(code && CODES_COLONNE_ABSENTE.has(code));

/* ── Lecture du coffre ─────────────────────────────────────────────────── */

async function lireOctets(key: string, plage?: string): Promise<Uint8Array> {
  const r = await makeR2().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key, ...(plage ? { Range: plage } : {}) }),
  );
  if (!r.Body) throw new Error(`objet sans corps : ${key}`);
  return r.Body.transformToByteArray();
}

/** Les premiers octets, ou tout si l'objet est petit. */
async function lireTete(key: string, taille: number | null): Promise<Uint8Array> {
  if (taille !== null && taille <= TETE_OCTETS) return lireOctets(key);
  return lireOctets(key, `bytes=0-${TETE_OCTETS - 1}`);
}

/* ── Ce qu'on lit d'une photo ──────────────────────────────────────────── */

export type Lecture = {
  format: FormatImage;
  largeur: number | null;
  hauteur: number | null;
  priseLe: string | null;
  appareil: string | null;
  logiciel: string | null;
  gpsLat: number | null;
  gpsLon: number | null;
  empreinte: string | null;
  luminance: number | null;
};

const CHAMPS_EXIF = [
  "DateTimeOriginal", "CreateDate", "Make", "Model", "Software",
  "Orientation", "ExifImageWidth", "ExifImageHeight",
];

type Exif = Record<string, unknown> | undefined;

async function lireExif(octets: Uint8Array): Promise<{ exif: Exif; gps: { latitude?: number; longitude?: number } | null }> {
  const buf = Buffer.from(octets);
  /* `reviveValues: false` : la date reste la chaîne « 2024:08:08 19:01:22 »
     que l'appareil a écrite, sans passer par une `Date` et son fuseau.
     `exifr.gps` fait la conversion degrés/minutes/secondes → décimal. */
  const [exif, gps] = await Promise.all([
    exifr.parse(buf, { pick: CHAMPS_EXIF, reviveValues: false }).catch(() => undefined) as Promise<Exif>,
    exifr.gps(buf).catch(() => null) as Promise<{ latitude?: number; longitude?: number } | null>,
  ]);
  return { exif, gps };
}

const nombre = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Empreinte et luminance depuis n'importe quelle image que sharp décode.
 * Un seul décodage : 32 × 32 en gris, orientation appliquée. La luminance
 * est la moyenne de ces 1024 pixels, ce qui suffit pour « très sombre » et
 * « très claire ».
 */
async function empreinteEtLuminance(octets: Uint8Array): Promise<{ empreinte: string; luminance: number } | null> {
  try {
    const gris = await sharp(Buffer.from(octets), { failOn: "none" })
      .rotate()
      .grayscale()
      .resize(TAILLE_DCT, TAILLE_DCT, { fit: "fill" })
      .raw()
      .toBuffer();
    if (gris.length !== TAILLE_DCT * TAILLE_DCT) return null;
    let somme = 0;
    for (let i = 0; i < gris.length; i++) somme += gris[i];
    return { empreinte: empreinteDepuisGris(gris), luminance: somme / gris.length / 255 };
  } catch {
    /* HEIC sans libheif, fichier abîmé : pas une panne, une image que ce
       binaire ne sait pas lire. */
    return null;
  }
}

/**
 * Tout ce qu'on sait lire d'une photo, à partir de sa tête, de l'objet
 * complet quand il le faut, et de sa vignette pour l'empreinte.
 *
 * `lireTout` est passé pour ne payer la lecture complète que dans deux cas :
 * un HEIC dont l'EXIF n'est pas en tête, et une photo sans vignette dont
 * on veut quand même l'empreinte.
 */
export async function lirePhoto(
  tete: Uint8Array,
  vignette: Uint8Array | null,
  lireTout: () => Promise<Uint8Array>,
  maintenant = new Date(),
): Promise<Lecture> {
  const format = formatDepuisOctets(tete);
  let { exif, gps } = await lireExif(tete);
  let entier: Uint8Array | null = null;

  if (format === "heic" && !exif && !gps) {
    entier = await lireTout().catch(() => null);
    if (entier) ({ exif, gps } = await lireExif(entier));
  }

  const orientation = nombre(exif?.Orientation);
  let largeur: number | null = null;
  let hauteur: number | null = null;
  try {
    const m = await sharp(Buffer.from(tete), { failOn: "none" }).metadata();
    largeur = nombre(m.width);
    hauteur = nombre(m.height);
    /* sharp lit l'orientation de l'en-tête EXIF, comme exifr ; on préfère
       la sienne quand elle existe, elle est prise au même endroit que les
       dimensions. */
    const dr = dimensionsDroites(largeur, hauteur, nombre(m.orientation) ?? orientation);
    largeur = dr.largeur; hauteur = dr.hauteur;
  } catch {
    const dr = dimensionsDroites(nombre(exif?.ExifImageWidth), nombre(exif?.ExifImageHeight), orientation);
    largeur = dr.largeur; hauteur = dr.hauteur;
  }

  const appareil = nommerAppareil(exif?.Make, exif?.Model);
  const logiciel = typeof exif?.Software === "string" ? exif.Software : null;
  const priseLe = normaliserDateExif(exif?.DateTimeOriginal ?? exif?.CreateDate ?? null, maintenant);
  const gpsLat = nombre(gps?.latitude);
  const gpsLon = nombre(gps?.longitude);

  /* L'empreinte sur la vignette (déjà droite, 320 px, ~20 Ko). Sans vignette,
     sur l'original entier si ce n'est pas un HEIC : sharp ne le décode pas. */
  let source: Uint8Array | null = vignette;
  if (!source && format !== "heic") source = entier ?? (await lireTout().catch(() => null));
  const el = source ? await empreinteEtLuminance(source) : null;

  return {
    format, largeur, hauteur, priseLe, appareil, logiciel,
    gpsLat: gpsLat !== null && gpsLon !== null ? gpsLat : null,
    gpsLon: gpsLat !== null && gpsLon !== null ? gpsLon : null,
    empreinte: el?.empreinte ?? null,
    luminance: el ? Math.round(el.luminance * 1000) / 1000 : null,
  };
}

/**
 * Une photo du coffre, lue : sa tête, sa vignette si elle existe, l'objet
 * entier seulement si `lirePhoto` le réclame. Exportée pour les sondes en
 * lecture seule : c'est exactement ce que le passage écrit, sans l'écrire.
 */
export async function lireDepuisCoffre(l: {
  r2_key: string;
  taille: number | null;
  vignette_key: string | null;
}, maintenant = new Date()): Promise<Lecture> {
  const [tete, vignette] = await Promise.all([
    lireTete(l.r2_key, l.taille),
    l.vignette_key ? lireOctets(l.vignette_key).catch(() => null) : Promise.resolve(null),
  ]);
  return lirePhoto(tete, vignette, () => lireOctets(l.r2_key), maintenant);
}

/* ── Le passage sur un dossier ─────────────────────────────────────────── */

type Ligne = {
  id: string;
  r2_key: string;
  nom_origine: string | null;
  taille: number | null;
  vignette_key: string | null;
};

export type BilanMetadonnees = {
  candidates: number;
  traitees: number;
  datees: number;
  geolocalisees: number;
  ratees: number;
  colonnesAbsentes: boolean;
};

export type Options = {
  /** Restreindre à ces photos (le lot qui vient d'être confirmé). */
  ids?: string[];
  /** Lire sans rien écrire. */
  essai?: boolean;
  /** Une ligne par photo, pour le script. */
  journal?: (ligne: string) => void;
};

/**
 * Lit et écrit les métadonnées des photos CONFIRMÉES du dossier qui n'en ont
 * pas encore. Ne throw jamais.
 */
export async function enrichirPhotos(
  supabase: SupabaseClient,
  numeroId: string,
  opts: Options = {},
): Promise<BilanMetadonnees> {
  const bilan: BilanMetadonnees = { candidates: 0, traitees: 0, datees: 0, geolocalisees: 0, ratees: 0, colonnesAbsentes: false };
  const dire = opts.journal ?? (() => {});

  let requete = supabase
    .from("photos")
    .select("id, r2_key, nom_origine, taille, vignette_key")
    .eq("numero_id", numeroId)
    .not("taille", "is", null)
    .is("metadonnees_le", null)
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: true });
  if (opts.ids?.length) requete = requete.in("id", opts.ids);

  const { data, error } = await requete.returns<Ligne[]>();
  if (error) {
    if (colonneAbsente(error.code)) { bilan.colonnesAbsentes = true; return bilan; }
    console.error("[enrichissement] lecture photos échouée", error.code, error.message);
    return bilan;
  }
  const lignes = data ?? [];
  bilan.candidates = lignes.length;
  if (!lignes.length) return bilan;

  let curseur = 0;
  let arret = false;
  const maintenant = new Date();

  const traiter = async (l: Ligne): Promise<void> => {
    const nom = l.nom_origine ?? l.id;
    try {
      const lecture = await lireDepuisCoffre(l, maintenant);

      dire(
        `  ${nom.padEnd(28).slice(0, 28)} ${lecture.format.padEnd(7)} ${lecture.priseLe ?? "sans date          "}` +
        ` ${lecture.gpsLat !== null ? `${lecture.gpsLat.toFixed(3)},${lecture.gpsLon!.toFixed(3)}` : "sans GPS      "}` +
        ` ${lecture.largeur ?? "?"}x${lecture.hauteur ?? "?"} ${lecture.appareil ?? ""}${lecture.empreinte ? "" : " (sans empreinte)"}`,
      );

      if (!opts.essai) {
        const { error: errMaj } = await supabase
          .from("photos")
          .update({
            largeur: lecture.largeur,
            hauteur: lecture.hauteur,
            prise_le: lecture.priseLe,
            appareil: lecture.appareil,
            gps_lat: lecture.gpsLat,
            gps_lon: lecture.gpsLon,
            empreinte: lecture.empreinte,
            luminance: lecture.luminance,
            metadonnees_le: maintenant.toISOString(),
          })
          .eq("id", l.id);
        if (errMaj) {
          if (colonneAbsente(errMaj.code)) { bilan.colonnesAbsentes = true; arret = true; return; }
          console.error(`[enrichissement] écriture ${l.id} échouée`, errMaj.code, errMaj.message);
          bilan.ratees++;
          return;
        }
      }
      bilan.traitees++;
      if (lecture.priseLe) bilan.datees++;
      if (lecture.gpsLat !== null) bilan.geolocalisees++;
    } catch (err) {
      console.error(`[enrichissement] ${l.id} : ${(err as Error)?.message}`);
      dire(`  ✗ ${nom} : ${(err as Error)?.message}`);
      bilan.ratees++;
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCE, lignes.length) }, async () => {
      for (;;) {
        if (arret) return;
        const i = curseur++;
        if (i >= lignes.length) return;
        await traiter(lignes[i]);
      }
    }),
  );
  return bilan;
}

export type BilanLieux = {
  photos: number;
  demandes: number;
  reponses: number;
  lieux: number;
  ratees: number;
  sansCle: boolean;
  colonnesAbsentes: boolean;
};

/**
 * Les lieux des photos géolocalisées qui n'en ont pas encore. Une requête
 * par groupe (`planGeocodage`), en série : quelques appels, pas de quoi
 * paralléliser, et le plan gratuit préfère la retenue. Ne throw jamais.
 */
export async function geocoderNumero(
  supabase: SupabaseClient,
  numeroId: string,
  opts: Pick<Options, "essai" | "journal"> = {},
): Promise<BilanLieux> {
  const bilan: BilanLieux = { photos: 0, demandes: 0, reponses: 0, lieux: 0, ratees: 0, sansCle: false, colonnesAbsentes: false };
  const dire = opts.journal ?? (() => {});

  const { data, error } = await supabase
    .from("photos")
    .select("id, gps_lat, gps_lon")
    .eq("numero_id", numeroId)
    .not("gps_lat", "is", null)
    .is("lieu_le", null)
    .returns<Array<{ id: string; gps_lat: number; gps_lon: number }>>();
  if (error) {
    if (colonneAbsente(error.code)) { bilan.colonnesAbsentes = true; return bilan; }
    console.error("[enrichissement] lecture GPS échouée", error.code, error.message);
    return bilan;
  }
  const photos = (data ?? []).map((p) => ({ id: p.id, gpsLat: p.gps_lat, gpsLon: p.gps_lon }));
  bilan.photos = photos.length;
  if (!photos.length) return bilan;

  const demandes = planGeocodage(photos);
  bilan.demandes = demandes.length;
  const lieuxVus = new Set<string>();
  const maintenant = new Date().toISOString();

  for (const d of demandes) {
    const r = await geocoderInverse(d.lat, d.lon);
    if (!r.ok) {
      if (r.raison === "sans_cle") { bilan.sansCle = true; break; }
      bilan.ratees++;
      continue;
    }
    bilan.reponses++;
    const lieu = r.lieu;
    dire(`  (${d.lat.toFixed(3)}, ${d.lon.toFixed(3)}) × ${d.ids.length} → ${lieu ? [lieu.ville, lieu.pays].filter(Boolean).join(", ") : "rien"}`);
    if (lieu) lieuxVus.add(`${lieu.ville}|${lieu.pays}`);
    if (opts.essai) continue;

    const { error: errMaj } = await supabase
      .from("photos")
      .update({
        lieu_ville: lieu?.ville ?? null,
        lieu_pays: lieu?.pays ?? null,
        lieu_code_pays: lieu?.codePays ?? null,
        lieu_le: maintenant,
      })
      .in("id", d.ids);
    if (errMaj) {
      if (colonneAbsente(errMaj.code)) { bilan.colonnesAbsentes = true; break; }
      console.error("[enrichissement] écriture lieu échouée", errMaj.code, errMaj.message);
      bilan.ratees++;
    }
  }
  bilan.lieux = lieuxVus.size;
  return bilan;
}

/**
 * Le passage complet sur un dossier : les métadonnées qui manquent, puis
 * les lieux si on le demande. Une ligne de journal quand quelque chose a
 * été lu. Ne throw jamais : c'est ce qu'on appelle depuis `after()`.
 */
export async function enrichirDossier(
  supabase: SupabaseClient,
  numeroId: string,
  opts: Options & { geocoder: boolean },
): Promise<{ metadonnees: BilanMetadonnees; lieux: BilanLieux | null }> {
  const vide: BilanMetadonnees = { candidates: 0, traitees: 0, datees: 0, geolocalisees: 0, ratees: 0, colonnesAbsentes: false };
  try {
    const metadonnees = await enrichirPhotos(supabase, numeroId, opts);
    if (metadonnees.colonnesAbsentes) {
      console.warn("[enrichissement] colonnes absentes : appliquer supabase/migrations/20260921_atelier_photos_metadonnees.sql");
      return { metadonnees, lieux: null };
    }
    const lieux = opts.geocoder ? await geocoderNumero(supabase, numeroId, opts) : null;
    if (lieux?.sansCle) console.warn("[enrichissement] GEOAPIFY_API_KEY absente : les lieux ne sont pas lus");

    if (!opts.essai && (metadonnees.traitees || lieux?.reponses)) {
      await logEvenement(supabase, numeroId, "metadonnees_lues", {
        photos: metadonnees.traitees,
        datees: metadonnees.datees,
        geolocalisees: metadonnees.geolocalisees,
        ratees: metadonnees.ratees + (lieux?.ratees ?? 0),
        ...(lieux ? { lieux: lieux.lieux, demandes: lieux.demandes } : {}),
      });
    }
    return { metadonnees, lieux };
  } catch (err) {
    console.error("[enrichissement] exception", (err as Error)?.message);
    return { metadonnees: vide, lieux: null };
  }
}
