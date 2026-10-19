/* EXTRAIT ARCHIVÉ de src/app/admin/collectif/FormulaireEdition.tsx (commit 0e30902) : l'étape 5
   « À envoyer par le client » en cinq cases à cocher, remplacée le 19/10/2026 au soir par
   DemandesClient.tsx (T-191). Pas un fichier qui compile seul : les deux morceaux tels qu'ils
   vivaient dans le formulaire (la table des libellés, puis l'élément de l'étape). Lire README.md. */

import { contenuClient } from "@/lib/collectif/contenus";
import { CONTENUS, type CleContenu } from "@/lib/collectif/types";

/* Ce que l'atelier lit sur chaque case (la planche 5) ; ce que le client voit
   vient de `contenuClient` (le nom de la case dans son espace). */
const CASES: Record<CleContenu, string> = {
  logo: "Le logo, en vectoriel",
  programme: "Le programme",
  mot: "Le mot du dirigeant",
  liste: "La liste des participants",
  rubrique: "Une rubrique à contenu fourni",
};

/* L'élément de l'étape, dans le tableau `etapes` du formulaire (`v`, `maj`, `erreur` sont ceux
   du composant FormulaireEdition). */
export const etape5 = (
  v: { contenus_demandes: string[] },
  maj: (champ: "contenus_demandes", valeur: string[]) => void,
  erreur: (champ: string) => React.ReactNode
) => (
  /* 5 · À envoyer par le client */
  <>
    <div className="eca-cases-effet">
      {CONTENUS.map((c) => {
        const coche = v.contenus_demandes.includes(c.cle);
        const chezLui = contenuClient(c.cle)?.libelle ?? c.libelle;
        return (
          <label className="eca-case-effet" key={c.cle}>
            <input
              type="checkbox"
              checked={coche}
              onChange={(e) =>
                maj(
                  "contenus_demandes",
                  e.target.checked ? [...v.contenus_demandes, c.cle] : v.contenus_demandes.filter((x) => x !== c.cle)
                )
              }
            />
            <span>
              {CASES[c.cle]}
              <small>{coche ? `Une case « ${chezLui} » dans son espace, qu'il doit remplir.` : "Non demandée : la case n'apparaît pas chez lui."}</small>
            </span>
          </label>
        );
      })}
    </div>
    {erreur("contenus_demandes")}
  </>
);
