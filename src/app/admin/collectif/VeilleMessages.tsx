"use client";

/* Les conversations qui attendent l'atelier, partout dans l'atelier des
   éditions (T-188, planche 8 validée le 19/10).

   `PastilleMessages` : le nombre, posé sur « Messages » et sur le côté
   « Éditions » du commutateur. `VeilleMessages` (une seule par écran, dans la
   barre) : la relève et le titre de l'onglet.

   La relève suit le patron de Rafraichissement.tsx, à la lettre :
   1. une lecture LÉGÈRE par minute (un nombre, `GET /api/admin/collectif/
      en-attente`), RIEN quand l'onglet est caché ;
   2. un rattrapage au retour sur l'onglet (sauf lecture de moins de 20 s) ;
   3. `router.refresh()`, jamais un rechargement du document, et seulement là où une
      liste doit suivre (la boîte de réception, la liste des éditions), et
      seulement quand le nombre a CHANGÉ.
   Le fil d'une conversation garde sa propre relève de 3,5 s (useMessagerie,
   T-169) : celle-ci ne la remplace pas.

   L'onglet du navigateur dit « (3) Atelier · Messages ». Next réécrit le
   titre à chaque navigation : un MutationObserver remet le compte devant. */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { phraseEnAttente, titreAvecCompte } from "@/lib/collectif/nouveaux";
import {
  abonner,
  depuisDernierSignal,
  lireMagasin,
  lireMagasinServeur,
  PERIODE_MS,
  plusRecent,
  relireCompte,
  REPOS_MIN_MS,
  signalerLecture,
} from "./compteMessages";

type Compte = {
  /** Le compte lu par la page, au serveur (absent si l'écran ne compte pas lui-même). */
  initial?: number | null;
  /** L'instant serveur de cette lecture (ISO). */
  le?: string | null;
};

function useCompte({ initial, le }: Compte, suivre: boolean): number | null {
  const magasin = useSyncExternalStore(abonner, lireMagasin, lireMagasinServeur);
  if (!suivre) return typeof initial === "number" ? initial : null;
  return plusRecent(initial, le, magasin);
}

/** La pastille : rien à zéro. `suivre` : prendre la relève de la barre (les éditions) ; sinon le seul compte de la page (les particuliers). */
export function PastilleMessages({ initial, le, suivre = true }: Compte & { suivre?: boolean }) {
  const n = useCompte({ initial, le }, suivre);
  if (!n) return null;
  return (
    <span className="atb-badge">
      <span aria-hidden="true">{n}</span>
      <span className="adm-sr">{`, ${phraseEnAttente(n)}`}</span>
    </span>
  );
}

export function VeilleMessages({ initial, le, rafraichir = false }: Compte & { rafraichir?: boolean }) {
  const router = useRouter();
  const n = useCompte({ initial, le }, true);
  /* Lus seulement dans les effets et les rappels, jamais au rendu. */
  const affiche = useRef(n);
  const sansCompte = useRef(typeof initial !== "number");
  useEffect(() => {
    affiche.current = n;
  });

  useEffect(() => {
    let minuterie: ReturnType<typeof setInterval> | null = null;
    const relire = async () => {
      const avant = affiche.current;
      const apres = await relireCompte();
      if (rafraichir && apres !== null && avant !== null && apres !== avant) router.refresh();
    };
    const armer = () => {
      if (!minuterie) minuterie = setInterval(relire, PERIODE_MS);
    };
    const desarmer = () => {
      if (!minuterie) return;
      clearInterval(minuterie);
      minuterie = null;
    };
    function auChangementDeVisibilite() {
      if (document.visibilityState === "visible") {
        armer();
        if (depuisDernierSignal() > REPOS_MIN_MS) void relire();
      } else {
        desarmer();
      }
    }
    if (document.visibilityState === "visible") {
      armer();
      /* Un écran qui ne compte pas lui-même lit tout de suite (sauf lecture toute fraîche). */
      if (sansCompte.current && depuisDernierSignal() > REPOS_MIN_MS) void relire();
    }
    document.addEventListener("visibilitychange", auChangementDeVisibilite);
    return () => {
      desarmer();
      document.removeEventListener("visibilitychange", auChangementDeVisibilite);
    };
  }, [rafraichir, router]);

  /* Une page qui a compté au serveur vaut une lecture : pas de relecture juste derrière. */
  useEffect(() => {
    if (typeof initial === "number") signalerLecture();
  }, [initial, le]);

  /* Le titre de l'onglet. Le compte d'avant est toujours retiré (titreAvecCompte), jamais empilé. */
  useEffect(() => {
    const appliquer = () => {
      const voulu = titreAvecCompte(document.title, n);
      if (document.title !== voulu) document.title = voulu;
    };
    appliquer();
    const observateur = new MutationObserver(appliquer);
    observateur.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observateur.disconnect();
      document.title = titreAvecCompte(document.title, null);
    };
  }, [n]);

  return null;
}
