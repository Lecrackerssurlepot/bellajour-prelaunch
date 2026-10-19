"use client";

/* « Partager avec mon équipe » (T-187) : le lien d'équipe, en lecture seule, que
   le mail « Votre espace est prêt » annonce et que l'espace ne donnait nulle part.
   Une entrée discrète en bas du menu, au-dessus du nom ; elle ouvre une fenêtre
   avec le lien et « Copier ». Montrée au RESPONSABLE seulement (`voitLienEquipe`,
   lu par le layout) : l'équipe l'a déjà, un participant ne voit jamais l'espace. */

import { useState } from "react";
import Fenetre from "../_composants/Fenetre";

export default function PartageEquipe({ lien, tu, avantOuvrir }: { lien: string; tu: boolean; avantOuvrir: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState<"" | "copie" | "refus">("");

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie("copie");
    } catch {
      setCopie("refus");
    }
  }

  return (
    <>
      <button
        type="button"
        className="ec-equipe-entree"
        onClick={() => {
          avantOuvrir();
          setCopie("");
          setOuvert(true);
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="9" r="2.6" />
          <path d="M15.6 14.1A4.6 4.6 0 0 1 21 18.6" />
        </svg>
        <span>Partager avec mon équipe</span>
      </button>
      {ouvert ? (
        <Fenetre
          titre="Partager avec mon équipe"
          sous={tu ? "Lecture seule : ton équipe suit tout sans rien modifier." : "Lecture seule : votre équipe suit tout sans rien modifier."}
          onFermer={() => setOuvert(false)}
        >
          <input
            className="ec-champ ec-lien-url"
            readOnly
            value={lien}
            aria-label="Le lien de l'équipe"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button type="button" className="ec-bouton" onClick={copier}>
            {copie === "copie" ? "Copié" : copie === "refus" ? "Copie impossible : sélectionnez le lien" : "Copier"}
          </button>
        </Fenetre>
      ) : null}
    </>
  );
}
