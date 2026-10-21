"use client";

/* La fiche d'une édition et la liste des éditions se relisent toutes seules (21/10/2026, test de Mathias : « il faut
   toujours refresh »). Jusqu'ici, la liste ne se relisait que si le NOMBRE de messages à lire changeait (VeilleMessages)
   et la fiche jamais : une photo arrivée, un message, un brief validé, un nouveau bon à tirer n'apparaissaient qu'au
   rechargement.

   Le patron de `admin/atelier/Rafraichissement.tsx`, sans son pied de page :
   - une relecture par minute, RIEN quand l'onglet est caché (`useSondage`) ;
   - une relecture tout de suite au retour sur l'onglet, sauf si la dernière a moins de 20 s ;
   - `router.refresh()`, jamais `location.reload()` : il perdrait le réglage à demi rempli, l'onglet de la fiche, le
     panneau ouvert. Les panneaux qui lisent leur route à l'affichage (personnes, corbeille) se relisent d'eux-mêmes
     quand le nombre de photos de la fiche change (prop `version`). */

import { useRouter } from "next/navigation";
import { useSondage } from "@/app/edition/_composants/useSondage";
import { PERIODE_MS } from "./compteMessages";

export default function RelireLaPage() {
  const router = useRouter();
  useSondage(() => router.refresh(), PERIODE_MS);
  return null;
}
