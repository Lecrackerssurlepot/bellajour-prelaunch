import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { signerPut, tailleReelle } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { MAX_PAGES_TOUR, lirePagesTour, manquesPourPublierTour, resumeTour } from "@/lib/collectif/bat";
import { cleVignettePageTour, clePageTour, clePdfTour, estUuid } from "@/lib/collectif/cles";
import { instantDeParis } from "@/lib/collectif/dates";
import { LIBELLE_ETAT_EDITION, etatEffectif } from "@/lib/collectif/etats";
import { preparerGeste } from "@/lib/collectif/gestes";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { lireCorps } from "@/lib/collectif/reponses";
import { couverturesDesTours, magazinesPourGeste, precedentDe, toursDuMagazine } from "@/lib/collectif/tours";
import type { EditionLigne, MagazineLigne, TourLigne } from "@/lib/collectif/types";

/**
 * POST /api/admin/collectif/editions/[id]/bat — le bon à tirer, côté atelier
 * (PRD §6.1). Une action par geste, `{ action, ... }` :
 * - `ouvrir_tour` `{ magazineId }` : le brouillon du prochain tour (un seul à
 *   la fois par magazine : le rouvrir, jamais en créer un second) ;
 * - `presigner` `{ tourId, pdf: { taille }, pages: [{ index, type, taille, vignette? }] }` :
 *   les PUT signés du PDF source et des images de pages ;
 * - `enregistrer_pages` `{ tourId, pages }` : le rendu du navigateur entre
 *   dans le tour, après un HEAD de chaque objet (rien n'entre qui ne soit
 *   au coffre) ;
 * - `echeance` `{ tourId, echeance_local }` : l'heure de PARIS ;
 * - `legende` `{ tourId, rang, legende }`, `retirer_couverture` `{ tourId, rang }` ;
 * - `publier` `{ tourId, verifier }` : en deux gestes, comme toute la fiche ;
 * - `repondre` `{ noteId, reponse }` : la réponse de l'atelier à une note ENVOYÉE.
 *
 * Un tour publié est figé par la base (trigger) : chaque action d'écriture
 * sur un tour vérifie d'abord qu'il est encore un brouillon, pour répondre
 * une phrase au lieu d'une exception SQL.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Le PDF source d'un magazine : jusqu'à 130 Mo mesurés (B2C), on laisse de la marge. */
const PDF_MAX = 1024 * 1024 * 1024;
const PAGE_MAX = 15 * 1024 * 1024;
const TYPES_PAGE: Record<string, "webp" | "jpg"> = { "image/webp": "webp", "image/jpeg": "jpg" };

type EditionLue = Pick<EditionLigne, "id" | "etat" | "cloture_le" | "archive_le" | "nb_propositions_couverture">;

function non(statut: number, error: string, message?: string) {
  return NextResponse.json(message ? { error, message } : { error }, { status: statut });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return non(401, "non_authentifie");
  const { id } = await params;
  if (!estUuid(id)) return non(404, "introuvable");
  const corps = await lireCorps(request);
  if (!corps) return non(400, "corps_illisible");
  const par = prenomDe(qui);

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("id, etat, cloture_le, archive_le, nb_propositions_couverture")
    .eq("id", id)
    .maybeSingle<EditionLue>();
  if (error) {
    if (tableAbsente(error.code)) return non(503, ERREUR_MIGRATION_ABSENTE);
    return non(500, "lecture_impossible");
  }
  if (!edition) return non(404, "introuvable");
  const action = String(corps.action ?? "");

  /* ─────────────── la réponse à une note : la note dit son magazine ─────────────── */
  if (action === "repondre") {
    if (!estUuid(corps.noteId)) return non(404, "introuvable");
    const reponse = typeof corps.reponse === "string" ? corps.reponse.trim().slice(0, 2000) : "";
    if (!reponse) return non(422, "saisie", "Écrire la réponse.");
    const { data: note } = await supabase
      .from("collectif_notes")
      .select("id, envoyee_le, collectif_tours!inner(id, collectif_magazines!inner(rang, edition_id))")
      .eq("id", corps.noteId)
      .maybeSingle<{ id: string; envoyee_le: string | null; collectif_tours: { collectif_magazines: { rang: number; edition_id: string } } }>();
    const mag = note?.collectif_tours?.collectif_magazines;
    if (!note || mag?.edition_id !== id) return non(404, "introuvable");
    if (!note.envoyee_le) return non(409, "brouillon", "Le client n'a pas encore envoyé cette note.");
    const maintenant = new Date().toISOString();
    const { error: e } = await supabase
      .from("collectif_notes")
      .update({ reponse_atelier: reponse, reponse_le: maintenant, maj_le: maintenant })
      .eq("id", note.id);
    if (e) return non(500, "ecriture_impossible");
    const journal = await journaliser(supabase, { editionId: id }, "note_repondue", { magazine: mag.rang, par }, qui);
    return NextResponse.json({ ok: true, journal });
  }

  /* ─────────────── ouvrir le brouillon du prochain tour ─────────────── */
  if (action === "ouvrir_tour") {
    if (edition.archive_le) return non(409, "archivee", "L'édition est archivée.");
    if (!estUuid(corps.magazineId)) return non(404, "introuvable");
    const { data: mag } = await supabase
      .from("collectif_magazines")
      .select("id, rang, bat_valide_le")
      .eq("id", corps.magazineId)
      .eq("edition_id", id)
      .maybeSingle<Pick<MagazineLigne, "id" | "rang" | "bat_valide_le">>();
    if (!mag) return non(404, "introuvable");
    if (mag.bat_valide_le) return non(409, "valide", `Le bon à tirer du magazine ${mag.rang} est validé : plus de nouveau tour.`);
    const lus = await toursDuMagazine(supabase, mag.id);
    if (!lus.ok) return non(500, "lecture_impossible");
    let tour = lus.valeur.find((t) => !t.publie_le) ?? null;
    if (!tour) {
      const numero = lus.valeur.reduce((n, t) => Math.max(n, t.numero), 0) + 1;
      const { data: cree, error: e } = await supabase
        .from("collectif_tours")
        .insert({ magazine_id: mag.id, numero, cree_par: qui })
        .select("id, magazine_id, numero, pdf_key, nb_pages, pages, echeance_retours, publie_le, publie_par, created_at, cree_par")
        .single<TourLigne>();
      if (e || !cree) {
        /* Deux clics simultanés : la contrainte (magazine, numéro) en refuse un. */
        if (e?.code === "23505") return non(409, "reessayer", "Un tour vient d'être ouvert : recharger la page.");
        return non(500, "ecriture_impossible");
      }
      tour = cree;
      await journaliser(supabase, { editionId: id }, "tour_cree", { magazine: mag.rang, tour: numero, par }, qui);
    }
    const precedent = precedentDe(lus.valeur, tour.numero);
    return NextResponse.json({
      ok: true,
      tour: { id: tour.id, numero: tour.numero },
      precedent: precedent
        ? { id: precedent.id, numero: precedent.numero, pages: precedent.pages.map((p) => ({ index: p.index, empreinte: p.empreinte, mots: p.mots ?? null })) }
        : null,
    });
  }

  /* ─────────────── les actions sur un tour : il doit être de cette édition ─────────────── */
  if (!estUuid(corps.tourId)) return non(404, "introuvable");
  const { data: tour } = await supabase
    .from("collectif_tours")
    .select("id, magazine_id, numero, pdf_key, nb_pages, pages, echeance_retours, publie_le, publie_par, created_at, cree_par")
    .eq("id", corps.tourId)
    .maybeSingle<TourLigne>();
  if (!tour) return non(404, "introuvable");
  const { data: mag } = await supabase
    .from("collectif_magazines")
    .select("id, rang, bat_valide_le, edition_id")
    .eq("id", tour.magazine_id)
    .maybeSingle<Pick<MagazineLigne, "id" | "rang" | "bat_valide_le" | "edition_id">>();
  if (!mag || mag.edition_id !== id) return non(404, "introuvable");
  if (tour.publie_le) return non(409, "tour_fige", `Le tour ${tour.numero} est publié : il est figé. Un nouveau PDF fait un nouveau tour.`);

  const lus = await toursDuMagazine(supabase, mag.id);
  if (!lus.ok) return non(500, "lecture_impossible");
  const precedent = precedentDe(lus.valeur, tour.numero);
  const premier = !lus.valeur.some((t) => t.publie_le);

  if (action === "presigner") {
    const pdf = (corps.pdf ?? null) as { taille?: unknown } | null;
    const pages = Array.isArray(corps.pages) ? (corps.pages as Record<string, unknown>[]) : [];
    if (pages.length > MAX_PAGES_TOUR * 2) return non(422, "saisie", "Trop de pages.");
    const sortie: { pdf: { key: string; url: string } | null; pages: { index: number; vignette: boolean; key: string; url: string }[] } = { pdf: null, pages: [] };
    try {
      if (pdf) {
        const taille = Number(pdf.taille);
        if (!Number.isInteger(taille) || taille <= 0 || taille > PDF_MAX) return non(422, "saisie", "PDF vide ou trop lourd.");
        const key = clePdfTour(id, tour.id);
        sortie.pdf = { key, url: await signerPut(key, "application/pdf", taille) };
      }
      for (const p of pages) {
        const index = Number(p.index);
        const ext = TYPES_PAGE[String(p.type)];
        const taille = Number(p.taille);
        if (!Number.isInteger(index) || index < 0 || index >= MAX_PAGES_TOUR || !ext) return non(422, "saisie", "Page illisible.");
        if (!Number.isInteger(taille) || taille <= 0 || taille > PAGE_MAX) return non(422, "saisie", `Page ${index + 1} : image vide ou trop lourde.`);
        const vignette = p.vignette === true;
        const key = vignette ? cleVignettePageTour(id, tour.id, index, ext) : clePageTour(id, tour.id, index, ext);
        sortie.pages.push({ index, vignette, key, url: await signerPut(key, String(p.type), taille) });
      }
    } catch (e) {
      console.error("[collectif] signature du tour impossible", e);
      return non(502, "signature_impossible");
    }
    return NextResponse.json({ ok: true, ...sortie });
  }

  if (action === "enregistrer_pages") {
    const lues = lirePagesTour(
      corps.pages,
      {
        page: (i, ext) => clePageTour(id, tour.id, i, ext),
        vignette: (i, ext) => cleVignettePageTour(id, tour.id, i, ext),
      },
      precedent ? precedent.pages.length : null
    );
    if (!lues.ok) return non(422, "saisie", lues.message);
    const pdfKey = clePdfTour(id, tour.id);
    /* Rien n'entre dans le tour qui ne soit au coffre : un HEAD par objet,
       huit à la fois. Une absence le dit, une panne aussi (sans confondre). */
    const cles = [pdfKey, ...lues.pages.flatMap((p) => (p.vignette_key ? [p.image_key, p.vignette_key] : [p.image_key]))];
    const manquants: string[] = [];
    try {
      for (let i = 0; i < cles.length; i += 8) {
        const tailles = await Promise.all(cles.slice(i, i + 8).map((k) => tailleReelle(k)));
        tailles.forEach((t, j) => {
          if (!t) manquants.push(cles[i + j]);
        });
      }
    } catch (e) {
      console.error("[collectif] HEAD du tour impossible", e);
      return non(502, "coffre_injoignable", "Le coffre ne répond pas : réessayer dans un instant.");
    }
    if (manquants.length) {
      const pdfManque = manquants.includes(pdfKey);
      return non(409, "fichiers_absents", pdfManque ? "Le PDF source n'est pas arrivé au coffre." : `${manquants.length} image(s) de page ne sont pas arrivées au coffre.`);
    }
    const { error: e } = await supabase
      .from("collectif_tours")
      .update({ pdf_key: pdfKey, nb_pages: lues.pages.length, pages: lues.pages })
      .eq("id", tour.id)
      .is("publie_le", null);
    if (e) {
      console.error("[collectif] pages du tour non écrites", e.code, e.message);
      return non(500, "ecriture_impossible");
    }
    const journal = await journaliser(supabase, { editionId: id }, "tour_pages", { magazine: mag.rang, tour: tour.numero, pages: lues.pages.length, par }, qui);
    return NextResponse.json({ ok: true, resume: resumeTour(lues.pages, precedent ? precedent.pages.length : null), journal });
  }

  if (action === "echeance") {
    const brut = typeof corps.echeance_local === "string" ? corps.echeance_local.trim() : "";
    const iso = brut ? instantDeParis(brut) : null;
    if (brut && !iso) return non(422, "saisie", "Cette heure n'existe pas à Paris (changement d'heure) : en choisir une autre.");
    const { error: e } = await supabase.from("collectif_tours").update({ echeance_retours: iso }).eq("id", tour.id).is("publie_le", null);
    if (e) return non(500, "ecriture_impossible");
    const journal = await journaliser(supabase, { editionId: id }, "tour_echeance", { magazine: mag.rang, tour: tour.numero, par }, qui);
    return NextResponse.json({ ok: true, echeance: iso, journal });
  }

  if (action === "legende" || action === "retirer_couverture") {
    const rang = Number(corps.rang);
    if (!Number.isInteger(rang) || rang < 1) return non(422, "saisie");
    if (action === "legende") {
      const legende = typeof corps.legende === "string" ? corps.legende.trim().slice(0, 200) : "";
      const { error: e } = await supabase
        .from("collectif_couvertures")
        .update({ legende: legende || null })
        .eq("tour_id", tour.id)
        .eq("rang", rang);
      if (e) return non(500, "ecriture_impossible");
      return NextResponse.json({ ok: true });
    }
    const { error: e } = await supabase.from("collectif_couvertures").delete().eq("tour_id", tour.id).eq("rang", rang);
    if (e) return non(500, "ecriture_impossible");
    const journal = await journaliser(supabase, { editionId: id }, "tour_couverture_retiree", { magazine: mag.rang, rang, par }, qui);
    return NextResponse.json({ ok: true, journal });
  }

  if (action === "publier") {
    const lusMags = await magazinesPourGeste(supabase, id);
    if (!lusMags.ok) return non(500, "lecture_impossible");
    const maintenant = new Date();
    const prep = preparerGeste("publier_tour", {
      role: "atelier",
      etat: edition.etat,
      clotureLe: edition.cloture_le,
      archiveLe: edition.archive_le,
      maintenant,
      magazines: lusMags.valeur,
      magazineId: mag.id,
    });
    if (!prep.ok) return NextResponse.json({ error: "refuse", erreurs: prep.erreurs, message: prep.erreurs.map((x) => x.message).join(" ") }, { status: 422 });
    const couv = premier ? await couverturesDesTours(supabase, [tour.id]) : { ok: true as const, valeur: [] };
    if (!couv.ok) return non(500, "lecture_impossible");
    const manques = manquesPourPublierTour(tour, premier, couv.valeur, edition.nb_propositions_couverture, maintenant);
    if (manques.length) return non(422, "incomplet", `Il manque ${manques.join(", ")}.`);
    const resume = resumeTour(tour.pages, precedent ? precedent.pages.length : null);
    const de = etatEffectif(edition.etat, edition.cloture_le, maintenant);

    if (corps.verifier === true) {
      return NextResponse.json({
        ok: true,
        verifier: true,
        geste: { libelle: prep.geste.libelle, explication: prep.geste.explication },
        de: LIBELLE_ETAT_EDITION[de],
        vers: LIBELLE_ETAT_EDITION[prep.vers],
        tour: tour.numero,
        pages: tour.nb_pages,
        resume,
        precedent: precedent?.numero ?? null,
      });
    }

    /* Le tour d'abord (il se fige), l'édition ensuite : un tour publié sur
       une édition restée en « composition » se rattrape au geste suivant,
       l'inverse montrerait au client une étape vide. */
    const { data: publie, error: e } = await supabase
      .from("collectif_tours")
      .update({ publie_le: maintenant.toISOString(), publie_par: par })
      .eq("id", tour.id)
      .is("publie_le", null)
      .select("id");
    if (e) {
      console.error("[collectif] tour non publié", e.code, e.message);
      return non(500, "ecriture_impossible");
    }
    if (!publie?.length) return non(409, "deja_publie", "Ce tour vient d'être publié.");
    const { data: ecrit, error: errEd } = await supabase
      .from("collectif_editions")
      .update(prep.patch)
      .eq("id", id)
      .eq("etat", edition.etat)
      .select("id");
    if (errEd || !ecrit?.length) console.error("[collectif] état non réaligné après publication", errEd?.code, errEd?.message);
    const journal = await journaliser(supabase, { editionId: id }, "tour_publie", { magazine: mag.rang, tour: tour.numero, par }, qui);
    return NextResponse.json({ ok: true, tour: tour.numero, vers: LIBELLE_ETAT_EDITION[prep.vers], journal, etatAligne: Boolean(ecrit?.length) });
  }

  return non(400, "action_inconnue");
}
