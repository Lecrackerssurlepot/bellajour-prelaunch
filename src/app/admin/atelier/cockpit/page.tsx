import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { chargerCockpit } from "@/lib/cockpit/donnees";
import VueCockpit from "./Vue";

/**
 * /admin/atelier/cockpit — quand faut-il avoir lancé le développement ?
 *
 * Même patron que /metriques : la page vérifie la session et charge, `Vue.tsx`
 * montre. Elle ne lit que l'AGRÉGAT (`weekly_metrics`) et les réglages
 * (`cockpit_settings`) : aucune commande brute n'est recalculée ici, c'est le
 * job du lundi qui écrit (src/lib/cockpit/job.ts).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — cockpit", robots: { index: false, follow: false } };

export default async function PageCockpit() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const donnees = await chargerCockpit();
  return <VueCockpit donnees={donnees} />;
}
