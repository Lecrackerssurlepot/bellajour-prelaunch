import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { generateNumeroToken } from "@/lib/atelier/token";
import { makeSupabase } from "@/lib/supabase";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE, personnesAbsentes, tableAbsente } from "@/lib/collectif/migration";
import { lireSaisieEdition, planMagazines } from "@/lib/collectif/saisie";

/**
 * POST /api/admin/collectif/editions — ouvrir une édition (PRD §3, étape 2).
 *
 * Crée la ligne, ses trois tokens et ses magazines. AUCUN MAIL ne part : l'écran
 * suivant (« L'édition est créée », `/admin/collectif/creee/[id]`, T-187) PROPOSE
 * d'envoyer les liens, en deux temps, par la route `mail-espace`.
 *
 * Il n'y a pas de transaction entre deux appels PostgREST : si les magazines
 * ne s'écrivent pas, l'édition tout juste créée est retirée aussitôt (rien
 * n'y est encore attaché) et la route répond 500. Une édition sans magazine
 * serait une page qui ment.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function troisTokens(): [string, string, string] {
  const t = new Set<string>();
  while (t.size < 3) t.add(generateNumeroToken());
  return [...t] as [string, string, string];
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  /* `new Date()` : une clôture déjà passée est refusée (T-186). La livraison
     souhaitée, si elle est donnée, entre dans `livraison` (insertion : rien à
     écraser). */
  const saisie = lireSaisieEdition(corps, "creation", undefined, new Date());
  if (!saisie.ok) return NextResponse.json({ error: "saisie", erreurs: saisie.erreurs }, { status: 422 });
  const plan = planMagazines([], saisie.magazines ?? []);
  if (!plan.ok) return NextResponse.json({ error: "saisie", erreurs: [{ champ: "magazines", message: plan.message }] }, { status: 422 });

  const supabase = makeSupabase();
  const par = prenomDe(qui);

  /* Deux essais : une collision de tokens (192 bits) n'arrivera pas, mais
     l'unicité de la base est la vraie garantie, et elle mérite une réponse. */
  let id: string | null = null;
  for (let essai = 0; essai < 2 && !id; essai++) {
    const [token_responsable, token_equipe, token_depot] = troisTokens();
    const { data, error } = await supabase
      .from("collectif_editions")
      .insert({ ...saisie.edition, token_responsable, token_equipe, token_depot, cree_par: par })
      .select("id")
      .single<{ id: string }>();
    if (error) {
      if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
      /* L'ouverture du dépôt a besoin de la migration 20261023 : sans elle, rien n'est créé, et on le dit
         (jamais une édition créée sans l'ouverture demandée, qui recevrait des photos trop tôt). */
      if (personnesAbsentes(error)) return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
      if (error.code === "23505") continue;
      console.error("[collectif] création d'édition échouée", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    id = data.id;
  }
  if (!id) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });

  const { error: errMag } = await supabase
    .from("collectif_magazines")
    .insert(plan.ajouter.map((m) => ({ edition_id: id, rang: m.rang, nom: m.nom })));
  if (errMag) {
    console.error("[collectif] magazines non écrits, édition retirée", errMag.code, errMag.message);
    await supabase.from("collectif_editions").delete().eq("id", id);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }

  const journal = await journaliser(
    supabase,
    { editionId: id },
    "edition_creee",
    { par, magazines: plan.ajouter.length },
    qui
  );
  return NextResponse.json({ ok: true, id, suggestion: saisie.suggestion, journal }, { status: 201 });
}
