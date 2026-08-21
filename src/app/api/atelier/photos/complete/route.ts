/**
 * POST /api/atelier/photos/complete — confirmation groupée d'un lot envoyé.
 *
 * Étape finale : le navigateur a poussé ses objets, le serveur VÉRIFIE.
 * Piège nº7 : R2 n'impose pas la taille annoncée dans la signature — on peut
 * pousser 40 Mo pour 1 Mo déclaré. Sans ce HEAD, le plafond de 50 Mo est
 * décoratif. Hors tolérance → l'objet est supprimé et la ligne retirée.
 *
 * Piège nº18, côté client : ne libérer la mémoire du fichier qu'APRÈS la
 * réponse de cette route, jamais au succès du PUT — sinon un réessai n'a plus
 * rien à renvoyer.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { TAILLE_TOLERANCE, supprimer, tailleReelle } from "@/lib/atelier/r2";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

/* Piège nº20 : plafond de confirmation distinct de celui de déclaration.
   Piège nº12 : un refus de trop-plein sur la confirmation perd les photos au
   dernier centimètre — 50 perdues le 30/07. Le lot reste donc petit et le
   client réessaie avec backoff plutôt que d'envoyer un lot géant. */
const MAX_PAR_LOT = 50;
/* Piège nº10 : par tranches, pour ne pas saturer R2 de HEAD simultanés. */
const TRANCHE_HEAD = 8;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; photoIds?: string[] };
    const token = (body.token ?? "").trim();

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    const ids = Array.isArray(body.photoIds) ? body.photoIds.slice(0, MAX_PAR_LOT) : [];
    if (!ids.length) return NextResponse.json({ error: "lot_vide" }, { status: 400 });

    const supabase = makeSupabase();

    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle();
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const { data: lignes, error: errSel } = await supabase
      .from("photos")
      .select("id, r2_key, taille")
      .eq("numero_id", numero.id)
      .in("id", ids);

    if (errSel) {
      console.error("[complete] select photos échoué", errSel.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const confirmees: string[] = [];
    const rejetees: Array<{ id: string; raison: string }> = [];
    const absentes: string[] = [];

    for (let i = 0; i < (lignes?.length ?? 0); i += TRANCHE_HEAD) {
      const tranche = (lignes ?? []).slice(i, i + TRANCHE_HEAD);
      await Promise.all(
        tranche.map(async (l) => {
          const reelle = await tailleReelle(l.r2_key);

          /* Objet pas encore là : ce n'est PAS une erreur. Le client réessaiera
             — une photo en échec est rouverte, jamais rejetée (piège nº9). */
          if (reelle === null) { absentes.push(l.id); return; }

          const declaree = Number(l.taille) || 0;
          if (declaree > 0 && reelle > declaree * TAILLE_TOLERANCE) {
            await supprimer(l.r2_key);
            await supabase.from("photos").delete().eq("id", l.id);
            rejetees.push({ id: l.id, raison: "taille_hors_tolerance" });
            return;
          }

          /* La taille déclarée cède la place à la taille MESURÉE. */
          await supabase.from("photos").update({ taille: reelle }).eq("id", l.id);
          confirmees.push(l.id);
        })
      );
    }

    /* nb_photos est recalculé depuis la base, jamais envoyé par le navigateur
       (même logique que l'invariant nº2 sur le prix). */
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("numero_id", numero.id);

    const nbPhotos = count ?? 0;
    await supabase.from("numeros").update({ nb_photos: nbPhotos }).eq("id", numero.id);

    if (confirmees.length) {
      await logEvenement(supabase, numero.id, "photos_confirmees", {
        confirmees: confirmees.length,
        rejetees: rejetees.length,
        nb_photos: nbPhotos,
      });
    }

    return NextResponse.json(
      { confirmees, rejetees, absentes, nbPhotos },
      { status: 200 }
    );
  } catch (err) {
    console.error("[complete] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
