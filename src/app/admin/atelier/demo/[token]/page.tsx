import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { ficheDemo } from "../fixtures";
import Fiche from "../../[token]/Fiche";
import "../../../admin.css";
import "../../atelier.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — démonstration", robots: { index: false, follow: false } };

export default async function PageFicheDemo({ params }: { params: Promise<{ token: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { token } = await params;
  const fiche = ficheDemo(token);
  if (!fiche) notFound();

  return <Fiche fiche={fiche} moi={qui} demo />;
}
