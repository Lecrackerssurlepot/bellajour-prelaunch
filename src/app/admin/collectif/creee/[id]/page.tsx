import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collecteOuverte } from "@/lib/collectif/etats";
import { lienDeGroupe, origineDepuis } from "@/lib/collectif/liens";
import { mailsCollectifOuverts } from "@/lib/collectif/mails";
import { donneesEspacePret, mailEspacePret } from "@/lib/collectif/mailsTextes";
import { MIGRATION_COLLECTIF, tableAbsente } from "@/lib/collectif/migration";
import { plafondLienMax } from "@/lib/collectif/plafonds";
import type { EditionLigne } from "@/lib/collectif/types";
import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import { chargerLiensDeGroupe, compterNonLus, type LienFiche } from "../../donnees";
import FinCreation from "./FinCreation";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/**
 * /admin/collectif/creee/[id] — « L'édition est créée » (T-187, planche 6 du 19/10).
 *
 * L'écran qui suit « Créer l'édition » : la ligne de résumé, DEUX liens en cartes
 * (le responsable, l'équipe), « Envoyer à <adresse> » en deux temps sur la carte
 * du responsable, « Copier les deux liens », « Aller à la fiche », et l'aperçu du
 * VRAI mail (la route GET `mail-espace`, la même qui l'enverrait).
 *
 * Planche 5C du 21/10 (validée) : plus de « lien des participants » (l'adresse de
 * base n'est plus montrée ni envoyée). La troisième carte devient « Les liens des
 * participants » : un lien par groupe, créé dans l'espace du responsable, et
 * « Préparer les groupes maintenant », qui ouvre ici la carte de création de
 * l'atelier (`PanneauProvenances`, la route `…/provenances`, ses contrôles et son
 * plafond). Ses liens se LISENT ici (`chargerLiensDeGroupe`) : « aucun pour
 * l'instant », ou « N liens ».
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
  | "plafond_participant_atelier"
  | "plafond_participant_client"
  | "plafond_total"
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
      .select(
        "id, organisation, evenement, registre, etat, responsable_email, responsable_nom, cloture_le, token_responsable, token_equipe, token_depot, archive_le, plafond_participant_atelier, plafond_participant_client, plafond_total"
      )
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
  const donnees = donneesEspacePret(e, origine);
  const mail = mailEspacePret(donnees);
  /* Les liens de groupe déjà là (une édition qu'on rouvre ici, des groupes préparés) : une lecture.
     Illisibles, l'écran ne dit pas « aucun » au hasard : la carte se tait sur le nombre. */
  let groupes: LienFiche[] | null = null;
  try {
    groupes = await chargerLiensDeGroupe(supabase, e.id, e);
  } catch (err) {
    console.error("[collectif] liens de groupe illisibles sur l'écran de fin de création", err);
  }
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
        liens={{ responsable: donnees.liens.responsable, equipe: donnees.liens.equipe }}
        depot={donnees.liens.depot}
        groupes={groupes ? groupes.map(({ cle, ...l }) => ({ ...l, url: lienDeGroupe(donnees.liens.depot, cle) })) : null}
        max={plafondLienMax(e)}
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
