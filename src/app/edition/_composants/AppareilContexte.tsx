"use client";

/* Le responsable sur un appareil pas encore reconnu (T-154, revu avec Mathias
   le 15/10) : l'espace s'ouvre EN LECTURE, et une pastille en tête de chaque
   écran propose « Recevoir un code pour modifier ». Le code part par mail à
   son adresse ; une fois saisi, l'appareil est reconnu un an et l'espace se
   recharge avec tous ses droits. Hors de ce cas, rien ne s'affiche. */

import { createContext, useContext, useState } from "react";
import CodeAppareil from "./CodeAppareil";
import Fenetre from "./Fenetre";

type Etat = { inconnu: boolean; ouvrir: () => void };
const Contexte = createContext<Etat>({ inconnu: false, ouvrir: () => {} });

export function AppareilFournisseur({ token, appareil, tu, children }: { token: string; appareil: { adresse: string } | null; tu: boolean; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Contexte.Provider value={{ inconnu: Boolean(appareil), ouvrir: () => setOuvert(true) }}>
      {children}
      {appareil && ouvert ? (
        <Fenetre titre="Modifier depuis cet appareil" onFermer={() => setOuvert(false)}>
          <CodeAppareil token={token} adresse={appareil.adresse} tu={tu} />
        </Fenetre>
      ) : null}
    </Contexte.Provider>
  );
}

/** La pastille d'en-tête (posée par `EnTeteEcran`, à côté de celle de l'envoi). */
export function PastilleAppareil() {
  const c = useContext(Contexte);
  if (!c.inconnu) return null;
  return (
    <button type="button" className="ec-pastille-appareil" onClick={c.ouvrir}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
      <span className="ec-pastille-appareil-long">Lecture sur cet appareil · </span>
      Recevoir un code pour modifier
    </button>
  );
}
