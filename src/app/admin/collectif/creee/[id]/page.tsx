import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { controleAppareilActif } from "@/lib/collectif/appareil";
import { estUuid } from "@/lib/collectif/cles";
import { collecteOuverte } from "@/lib/collectif/etats";
import { origineDepuis } from "@/lib/collectif/liens";
import { mailsCollectifOuverts } from "@/lib/collectif/mails";
import { donneesEspacePret, mailEspacePret } from "@/lib/collectif/mailsTextes";
import { MIGRATION_COLLECTIF, tableAbsente } from "@/lib/collectif/migration";
import type { EditionLigne } from "@/lib/collectif/types";
import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import { compterNonLus } from "../../donnees";
import FinCreation from "./FinCreation";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/**
 * /admin/collectif/creee/[id] — « L'édition est créée » (T-187, planche 6 du 19/10).
 *
 * L'écran qui suit « Créer l'édition » : la ligne de résumé, les TROIS liens en
 * cartes (chacun avec son rôle), « Envoyer à <adresse> » en deux temps sur la
 * carte du responsable, « Copier les trois liens », « Aller à la fiche », et
 * l'aperçu du VRAI mail (la route GET `mail-espace`, la même qui l'enverrait).
 *
 * ⚠️ Rien ne part sans le second clic, et rien ne part du tout tant que
 * `COLLECTIF_MAILS` est fermé (décision de Mathias du 19/10 : « sauf le mail :
 * n'ouvre rien sans moi ») : le bouton le dit, « Copier les trois liens » prend
 * le relais.
 *
 * Hors de `[id]/` exprès : sous la fiche, sa silhouette de chargement
 * (`[id]/loading.tsx`) s'afficherait d'abord, avec la forme de la fiche.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — l'édition est créée", robots: { index: false, follow: false } };

type Lue = Pick<
  EditionLigne,
  | "id"
  | "organisation"
  | "evenement"
  | "registre"
  | "etat"
  | "responsable_email"
  | "responsable_nom"
  | "cloture_le"
  | "token_responsable"
  | "token_equipe"
  | "token_depot"
  | "archive_le"
>;

export default async function PageCreee({ params }: { params: Promise<{ id: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  const { id } = await params;
  if (!estUuid(id)) notFound();

  const supabase = makeSupabase();
  const [lue, mags, nonLus] = await Promise.all([
    supabase
      .from("collectif_editions")
      .select("id, organisation, evenement, registre, etat, responsable_email, responsable_nom, cloture_le, token_responsable, token_equipe, token_depot, archive_le")
      .eq("id", id)
      .maybeSingle<Lue>(),
    supabase.from("collectif_magazines").select("id", { count: "exact", head: true }).eq("edition_id", id),
    compterNonLus(supabase),
  ]);
  if (lue.error && tableAbsente(lue.error.code)) {
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
  if (lue.error) throw new Error(`[collectif] édition illisible (${lue.error.code}) : ${lue.error.message}`);
  const e = lue.data;
  if (!e) notFound();

  const h = await headers();
  const origine = origineDepuis(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  /* Les mêmes données que la route qui enverrait le mail : l'objet affiché est le vrai. */
  const donnees = donneesEspacePret(e, origine, controleAppareilActif(process.env));
  const mail = mailEspacePret(donnees);
  const nbMagazines = mags.count ?? 0;
  const ouverte = collecteOuverte(e.etat, e.cloture_le, new Date());
  const resume = [
    e.evenement,
    e.organisation,
    `${nbMagazines} magazine${nbMagazines > 1 ? "s" : ""}`,
    donnees.cloture ? `collecte jusqu'au ${donnees.cloture}` : "collecte sans date de clôture",
  ].join(" · ");

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif nonLus={nonLus} liens={liensEditions(null, nonLus)} />
      <header className="eca-tete-ecran eca-tete-ecran--pile">
        <h1 className="eca-titre-ecran">L&apos;édition est créée</h1>
        <span className="eca-note">{resume}</span>
      </header>
      <FinCreation
        id={e.id}
        liens={donnees.liens}
        prenom={(e.responsable_nom ?? "").trim().split(/\s+/)[0] || null}
        email={e.responsable_email}
        cloture={donnees.cloture}
        collecteOuverte={ouverte}
        ouverts={mailsCollectifOuverts()}
        archivee={Boolean(e.archive_le)}
        sujet={mail.sujet}
      />
    </div>
  );
}
