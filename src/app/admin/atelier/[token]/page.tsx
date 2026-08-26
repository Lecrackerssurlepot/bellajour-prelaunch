import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { chargerFiche, marquerVu } from "../donnees";
import Fiche from "./Fiche";
import Rafraichissement from "../Rafraichissement";
import "../../admin.css";
import "../atelier.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — dossier", robots: { index: false, follow: false } };

export default async function PageFiche({ params }: { params: Promise<{ token: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { token } = await params;
  if (!isValidNumeroToken(token)) notFound();

  const fiche = await chargerFiche(token);
  if (!fiche) notFound();

  /* Ouvrir la fiche, c'est avoir vu le dossier : le badge « nouveau »
     disparaît de la liste pour CETTE personne. C'est le geste réel de
     triage, et c'est ce qui rend la marque fiable — contrairement à une
     « dernière visite » globale, qu'un simple rechargement fait avancer. */
  await marquerVu(qui, fiche.ligne.numeroId);

  /* T2-9 — la fiche se rafraîchit comme la liste. Vécu en recette : Mathias
     attendait le paiement la fiche ouverte, elle est restée figée sur
     l'état 2 alors que la base était « payée » et M4 parti — c'est
     exactement le moment où l'on regarde une fiche. Mêmes règles que la
     liste (rien onglet caché, rattrapage au retour) ; la page est
     force-dynamic, router.refresh() relit donc la base. */
  return (
    <>
      <Fiche fiche={fiche} moi={qui} />
      <Rafraichissement fetchedAt={new Date().toISOString()} />
    </>
  );
}
