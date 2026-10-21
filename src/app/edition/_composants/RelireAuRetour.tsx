"use client";

/* Relire l'écran rendu au serveur quand on REVIENT sur l'onglet (21/10/2026, test de Mathias : « il faut toujours
   refresh »). Un layout ne se re-rend pas en navigation (Next 16) et une page rendue au serveur ne bouge pas
   toute seule : le menu (cadenas, pastille des non-lus), le tableau de bord, les documents et la livraison
   vieillissaient jusqu'au rechargement de la page. Sur le patron de `admin/atelier/Rafraichissement.tsx` :
   - RIEN tant que l'onglet est caché ni pendant qu'il est visible : seul le RETOUR (iPhone : revenir d'Instagram)
     relit, et pas si la dernière lecture a moins de `REPOS_MIN_MS` ;
   - `router.refresh()`, jamais `location.reload()` : il tuerait l'envoi de photos qui continue dans la coquille ;
   - seulement pour les écrans de `ECRANS_RELUS_AU_RETOUR` (arrivees.ts) : la page Photos a sa lecture légère, le bon à
     tirer et le style recopient leurs données dans un état local, un rafraîchissement n'y changerait rien. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { REPOS_MIN_MS } from "@/lib/collectif/arrivees";

export default function RelireAuRetour({ actif }: { actif: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!actif) return;
    /* Le chargement de la page vaut une lecture. */
    let derniere = Date.now();
    const auRetour = () => {
      if (document.visibilityState !== "visible" || Date.now() - derniere < REPOS_MIN_MS) return;
      derniere = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => document.removeEventListener("visibilitychange", auRetour);
  }, [actif, router]);
  return null;
}
