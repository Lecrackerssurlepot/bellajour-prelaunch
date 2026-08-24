import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { chargerFiche } from "../donnees";
import Fiche from "./Fiche";
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

  return <Fiche fiche={fiche} />;
}
