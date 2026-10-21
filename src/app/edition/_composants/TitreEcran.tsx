"use client";

/* Le grand titre d'un écran, et sa copie dans la barre du téléphone (planche 1 du 21/10/2026).

   Sur téléphone la barre du haut fait 52 px et ne grossit jamais ; elle porte le logo. Dès que le GRAND titre de
   l'écran passe sous elle, le logo lui laisse la place (un fondu court, `espace.css`) : on sait toujours où l'on est.
   En haut de page, le logo revient.

   - Aucun calcul au défilement : un `IntersectionObserver` regarde le titre et dit à la coquille « il est passé sous
     la barre » (`data-defile="oui"` sur la barre). Rien ne s'exécute pendant qu'on fait défiler.
   - La copie du titre est un PORTAIL dans la barre (`cible`, posée par `Coquille`) : le titre peut être n'importe quel
     contenu (« 3 cochées » change à chaque case), les deux exemplaires suivent le même rendu, sans second état.
   - Un titre qu'on ne voit pas (`display: none`, comme la fiche d'une personne ou la corbeille, qui portent leur
     propre titre) n'a pas de hauteur : il ne passe donc JAMAIS sous la barre, le logo reste.
   - Sur ordinateur la barre est cachée et le titre ne quitte jamais l'écran (la page ne défile pas) : rien à faire.
   Le contexte est posé par `Coquille` ; hors d'elle (jamais aujourd'hui) le titre reste un simple titre. */

import { createContext, useContext, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type BarreTitre = {
  /** La barre du téléphone (pour savoir où le titre « passe dessous »). */
  barre: HTMLElement | null;
  /** L'endroit de la barre où la copie du titre se pose. */
  cible: HTMLElement | null;
  /** Le grand titre est passé sous la barre (ou revenu). */
  signaler: (defile: boolean) => void;
};

export const BarreTitreContexte = createContext<BarreTitre>({ barre: null, cible: null, signaler: () => {} });

export default function TitreEcran({ children }: { children: React.ReactNode }) {
  const { barre, cible, signaler } = useContext(BarreTitreContexte);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = titre.current;
    if (!el || !barre || typeof IntersectionObserver === "undefined") return;
    /* Le bord bas de la barre, tel qu'elle est posée (marge, zone sûre) : le titre « passe dessous » quand il le
       franchit. Barre cachée (ordinateur) : 0, le titre est toujours dans la fenêtre. */
    const bas = Math.max(0, Math.round(barre.getBoundingClientRect().bottom));
    const obs = new IntersectionObserver(
      (entrees) => {
        const e = entrees[entrees.length - 1];
        if (!e) return;
        const dessus = e.boundingClientRect.height > 0 && e.boundingClientRect.bottom <= (e.rootBounds?.top ?? bas) + 1;
        signaler(!e.isIntersecting && dessus);
      },
      { rootMargin: `-${bas}px 0px 0px 0px`, threshold: 0 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      signaler(false);
    };
  }, [barre, signaler]);

  return (
    <>
      <h1 ref={titre} className="ec-ecran-titre">
        {children}
      </h1>
      {cible ? createPortal(children, cible) : null}
    </>
  );
}
