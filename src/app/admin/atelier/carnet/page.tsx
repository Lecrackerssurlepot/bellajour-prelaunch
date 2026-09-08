import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { chargerCarnet } from "../carnet";
import VueCarnetEcran from "./Vue";

/**
 * /admin/atelier/carnet — tout le carnet, d'un seul tenant.
 *
 * Cette page ne fait que TROIS choses : vérifier la session, lire les notes,
 * passer le tout au rendu. Même patron que `metriques/page.tsx` — la garde et
 * la lecture ici, le dessin dans `Vue.tsx`.
 *
 * LECTURE SEULE, sans exception : aucun bouton de cet écran n'écrit, ne
 * supprime ni n'envoie quoi que ce soit. Pour effacer une note, il faut
 * ouvrir la fiche de son dossier — c'est voulu : on ne supprime pas la
 * mémoire de l'atelier depuis un écran qui sert à la parcourir.
 *
 * `force-dynamic` : une note écrite il y a trente secondes doit être là.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier · carnet", robots: { index: false, follow: false } };

export default async function PageCarnet() {
  const qui = await quiEstConnecte();
  /* Le middleware a déjà filtré ; ce garde-fou existe pour le cas où le
     matcher changerait sans que personne n'y pense. */
  if (!qui) redirect("/admin/login");

  const vue = await chargerCarnet();
  return <VueCarnetEcran vue={vue} />;
}
