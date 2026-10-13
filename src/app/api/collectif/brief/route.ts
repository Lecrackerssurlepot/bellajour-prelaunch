import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { basculerCouverture, briefModifiable, lireChoixStyle, manquesBrief, styleVisible, type CouvertureAimee, type StylePourBrief } from "@/lib/collectif/brief";
import { estUuid } from "@/lib/collectif/cles";
import { peut } from "@/lib/collectif/droits";
import { etatEffectif } from "@/lib/collectif/etats";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import type { MagazineLigne } from "@/lib/collectif/types";

/**
 * POST /api/collectif/brief — le brief d'un magazine, geste par geste.
 * `{ token, magazineId, action, ... }` :
 * - `choisir` `{ slug, palette_cle, texte, doubles }` : ce style pour ce magazine
 *   (le brief repasse « à valider ») ;
 * - `couverture` `{ styleId, couverture, aimer }` : aimer une couverture de
 *   n'importe quel style publié (plafond de l'édition) ;
 * - `valider` / `devalider` : le brief complet part à l'atelier, ou revient ;
 * - `reprendre` `{ depuisMagazineId }` : reprendre le style d'un autre magazine.
 *
 * Responsable seulement (`choisir_style`, `valider_brief`) ; l'équipe reçoit
 * 403. Plus rien ne change après la clôture : l'atelier compose.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StyleLu = StylePourBrief & { slug: string; nom: string; segment: string };

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  const action = String(corps.action ?? "");
  const droit = action === "valider" || action === "devalider" ? "valider_brief" : "choisir_style";
  if (!peut(acces.role, droit)) return refusDroit();
  const { edition } = acces;

  if (!briefModifiable(etatEffectif(edition.etat, edition.cloture_le, new Date()))) {
    return NextResponse.json({ error: "brief_fige", message: "La collecte est close : l'atelier compose avec ce brief." }, { status: 409 });
  }
  if (!estUuid(corps.magazineId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const supabase = makeSupabase();
  const { data: mag, error } = await supabase
    .from("collectif_magazines")
    .select("id, rang, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le")
    .eq("id", corps.magazineId)
    .eq("edition_id", edition.id)
    .maybeSingle<MagazineLigne>();
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  if (!mag) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const lireStyle = async (filtre: { slug?: string; id?: string }): Promise<StyleLu | null> => {
    let q = supabase.from("collectif_styles").select("id, slug, nom, segment, publie, palettes, couvertures");
    q = filtre.slug ? q.eq("slug", filtre.slug) : q.eq("id", filtre.id ?? "");
    const { data } = await q.maybeSingle<StyleLu>();
    return data && styleVisible(edition.styles_segment, data.segment) ? data : null;
  };

  let patch: Record<string, unknown> = {};
  let journalType = "";
  let journalPayload: Record<string, unknown> = { magazine: mag.rang };

  if (action === "choisir") {
    const style = typeof corps.slug === "string" ? await lireStyle({ slug: corps.slug }) : null;
    if (!style) return NextResponse.json({ error: "saisie", message: "Ce style n'est pas sur le mur." }, { status: 422 });
    const choix = lireChoixStyle(corps, style);
    if (!choix.ok) return NextResponse.json({ error: "saisie", message: choix.message }, { status: 422 });
    patch = choix.patch;
    journalType = "brief_style_choisi";
    journalPayload = { ...journalPayload, style: style.nom };
  } else if (action === "couverture") {
    if (!estUuid(corps.styleId) || typeof corps.couverture !== "string") return NextResponse.json({ error: "saisie" }, { status: 422 });
    const style = await lireStyle({ id: corps.styleId });
    const cible: CouvertureAimee = { style_id: corps.styleId, couverture: corps.couverture };
    const b = basculerCouverture(mag.couvertures_aimees ?? [], cible, corps.aimer === true, edition.couvertures_aimees_max, style);
    if (!b.ok) return NextResponse.json({ error: "saisie", message: b.message }, { status: 422 });
    patch = { couvertures_aimees: b.aimees };
    journalType = corps.aimer === true ? "couverture_aimee" : "couverture_retiree";
  } else if (action === "valider") {
    const manques = manquesBrief(mag);
    if (manques.length) return NextResponse.json({ error: "incomplet", message: `Il manque ${manques.join(", ")}.` }, { status: 422 });
    patch = { brief_valide_le: new Date().toISOString() };
    journalType = "brief_valide";
  } else if (action === "devalider") {
    patch = { brief_valide_le: null };
    journalType = "brief_rouvert";
  } else if (action === "reprendre") {
    if (!estUuid(corps.depuisMagazineId)) return NextResponse.json({ error: "saisie" }, { status: 422 });
    const { data: source } = await supabase
      .from("collectif_magazines")
      .select("rang, style_id, palette_cle, texte, doubles")
      .eq("id", corps.depuisMagazineId)
      .eq("edition_id", edition.id)
      .maybeSingle<Pick<MagazineLigne, "rang" | "style_id" | "palette_cle" | "texte" | "doubles">>();
    if (!source?.style_id) return NextResponse.json({ error: "saisie", message: "Ce magazine n'a pas encore de style." }, { status: 422 });
    patch = { style_id: source.style_id, palette_cle: source.palette_cle, texte: source.texte, doubles: source.doubles, brief_valide_le: null };
    journalType = "brief_repris";
    journalPayload = { ...journalPayload, depuis: source.rang };
  } else {
    return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  }

  const { error: errEcriture } = await supabase.from("collectif_magazines").update(patch).eq("id", mag.id);
  if (errEcriture) {
    console.error("[collectif] brief non écrit", errEcriture.code, errEcriture.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = await journaliser(supabase, { editionId: edition.id }, journalType, journalPayload, null);
  return NextResponse.json({ ok: true, journal });
}
