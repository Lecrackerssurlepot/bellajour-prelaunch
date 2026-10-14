import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { LIBELLE_ETAT_EDITION } from "@/lib/collectif/etats";
import { MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { chargerBatAtelier } from "../../donnees";
import AtelierBat from "./AtelierBat";
import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/**
 * /admin/collectif/[id]/bat — le bon à tirer, côté atelier (PRD §6.1).
 * `?m=<rang>` choisit le magazine. Déposer un PDF (rendu dans CE navigateur),
 * les propositions de couverture du premier tour, l'échéance, publier en
 * deux gestes ; puis lire et répondre aux notes envoyées par le client.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — bon à tirer collectif", robots: { index: false, follow: false } };

export default async function PageBatAtelier({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  const { id } = await params;
  if (!estUuid(id)) notFound();
  const m = Number((await searchParams).m);

  const lu = await chargerBatAtelier(makeSupabase(), id, Number.isInteger(m) ? m : null, new Date());
  if (lu.absent) {
    return (
      <div className="adm-root ate-root eca-root">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Migration collectif absente</h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>.
          </p>
        </section>
      </div>
    );
  }
  if (!lu.bat) notFound();
  const { bat } = lu;

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="ate-fiche-tete">
        <Link href={`/admin/collectif/${id}`} className="ate-retour">
          ← {bat.edition.organisation}
        </Link>
        <h1 className="ate-h1">Bon à tirer</h1>
        <p className="ate-bonjour">
          <strong>{bat.edition.evenement}</strong> · {LIBELLE_ETAT_EDITION[bat.etat]}
          {bat.edition.archive_le ? " · archivée" : ""}
        </p>
        {bat.magazines.length > 1 ? (
          <nav className="eca-filtres" aria-label="Magazines">
            {bat.magazines.map((mag) => (
              <Link
                key={mag.id}
                href={`/admin/collectif/${id}/bat?m=${mag.rang}`}
                className="eca-filtre"
                aria-current={mag.id === bat.magazine?.id ? "page" : undefined}
              >
                {mag.rang}. {mag.nom}
                {mag.bat_valide_le ? " · validé" : ""}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>
      {bat.magazine ? (
        <AtelierBat key={bat.magazine.id} id={id} bat={bat} />
      ) : (
        <p className="eca-vide">Cette édition n&apos;a pas de magazine.</p>
      )}
    </div>
  );
}
