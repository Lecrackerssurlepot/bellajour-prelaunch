import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { MEDIA, jourParis, type Emplacement, type NomEmplacement } from "@/content/media";
import type { LigneRotation } from "@/lib/visuels/rotation";
import { lireLignesVisuels, tableVisuelsAbsente } from "@/lib/visuels/serveur";
import { bibliothequeVisuels } from "@/lib/visuels/bibliotheque";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import Visuels, { type EmplacementVu } from "./Visuels";
import "../../../admin.css";
import "../../atelier.css";
import "./visuels.css";

/**
 * /admin/atelier/site/visuels (26/11, charte V2) : les visuels du site, réglés
 * par Mathias sans passer par le code. La LISTE des emplacements et leurs
 * défauts viennent de `src/content/media.ts` ; les rotations datées de la table
 * `visuels_rotations`. Lecture fraîche (sans le cache du site) ; les écritures
 * passent par /api/admin/visuels/*.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier · visuels", robots: { index: false, follow: false } };

async function lireLignes(): Promise<{ lignes: LigneRotation[]; absente: boolean; erreur: boolean; v2: boolean }> {
  try {
    const { lignes, v2, code } = await lireLignesVisuels();
    if (code) return { lignes: [], absente: tableVisuelsAbsente(code), erreur: !tableVisuelsAbsente(code), v2: false };
    return { lignes, absente: false, erreur: false, v2 };
  } catch {
    return { lignes: [], absente: false, erreur: true, v2: false };
  }
}

export default async function PageVisuels() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { lignes, absente, erreur, v2 } = await lireLignes();
  const emplacements: EmplacementVu[] = (Object.keys(MEDIA) as NomEmplacement[]).map((nom) => {
    const e = MEDIA[nom] as Emplacement;
    return { nom, ...e, lignes: lignes.filter((l) => l.emplacement === nom) };
  });

  return (
    <div className="adm-root ate-root vis-root">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <Visuels emplacements={emplacements} aujourdhui={jourParis(new Date())} absente={absente} erreur={erreur} v2={v2} bibliotheque={bibliothequeVisuels(lignes)} />
    </div>
  );
}
