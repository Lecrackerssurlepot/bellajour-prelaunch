import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { ARRIVEES_LUES_MAX, nouvellesDepuis } from "@/lib/collectif/arrivees";
import { peut } from "@/lib/collectif/droits";
import { lireInstant } from "@/lib/collectif/etats";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/photos/etat — les photos arrivent-elles ? (T-181)
 * `{ token, depuis? }` (lien responsable ou équipe ; ne lit qu'un compte et
 * quelques colonnes, n'écrit rien).
 *
 * La lecture LÉGÈRE que la page Photos (30 s) et le tableau de bord (une
 * minute) interrogent tant que l'onglet est visible : le nombre de photos
 * arrivées (`head`, aucune ligne), la dernière arrivée, et, si `depuis` est
 * donné, qui a envoyé quoi depuis (`ARRIVEES_LUES_MAX` lignes au plus, trois
 * colonnes). Jamais la grande lecture de `/api/collectif/photos` (toutes les
 * photos, les doublons, les vignettes signées) : elle se relit seulement quand
 * le nombre a changé et que le client le demande.
 *
 * `depuis` est passé TEL QUE la base l'a rendu (microsecondes comprises) :
 * relu par `Date`, il perdrait les microsecondes et la dernière photo vue se
 * compterait de nouveau.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_espace")) return refusDroit();
  const { edition } = acces;

  const depuis = lireInstant(corps.depuis) === null ? null : String(corps.depuis).trim();
  const supabase = makeSupabase();
  /* Hors corbeille (migration 20261023) : une photo supprimée ne s'annonce pas et ne se compte
     plus ; sans la colonne, les mêmes lectures sans le filtre (`lireHorsCorbeille`). */
  const lus = await lireHorsCorbeille(async (avec) => {
    const arrivees = () => {
      const q = supabase.from("collectif_photos").select("deposant, role_deposant, provenance_id, appareil_id, confirmee_le").eq("edition_id", edition.id).not("confirmee_le", "is", null);
      return avec ? q.is("supprimee_le", null) : q;
    };
    /* Le compte en GET `limit(0)` (aucune ligne), jamais `head` : un HEAD filtré sur la corbeille rend,
       sans la migration, une erreur sans code que le repli ne reconnaîtrait pas (horsCorbeille.ts). */
    const tete = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", edition.id).not("confirmee_le", "is", null);
    const [compte, recentes] = await Promise.all([
      (avec ? tete.is("supprimee_le", null) : tete).limit(0),
      (depuis ? arrivees().gt("confirmee_le", depuis) : arrivees()).order("confirmee_le", { ascending: false }).limit(depuis ? ARRIVEES_LUES_MAX : 1),
    ]);
    return { compte, recentes, error: compte.error ?? recentes.error ?? null };
  });
  const { compte, recentes } = lus;
  if (lus.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });

  const lignes = (recentes.data ?? []) as { deposant: string | null; role_deposant: string; provenance_id: string | null; appareil_id: string | null; confirmee_le: string }[];
  return NextResponse.json(
    {
      photos: compte.count ?? 0,
      derniere: lignes[0]?.confirmee_le ?? (depuis || null),
      nouvelles: depuis ? nouvellesDepuis(lignes) : null,
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
