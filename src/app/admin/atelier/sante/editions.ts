/**
 * Le bloc « Éditions » de la page Santé (T-160) : ce qui a échoué sans bruit
 * dans l'Édition collective. Lecture seule (service key), serveur uniquement.
 *
 * Par édition non archivée : les échecs des sept derniers jours (lignes
 * `echec` du journal, `noterEchec`), les photos déclarées sans confirmation
 * depuis plus d'une heure, les photos confirmées sans vignette, et le dernier
 * passage du rattrapage (T-194). La phrase se décide dans `constatEdition`
 * (echecs.ts, pur, au harnais) ; ici, les lectures, toutes en même temps.
 *
 * Fermé (`COLLECTIF_OUVERT`), le bloc n'existe pas : la santé des
 * particuliers ne parle jamais des éditions.
 */

import { makeSupabase } from "@/lib/supabase";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { ATTENTE_SIGNALEE_MS, constatEdition, EVT_ECHEC, FENETRE_ECHECS_MS, type ConstatEdition } from "@/lib/collectif/echecs";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { MIGRATION_COLLECTIF, tableAbsente } from "@/lib/collectif/migration";
import { EVT_PHOTOS_RATTRAPEES, EVT_RATTRAPAGE_FINI } from "@/lib/collectif/rattrapage";

export type SanteEditions =
  | { ouvert: false }
  | { ouvert: true; erreur: string | null; nbEditions: number; constats: (ConstatEdition & { id: string })[] };

/** Les échecs lus d'un coup pour toutes les éditions (les plus récents) : bien au-delà de ce qu'on montre. */
const ECHECS_LUS = 500;

export async function chargerSanteEditions(): Promise<SanteEditions> {
  if (!collectifOuvert()) return { ouvert: false };
  const supabase = makeSupabase();
  const maintenant = Date.now();
  const depuis = new Date(maintenant - FENETRE_ECHECS_MS).toISOString();
  const avant = new Date(maintenant - ATTENTE_SIGNALEE_MS).toISOString();

  type E = { id: string; organisation: string; evenement: string };
  type Ev = { edition_id: string | null; payload: Record<string, unknown> | null; created_at: string };
  const [eds, evs] = await Promise.all([
    supabase.from("collectif_editions").select("id, organisation, evenement").is("archive_le", null).order("created_at", { ascending: false }).returns<E[]>(),
    supabase
      .from("collectif_evenements")
      .select("edition_id, payload, created_at")
      .eq("type", EVT_ECHEC)
      .gte("created_at", depuis)
      .order("created_at", { ascending: false })
      .limit(ECHECS_LUS)
      .returns<Ev[]>(),
  ]);
  if (eds.error) {
    const erreur = tableAbsente(eds.error.code) ? `Migration collectif absente (${MIGRATION_COLLECTIF}).` : `Les éditions n'ont pas pu se lire (code ${eds.error.code ?? "?"}).`;
    return { ouvert: true, erreur, nbEditions: 0, constats: [] };
  }
  const editions = eds.data ?? [];
  const echecsLus = !evs.error;

  const constats = await Promise.all(
    editions.map(async (e) => {
      const [attente, sansVignette, dernier] = await Promise.all([
        supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", e.id).is("confirmee_le", null).lt("created_at", avant),
        supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", e.id).not("confirmee_le", "is", null).is("vignette_key", null),
        supabase
          .from("collectif_evenements")
          .select("payload, created_at")
          .eq("edition_id", e.id)
          .in("type", [EVT_PHOTOS_RATTRAPEES, EVT_RATTRAPAGE_FINI])
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<{ payload: Record<string, unknown> | null; created_at: string }[]>(),
      ]);
      /* Une cession n'est pas un passage : on montre le dernier passage qui a VRAIMENT regardé. */
      const vrai = (dernier.data ?? []).find((d) => d.payload?.cede !== true) ?? null;
      const c = constatEdition(
        {
          id: e.id,
          organisation: e.organisation,
          evenement: e.evenement,
          echecs: (evs.data ?? []).filter((x) => x.edition_id === e.id).map((x) => ({ payload: x.payload ?? {}, created_at: x.created_at })),
          enAttente: attente.error ? null : (attente.count ?? null),
          sansVignette: sansVignette.error ? null : (sansVignette.count ?? null),
          dernierRattrapage: vrai ? { payload: vrai.payload ?? {}, created_at: vrai.created_at } : null,
        },
        formaterInstantParis
      );
      return c ? { ...c, id: e.id } : null;
    })
  );

  return {
    ouvert: true,
    erreur: echecsLus ? null : `Le journal des échecs n'a pas pu se lire (code ${evs.error?.code ?? "?"}) : seuls les comptes de photos sont montrés.`,
    nbEditions: editions.length,
    constats: constats.filter((c): c is ConstatEdition & { id: string } => c !== null),
  };
}
