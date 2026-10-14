import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { etatNote, lireChoixCouverture, lireNote, tourCourant } from "@/lib/collectif/bat";
import { estUuid } from "@/lib/collectif/cles";
import { peut, type Action } from "@/lib/collectif/droits";
import { etatEffectif } from "@/lib/collectif/etats";
import { preparerGeste } from "@/lib/collectif/gestes";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { couverturesDesTours, magazinesPourGeste, toursDuMagazine } from "@/lib/collectif/tours";
import type { MagazineLigne, NoteLigne } from "@/lib/collectif/types";

/**
 * POST /api/collectif/bat — le bon à tirer, côté client (PRD §6.2).
 * `{ token, magazineId, action, ... }` :
 * - `noter` `{ tourId, noteId?, page_index, x_pct, y_pct, type, contenu }` :
 *   la note est ENREGISTRÉE tout de suite, en brouillon (sur le tour courant) ;
 * - `retirer` `{ noteId }` : un brouillon retiré (il reste en base) ;
 * - `envoyer` `{ tourId }` : les brouillons du tour partent à l'atelier, en lot ;
 * - `resoudre` / `rouvrir` `{ noteId }` : une note envoyée, de n'importe quel tour ;
 * - `couverture` `{ couvertureId | sans_preference: true }`, `couverture_note` `{ note }` ;
 * - `valider` : le bon à tirer de CE magazine (définitif).
 *
 * Le droit dépend de l'action (matrice du PRD §2) : le lien d'équipe reçoit
 * 403 sur toutes. Plus rien ne bouge sur un magazine validé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DROIT: Record<string, Action> = {
  noter: "poser_note",
  retirer: "poser_note",
  envoyer: "envoyer_notes",
  resoudre: "resoudre_note",
  rouvrir: "resoudre_note",
  couverture: "choisir_couverture",
  couverture_note: "choisir_couverture",
  valider: "valider_bat",
};

const COLONNES_NOTE =
  "id, tour_id, page_index, x_pct, y_pct, type, contenu, envoyee_le, resolue_le, reponse_atelier, reponse_le, retiree_le, created_at, maj_le";

function non(statut: number, error: string, message?: string) {
  return NextResponse.json(message ? { error, message } : { error }, { status: statut });
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return non(400, "corps_illisible");

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  const action = String(corps.action ?? "");
  const droit = DROIT[action];
  if (!droit) return non(400, "action_inconnue");
  if (!peut(acces.role, droit)) return refusDroit();
  const { edition } = acces;
  const maintenant = new Date();
  if (etatEffectif(edition.etat, edition.cloture_le, maintenant) !== "bat") {
    return non(409, "hors_bat", "Le bon à tirer n'est pas ouvert à la relecture.");
  }
  if (!estUuid(corps.magazineId)) return non(404, "introuvable");

  const supabase = makeSupabase();
  const { data: mag, error } = await supabase
    .from("collectif_magazines")
    .select("id, rang, bat_valide_le, couverture_choisie_id, couverture_sans_preference, couverture_note")
    .eq("id", corps.magazineId)
    .eq("edition_id", edition.id)
    .maybeSingle<Pick<MagazineLigne, "id" | "rang" | "bat_valide_le" | "couverture_choisie_id" | "couverture_sans_preference" | "couverture_note">>();
  if (error) return non(500, "lecture_impossible");
  if (!mag) return non(404, "introuvable");
  if (mag.bat_valide_le) return non(409, "valide", "Ce bon à tirer est validé : il ne change plus.");

  const lus = await toursDuMagazine(supabase, mag.id);
  if (!lus.ok) return non(500, "lecture_impossible");
  const publies = lus.valeur.filter((t) => t.publie_le);
  const courant = tourCourant(publies);
  if (!courant) return non(409, "sans_tour", "Aucun bon à tirer publié pour ce magazine.");
  const journalDe = (type: string, payload: Record<string, unknown> = {}) =>
    journaliser(supabase, { editionId: edition.id }, type, { magazine: mag.rang, ...payload }, null);

  /* Une note du magazine, quel que soit son tour (publié). */
  const lireNoteDuMagazine = async (noteId: unknown) => {
    if (!estUuid(noteId)) return null;
    const { data } = await supabase.from("collectif_notes").select(COLONNES_NOTE).eq("id", noteId).maybeSingle<NoteLigne>();
    return data && publies.some((t) => t.id === data.tour_id) ? data : null;
  };

  if (action === "noter") {
    if (corps.tourId !== courant.id) return non(409, "tour_archive", "Ce tour est archivé : on ne peut plus y poser de note.");
    const lue = lireNote(corps, courant.nb_pages ?? courant.pages.length);
    if (!lue.ok) return non(422, "saisie", lue.message);
    const iso = maintenant.toISOString();
    if (corps.noteId !== undefined && corps.noteId !== null) {
      const note = await lireNoteDuMagazine(corps.noteId);
      if (!note || note.tour_id !== courant.id) return non(404, "introuvable");
      if (etatNote(note) !== "brouillon") return non(409, "envoyee", "Cette note est déjà partie à l'atelier.");
      const { data, error: e } = await supabase
        .from("collectif_notes")
        .update({ ...lue.note, maj_le: iso })
        .eq("id", note.id)
        .is("envoyee_le", null)
        .select(COLONNES_NOTE)
        .maybeSingle<NoteLigne>();
      if (e || !data) return non(500, "ecriture_impossible");
      return NextResponse.json({ ok: true, note: data });
    }
    const { data, error: e } = await supabase
      .from("collectif_notes")
      .insert({ tour_id: courant.id, ...lue.note })
      .select(COLONNES_NOTE)
      .single<NoteLigne>();
    if (e || !data) {
      console.error("[collectif] note non écrite", e?.code, e?.message);
      return non(500, "ecriture_impossible");
    }
    return NextResponse.json({ ok: true, note: data }, { status: 201 });
  }

  if (action === "retirer") {
    const note = await lireNoteDuMagazine(corps.noteId);
    if (!note) return non(404, "introuvable");
    if (etatNote(note) !== "brouillon") return non(409, "envoyee", "Cette note est déjà partie à l'atelier.");
    const iso = maintenant.toISOString();
    const { error: e } = await supabase.from("collectif_notes").update({ retiree_le: iso, maj_le: iso }).eq("id", note.id).is("envoyee_le", null);
    if (e) return non(500, "ecriture_impossible");
    return NextResponse.json({ ok: true });
  }

  if (action === "envoyer") {
    if (corps.tourId !== courant.id) return non(409, "tour_archive", "Ce tour est archivé.");
    const iso = maintenant.toISOString();
    const { data, error: e } = await supabase
      .from("collectif_notes")
      .update({ envoyee_le: iso, maj_le: iso })
      .eq("tour_id", courant.id)
      .is("envoyee_le", null)
      .is("retiree_le", null)
      .select("id");
    if (e) return non(500, "ecriture_impossible");
    const n = data?.length ?? 0;
    if (n === 0) return non(409, "rien", "Aucune note en attente d'envoi.");
    const journal = await journalDe("notes_envoyees", { n });
    return NextResponse.json({ ok: true, n, envoyee_le: iso, journal });
  }

  if (action === "resoudre" || action === "rouvrir") {
    const note = await lireNoteDuMagazine(corps.noteId);
    if (!note) return non(404, "introuvable");
    if (!note.envoyee_le || note.retiree_le) return non(409, "brouillon", "Une note se résout une fois envoyée.");
    const iso = maintenant.toISOString();
    const { error: e } = await supabase
      .from("collectif_notes")
      .update({ resolue_le: action === "resoudre" ? iso : null, maj_le: iso })
      .eq("id", note.id);
    if (e) return non(500, "ecriture_impossible");
    const journal = await journalDe(action === "resoudre" ? "note_resolue" : "note_rouverte");
    return NextResponse.json({ ok: true, resolue_le: action === "resoudre" ? iso : null, journal });
  }

  if (action === "couverture" || action === "couverture_note") {
    if (action === "couverture_note") {
      const note = typeof corps.note === "string" ? corps.note.trim().slice(0, 2000) : "";
      const { error: e } = await supabase.from("collectif_magazines").update({ couverture_note: note || null }).eq("id", mag.id).is("bat_valide_le", null);
      if (e) return non(500, "ecriture_impossible");
      const journal = await journalDe("couverture_note");
      return NextResponse.json({ ok: true, journal });
    }
    const couv = await couverturesDesTours(supabase, publies.map((t) => t.id));
    if (!couv.ok) return non(500, "lecture_impossible");
    const choix = lireChoixCouverture(corps, couv.valeur);
    if (!choix.ok) return non(422, "saisie", choix.message);
    const { error: e } = await supabase.from("collectif_magazines").update(choix.patch).eq("id", mag.id).is("bat_valide_le", null);
    if (e) return non(500, "ecriture_impossible");
    const rang = couv.valeur.find((c) => c.id === choix.patch.couverture_choisie_id)?.rang ?? null;
    const journal = await journalDe("couverture_choisie", { rang, sansPreference: choix.patch.couverture_sans_preference });
    return NextResponse.json({ ok: true, ...choix.patch, journal });
  }

  /* ─────────────── valider : définitif, et le geste dit tout ─────────────── */
  if (action === "valider") {
    const { count: brouillons } = await supabase
      .from("collectif_notes")
      .select("id", { count: "exact", head: true })
      .eq("tour_id", courant.id)
      .is("envoyee_le", null)
      .is("retiree_le", null);
    if ((brouillons ?? 0) > 0) {
      return non(409, "brouillons", `${brouillons} note(s) pas encore envoyée(s) : les envoyer ou les retirer avant de valider.`);
    }
    const lusMags = await magazinesPourGeste(supabase, edition.id);
    if (!lusMags.ok) return non(500, "lecture_impossible");
    const prep = preparerGeste("valider_bat", {
      role: acces.role,
      etat: edition.etat,
      clotureLe: edition.cloture_le,
      archiveLe: edition.archive_le,
      maintenant,
      magazines: lusMags.valeur,
      magazineId: mag.id,
    });
    if (!prep.ok) return non(422, "refuse", prep.erreurs.map((x) => x.message).join(" "));
    const { data: ecrit, error: e } = await supabase
      .from("collectif_magazines")
      .update({ ...(prep.magazine?.patch ?? {}), bat_valide_par: edition.responsable_nom || "le responsable" })
      .eq("id", mag.id)
      .is("bat_valide_le", null)
      .select("id");
    if (e) {
      console.error("[collectif] BAT non validé", e.code, e.message);
      return non(500, "ecriture_impossible");
    }
    if (!ecrit?.length) return non(409, "deja_valide", "Ce bon à tirer vient d'être validé.");
    const { data: aligne, error: errEd } = await supabase
      .from("collectif_editions")
      .update(prep.patch)
      .eq("id", edition.id)
      .eq("etat", edition.etat)
      .select("id");
    if (errEd || !aligne?.length) console.error("[collectif] état non réaligné après validation", errEd?.code, errEd?.message);
    const journal = await journalDe("bat_valide", { tour: courant.numero });
    return NextResponse.json({ ok: true, bat_valide_le: maintenant.toISOString(), toutValide: prep.vers === "bat_valide", journal });
  }

  return non(400, "action_inconnue");
}
