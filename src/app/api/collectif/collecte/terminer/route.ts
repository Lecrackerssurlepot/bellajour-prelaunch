import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { messageFinCollecte } from "@/lib/collectif/espace";
import { etatEffectif } from "@/lib/collectif/etats";
import { preparerGeste } from "@/lib/collectif/gestes";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { journaliser } from "@/lib/collectif/journal";
import { ecrireMessage } from "@/lib/collectif/messagerie";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/collecte/terminer — « Toutes les photos sont là » (D25, T-182).
 * `{ token, verifier? }` : le lien du RESPONSABLE seulement (403 pour l'équipe).
 *
 * Même effet que « Clore maintenant » de l'atelier (la règle vit dans
 * `gestes.ts`, `terminer_collecte`) : la date de clôture devient maintenant,
 * les liens des participants se ferment, l'édition passe en composition.
 * `verifier: true` ne fait que compter (la fenêtre de confirmation le dit) ;
 * le second appel écrit. L'écriture est conditionnée à l'état lu : si
 * l'atelier a déjà clos entre-temps, 409 au lieu d'écraser.
 *
 * L'atelier l'apprend par sa boîte de réception (un message du client, comme
 * une demande de modification) et par le journal. Aucun mail.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(10);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite" }, { status: 429 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "terminer_collecte")) return refusDroit();
  const { edition } = acces;

  const maintenant = new Date();
  const prep = preparerGeste("terminer_collecte", {
    role: acces.role,
    etat: edition.etat,
    clotureLe: edition.cloture_le,
    archiveLe: edition.archive_le,
    maintenant,
    magazines: [],
  });
  if (!prep.ok) return NextResponse.json({ error: "refuse", message: "La collecte est déjà close." }, { status: 409 });

  const supabase = makeSupabase();
  /* Hors corbeille (migration 20261023) ; sans la colonne, les mêmes comptes sans le filtre. */
  const lus = await lireHorsCorbeille(async (avec) => {
    const compter = (selection: boolean) => {
      /* GET `limit(0)`, jamais `head` : un HEAD filtré rend une erreur sans code (horsCorbeille.ts). */
      const debut = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", edition.id).not("confirmee_le", "is", null);
      const q = avec ? debut.is("supprimee_le", null) : debut;
      return (selection ? q.eq("preselection", true) : q).limit(0);
    };
    const [photos, selection] = await Promise.all([compter(false), compter(true)]);
    return { photos, selection, error: photos.error ?? selection.error ?? null };
  });
  const { photos, selection } = lus;
  if (lus.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const n = { photos: photos.count ?? 0, selection: selection.count ?? 0 };
  if (corps.verifier === true) return NextResponse.json({ ok: true, verifier: true, ...n });

  const { data: ecrit, error } = await supabase.from("collectif_editions").update(prep.patch).eq("id", edition.id).eq("etat", edition.etat).select("id");
  if (error) {
    console.error("[collectif] fin de collecte non écrite", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  if (!ecrit?.length) return NextResponse.json({ error: "etat_change", message: "La collecte est déjà terminée." }, { status: 409 });

  const qui = edition.responsable_nom ?? "Le responsable";
  const de = etatEffectif(edition.etat, edition.cloture_le, maintenant);
  const journal = await journaliser(supabase, { editionId: edition.id }, "geste", { cle: "terminer_collecte", de, vers: prep.vers, par: qui }, null);
  /* Le message porte la nouvelle jusque dans la boîte de l'atelier. S'il échoue, le geste
     reste fait (le journal le dit) : on ne défait pas une clôture pour un message. */
  const message = await ecrireMessage(supabase, edition.id, "client", qui, messageFinCollecte(n.photos, n.selection));
  if (!message.ok) console.error("[collectif] fin de collecte : message non écrit", message.code);
  /* `termineLe` : l'instant écrit comme clôture (celui du geste), pour que l'écran dise « Collecte
     terminée le … à … » sans attendre la relecture de la page (21/10). */
  return NextResponse.json({ ok: true, ...n, journal, message: message.ok, termineLe: String(prep.patch.cloture_le ?? maintenant.toISOString()) });
}
