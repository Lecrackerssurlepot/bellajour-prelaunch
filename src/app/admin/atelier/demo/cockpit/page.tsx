import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import type { DonneesCockpit } from "@/lib/cockpit/donnees";
import type { LigneSemaine } from "@/lib/cockpit/modele";
import VueCockpit from "../../cockpit/Vue";

/**
 * /admin/atelier/demo/cockpit — le cockpit avec des semaines FABRIQUÉES.
 *
 * Même écran, même modèle (`calculerCockpit`), mêmes curseurs ; seules les
 * lignes changent, et rien n'est écrit. Sert à regarder l'écran sans base
 * agrégée, et à montrer ce qu'il dira le jour où le froid montera.
 * Les chiffres ci-dessous sont une SÉRIE INVENTÉE pour la démonstration,
 * jamais une mesure : un froid qui double toutes les trois semaines.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — cockpit (démo)", robots: { index: false, follow: false } };

const FROIDES = [1, 2, 2, 3, 4, 5, 6, 8, 10, 13];

function serie(): LigneSemaine[] {
  const lundis = ["2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"];
  return lundis.map((date_debut, i) => {
    const froides = FROIDES[i];
    const chaudes = i < 4 ? 3 : 2;
    const sans = i === 9 ? 0 : i % 4 === 2 ? 1 : 0;
    return {
      semaine: 202629 + i,
      date_debut,
      commandes_totales: froides + chaudes + sans,
      commandes_froides: froides,
      commandes_chaudes: chaudes,
      commandes_sans_origine: sans,
      pages_moy: Math.round((40 - i * 0.8) * 10) / 10,
      marge_moy: null,
      delai_moy_jours: i % 3 === 0 ? null : Math.round((6 + (i % 3)) * 10) / 10,
    };
  });
}

export default async function PageDemoCockpit() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const donnees: DonneesCockpit = {
    absent: false,
    reglages: {
      capacite: 30,
      t_dev: 8,
      buffer: 2,
      cout_dev: 12000,
      reinvesti_pct: 50,
      marge_defaut: 20,
      volume_mensuel: 40,
      regle_le: "2026-09-17T08:00:00Z",
      regle_par: "demo",
    },
    lignes: serie(),
    calculeLe: "2026-09-21T06:05:00Z",
  };
  return <VueCockpit donnees={donnees} demo />;
}
