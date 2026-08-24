import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { chargerListe } from "./donnees";
import Liste from "./Liste";
import "../admin.css";
import "./atelier.css";

/**
 * /admin/atelier — la table de travail.
 *
 * Composant serveur : toute la lecture se fait ici avec la service key, qui
 * n'atteint jamais le navigateur. Le composant client ne reçoit que des
 * chaînes et des nombres déjà calculés.
 *
 * `force-dynamic` : un tableau de bord d'urgences mis en cache afficherait des
 * délais faux. C'est le seul endroit du site où l'on ne veut aucun cache.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — dossiers", robots: { index: false, follow: false } };

export default async function PageAtelier() {
  const qui = await quiEstConnecte();
  /* Le middleware a déjà filtré ; ce garde-fou existe pour le cas où le
     matcher changerait sans que personne n'y pense. */
  if (!qui) redirect("/admin/login");

  const vue = await chargerListe(prenomDe(qui));
  return <Liste vue={vue} />;
}
