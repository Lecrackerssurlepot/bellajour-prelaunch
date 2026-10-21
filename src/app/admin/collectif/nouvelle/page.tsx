import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { DEMANDES_PAR_DEFAUT } from "@/lib/collectif/demandes";
import { personnesAbsentes } from "@/lib/collectif/migration";
import { nomMagazineParDefaut } from "@/lib/collectif/saisie";
import { makeSupabase } from "@/lib/supabase";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/nouvelle — ouvrir une édition (PRD §8 ; T-186, planche 5 du 19/10).
 *
 * Six étapes, une à la fois (`FormulaireEdition`), et « Créer l'édition » dès la première :
 * quatre champs obligatoires (planche 7 du 21/10), le reste peut attendre et la fiche
 * de l'édition dit ce qui manque. Résultat : l'écran « L'édition est créée »
 * (`creee/[id]`, T-187), qui montre les trois liens et PROPOSE le mail.
 * Rien ne part d'ici. Les chiffres partent VIDES : rien n'est pré-rempli.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — nouvelle édition", robots: { index: false, follow: false } };

/* Les seuls choix pré-cochés sont des CHOIX, pas des chiffres : le registre et
   le mur suivent la première option de la maquette, les contenus demandés ses
   cases cochées, et un « Magazine 1 » est créé d'office (à renommer). */
const VIERGE: ValeursEdition = {
  organisation: "",
  evenement: "",
  dates_texte: "",
  registre: "entreprise_vous",
  cloture_local: "",
  ouverture_local: "",
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
  contenus_demandes: [...DEMANDES_PAR_DEFAUT],
  invitation_texte: "",
  responsable_email: "",
  responsable_nom: "",
  rdv_url: "",
  magazines: [{ id: null, nom: nomMagazineParDefaut(1), vide: true }],
};

export default async function PageNouvelle() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  /* L'instant présent, lu ici une fois : les raccourcis de clôture partent du jour de Paris. */
  const maintenant = new Date().toISOString();
  /* La colonne `ouverture_le` (migration 20261023) existe-t-elle ? Une lecture d'une ligne : l'erreur qui NOMME la colonne le dit,
     et le champ « Ouverture du dépôt » l'écrit au lieu de laisser le serveur refuser la création. Une panne autre ne ferme rien. */
  let ouvertureIndisponible = false;
  try {
    ouvertureIndisponible = personnesAbsentes((await makeSupabase().from("collectif_editions").select("ouverture_le").limit(1)).error);
  } catch {
    ouvertureIndisponible = false;
  }

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="eca-tete-ecran">
        <h1 className="eca-titre-ecran">Nouvelle édition</h1>
        <span className="eca-note">Rien ne part chez le client à cette étape</span>
      </header>
      <FormulaireEdition mode="creation" initiales={VIERGE} maintenant={maintenant} ouvertureIndisponible={ouvertureIndisponible} />
    </div>
  );
}
