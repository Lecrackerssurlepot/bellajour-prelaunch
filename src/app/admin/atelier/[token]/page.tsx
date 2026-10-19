import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { makeSupabase } from "@/lib/supabase";
import { compterConversationsEnAttente } from "../../collectif/donnees";
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

  /* La barre commune (T-152) : les conversations des éditions qui attendent (T-188) partent avec la fiche. */
  const collectif = collectifOuvert();
  const [fiche, nonLus] = await Promise.all([chargerFiche(token), collectif ? compterConversationsEnAttente(makeSupabase()) : Promise.resolve(null)]);
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
      <Fiche fiche={fiche} moi={qui} collectif={collectif} nonLus={nonLus} />
      <Rafraichissement fetchedAt={new Date().toISOString()} />
    </>
  );
}
