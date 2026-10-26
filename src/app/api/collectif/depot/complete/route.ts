import { after, NextResponse } from "next/server";
import { supprimer } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAccesDepot } from "@/lib/collectif/acces";
import { cleMoyenne, cleVignette } from "@/lib/collectif/cles";
import { LOT_CONFIRMATION } from "@/lib/collectif/depot";
import { peut } from "@/lib/collectif/droits";
import { noterEchec } from "@/lib/collectif/echecsJournal";
import { enrichirCollectif } from "@/lib/collectif/enrichissement";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { BUDGET_RATTRAPAGE_MS, issueTete } from "@/lib/collectif/rattrapage";
import { confirmerArrivee, teteObjet } from "@/lib/collectif/rattrapageCoffre";
import { fabriquerVignettes, type PhotoSansVignette } from "@/lib/collectif/rattrapageVignettes";
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
 *
 * La confirmation elle-même est `confirmerArrivee` (rattrapageCoffre.ts) : LA
 * même que celle du rattrapage (T-194), qui retrouve les photos arrivées dont
 * le navigateur n'a jamais envoyé la confirmation (page fermée, iPhone
 * verrouillé).
 *
 * T-171 : une photo confirmée ici SANS vignette (le navigateur n'a pas su la
 * faire, ou ses quatre essais sont perdus) a sa vignette fabriquée par le
 * serveur, après la réponse et AVANT la lecture des métadonnées (l'empreinte
 * se lit sur la vignette). Bornée (`fabriquerVignettes`).
 *
 * T-160 : une lecture ratée, un coffre qui ne répond pas, une écriture
 * refusée s'écrivent AUSSI au journal de l'édition (`noterEchec`). La réponse
 * au navigateur ne change pas.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ligne = { id: string; r2_key: string; confirmee_le: string | null; mime: string | null };

/** T-171 : la vignette que le navigateur n'a pas déposée, fabriquée après la réponse, bornée. */
async function vignettesManquantes(editionId: string, photos: PhotoSansVignette[]): Promise<void> {
  const supabase = makeSupabase();
  const b = await fabriquerVignettes(supabase, editionId, photos, { jusqua: Date.now() + BUDGET_RATTRAPAGE_MS });
  if (b.faites || b.ratees || b.impossibles.length) {
    await journaliser(supabase, { editionId }, "vignettes_fabriquees", { n: b.faites, ratees: b.ratees, impossibles: b.impossibles.length, reportees: b.reportees }, null);
  }
  if (b.ratees) await noterEchec(supabase, editionId, "vignette", { n: b.ratees });
}

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
    .select("id, r2_key, confirmee_le, mime")
    .eq("edition_id", edition.id)
    .in("id", ids)
    .returns<Ligne[]>();
  if (error) {
    await noterEchec(supabase, edition.id, "confirmation", { etape: "lecture", code: error.code, n: ids.length });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }

  const confirmees: string[] = [];
  /* Les photos confirmées PAR CET APPEL : seules elles se comptent, se journalisent et
     se lisent ensuite. Un lot rejoué (réponse perdue sur un réseau mobile) rend ses
     photos déjà confirmées dans `confirmees`, sans les redater ni les réécrire. */
  const nouvelles: string[] = [];
  const rejetees: { id: string; raison: string }[] = [];
  const absentes: string[] = [];
  /* T-171 : les nouvelles dont le navigateur n'a pas déposé la vignette. */
  const sansVignette: PhotoSansVignette[] = [];
  /* T-160 : ce qui a raté côté serveur (la réponse, elle, ne change pas). */
  let pannesCoffre = 0;
  let ecrituresRatees = 0;
  const maintenant = new Date().toISOString();
  const lignes = data ?? [];
  for (const l of lignes) if (l.confirmee_le) confirmees.push(l.id);
  const aConfirmer = lignes.filter((l) => !l.confirmee_le);

  for (let i = 0; i < aConfirmer.length; i += 8) {
    await Promise.all(
      aConfirmer.slice(i, i + 8).map(async (l) => {
        const tete = await teteObjet(l.r2_key);
        const issue = issueTete(tete);
        /* Une panne du coffre se répond comme une absence (le navigateur la renverra), mais elle se compte. */
        if (tete.statut !== "presente") {
          if (issue === "panne") pannesCoffre++;
          absentes.push(l.id);
          return;
        }
        if (issue === "trop_lourde") {
          await Promise.all([supprimer(l.r2_key), supprimer(cleVignette(edition.id, l.id)), supprimer(cleMoyenne(edition.id, l.id))]);
          await supabase.from("collectif_photos").delete().eq("id", l.id);
          rejetees.push({ id: l.id, raison: "trop_volumineuse" });
          return;
        }
        /* `confirmee_le` encore vide : deux appels du même lot en même temps ne datent la
           photo qu'une fois ; celui qui arrive second la trouve confirmée et la rend sans
           la compter (`confirmerArrivee`, la même que celle du rattrapage). */
        const r = await confirmerArrivee(supabase, edition.id, l, tete.taille, maintenant);
        if (r.statut === "erreur") {
          ecrituresRatees++;
          absentes.push(l.id);
        } else {
          confirmees.push(l.id);
          if (r.statut === "nouvelle") {
            nouvelles.push(l.id);
            if (!r.vignette) sansVignette.push({ id: l.id, r2_key: l.r2_key, mime: l.mime, taille: tete.taille, metadonnees_le: null, empreinte: null });
          }
        }
      })
    );
  }
  if (pannesCoffre) await noterEchec(supabase, edition.id, "confirmation", { etape: "coffre", n: pannesCoffre });
  if (ecrituresRatees) await noterEchec(supabase, edition.id, "confirmation", { etape: "ecriture", n: ecrituresRatees });
  /* Une id inconnue de cette édition : ni confirmée, ni absente. Rendue
     comme rejetée, pour que le navigateur cesse de la renvoyer. */
  for (const id of ids) {
    if (!lignes.some((l) => l.id === id)) rejetees.push({ id, raison: "inconnue" });
  }

  if (nouvelles.length) {
    await journaliser(supabase, { editionId: edition.id }, "photos_confirmees", { n: nouvelles.length, role: acces.role }, null);
    after(async () => {
      /* Les vignettes D'ABORD : l'empreinte des métadonnées se lit sur elles. */
      if (sansVignette.length) await vignettesManquantes(edition.id, sansVignette);
      await enrichirCollectif(makeSupabase(), edition.id, nouvelles);
    });
  }
  return NextResponse.json({ confirmees, rejetees, absentes });
}
