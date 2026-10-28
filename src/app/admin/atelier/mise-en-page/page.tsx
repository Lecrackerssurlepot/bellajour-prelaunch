import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../BarreAtelier";
import { chargerProjetsMep } from "./projets";
import CreationLibre from "./CreationLibre";
import ListeProjets from "./ListeProjets";
import "../../admin.css";
import "../atelier.css";
import "./mise-en-page.css";

/**
 * /admin/atelier/mise-en-page — la page des projets (brief §2) : « À
 * démarrer », « En cours », « Archivés », dossiers et éditions, et la
 * « Création libre ». LECTURE seule : rien n'est écrit, pas même la marque
 * « vu » de la fiche. Ordinateur seulement.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — mise en page", robots: { index: false, follow: false } };

export default async function PageMiseEnPage() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const collectif = collectifOuvert();
  const { projets, sauvegardeDisponible } = await chargerProjetsMep(collectif);

  const liens = liensParticuliers(false).map((l) => (l.href === "/admin/atelier/mise-en-page" ? { ...l, courant: true } : l));

  return (
    <div className="adm-root ate-root mep-outil">
      <BarreAtelier monde="particuliers" collectif={collectif} liens={liens} />

      <header className="mep-tete">
        <h1 className="ate-h1">Projets</h1>
        <div className="mep-tete-gestes">
          <Link href="/admin/atelier/mise-en-page/gabarits" className="mep-lien-discret">
            Gabarits
          </Link>
          <CreationLibre />
        </div>
      </header>

      {sauvegardeDisponible ? null : <p className="mep-note">Sauvegarde serveur indisponible</p>}

      <ListeProjets projets={projets} />
    </div>
  );
}
