import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import { chargerStyle } from "../../donnees";
import EditeurStyle from "./EditeurStyle";
import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/**
 * /admin/collectif/styles/[id] — l'éditeur d'un style (PRD §8).
 * Les images arrivent signées (une heure) : le coffre est privé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — un style", robots: { index: false, follow: false } };

export default async function PageStyle({ params }: { params: Promise<{ id: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  if (!estUuid(id)) notFound();

  const lu = await chargerStyle(makeSupabase(), id);
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
  if (!lu.style) notFound();
  const { style: st, images, journal } = lu.style;

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions("styles")} />
      <header className="ate-fiche-tete">
        <Link href="/admin/collectif/styles" className="eca-retour">
          <span aria-hidden="true">←</span> Les styles du mur
        </Link>
        <h1 className="ate-h1">{st.nom}</h1>
        <p className="ate-bonjour">
          Dans un magazine, tout l&apos;intérieur suit le style choisi ; seule la couverture peut venir d&apos;un autre
          style.
        </p>
      </header>

      <EditeurStyle
        initial={{
          id: st.id,
          slug: st.slug,
          nom: st.nom,
          description: st.description ?? "",
          segment: st.segment,
          ordre: st.ordre,
          publie: st.publie,
          palettes: st.palettes ?? [],
          typos: {
            titres: st.typos?.titres ?? "",
            texte: st.typos?.texte ?? "",
            echantillon_key: st.typos?.echantillon_key ?? null,
            /* T-172 : les tailles réduites repartent à l'enregistrement, sinon il les effacerait. */
            ...(st.typos?.echantillon_tailles ? { echantillon_tailles: st.typos.echantillon_tailles } : {}),
          },
          couvertures: st.couvertures ?? [],
          doubles: TYPES_DOUBLES.map(
            ({ cle }) => (st.doubles ?? []).find((d) => d.type === cle) ?? { type: cle, image_key: null, legende: "" }
          ),
        }}
        images={images}
      />

      <section className="ate-carte" style={{ marginTop: 16 }}>
        <h2 className="ate-carte-titre">Journal du style</h2>
        {journal.length === 0 ? (
          <p className="eca-vide">Rien encore.</p>
        ) : (
          <ul className="eca-journal">
            {journal.map((j) => (
              <li key={j.id}>
                <time dateTime={j.quand}>{formaterInstantParis(j.quand)}</time>
                {j.phrase}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
