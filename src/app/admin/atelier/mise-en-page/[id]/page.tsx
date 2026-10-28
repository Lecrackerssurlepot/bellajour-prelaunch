import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/tokenForme";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { estUuid } from "@/lib/collectif/cles";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import { LIBRE_PATTERN } from "../libelles";
import Editeur, { type CibleEditeur } from "./Editeur";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/**
 * /admin/atelier/mise-en-page/[id] — l'ÉDITEUR. `id` est le token d'un dossier (32 caractères), `edition-<id>`
 * (une édition collective : ses photos, un ou plusieurs magazines) ou `libre-<uuid>` (création libre, sans photos
 * pour l'instant). Tout l'écran est côté navigateur (`Editeur`) : les photos arrivent par les routes de lecture,
 * la sauvegarde par `sauvegardeClient`. Rien n'est écrit ici.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — mise en page", robots: { index: false, follow: false } };

function lireCible(id: string): CibleEditeur | null {
  if (id.startsWith("libre-")) return LIBRE_PATTERN.test(id) ? { type: "libre", id } : null;
  if (id.startsWith("edition-")) {
    const editionId = id.slice("edition-".length);
    return estUuid(editionId) ? { type: "edition", editionId } : null;
  }
  return isValidNumeroToken(id) ? { type: "dossier", token: id } : null;
}

export default async function PageEditeur({ params }: { params: Promise<{ id: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  const cible = lireCible(id);
  if (!cible) notFound();

  const liens = liensParticuliers(false).map((l) => (l.href === "/admin/atelier/mise-en-page" ? { ...l, courant: true } : l));

  return (
    <div className="adm-root ate-root mep-editeur">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liens} />
      <Editeur cible={cible} />
    </div>
  );
}
