import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { MIGRATION_COLLECTIF, TABLES_COLLECTIF } from "@/lib/collectif/migration";
import { etatMigration } from "@/lib/collectif/sante";
import "../admin.css";
import "../atelier/atelier.css";

/**
 * /admin/collectif — phase 0 : l'état du socle, rien d'autre.
 *
 * La liste des éditions, la création et l'éditeur de styles arrivent en
 * phase 1 (T-140). Pour l'instant la page dit une seule chose, celle dont
 * Mathias a besoin pour sa recette : la migration est-elle passée, et en
 * entier ? Elle interroge les treize tables une à une et NOMME celles qui
 * manquent (une migration à moitié appliquée se verrait ici).
 *
 * Aucune feuille de style à elle : elle emprunte celles de la table de
 * travail (`.adm-root .ate-root`), déjà chargées par l'admin. Pas une classe
 * de plus qui pourrait fuir.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — éditions collectives", robots: { index: false, follow: false } };

export default async function PageCollectif() {
  const qui = await quiEstConnecte();
  /* Le middleware a déjà filtré ; ce garde-fou existe pour le cas où le
     matcher changerait sans que personne n'y pense. */
  if (!qui) redirect("/admin/login");

  const etat = await etatMigration(makeSupabase());
  const complete = etat.absentes.length === 0 && etat.erreurs.length === 0;

  return (
    <div className="adm-root ate-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Table de travail
        </Link>
        <h1 className="ate-h1">Éditions collectives</h1>
        <p className="ate-bonjour">
          Le socle est posé (phase 0). La liste des éditions, leur création et l&apos;éditeur de
          styles arrivent avec la phase 1.
        </p>
      </header>

      {complete ? (
        <section className="ate-carte ate-sante-ok">
          <h2 className="ate-carte-titre">La migration est passée</h2>
          <p>
            Les {TABLES_COLLECTIF.length} tables <code>collectif_*</code>{" "}répondent. Les liens
            d&apos;édition et de dépôt sont prêts à servir dès qu&apos;une édition existera.
          </p>
        </section>
      ) : (
        <section className="ate-carte">
          <h2 className="ate-carte-titre">
            {etat.absentes.length === TABLES_COLLECTIF.length
              ? "Migration collectif absente"
              : "Migration collectif incomplète"}
          </h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>. Tant qu&apos;elle n&apos;est pas
            passée, les routes de l&apos;Édition collective répondent 503 et les liens client
            affichent « Migration collectif absente ».
          </p>
          {etat.absentes.length > 0 && etat.absentes.length < TABLES_COLLECTIF.length ? (
            <p>Tables manquantes : {etat.absentes.join(", ")}.</p>
          ) : null}
          {etat.erreurs.length > 0 ? (
            <p>
              Lecture impossible (ni présente ni absente) :{" "}
              {etat.erreurs.map((e) => `${e.table} (${e.code ?? "sans code"})`).join(", ")}.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
