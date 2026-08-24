import { comptesAdmin, prenomDe } from "@/lib/admin-auth";
import Formulaire from "./Formulaire";
import "../admin.css";

/**
 * L'écran d'entrée du back-office.
 *
 * Composant serveur pour UNE raison : les comptes proposés doivent être ceux
 * qui existent RÉELLEMENT dans l'environnement. Une liste écrite en dur dans
 * le composant client afficherait « Mathias » et « Louis » sur un déploiement
 * où seul l'ancien ADMIN_PASSWORD est posé — et personne ne pourrait entrer.
 *
 * Aucun mot de passe ne traverse : seuls les identifiants et les prénoms.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Bellajour — accès", robots: { index: false, follow: false } };

export default async function PageLogin() {
  const comptes = Object.keys(comptesAdmin()).map((cle) => ({ cle, prenom: prenomDe(cle) }));
  return <Formulaire comptes={comptes} />;
}
