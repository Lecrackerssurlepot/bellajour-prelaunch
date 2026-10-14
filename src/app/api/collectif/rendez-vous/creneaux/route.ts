import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { plagesOccupees } from "@/lib/collectif/agenda";
import { estUuid } from "@/lib/collectif/cles";
import { creneauxDuJour, creneauxLibres, joursOuvres, libelleJour, lundiDeSemaine, plusJours, SEMAINES_MAX, type Plage } from "@/lib/collectif/creneaux";
import { formaterHeureParis, instantDeParis } from "@/lib/collectif/dates";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { interlocuteurPret } from "@/lib/collectif/rendezvous";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/rendez-vous/creneaux — les créneaux LIBRES d'une
 * semaine (D23, T-148). `{ token, semaine, rdvId? }` : `semaine` = 0 pour la
 * semaine en cours, 1 pour la suivante… ; `rdvId` : le rendez-vous qu'on
 * déplace (son propre créneau ne le bloque pas).
 *
 * ⚠️ Rien du contenu de l'agenda ne sort : on lit « free/busy » (des plages
 * occupées), on rend des débuts de créneau. Token dans le CORPS.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(60);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite" }, { status: 429 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "prendre_rendez_vous")) return refusDroit();
  const { edition } = acces;

  const semaine = Number.isInteger(corps.semaine) ? Math.min(Math.max(corps.semaine as number, 0), SEMAINES_MAX) : 0;
  const supabase = makeSupabase();
  const pret = await interlocuteurPret(supabase, edition);
  if (!pret.ok) return NextResponse.json({ error: pret.echec.error, message: pret.echec.message }, { status: pret.echec.statut });

  let ignorer: Plage | null = null;
  if (estUuid(corps.rdvId)) {
    const { data } = await supabase
      .from("collectif_rendez_vous")
      .select("debut, fin")
      .eq("id", corps.rdvId)
      .eq("edition_id", edition.id)
      .eq("statut", "pris")
      .maybeSingle<Plage>();
    if (data) ignorer = { debut: new Date(data.debut).toISOString(), fin: new Date(data.fin).toISOString() };
  }

  const maintenant = new Date();
  const lundi = lundiDeSemaine(maintenant, semaine);
  const debut = instantDeParis(`${lundi}T00:00`);
  const fin = instantDeParis(`${plusJours(lundi, 7)}T00:00`);
  if (!debut || !fin) return NextResponse.json({ error: "semaine_illisible" }, { status: 422 });

  const occ = await plagesOccupees(pret.inter.agenda_id as string, debut, fin);
  if (!occ.ok) {
    return NextResponse.json(
      { error: `agenda_${occ.raison}`, message: occ.message },
      { status: occ.raison === "non_configure" ? 503 : 502 }
    );
  }

  const jours = joursOuvres(lundi).map((jour) => ({
    jour,
    libelle: libelleJour(jour),
    creneaux: creneauxLibres(creneauxDuJour(jour), occ.valeur, maintenant, ignorer).map((c) => ({ debut: c.debut, heure: formaterHeureParis(c.debut) })),
  }));
  return NextResponse.json({
    semaine,
    derniere: semaine >= SEMAINES_MAX,
    libelle: `Semaine du ${libelleJour(lundi)}`,
    avec: pret.inter.prenom,
    jours,
  });
}
