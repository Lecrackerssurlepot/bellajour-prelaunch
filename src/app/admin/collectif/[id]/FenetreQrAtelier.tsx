"use client";

/* Le QR code d'un lien de contribution EN GRAND, côté atelier (T-197) : à projeter
   ou à imprimer, avec le NOM du lien sous le code. Le jumeau de `FenetreQr` de
   l'espace du client (`edition/_composants/LienContribution.tsx`) : l'espace a sa
   propre feuille (`.ec-espace`) qui n'est pas chargée ici, d'où cette fenêtre-ci,
   en `eca-` et en verre de l'atelier.

   ⚠️ Elle s'ouvre par un PORTAIL dans `.eca-root` : un panneau de verre
   (`backdrop-filter`, la carte qui l'appelle) devient le bloc conteneur de tout ce
   qui est positionné dedans, et la fenêtre resterait enfermée dans sa carte. Même
   leçon que `Fenetre` côté client (15/10).
   « Imprimer » ne sort que le nom et le code, sur une feuille A4
   (`pageQrImprimable`), jamais la fiche entière. */

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { imprimerPage } from "@/lib/collectif/imprimer";
import { cheminQr, matriceQr, nomFichierQr, pageQrImprimable, svgQr } from "@/lib/collectif/qr";

const rien = () => () => {};

export default function FenetreQrAtelier({ nom, url, details, onFermer }: { nom: string; url: string; details: string; onFermer: () => void }) {
  const titre = useId();
  const client = useSyncExternalStore(rien, () => true, () => false);
  const fenetre = useRef<HTMLDivElement>(null);
  const { d, cote } = cheminQr(matriceQr(url));

  /* `onFermer` est souvent une flèche refaite à chaque rendu du parent : on la garde dans une réf pour que
     l'effet du clavier ne se rejoue pas (il volerait le focus à chaque rendu). */
  const fermer = useRef(onFermer);
  useEffect(() => {
    fermer.current = onFermer;
  });
  useEffect(() => {
    /* Le clavier : la fenêtre prend le focus à l'ouverture et le rend en se fermant ; Échap la ferme. */
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    fenetre.current?.focus();
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer.current();
    };
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("keydown", touche);
      avant?.focus();
    };
  }, []);

  function telecharger() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svgQr(url)], { type: "image/svg+xml" }));
    a.download = nomFichierQr(nom);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const contenu = (
    <div className="eca-fen-voile" role="presentation" onClick={onFermer}>
      <div ref={fenetre} className="eca-fen" role="dialog" aria-modal="true" aria-labelledby={titre} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="eca-fen-tete">
          <h2 className="eca-fen-titre" id={titre}>
            Le QR code du lien
          </h2>
          <button type="button" className="eca-fen-fermer" aria-label="Fermer" onClick={onFermer}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <p className="eca-champ-aide">À projeter ou à imprimer : on le scanne avec l&apos;appareil photo du téléphone, sans application.</p>
        <div className="eca-fen-qr">
          <svg className="eca-qr" viewBox={`0 0 ${cote} ${cote}`} shapeRendering="crispEdges" role="img" aria-label={`QR code du lien « ${nom} »`}>
            <rect className="eca-qr-fond" width={cote} height={cote} />
            <path className="eca-qr-modules" d={d} />
          </svg>
          <strong className="eca-fen-nom">{nom}</strong>
          <span className="eca-sous eca-fen-details">{details}</span>
        </div>
        <div className="eca-fen-gestes">
          <button
            type="button"
            className="adm-btn"
            onClick={() =>
              imprimerPage(
                pageQrImprimable({ nom, url, consigne: "Pour déposer ses photos : scanner ce code avec l'appareil photo du téléphone.", details })
              )
            }
          >
            Imprimer
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={telecharger}>
            Télécharger le QR
          </button>
        </div>
      </div>
    </div>
  );
  const hote = client ? document.querySelector(".eca-root") : null;
  return hote ? createPortal(contenu, hote) : contenu;
}
