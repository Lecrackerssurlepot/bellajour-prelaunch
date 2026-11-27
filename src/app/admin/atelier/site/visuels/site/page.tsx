import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { makeSupabase } from "@/lib/supabase";
import { MEDIA, jourParis, type Emplacement, type NomEmplacement } from "@/content/media";
import { COLONNES_ROTATION, estJour, type LigneRotation } from "@/lib/visuels/rotation";
import { bibliothequeVisuels } from "@/lib/visuels/bibliotheque";
import BarreAtelier, { liensParticuliers } from "../../../../BarreAtelier";
import type { EmplacementVu } from "../Visuels";
import VueSite from "./VueSite";
import "../../../../admin.css";
import "../../../atelier.css";
import "../visuels.css";
import "./vue-site.css";

/**
 * /admin/atelier/site/visuels/site (27/11) : le site tel qu'il sera à une date,
 * ou à deux dates côte à côte, avec chaque emplacement repéré sur la page.
 * Chaque cadre porte sa date dans l'adresse (`?apercu_jour=`), lue seulement en
 * mode brouillon avec un cookie admin : si le mode brouillon n'est pas ouvert,
 * on passe d'abord par /api/admin/visuels/apercu, qui l'ouvre et revient ici.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier · le site à une date", robots: { index: false, follow: false } };

type Params = { a?: string; b?: string; page?: string; brouillons?: string; montrer?: string };

const PAGES = new Set(["/", "/magazine", "/offrir", "/partenaires", "/composer"]);

export default async function PageVueSite({ searchParams }: { searchParams: Promise<Params> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const p = await searchParams;
  const aujourdhui = jourParis(new Date());
  const a = estJour(p.a) ? p.a : aujourdhui;
  const b = estJour(p.b) ? p.b : null;
  const page = p.page && PAGES.has(p.page) ? p.page : "/";
  const brouillons = p.brouillons === "1";
  const montrer = p.montrer && p.montrer in MEDIA ? (p.montrer as NomEmplacement) : null;

  if (!(await draftMode()).isEnabled) {
    const ici = new URLSearchParams({ a, page });
    if (b) ici.set("b", b);
    if (brouillons) ici.set("brouillons", "1");
    if (montrer) ici.set("montrer", montrer);
    const vers = `/admin/atelier/site/visuels/site?${ici.toString()}`;
    redirect(`/api/admin/visuels/apercu?jour=${a}&vers=${encodeURIComponent(vers)}`);
  }

  let lignes: LigneRotation[] = [];
  try {
    const { data } = await makeSupabase().from("visuels_rotations").select(COLONNES_ROTATION);
    lignes = (data ?? []) as LigneRotation[];
  } catch {
    lignes = [];
  }
  const emplacements: EmplacementVu[] = (Object.keys(MEDIA) as NomEmplacement[]).map((nom) => ({
    nom,
    ...(MEDIA[nom] as Emplacement),
    lignes: lignes.filter((l) => l.emplacement === nom),
  }));

  return (
    <div className="adm-root ate-root vis-root vs-root">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <VueSite
        emplacements={emplacements}
        bibliotheque={bibliothequeVisuels(lignes)}
        aujourdhui={aujourdhui}
        depart={{ a, b, page, brouillons, montrer }}
      />
    </div>
  );
}
