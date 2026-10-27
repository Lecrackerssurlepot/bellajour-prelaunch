import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/tokenForme";
import { ETATS, LIBELLE_ETAT } from "@/lib/atelier/transitions";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import { LIBRE_PATTERN } from "../libelles";
import PhotosDossier from "./PhotosDossier";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/**
 * /admin/atelier/mise-en-page/[id] — la COQUILLE de l'éditeur.
 *
 * L'écran réel sera dessiné d'après la maquette de Mathias : ici, rien que
 * la preuve que le dossier se charge. `libre-<uuid>` ouvre une création
 * libre (vierge) ; sinon `id` est le token d'un dossier, dont les photos
 * sont lues par GET /api/admin/atelier/mise-en-page/photos. Rien n'est écrit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — mise en page", robots: { index: false, follow: false } };

export default async function PageEditeur({ params }: { params: Promise<{ id: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  const libre = id.startsWith("libre-");
  if (libre ? !LIBRE_PATTERN.test(id) : !isValidNumeroToken(id)) notFound();

  const liens = liensParticuliers(false).map((l) => (l.href === "/admin/atelier/mise-en-page" ? { ...l, courant: true } : l));

  /* Les libellés d'état partent tout faits : la table reste côté serveur. */
  const libelles: Record<string, string> = Object.fromEntries(ETATS.map((e) => [e, LIBELLE_ETAT[e]]));

  return (
    <div className="adm-root ate-root mep-outil">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liens} />
      <Link href="/admin/atelier/mise-en-page" className="ate-retour">
        ← Mise en page
      </Link>
      {libre ? (
        <header className="mep-tete">
          <div>
            <h1 className="ate-h1">Création libre</h1>
            <p className="ate-bonjour">Magazine vierge.</p>
          </div>
        </header>
      ) : (
        <PhotosDossier token={id} libelles={libelles} />
      )}
    </div>
  );
}
