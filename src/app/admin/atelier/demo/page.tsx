import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { listeDemo } from "./fixtures";
import Liste from "../Liste";
import "../../admin.css";
import "../atelier.css";

/**
 * /admin/atelier/demo — l'outil, avec des dossiers fabriqués.
 *
 * Mêmes composants, même calcul d'urgence, même tri. Seules les données
 * changent. Protégé comme le reste (le matcher couvre /admin/*) : ces
 * dossiers sont fictifs, mais l'écran montre exactement comment on travaille.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — démonstration", robots: { index: false, follow: false } };

export default async function PageDemo() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  return <Liste vue={listeDemo(prenomDe(qui))} />;
}
