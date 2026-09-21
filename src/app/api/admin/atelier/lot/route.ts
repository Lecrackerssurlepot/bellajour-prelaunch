/**
 * POST /api/admin/atelier/lot — les liens du lot, refaits à l'instant du clic.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE ROUTE ALORS QUE LA FICHE A DÉJÀ LES LIENS
 *
 * La fiche signe ses vignettes au rendu, pour une heure. L'éditeur, lui,
 * ouvre le dossier le matin, lit l'histoire, écrit une note, va chercher un
 * café, et clique « Télécharger » à onze heures. Les liens de la page sont
 * alors périmés : le téléchargement partirait et rendrait quarante et un
 * fichiers de zéro octet, sans que rien ne le dise.
 *
 * Cette route re-signe au moment exact où l'on va s'en servir. C'est sa
 * seule raison d'être — elle ne décide rien, ne journalise rien, n'écrit
 * rien. Elle LIT.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { signerGet, LOT_TTL_SECONDS } from "@/lib/atelier/r2";
import { nomsDeFichiers } from "@/lib/atelier/lot";

export const runtime = "nodejs";

type RangeeLot = {
  id: string;
  r2_key: string;
  nom_origine: string | null;
  taille: number | null;
  /* T-124 — absentes tant que la migration 20260921 n'est pas passée. */
  prise_le?: string | null;
  lieu_ville?: string | null;
  lieu_pays?: string | null;
};

/**
 * Les photos du lot, dans l'ordre de la fiche, avec la date et le lieu quand
 * les colonnes existent.
 *
 * T-124 — la date EXIF et le lieu (migration 20260921) entrent dans le nom
 * du fichier. Même repli 42703 que `donnees.ts` : si la colonne manque, on
 * relit sans, et le nom se fait comme avant. Le téléchargement d'un lot ne
 * doit jamais dépendre d'une migration.
 */
async function lirePhotosDuLot(supabase: ReturnType<typeof makeSupabase>, numeroId: string) {
  const lire = (champs: string) =>
    supabase
      .from("photos")
      .select(champs)
      .eq("numero_id", numeroId)
      /* T-114 : même tri que la fiche (donnees.ts), pour que « 03 - » soit
         la même photo dans le dossier et à l'écran. */
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<RangeeLot[]>();

  const complet = await lire("id, r2_key, nom_origine, taille, ordre, prise_le, lieu_ville, lieu_pays");
  if (!complet.error || complet.error.code !== "42703") return complet;
  return lire("id, r2_key, nom_origine, taille, ordre");
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; ids?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    /* T2-5 — un SOUS-ENSEMBLE du lot (« télécharger les N nouvelles »).
       Les ids inconnus sont ignorés en silence : un id périmé ne doit pas
       faire échouer les autres. Sans `ids`, le lot entier, comme avant. */
    const ids = Array.isArray(body.ids)
      ? new Set(body.ids.filter((v): v is string => typeof v === "string"))
      : null;

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const { data: photos, error } = await lirePhotosDuLot(supabase, numero.id);

    if (error) {
      console.error("[admin/lot] lecture photos échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Le nom du fichier est calculé ICI, par le module pur, et signé dans
       l'URL : le chemin `curl` écrit donc exactement les mêmes noms que le
       chemin Chrome (cf. lot.ts). Une seule règle de nommage, deux
       consommateurs.
       ⚠️ Les noms sont calculés sur le lot COMPLET, PUIS filtrés (T2-5) :
       la numérotation `01-`, `02-` reste celle du dépôt d'origine, et un
       lot partiel COMPLÈTE le même dossier au lieu de le renuméroter. */
    const rangees = photos ?? [];
    const noms = nomsDeFichiers(
      rangees.map((p) => ({
        nom: p.nom_origine,
        priseLe: p.prise_le ?? null,
        lieuVille: p.lieu_ville ?? null,
        lieuPays: p.lieu_pays ?? null,
      })),
    );
    const retenues = rangees
      .map((p, i) => ({ ...p, nomFichier: noms[i] }))
      .filter((p) => !ids || ids.has(p.id));

    /* Une signature qui échoue rend `null` : le navigateur écrira les autres
       et dira laquelle manque. Un lot de quarante photos ne doit pas être
       perdu parce que la trente-septième a une clé bancale. */
    const lignes = await Promise.all(
      retenues.map(async (p) => ({
        id: p.id,
        nom: p.nom_origine,
        taille: p.taille,
        nomFichier: p.nomFichier,
        url: await signerGet(p.r2_key, LOT_TTL_SECONDS, p.nomFichier).catch(() => null),
      })),
    );

    return NextResponse.json({ ok: true, photos: lignes, ttl: LOT_TTL_SECONDS }, { status: 200 });
  } catch (err) {
    console.error("[admin/lot] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
