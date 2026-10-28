import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { accesPourEcrire, chargerAcces } from "@/lib/collectif/acces";
import {
  basculerCouverture,
  briefModifiable,
  compositionDu,
  lireChoixStyle,
  lirePiece,
  lireTexte,
  manquesBrief,
  patchCouvertures,
  styleVisible,
  type BriefLigne,
  type CouvertureAimee,
  type StylePourBrief,
} from "@/lib/collectif/brief";
import { estUuid } from "@/lib/collectif/cles";
import { peut } from "@/lib/collectif/droits";
import { etatEffectif } from "@/lib/collectif/etats";
import { collectifOuvert, stylesOuverts } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_COMPOSITION_ABSENTE, MESSAGE_COMPOSITION_ABSENTE } from "@/lib/collectif/migration";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/brief — le brief d'un magazine, geste par geste.
 * `{ token, magazineId, action, ... }` :
 * - `choisir` `{ slug, palette_cle, texte, doubles }` : prendre TOUT le style
 *   pour ce magazine (palette, typographies, doubles pages ; les couvertures
 *   aimées restent) ;
 * - `piece` `{ genre, styleId, palette_cle?, double?, ajouter? }` : UNE pièce
 *   de n'importe quel style publié (D24) : `palette`, `typos`, `double` ;
 * - `texte` `{ texte }` : la place du texte ;
 * - `couverture` `{ styleId, couverture, aimer }` : aimer une couverture de
 *   n'importe quel style publié (plafond de l'édition) ; un brief validé
 *   repasse « à valider » si la liste change ;
 * - `valider` / `devalider` : le brief complet part à l'atelier, ou revient ;
 * - `reprendre` `{ depuisMagazineId }` : reprendre le style d'un autre magazine.
 *
 * Responsable seulement (`choisir_style`, `valider_brief`) ; l'équipe reçoit
 * 403. Plus rien ne change après la clôture : l'atelier compose. Tout geste
 * qui change le brief le remet « à valider ».
 *
 * Sans la migration 20261017 : la lecture se replie (tout vient de
 * `style_id`) ; « prendre tout le style » s'écrit encore dans les colonnes
 * d'avant (il s'y exprime en entier, rien ne se perd) ; une PIÈCE répond 503
 * `migration_composition_absente`, jamais écrite à moitié.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StyleLu = StylePourBrief & { slug: string; nom: string; segment: string };
type MagLu = BriefLigne & { id: string; rang: number };

const COLONNES_AVANT = "id, rang, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le";
const COLONNES = `${COLONNES_AVANT}, palette_style_id, typo_style_id, doubles_aimes`;

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const porte = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(porte);
  if (refus || porte.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  const action = String(corps.action ?? "");
  const droit = action === "valider" || action === "devalider" ? "valider_brief" : "choisir_style";
  /* Chaque action du brief écrit : le premier appareil prend la place ici (28/10). */
  const acces = await accesPourEcrire(porte, droit);
  if (!peut(acces.role, droit)) return refusDroit();
  /* Le choix du style est fermé pour toutes les éditions (interrupteur.ts) : la page montre
     une vitrine, et aucun geste ne passe, même envoyé à la main. Rien n'est effacé. */
  if (!stylesOuverts()) {
    return NextResponse.json({ error: "styles_fermes", message: "Le choix du style n'est pas encore ouvert." }, { status: 409 });
  }
  const { edition } = acces;

  if (!briefModifiable(etatEffectif(edition.etat, edition.cloture_le, new Date()))) {
    return NextResponse.json({ error: "brief_fige", message: "La collecte est close : l'atelier compose avec ce brief." }, { status: 409 });
  }
  if (!estUuid(corps.magazineId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const supabase = makeSupabase();
  const lireMag = (colonnes: string, id: unknown) =>
    supabase.from("collectif_magazines").select(colonnes).eq("id", id).eq("edition_id", edition.id).maybeSingle<MagLu>();
  let lu = await lireMag(COLONNES, corps.magazineId);
  if (lu.error && colonneAbsente(lu.error.code)) lu = await lireMag(COLONNES_AVANT, corps.magazineId);
  if (lu.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const mag = lu.data;
  if (!mag) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const lireStyle = async (filtre: { slug?: string; id?: string }): Promise<StyleLu | null> => {
    let q = supabase.from("collectif_styles").select("id, slug, nom, segment, publie, palettes, couvertures, typos, doubles");
    q = filtre.slug ? q.eq("slug", filtre.slug) : q.eq("id", filtre.id ?? "");
    const { data } = await q.maybeSingle<StyleLu>();
    return data && styleVisible(edition.styles_segment, data.segment) ? data : null;
  };

  let patch: Record<string, unknown> = {};
  /** Le même patch sans les colonnes de D24, quand il s'y exprime en entier (« prendre tout le style »). */
  let patchAvant: Record<string, unknown> | null = null;
  let journalType = "";
  let journalPayload: Record<string, unknown> = { magazine: mag.rang };

  if (action === "choisir") {
    const style = typeof corps.slug === "string" ? await lireStyle({ slug: corps.slug }) : null;
    if (!style) return NextResponse.json({ error: "saisie", message: "Ce style n'est pas sur le mur." }, { status: 422 });
    const choix = lireChoixStyle(corps, style);
    if (!choix.ok) return NextResponse.json({ error: "saisie", message: choix.message }, { status: 422 });
    patch = choix.patch;
    patchAvant = choix.patchAvant;
    journalType = "brief_style_choisi";
    journalPayload = { ...journalPayload, style: style.nom };
  } else if (action === "couverture") {
    if (!estUuid(corps.styleId) || typeof corps.couverture !== "string") return NextResponse.json({ error: "saisie" }, { status: 422 });
    const style = await lireStyle({ id: corps.styleId });
    const cible: CouvertureAimee = { style_id: corps.styleId, couverture: corps.couverture };
    const b = basculerCouverture(mag.couvertures_aimees ?? [], cible, corps.aimer === true, edition.couvertures_aimees_max, style);
    if (!b.ok) return NextResponse.json({ error: "saisie", message: b.message }, { status: 422 });
    patch = patchCouvertures(mag.couvertures_aimees ?? [], b.aimees);
    journalType = corps.aimer === true ? "couverture_aimee" : "couverture_retiree";
  } else if (action === "piece") {
    const style = estUuid(corps.styleId) ? await lireStyle({ id: corps.styleId }) : null;
    const piece = lirePiece(corps.genre, corps, style, compositionDu(mag));
    if (!piece.ok) return NextResponse.json({ error: "saisie", message: piece.message }, { status: 422 });
    patch = piece.patch;
    journalType = "brief_piece";
    journalPayload = { ...journalPayload, piece: piece.libelle, style: style?.nom ?? null, ...(corps.genre === "double" ? { retiree: corps.ajouter === false } : {}) };
  } else if (action === "texte") {
    const texte = lireTexte(corps);
    if (!texte.ok) return NextResponse.json({ error: "saisie", message: texte.message }, { status: 422 });
    patch = texte.patch;
    journalType = "brief_modifie";
    journalPayload = { ...journalPayload, partie: "texte" };
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
    let src = await lireMag(COLONNES, corps.depuisMagazineId);
    if (src.error && colonneAbsente(src.error.code)) src = await lireMag(COLONNES_AVANT, corps.depuisMagazineId);
    const source = src.data;
    const composee = source ? compositionDu(source) : null;
    if (!source || !composee || (!composee.palette && !composee.typos && !composee.doubles.length)) {
      return NextResponse.json({ error: "saisie", message: "Ce magazine n'a encore rien de composé." }, { status: 422 });
    }
    patchAvant = { style_id: source.style_id, palette_cle: source.palette_cle, texte: source.texte, doubles: source.doubles, brief_valide_le: null };
    patch = { ...patchAvant, palette_style_id: source.palette_style_id ?? null, typo_style_id: source.typo_style_id ?? null, doubles_aimes: source.doubles_aimes ?? [] };
    journalType = "brief_repris";
    journalPayload = { ...journalPayload, depuis: source.rang };
  } else {
    return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  }

  let { error: errEcriture } = await supabase.from("collectif_magazines").update(patch).eq("id", mag.id);
  if (errEcriture && colonneAbsente(errEcriture.code)) {
    /* Sans la migration 20261017 : un style pris en entier s'écrit dans les
       colonnes d'avant (rien ne s'y perd) ; une pièce, jamais à moitié. */
    if (!patchAvant) return NextResponse.json({ error: ERREUR_COMPOSITION_ABSENTE, message: MESSAGE_COMPOSITION_ABSENTE }, { status: 503 });
    ({ error: errEcriture } = await supabase.from("collectif_magazines").update(patchAvant).eq("id", mag.id));
  }
  if (errEcriture) {
    console.error("[collectif] brief non écrit", errEcriture.code, errEcriture.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = await journaliser(supabase, { editionId: edition.id }, journalType, journalPayload, null);
  return NextResponse.json({ ok: true, journal });
}
