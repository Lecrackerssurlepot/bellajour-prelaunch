import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { listerStyles } from "../donnees";
import NouveauStyle from "./NouveauStyle";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/styles — les styles du mur (PRD §8, prioritaire).
 *
 * Mathias les ajoute au fil de l'eau. Un style n'arrive sur le mur d'un
 * client qu'une fois complet et publié ; le dépublier le retire sans rien
 * effacer. L'ordre ici est celui du mur.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — styles du mur", robots: { index: false, follow: false } };

const PUBLIC = { tous: "Tous", entreprise: "Entreprise", ecole: "École" } as const;

export default async function PageStyles() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const lu = await listerStyles(makeSupabase());

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions("styles")} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Les styles du mur</h1>
        <p className="ate-bonjour">
          Dans un magazine, tout l&apos;intérieur suit le style choisi ; seule la couverture peut venir d&apos;un autre
          style.
        </p>
      </header>

      {lu.absent ? (
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Migration collectif absente</h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>.
          </p>
        </section>
      ) : (
        <div className="eca-form">
          <NouveauStyle />
          {lu.styles.length === 0 ? (
            <section className="ate-carte">
              <p className="eca-vide">Aucun style pour l&apos;instant. Le premier se crée juste au-dessus.</p>
            </section>
          ) : (
            <div className="eca-styles">
              {lu.styles.map((st) => (
                <Link key={st.id} href={`/admin/collectif/styles/${st.id}`} className="eca-style-carte">
                  <div className="eca-style-image">
                    {st.apercu ? <img src={st.apercu} alt="" loading="lazy" decoding="async" /> : <span>Pas encore de couverture</span>}
                  </div>
                  <div className="eca-style-corps">
                    <span className="eca-style-nom">{st.nom}</span>
                    <span className="eca-sous">
                      {PUBLIC[st.segment]} · ordre {st.ordre}
                    </span>
                    {st.publie ? (
                      <span className="ate-camp ate-camp--atelier">Sur le mur</span>
                    ) : (
                      <span className="ate-camp">
                        Brouillon{st.manques.length ? ` · ${st.manques.length} manque${st.manques.length > 1 ? "s" : ""}` : " · publiable"}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
