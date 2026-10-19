import { after, NextResponse } from "next/server";
import { MAX_FILE_BYTES } from "@/lib/atelier/formats";
import { MAX_VIGNETTE_BYTES, supprimer, tailleReelle } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAccesDepot } from "@/lib/collectif/acces";
import { cleVignette } from "@/lib/collectif/cles";
import { LOT_CONFIRMATION } from "@/lib/collectif/depot";
import { peut } from "@/lib/collectif/droits";
import { enrichirCollectif } from "@/lib/collectif/enrichissement";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/depot/complete — confirmer qu'un lot est ARRIVÉ.
 * `{ token, photoIds }` (25 au plus).
 *
 * Le navigateur dit « envoyé » ; seul le coffre dit « arrivé ». Chaque photo
 * est vérifiée par un HEAD R2 : absente (le navigateur la renverra), trop
 * lourde (retirée du coffre ET de la base, la règle des 50 Mo), ou arrivée
 * (taille et vignette posées, `confirmee_le` daté). Les métadonnées se lisent
 * ensuite en tâche de fond (`after`), sans retenir la réponse.
 *
 * IDEMPOTENTE (T-167) : une photo déjà confirmée est rendue confirmée telle
 * quelle, ni redatée, ni rejournalisée, ni relue. Sans cela, un lot rejoué
 * redatait ses photos (elles remontaient en tête des arrivées) et doublait la
 * ligne `photos_confirmees` du journal.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ligne = { id: string; r2_key: string; confirmee_le: string | null };

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAccesDepot(String(corps.token ?? ""));
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "deposer_photos")) return refusDroit();
  const { edition } = acces;

  const ids = Array.isArray(corps.photoIds)
    ? corps.photoIds.filter((x): x is string => typeof x === "string").slice(0, LOT_CONFIRMATION)
    : [];
  if (!ids.length) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });

  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("collectif_photos")
    .select("id, r2_key, confirmee_le")
    .eq("edition_id", edition.id)
    .in("id", ids)
    .returns<Ligne[]>();
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });

  const confirmees: string[] = [];
  /* Les photos confirmées PAR CET APPEL : seules elles se comptent, se journalisent et
     se lisent ensuite. Un lot rejoué (réponse perdue sur un réseau mobile) rend ses
     photos déjà confirmées dans `confirmees`, sans les redater ni les réécrire. */
  const nouvelles: string[] = [];
  const rejetees: { id: string; raison: string }[] = [];
  const absentes: string[] = [];
  const maintenant = new Date().toISOString();
  const lignes = data ?? [];
  for (const l of lignes) if (l.confirmee_le) confirmees.push(l.id);
  const aConfirmer = lignes.filter((l) => !l.confirmee_le);

  for (let i = 0; i < aConfirmer.length; i += 8) {
    await Promise.all(
      aConfirmer.slice(i, i + 8).map(async (l) => {
        const taille = await tailleReelle(l.r2_key);
        if (taille === null) {
          absentes.push(l.id);
          return;
        }
        const vKey = cleVignette(edition.id, l.id);
        if (taille > MAX_FILE_BYTES) {
          await Promise.all([supprimer(l.r2_key), supprimer(vKey)]);
          await supabase.from("collectif_photos").delete().eq("id", l.id);
          rejetees.push({ id: l.id, raison: "trop_volumineuse" });
          return;
        }
        const tv = await tailleReelle(vKey);
        /* `confirmee_le` encore vide : deux appels du même lot en même temps ne datent la
           photo qu'une fois ; celui qui arrive second la trouve confirmée (aucune ligne
           rendue) et la rend sans la compter. */
        const { data: ecrites, error: e } = await supabase
          .from("collectif_photos")
          .update({ taille, confirmee_le: maintenant, vignette_key: tv !== null && tv <= MAX_VIGNETTE_BYTES ? vKey : null })
          .eq("id", l.id)
          .is("confirmee_le", null)
          .select("id");
        if (e) absentes.push(l.id);
        else {
          confirmees.push(l.id);
          if (ecrites?.length) nouvelles.push(l.id);
        }
      })
    );
  }
  /* Une id inconnue de cette édition : ni confirmée, ni absente. Rendue
     comme rejetée, pour que le navigateur cesse de la renvoyer. */
  for (const id of ids) {
    if (!lignes.some((l) => l.id === id)) rejetees.push({ id, raison: "inconnue" });
  }

  if (nouvelles.length) {
    await journaliser(supabase, { editionId: edition.id }, "photos_confirmees", { n: nouvelles.length, role: acces.role }, null);
    after(() => enrichirCollectif(makeSupabase(), edition.id, nouvelles));
  }
  return NextResponse.json({ confirmees, rejetees, absentes });
}
