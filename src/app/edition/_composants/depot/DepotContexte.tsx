"use client";

/* Le moteur d'envoi du RESPONSABLE vit dans la coquille, pas dans la page
   (PRD §5.2.3) : il peut aller lire ses messages ou le mur des styles pendant
   que trois cents photos partent. Un seul moteur par espace ouvert. */

import Link from "next/link";
import { createContext, useContext, useMemo } from "react";
import { MoteurDepot } from "./moteur";
import { useMoteur } from "./useMoteur";

const Contexte = createContext<MoteurDepot | null>(null);

export function useMoteurDepot(): MoteurDepot | null {
  return useContext(Contexte);
}

export function DepotFournisseur({ token, actif, children }: { token: string; actif: boolean; children: React.ReactNode }) {
  const moteur = useMemo(() => (actif ? new MoteurDepot({ token }) : null), [token, actif]);
  return <Contexte.Provider value={moteur}>{children}</Contexte.Provider>;
}

/** La pastille « envoi en cours », visible depuis toutes les sections. */
export function PastilleEnvoi({ lien }: { lien: string }) {
  const moteur = useMoteurDepot();
  const vue = useMoteur(moteur);
  if (!moteur || vue.enCours === 0) return null;
  const faites = vue.total - vue.enCours;
  return (
    <Link href={lien} className="ec-pastille-envoi" prefetch={false}>
      Envoi des photos : {faites} sur {vue.total}
    </Link>
  );
}
