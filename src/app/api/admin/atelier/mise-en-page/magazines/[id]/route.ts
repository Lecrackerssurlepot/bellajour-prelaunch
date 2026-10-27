/**
 * /api/admin/atelier/mise-en-page/magazines/[id] — un magazine de la
 * sauvegarde partagée (docs/produit/MISE-EN-PAGE.md §6).
 *
 * GET : l'enregistrement complet, contenu compris.
 * PUT { version, contenu?, titre?, etat?, exporte?: true } : sauvegarde sous
 * VERROU OPTIMISTE. La mise à jour ne vise que la ligne qui porte encore la
 * version envoyée (`.eq("id").eq("version", envoyee)`), et la passe à
 * envoyee + 1 : comme le filtre porte sur la version, c'est exactement
 * « version = version + 1 », atomique côté base. Zéro ligne touchée : on
 * relit, 404 si la ligne n'existe pas, sinon 409 { version, modifie_par,
 * modifie_le } (« Louis modifie ce magazine »), jamais un écrasement.
 *
 * Seule table écrite : `mises_en_page`. Aucun DELETE : archiver = `etat: "archive"`.
 * Pas de ligne dans `evenements` (journal d'un dossier client, que la mise en
 * page ne change pas) : la ligne porte `modifie_par` / `modifie_le`.
 * Sans la migration 20261027 : 503 `migration_mises_en_page_absente`.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { estUuid } from "@/lib/collectif/cles";
import {
  TAILLE_MAX_CONTENU,
  TAILLE_MAX_CORPS,
  contenuValide,
  estEtatMep,
  estVersion,
  issueSauvegarde,
  tailleContenu,
  titreValide,
} from "@/lib/mise-en-page/sauvegarde";
import {
  COLONNES_COMPLETES,
  COLONNES_SANS_CONTENU,
  SANS_CACHE,
  lireCorpsBorne,
  refus,
  refusCorps,
  reponseTableAbsente,
  tableMepAbsente,
} from "../commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Contexte = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Contexte) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const { id } = await params;
  if (!estUuid(id)) return refus(404, "introuvable");

  try {
    const supabase = makeSupabase();
    const { data, error } = await supabase.from("mises_en_page").select(COLONNES_COMPLETES).eq("id", id).maybeSingle();
    if (error) {
      if (tableMepAbsente(error.code)) return reponseTableAbsente();
      console.error("[admin/mise-en-page/magazines/id] lecture", error.code, error.message);
      return refus(500, "lecture_impossible");
    }
    if (!data) return refus(404, "introuvable");
    return NextResponse.json({ ok: true, magazine: data }, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/magazines/id] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}

export async function PUT(request: Request, { params }: Contexte) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const { id } = await params;
  if (!estUuid(id)) return refus(404, "introuvable");

  const lu = await lireCorpsBorne(request, TAILLE_MAX_CORPS);
  if (!lu.ok) return refusCorps(lu.raison);
  const corps = lu.corps;

  const envoyee = corps.version;
  if (!estVersion(envoyee)) return refus(400, "version_invalide");

  const patch: Record<string, unknown> = {};
  if (corps.contenu !== undefined) {
    if (tailleContenu(corps.contenu) > TAILLE_MAX_CONTENU) return refus(413, "trop_lourd");
    if (!contenuValide(corps.contenu)) return refus(400, "contenu_invalide");
    patch.contenu = corps.contenu;
  }
  if (corps.titre !== undefined) {
    const titre = titreValide(corps.titre);
    if (!titre) return refus(400, "titre_invalide");
    patch.titre = titre;
  }
  if (corps.etat !== undefined) {
    if (!estEtatMep(corps.etat)) return refus(400, "etat_invalide");
    patch.etat = corps.etat;
  }
  if (corps.exporte !== undefined && corps.exporte !== true) return refus(400, "exporte_invalide");
  const maintenant = new Date().toISOString();
  if (corps.exporte === true) patch.exporte_le = maintenant;
  if (Object.keys(patch).length === 0) return refus(400, "rien_a_enregistrer");

  patch.version = envoyee + 1;
  patch.modifie_par = prenomDe(qui);
  patch.modifie_le = maintenant;

  try {
    const supabase = makeSupabase();
    const { data, error } = await supabase.from("mises_en_page").update(patch).eq("id", id).eq("version", envoyee).select(COLONNES_SANS_CONTENU);
    if (error) {
      if (tableMepAbsente(error.code)) return reponseTableAbsente();
      console.error("[admin/mise-en-page/magazines/id] sauvegarde", error.code, error.message);
      return refus(500, "ecriture_impossible");
    }
    if (data && data.length === 1) {
      return NextResponse.json({ ok: true, magazine: data[0] }, { status: 200, headers: SANS_CACHE });
    }

    /* Zéro ligne : l'id n'existe pas, ou un autre poste a sauvegardé entre-temps. */
    const { data: enBase, error: e2 } = await supabase
      .from("mises_en_page")
      .select("id, version, modifie_par, modifie_le")
      .eq("id", id)
      .maybeSingle<{ id: string; version: number; modifie_par: string | null; modifie_le: string }>();
    if (e2) {
      console.error("[admin/mise-en-page/magazines/id] relecture", e2.code, e2.message);
      return refus(500, "lecture_impossible");
    }
    if (!enBase) return refus(404, "introuvable");
    if (issueSauvegarde(envoyee, enBase.version) === "ok") {
      /* Même version et pourtant rien d'écrit : ni conflit ni absence, une anomalie à voir dans les logs. */
      console.error("[admin/mise-en-page/magazines/id] aucune ligne écrite à version égale", id);
      return refus(500, "ecriture_impossible");
    }
    return refus(409, "conflit", { version: enBase.version, modifie_par: enBase.modifie_par, modifie_le: enBase.modifie_le });
  } catch (err) {
    console.error("[admin/mise-en-page/magazines/id] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}
