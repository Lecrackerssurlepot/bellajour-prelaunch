/**
 * Le job du lundi : agrège les commandes en une ligne par semaine dans
 * `weekly_metrics`. IDEMPOTENT : chaque passage réécrit TOUTES les semaines
 * complètes (upsert sur `semaine`), donc le relancer dix fois ne crée rien,
 * et corriger l'origine d'un dossier sur sa fiche se répercute au passage
 * suivant. La page du cockpit ne lit que ce que ce job a écrit.
 *
 * Trois déclencheurs, une seule fonction : le cron Vercel du lundi
 * (`/api/atelier/cockpit/agreger`, secret d'en-tête), le bouton
 * « Recalculer » de l'écran (`/api/admin/cockpit/agreger`, cookie admin), et
 * un curl à la main.
 *
 * LA SOURCE est le journal `evenements`, comme les métriques : le passage à
 * `payee` écrit par le webhook Stripe fait la commande, `consentements` le
 * dépôt, le passage à `livree` la livraison. Les dossiers avancés en SQL
 * avant /admin n'ont pas de jalons et ne comptent pas — c'est déjà la règle
 * de metriques.ts, on ne l'adoucit pas ici.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TYPES_MESURE, reconstruireJalons, type EvenementMesure } from "@/lib/atelier/mesure";
import { TYPES_FONDATEUR, agregerSemaine, origineValide, type CommandeAgregat, type LivraisonAgregat } from "./agregat";
import { semainesCompletes } from "./semaine";

/* Même pagination que metriques.ts (chargerEvenements) : un `.limit()` ferait
   tomber les plus récents du calcul sans le dire. */
const PAGE = 1000;
const MAX_PAGES = 100;

async function chargerEvenements(supabase: SupabaseClient): Promise<EvenementMesure[]> {
  const tout: EvenementMesure[] = [];
  const types = [...TYPES_MESURE, ...TYPES_FONDATEUR];
  for (let page = 0; page < MAX_PAGES; page++) {
    const de = page * PAGE;
    const { data, error } = await supabase
      .from("evenements")
      .select("numero_id, type, payload, created_at")
      .in("type", types)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + PAGE - 1)
      .returns<EvenementMesure[]>();
    if (error) throw new Error(`evenements ${error.code}: ${error.message}`);
    tout.push(...(data ?? []));
    if (!data || data.length < PAGE) return tout;
  }
  console.error(`[cockpit/job] plus de ${MAX_PAGES * PAGE} événements : agrégat sur un journal tronqué`);
  return tout;
}

type NumeroLeger = { id: string; nb_pages: number | null; origine?: string | null };

/* `origine` (20260917) peut manquer : repli 42703 sans elle, et toutes les
   commandes non fondatrices sortent « sans origine », ce qui est la vérité. */
async function chargerNumeros(supabase: SupabaseClient): Promise<NumeroLeger[]> {
  const lire = (champs: string) => supabase.from("numeros").select(champs).returns<NumeroLeger[]>();
  const avec = await lire("id, nb_pages, origine");
  if (!avec.error) return avec.data ?? [];
  if (avec.error.code !== "42703") throw new Error(`numeros ${avec.error.code}: ${avec.error.message}`);
  const sans = await lire("id, nb_pages");
  if (sans.error) throw new Error(`numeros ${sans.error.code}: ${sans.error.message}`);
  return sans.data ?? [];
}

export type ResultatAgregation =
  | { ok: true; semaines: number; premiere: number | null; derniere: number | null; commandes: number }
  | { ok: false; erreur: "table_absente" | "lecture" | "ecriture"; detail: string };

/** PGRST205 = table inconnue du cache PostgREST ; 42P01 = relation inexistante. */
export function tableAbsente(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}

export async function agregerSemaines(supabase: SupabaseClient, maintenant = new Date()): Promise<ResultatAgregation> {
  let evts: EvenementMesure[];
  let numeros: NumeroLeger[];
  try {
    [evts, numeros] = await Promise.all([chargerEvenements(supabase), chargerNumeros(supabase)]);
  } catch (e) {
    return { ok: false, erreur: "lecture", detail: (e as Error).message };
  }

  const jalons = reconstruireJalons(evts);
  const fondateurs = new Set<string>();
  for (const e of evts) {
    if ((TYPES_FONDATEUR as readonly string[]).includes(e.type)) fondateurs.add(e.numero_id);
  }
  const parId = new Map(numeros.map((n) => [n.id, n]));

  const commandes: CommandeAgregat[] = [];
  const livraisons: LivraisonAgregat[] = [];
  for (const [id, j] of jalons) {
    const n = parId.get(id);
    if (j.paye !== undefined) {
      commandes.push({
        id,
        payeA: j.paye,
        origine: origineValide(n?.origine) ? n.origine : null,
        fondateur: fondateurs.has(id),
        nbPages: typeof n?.nb_pages === "number" ? n.nb_pages : null,
      });
    }
    if (j.livree !== undefined) livraisons.push({ id, livreeA: j.livree, depotA: j.depot ?? null });
  }

  /* De la première commande (ou livraison) à la dernière semaine complète. */
  const instants = [...commandes.map((c) => c.payeA), ...livraisons.map((l) => l.livreeA)];
  if (!instants.length) return { ok: true, semaines: 0, premiere: null, derniere: null, commandes: 0 };
  const semaines = semainesCompletes(new Date(Math.min(...instants)), maintenant);
  if (!semaines.length) return { ok: true, semaines: 0, premiere: null, derniere: null, commandes: commandes.length };

  const lignes = semaines.map((s) => ({
    semaine: s.cle,
    date_debut: s.dateDebut,
    ...agregerSemaine(commandes, livraisons, s.debut.getTime(), s.fin.getTime()),
    calcule_le: maintenant.toISOString(),
  }));

  const { error } = await supabase.from("weekly_metrics").upsert(lignes, { onConflict: "semaine" });
  if (error) {
    if (tableAbsente(error.code)) return { ok: false, erreur: "table_absente", detail: "migration 20260917_cockpit non appliquée" };
    return { ok: false, erreur: "ecriture", detail: `${error.code}: ${error.message}` };
  }
  return {
    ok: true,
    semaines: lignes.length,
    premiere: lignes[0].semaine,
    derniere: lignes[lignes.length - 1].semaine,
    commandes: commandes.length,
  };
}
