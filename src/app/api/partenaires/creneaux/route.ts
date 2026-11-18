import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { creneauxDuJour, creneauxLibres, joursOuvres, libelleJour, lundiDeSemaine, plusJours, SEMAINES_MAX } from "@/lib/collectif/creneaux";
import { formaterHeureParis, instantDeParis } from "@/lib/collectif/dates";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { equipeDeLAppel, occupesDeLEquipe } from "@/lib/collectif/prospects";

/**
 * POST /api/partenaires/creneaux — les créneaux libres d'une semaine, pour la
 * page /partenaires. `{ semaine }` : 0 = la semaine en cours.
 *
 * Route PUBLIQUE, sans token : elle ne rend que des débuts de créneau où
 * toute l'équipe de l'appel est libre. ⚠️ Rien du contenu des agendas ne
 * sort (« free/busy » : des plages occupées, fusionnées, jamais à qui).
 * 503 `agenda_non_relie` tant que tout n'est pas branché : la page montre
 * alors l'adresse de contact.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(40);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite" }, { status: 429 });
  let corps: Record<string, unknown> = {};
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    /* corps vide : la semaine en cours */
  }
  const semaine = Number.isInteger(corps.semaine) ? Math.min(Math.max(corps.semaine as number, 0), SEMAINES_MAX) : 0;

  const pret = await equipeDeLAppel(makeSupabase());
  if (!pret.ok) return NextResponse.json({ error: pret.echec.error, message: pret.echec.message }, { status: pret.echec.statut });

  const maintenant = new Date();
  const lundi = lundiDeSemaine(maintenant, semaine);
  const debut = instantDeParis(`${lundi}T00:00`);
  const fin = instantDeParis(`${plusJours(lundi, 7)}T00:00`);
  if (!debut || !fin) return NextResponse.json({ error: "semaine_illisible" }, { status: 422 });

  const occ = await occupesDeLEquipe(pret.equipe, debut, fin);
  if (!occ.ok) return NextResponse.json({ error: occ.echec.error, message: occ.echec.message }, { status: occ.echec.statut });

  const jours = joursOuvres(lundi).map((jour) => ({
    jour,
    libelle: libelleJour(jour),
    creneaux: creneauxLibres(creneauxDuJour(jour), occ.occupes, maintenant).map((c) => ({ debut: c.debut, heure: formaterHeureParis(c.debut) })),
  }));
  return NextResponse.json({
    semaine,
    derniere: semaine >= SEMAINES_MAX,
    libelle: `Semaine du ${libelleJour(lundi)}`,
    avec: pret.equipe.map((p) => p.inter.prenom),
    jours,
  });
}
