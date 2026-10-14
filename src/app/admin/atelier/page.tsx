import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { makeSupabase } from "@/lib/supabase";
import { compterNonLus } from "../collectif/donnees";
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

  /* L'Édition collective (13/10/2026) : son côté du commutateur n'existe que
     si l'interrupteur est ouvert. Lu ici, côté serveur : un composant client
     ne lit pas process.env. Ses non-lus partent EN MÊME TEMPS que la liste. */
  const collectif = collectifOuvert();
  const [vue, nonLus] = await Promise.all([
    chargerListe({ cle: qui, prenom: prenomDe(qui) }),
    collectif ? compterNonLus(makeSupabase()) : Promise.resolve(null),
  ]);
  return <Liste vue={vue} collectif={collectif} nonLus={nonLus} />;
}
