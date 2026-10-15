"use client";

/* Le lien du responsable dans la carte « Le dernier message » de la fiche
   (15/10, maquette « Atelier, la fiche ») : le copier pour le renvoyer, ou
   ouvrir son espace. Les deux autres liens et « Régénérer » restent dans
   l'onglet « Réglages et liens ». */

import { useState } from "react";

export default function LienResponsable({ url }: { url: string }) {
  const [etat, setEtat] = useState<"repos" | "copie" | "echec">("repos");

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setEtat("copie");
      setTimeout(() => setEtat((e) => (e === "copie" ? "repos" : e)), 2000);
    } catch {
      setEtat("echec");
    }
  }

  return (
    <>
      <span className="eca-carte-actions">
        <button type="button" className="eca-pilule eca-pilule--encre" onClick={copier}>
          {etat === "copie" ? "Lien copié" : "Copier le lien du responsable"}
        </button>
        <a className="eca-pilule eca-pilule--claire" href={url} target="_blank" rel="noopener noreferrer">
          Ouvrir
        </a>
      </span>
      {etat === "echec" ? (
        <p className="eca-message eca-message--erreur" role="alert">
          Copie impossible : l&apos;onglet « Réglages et liens » montre le lien à sélectionner.
        </p>
      ) : null}
    </>
  );
}
