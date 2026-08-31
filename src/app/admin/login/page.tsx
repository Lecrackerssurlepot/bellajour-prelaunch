import { comptesAdmin, prenomDe } from "@/lib/admin-auth";
import Formulaire from "./Formulaire";
import "../admin.css";

/**
 * L'écran d'entrée du back-office.
 *
 * Composant serveur pour UNE raison : les comptes proposés doivent être ceux
 * qui existent RÉELLEMENT dans l'environnement. Une liste écrite en dur dans
 * le composant client afficherait « Mathias » et « Louis » sur un déploiement
 * où une des variables manque — et cette personne croirait à un mauvais mot
 * de passe alors que son compte n'existe pas. (L'ancien ADMIN_PASSWORD
 * partagé n'est plus lu du tout depuis le 31/08/2026, T-005.)
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
