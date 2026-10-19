"use client";

/* « Marquer comme non lu » (T-188, planche 8 : « pour en garder une à
   traiter »). Le dernier message du client redevient non lu, par la route
   PATCH de l'atelier (`{ nonLu: true }`). La barre se relit aussitôt ; dans la
   boîte de réception on revient à la liste (la conversation fermée ne se
   remarque pas lue), dans la fiche la page se relit sur place. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { relireCompte } from "./compteMessages";

export default function MarquerNonLu({ id, possible, retour }: { id: string; possible: boolean; retour?: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState<"repos" | "envoi" | "fait" | "erreur">("repos");

  async function marquer() {
    setEtat("envoi");
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/messages`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nonLu: true }),
      });
      if (!rep.ok) {
        setEtat("erreur");
        return;
      }
      setEtat("fait");
      void relireCompte();
      if (retour) router.push(retour);
      else router.refresh();
    } catch {
      setEtat("erreur");
    }
  }

  if (!possible) return null;
  return (
    <span className="eca-non-lu">
      <button type="button" className="eca-bouton-petit" onClick={marquer} disabled={etat === "envoi" || etat === "fait"}>
        {etat === "fait" ? "Marquée non lue" : etat === "envoi" ? "Un instant…" : "Marquer comme non lu"}
      </button>
      {etat === "erreur" ? (
        <span className="eca-non-lu-erreur" role="alert">
          Non enregistré. Réessayez.
        </span>
      ) : null}
    </span>
  );
}
