"use client";

/* Une fenêtre de l'espace client (révision §14.1) : du verre dépoli (fond
   translucide et flou), jamais un aplat opaque. Elle couvre la colonne de
   contenu, pas le menu, comme dans les maquettes ; sur téléphone, tout
   l'écran. Échap ou un clic sur le voile la ferment.

   ⚠️ Elle s'ouvre TOUJOURS dans `.ec-contenu`, par un portail (15/10) : un
   panneau de verre (`backdrop-filter`) enferme ce qui est positionné dedans,
   et la fenêtre ouverte depuis la ligne « À envoyer » ou l'encart Photos
   restait prisonnière de son encart, inutilisable. Au premier rendu (serveur,
   hydratation) elle reste en place, puis passe dans la colonne. */

import { useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import "./fenetre.css";
import { useEchap } from "@/components/couche/useEchap";
import { useRetourFerme } from "@/components/couche/useRetourFerme";
import { useVerrouDefilement } from "@/components/couche/useVerrouDefilement";

const rien = () => () => {};

export default function Fenetre({
  titre,
  sous,
  onFermer,
  large,
  cote,
  pleine,
  actions,
  pied,
  children,
}: {
  titre: React.ReactNode;
  sous?: React.ReactNode;
  onFermer: () => void;
  /** 560 px au lieu de 520 (la seconde étape d'un lien, par exemple). */
  large?: boolean;
  /** Un panneau latéral à droite, toute la hauteur (le brief, révision §14.6) : son corps défile, son pied reste. */
  cote?: boolean;
  /** Toute la colonne de contenu (la visionneuse d'un document) : l'en-tête reste, le corps prend le reste. */
  pleine?: boolean;
  /** Des boutons de plus, à côté de « Fermer » (« Télécharger »). */
  actions?: React.ReactNode;
  /** Le pied d'un panneau latéral (« Terminé »), toujours visible. */
  pied?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  const client = useSyncExternalStore(rien, () => true, () => false);
  useVerrouDefilement();
  useRetourFerme(onFermer);
  useEchap(onFermer);
  const fenetre = (
    <div className={cote ? "ec-fenetre-voile ec-fenetre-voile--cote" : pleine ? "ec-fenetre-voile" : "ec-fenetre-voile ec-fenetre-voile--feuille"} role="presentation" onClick={onFermer}>
      <div
        className={cote ? "ec-fenetre ec-fenetre--cote" : pleine ? "ec-fenetre ec-fenetre--pleine" : large ? "ec-fenetre ec-fenetre--large" : "ec-fenetre"}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ec-fenetre-tete">
          <div>
            <h2 className="ec-fenetre-titre" id={id}>
              {titre}
            </h2>
            {sous ? <p className="ec-note">{sous}</p> : null}
          </div>
          <div className="ec-fenetre-actions">
            {actions}
            <button type="button" className="ec-fenetre-fermer" aria-label="Fermer" onClick={onFermer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
        {cote ? <div className="ec-fenetre-corps">{children}</div> : children}
        {pied ? <div className="ec-fenetre-pied">{pied}</div> : null}
      </div>
    </div>
  );
  const hote = client ? document.querySelector(".ec-contenu") : null;
  return hote ? createPortal(fenetre, hote) : fenetre;
}
