import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { PERIODES, chargerMetriques, type Periode } from "../metriques";
import VueMetriques from "./Vue";

/**
 * /admin/atelier/metriques — la lecture du vendredi soir.
 *
 * Cette page ne fait plus que TROIS choses : vérifier la session, lire la
 * période dans l'URL, charger les chiffres. Le rendu vit dans `Vue.tsx`
 * (07/09/2026) — séparation volontaire, même patron que `compte/Espace.tsx` :
 * un écran qu'on ne peut pas ouvrir sans mot de passe ni base est un écran
 * qu'on ne peut pas regarder, donc pas dessiner.
 *
 * La période passe par l'URL (`?p=30`), pas par un état React : un lien se
 * partage, le retour arrière fonctionne, et aucun calcul ne descend dans le
 * navigateur.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — métriques", robots: { index: false, follow: false } };

export default async function PageMetriques({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { p } = await searchParams;
  const periode = (PERIODES.find((x) => x.cle === p)?.cle ?? "30") as Periode;
  const m = await chargerMetriques(periode);

  return <VueMetriques m={m} periode={periode} />;
}
