import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/nouvelle — ouvrir une édition (PRD §8, maquette Creation).
 *
 * Résultat : la fiche de l'édition, avec ses trois liens à copier. Aucun
 * mail ne part. Les chiffres partent VIDES : rien n'est pré-rempli.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — ouvrir une édition", robots: { index: false, follow: false } };

/* Les seuls choix pré-cochés sont des CHOIX, pas des chiffres : le registre et
   le mur suivent la première option de la maquette, les contenus demandés ses
   cases cochées. */
const VIERGE: ValeursEdition = {
  organisation: "",
  evenement: "",
  dates_texte: "",
  registre: "entreprise_vous",
  cloture_local: "",
  plafond_participant_atelier: "",
  plafond_total: "",
  preselection_max: "",
  pagination_prevue: "",
  tirage: "",
  tours_inclus: "",
  nb_propositions_couverture: "",
  couvertures_aimees_max: "",
  styles_segment: "tous",
  contenus_demandes: ["logo", "programme", "mot", "liste"],
  invitation_texte: "",
  responsable_email: "",
  responsable_nom: "",
  rdv_url: "",
  magazines: [{ id: null, nom: "", vide: true }],
};

export default async function PageNouvelle() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Ouvrir une édition</h1>
        <p className="ate-bonjour">
          Après signature de la proposition. La création produit trois liens : le responsable, l&apos;équipe (lecture
          seule), les participants.
        </p>
      </header>
      <FormulaireEdition mode="creation" initiales={VIERGE} />
    </div>
  );
}
