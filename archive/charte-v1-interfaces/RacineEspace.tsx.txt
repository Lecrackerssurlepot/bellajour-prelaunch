"use client";

/* La racine de l'espace client : elle porte le mode jour / nuit
   (`data-ec-mode`, lu par toutes les variables de `espace.css`) et le donne à
   qui le demande (le bouton du menu, le logo).

   Le premier rendu vient du cookie, lu par le layout serveur : la page arrive
   déjà dans le bon mode. Basculer écrit le cookie et change l'attribut, sans
   recharger. */

import { createContext, useContext, useState } from "react";
import { cookieMode, type ModeEspace } from "@/lib/collectif/affichage";

type ContexteMode = { mode: ModeEspace; basculer: () => void };

const Contexte = createContext<ContexteMode>({ mode: "nuit", basculer: () => {} });

export function useModeEspace(): ContexteMode {
  return useContext(Contexte);
}

export default function RacineEspace({ className, modeInitial, children }: { className: string; modeInitial: ModeEspace; children: React.ReactNode }) {
  const [mode, setMode] = useState<ModeEspace>(modeInitial);
  function basculer() {
    const suivant: ModeEspace = mode === "jour" ? "nuit" : "jour";
    setMode(suivant);
    document.cookie = cookieMode(suivant);
  }
  return (
    <Contexte.Provider value={{ mode, basculer }}>
      <div className={className} data-ec-mode={mode}>
        {children}
      </div>
    </Contexte.Provider>
  );
}
