"use client";

/* La visionneuse d'un document (T-152, retour du 14/10) : le devis, une
   facture, une pièce jointe ou un envoi s'ouvre DANS la page, en verre,
   sans quitter l'espace. En tête : télécharger (l'icône), ouvrir dans un
   onglet, fermer. Un PDF passe par le lecteur du navigateur, une image se
   peint ; le reste se télécharge (`genreFichier`).

   La fenêtre est posée dans la colonne de contenu par un portail : ouverte
   depuis une bulle de message, elle ne serait sinon que de la taille de la
   bulle. */

import { useState } from "react";
import { createPortal } from "react-dom";
import { genreFichier } from "@/lib/collectif/visionneuse";
import Fenetre from "./Fenetre";

export type FichierVu = {
  titre: string;
  sous?: string | null;
  /** L'adresse signée qui s'AFFICHE (sans en-tête de téléchargement). */
  voir: string;
  /** L'adresse signée qui TÉLÉCHARGE (nom propre imposé), si elle existe. */
  telecharger?: string | null;
  /** Le nom d'origine, pour reconnaître le genre quand la clé ne le dit pas. */
  nom?: string | null;
};

function IconeTelecharger() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

function IconeOnglet() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export default function Visionneuse({ fichier, fermer }: { fichier: FichierVu; fermer: () => void }) {
  const genre = genreFichier(fichier.nom, fichier.voir);
  const telecharger = fichier.telecharger ?? fichier.voir;
  const hote = typeof document === "undefined" ? null : (document.querySelector(".ec-contenu") ?? document.body);
  if (!hote) return null;
  return createPortal(
    <Fenetre
      titre={fichier.titre}
      sous={fichier.sous ?? undefined}
      onFermer={fermer}
      pleine
      actions={
        <>
          <a className="ec-fenetre-fermer" href={telecharger} download aria-label="Télécharger" title="Télécharger">
            <IconeTelecharger />
          </a>
          <a className="ec-fenetre-fermer" href={fichier.voir} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir dans un nouvel onglet" title="Ouvrir dans un nouvel onglet">
            <IconeOnglet />
          </a>
        </>
      }
    >
      <div className={`ec-visionneuse ec-visionneuse--${genre}`}>
        {genre === "pdf" ? (
          <iframe src={fichier.voir} title={fichier.titre} />
        ) : genre === "image" ? (
          <img src={fichier.voir} alt={fichier.titre} decoding="async" />
        ) : (
          <div className="ec-visionneuse-autre">
            <p className="ec-texte">Ce fichier ne s&apos;affiche pas dans la page.</p>
            <a className="ec-bouton" href={telecharger} download>
              <IconeTelecharger />
              Télécharger
            </a>
          </div>
        )}
      </div>
    </Fenetre>,
    hote
  );
}

/** Une visionneuse par écran : `ouvrir(fichier)` au clic, `rendu` posé n'importe où dans l'écran. */
export function useVisionneuse(): { ouvrir: (f: FichierVu) => void; rendu: React.ReactNode } {
  const [vu, setVu] = useState<FichierVu | null>(null);
  return { ouvrir: setVu, rendu: vu ? <Visionneuse fichier={vu} fermer={() => setVu(null)} /> : null };
}
