"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/**
 * Le réglage de la vue.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI PARAMÉTRABLE, ET PAS UN SEUL BON AFFICHAGE
 *
 * On ne regarde pas la même chose selon le moment. Le lundi matin, on veut
 * la file de travail triée par urgence. En point d'équipe, on veut voir où
 * en est CHAQUE dossier dans le parcours — c'est un tableau, pas une liste.
 * Et quand on cherche un dossier précis, on veut une liste plate et dense.
 *
 * Trois réglages, pas dix : le mode, le regroupement, la densité. Un panneau
 * de préférences qu'il faut apprendre est un panneau qu'on n'ouvre pas.
 *
 * Le choix survit au rechargement (localStorage). Il est PERSONNEL et jamais
 * envoyé au serveur : Louis et Mathias ne travaillent pas pareil, et ça n'a
 * pas à devenir une négociation.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type Reglages = {
  mode: "liste" | "tableau";
  groupe: "urgence" | "etape" | "aucun";
  densite: "confort" | "compact";
};

export const REGLAGES_DEFAUT: Reglages = {
  mode: "liste",
  groupe: "urgence",
  densite: "confort",
};

const CLE = "bj-atelier-vue";

/* ── abonnement au stockage ────────────────────────────────────────────
   `useSyncExternalStore` est LE motif prévu pour lire un état qui vit hors
   de React avec du rendu serveur : l'instantané serveur est vide, donc le
   serveur rend les valeurs par défaut, et React bascule sur l'instantané
   navigateur après l'hydratation. Lire localStorage pendant le rendu, ou
   poser un setState dans un effet, produisait deux HTML différents et un
   clignotement.

   L'événement `storage` du navigateur vient en prime : deux onglets ouverts
   sur l'atelier restent d'accord sans rien de plus. */
const ecouteurs = new Set<() => void>();

function abonner(rappel: () => void): () => void {
  ecouteurs.add(rappel);
  window.addEventListener("storage", rappel);
  return () => {
    ecouteurs.delete(rappel);
    window.removeEventListener("storage", rappel);
  };
}

/* `storage` ne se déclenche PAS dans l'onglet qui écrit : c'est à nous de
   prévenir les abonnés locaux. */
function prevenir() {
  for (const rappel of ecouteurs) rappel();
}

/* Repli en mémoire quand le stockage est refusé (navigation privée, réglage
   d'entreprise). Sans lui, cliquer « Tableau » ne ferait RIEN du tout, ce qui
   se lit comme un bouton cassé. Avec, le choix tient pour la session et se
   perd au rechargement : une préférence oubliée n'est pas une panne. */
let secours: string | null = null;

function lireBrut(): string {
  try {
    return localStorage.getItem(CLE) ?? secours ?? "";
  } catch {
    return secours ?? "";
  }
}

const lireBrutServeur = () => "";

export function useReglages(): [Reglages, (r: Partial<Reglages>) => void] {
  const brut = useSyncExternalStore(abonner, lireBrut, lireBrutServeur);

  const reglages = useMemo<Reglages>(() => {
    if (!brut) return REGLAGES_DEFAUT;
    try {
      return { ...REGLAGES_DEFAUT, ...JSON.parse(brut) };
    } catch {
      /* Réglage corrompu à la main : on repart des valeurs par défaut plutôt
         que de laisser l'écran vide. */
      return REGLAGES_DEFAUT;
    }
  }, [brut]);

  const majReglages = (partiel: Partial<Reglages>) => {
    const suivant = JSON.stringify({ ...reglages, ...partiel });
    secours = suivant;
    try {
      localStorage.setItem(CLE, suivant);
    } catch {
      /* Le choix tient pour la session grâce au repli ci-dessus. */
    }
    prevenir();
  };

  return [reglages, majReglages];
}

const CHOIX: Array<{
  cle: keyof Reglages;
  titre: string;
  aide: string;
  options: Array<{ valeur: string; label: string }>;
}> = [
  {
    cle: "mode",
    titre: "Affichage",
    aide: "Le tableau montre où en est chaque dossier dans le parcours.",
    options: [
      { valeur: "liste", label: "Liste" },
      { valeur: "tableau", label: "Tableau" },
    ],
  },
  {
    cle: "groupe",
    titre: "Regrouper par",
    aide: "L'urgence répond à « par quoi je commence ».",
    options: [
      { valeur: "urgence", label: "Urgence" },
      { valeur: "etape", label: "Étape" },
      { valeur: "aucun", label: "Rien" },
    ],
  },
  {
    cle: "densite",
    titre: "Densité",
    aide: "Compact tient deux fois plus de dossiers à l'écran.",
    options: [
      { valeur: "confort", label: "Confort" },
      { valeur: "compact", label: "Compact" },
    ],
  },
];

export default function Vues({
  reglages,
  onChange,
}: {
  reglages: Reglages;
  onChange: (r: Partial<Reglages>) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  return (
    <div className="ate-vues" ref={boite}>
      <button
        type="button"
        className={ouvert ? "ate-vues-btn ate-vues-btn--ouvert" : "ate-vues-btn"}
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
      >
        Vue
        <span className="ate-vues-etat">
          {reglages.mode === "tableau" ? "Tableau" : "Liste"}
        </span>
      </button>

      {ouvert ? (
        <div className="ate-vues-panneau">
          {CHOIX
            /* Regrouper une vue tableau n'a pas de sens : ses colonnes SONT
               le regroupement. On masque le réglage plutôt que de le laisser
               à l'écran sans effet. */
            .filter((c) => !(c.cle === "groupe" && reglages.mode === "tableau"))
            .map((c) => (
            <div key={c.cle} className="ate-vues-bloc">
              <span className="ate-vues-titre">{c.titre}</span>
              <div className="ate-vues-options">
                {c.options.map((o) => (
                  <button
                    key={o.valeur}
                    type="button"
                    className={
                      reglages[c.cle] === o.valeur
                        ? "ate-vues-option ate-vues-option--actif"
                        : "ate-vues-option"
                    }
                    onClick={() => onChange({ [c.cle]: o.valeur } as Partial<Reglages>)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <span className="ate-vues-aide">{c.aide}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
