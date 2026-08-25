"use client";

/**
 * La table de travail se met à jour toute seule.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI, ET POURQUOI PAS N'IMPORTE COMMENT
 *
 * Recette du 25/08 : « l'admin ne se met pas à jour sans refresh ». C'est
 * exact — jusqu'ici, seule une action déclenchait `router.refresh()`. Or cet
 * écran est ouvert toute la journée sur un second moniteur : une cliente qui
 * paie à onze heures n'apparaissait qu'au prochain rechargement à la main.
 *
 * Trois précautions, parce qu'une boucle de rafraîchissement mal réglée coûte
 * plus cher qu'elle ne rapporte :
 *
 * 1. RIEN QUAND L'ONGLET EST CACHÉ. La liste est en `force-dynamic` : chaque
 *    passage interroge la base. Un onglet oublié tout un week-end, c'est des
 *    milliers de requêtes pour personne. On s'arrête dès que l'onglet passe
 *    en arrière-plan, et on repart en revenant.
 *
 * 2. UN RATTRAPAGE AU RETOUR. C'est le moment qui compte vraiment : on
 *    revient sur l'onglet pour voir ce qui a bougé. Attendre le prochain tour
 *    de minuterie donnerait exactement la sensation qu'on répare.
 *
 * 3. `router.refresh()` ET NON `location.reload()`. Le rechargement du
 *    navigateur perdrait la recherche en cours, le filtre choisi, la fiche à
 *    demi remplie. `refresh()` ne réévalue que les composants serveur et
 *    laisse l'état du navigateur intact — c'est la différence entre un écran
 *    vivant et un écran qui se dérobe sous la main.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/* Une minute. L'atelier n'est pas une salle de marché : ce qu'on guette, ce
   sont des paiements et des dépôts, quelques-uns par jour. En dessous, on
   paierait la base pour rien ; au-dessus, l'écran redeviendrait un instantané. */
const PERIODE_MS = 60_000;

/* Au retour sur l'onglet, on ne redemande pas si l'on vient de le faire :
   passer d'une fenêtre à l'autre trois fois de suite ne doit pas déclencher
   trois relectures. */
const REPOS_MIN_MS = 20_000;

function ilYA(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 45) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.round(m / 60)} h`;
}

export default function Rafraichissement({ fetchedAt, demo }: { fetchedAt: string; demo?: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  /* Rejoue le compteur « il y a X » sans toucher au serveur. */
  const [tic, setTic] = useState(0);
  const [dernier, setDernier] = useState(() => Date.now());

  const relire = useCallback(() => {
    setDernier(Date.now());
    demarrer(() => router.refresh());
  }, [router]);

  useEffect(() => {
    /* En démonstration, les données sont fabriquées : rafraîchir ne changerait
       rien et donnerait l'illusion d'un flux réel. */
    if (demo) return;

    let minuterie: ReturnType<typeof setInterval> | null = null;

    const armer = () => {
      if (minuterie) return;
      minuterie = setInterval(relire, PERIODE_MS);
    };
    const desarmer = () => {
      if (!minuterie) return;
      clearInterval(minuterie);
      minuterie = null;
    };

    function auChangementDeVisibilite() {
      if (document.visibilityState === "visible") {
        armer();
        if (Date.now() - dernier > REPOS_MIN_MS) relire();
      } else {
        desarmer();
      }
    }

    if (document.visibilityState === "visible") armer();
    document.addEventListener("visibilitychange", auChangementDeVisibilite);
    return () => {
      desarmer();
      document.removeEventListener("visibilitychange", auChangementDeVisibilite);
    };
    /* `dernier` est lu dans le gestionnaire mais ne doit PAS réarmer la
       minuterie à chaque relecture : la remettre à zéro toutes les minutes
       ferait dériver la cadence. On le lit tel qu'il est au moment du retour,
       ce qui est exactement le comportement voulu. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, relire]);

  /* Le compteur du pied de page avance seul, sans requête. */
  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const lu = new Date(fetchedAt);
  const age = Number.isNaN(lu.getTime()) ? null : Date.now() - lu.getTime();
  /* `tic` n'est pas lu : il ne sert qu'à provoquer ce nouveau rendu. */
  void tic;

  return (
    <p className="adm-fetched ate-pied">
      {demo ? (
        <>Mode démonstration — pas de relecture automatique.</>
      ) : (
        <>
          <span className={enCours ? "ate-pouls ate-pouls--actif" : "ate-pouls"} aria-hidden />
          {enCours ? "Relecture…" : `Lu ${age === null ? "" : ilYA(age)}`}
          <button type="button" className="ate-pied-btn" onClick={relire} disabled={enCours}>
            Relire maintenant
          </button>
          <span className="ate-faint">Se met à jour toute seule chaque minute.</span>
        </>
      )}
    </p>
  );
}
