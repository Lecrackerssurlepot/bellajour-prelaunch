import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/nouvelle — ouvrir une édition (PRD §8 ; T-186, planche 5 du 19/10).
 *
 * Six étapes, une à la fois (`FormulaireEdition`). Résultat : l'écran « L'édition
 * est créée » (`creee/[id]`, T-187), qui montre les trois liens et PROPOSE le mail.
 * Rien ne part d'ici. Les chiffres partent VIDES : rien n'est pré-rempli.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — nouvelle édition", robots: { index: false, follow: false } };

/* Les seuls choix pré-cochés sont des CHOIX, pas des chiffres : le registre et
   le mur suivent la première option de la maquette, les contenus demandés ses
   cases cochées. */
const VIERGE: ValeursEdition = {
  organisation: "",
  evenement: "",
  dates_texte: "",
  registre: "entreprise_vous",
  cloture_local: "",
  livraison_prevue_le: "",
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
  /* L'instant présent, lu ici une fois : les raccourcis de clôture partent du jour de Paris. */
  const maintenant = new Date().toISOString();

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="eca-tete-ecran">
        <h1 className="eca-titre-ecran">Nouvelle édition</h1>
        <span className="eca-note">Rien ne part chez le client à cette étape</span>
      </header>
      <FormulaireEdition mode="creation" initiales={VIERGE} maintenant={maintenant} />
    </div>
  );
}
