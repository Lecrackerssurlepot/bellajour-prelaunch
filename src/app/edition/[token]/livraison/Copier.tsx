"use client";

/* Copier le numéro de suivi : le bouton dit qu'il a copié, ou qu'il n'a pas pu. */

import { useState } from "react";

export default function Copier({ texte }: { texte: string }) {
  const [etat, setEtat] = useState<"" | "copie" | "refus">("");
  return (
    <button
      type="button"
      className="ec-bouton ec-bouton--clair ec-livraison-copier"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setEtat("copie");
        } catch {
          setEtat("refus");
        }
      }}
    >
      {etat === "copie" ? "Copié" : etat === "refus" ? "Copie impossible" : "Copier"}
    </button>
  );
}
