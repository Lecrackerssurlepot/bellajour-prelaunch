"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FluxVue } from "./types";

/**
 * Le flux entrant — la première chose qu'on lit.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS NOMBRES, ET RIEN D'AUTRE
 *
 * Un tableau de bord d'entrées qui affiche dix indicateurs ne se lit pas, il
 * se survole. Ici, trois questions, dans l'ordre où on se les pose :
 *
 *   1. Qu'est-ce que je n'ai pas encore vu ?  → c'est le seul chiffre cliquable
 *   2. Combien sont arrivées aujourd'hui ?    → le rythme du jour
 *   3. Combien attendent leurs photos ?       → la file de relance, pas du travail
 *
 * La frise de quatorze jours répond à la quatrième, celle qu'on ne formule
 * pas : « est-ce que ça accélère ? ». Elle n'a pas d'axe ni de légende — une
 * silhouette suffit à voir une tendance, et un graphique complet à cet endroit
 * volerait la vedette aux trois nombres.
 * ══════════════════════════════════════════════════════════════════════════
 */

export default function Flux({
  flux,
  tokens,
  demo,
  actif,
  onFiltrer,
}: {
  flux: FluxVue;
  /** Les dossiers actuellement à l'écran, pour « tout marquer comme vu ». */
  tokens: string[];
  demo?: boolean;
  actif: boolean;
  onFiltrer: () => void;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);

  const max = Math.max(1, ...flux.parJour.map((j) => j.demandes));

  async function toutVu() {
    if (demo) return;
    setOccupe(true);
    try {
      await fetch("/api/admin/atelier/vu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokens }),
      });
      router.refresh();
    } catch {
      /* Un marqueur non posé fait réapparaître un badge, rien de plus : pas
         de message d'erreur pour un geste sans conséquence. */
    } finally {
      setOccupe(false);
    }
  }

  return (
    <section className="ate-flux">
      <div className="ate-flux-nombres">
        <button
          type="button"
          className={actif ? "ate-flux-item ate-flux-item--actif" : "ate-flux-item"}
          onClick={onFiltrer}
          disabled={flux.nouveaux === 0}
          aria-pressed={actif}
        >
          <span className={flux.nouveaux > 0 ? "ate-flux-val ate-flux-val--fort" : "ate-flux-val"}>
            {flux.nouveaux}
          </span>
          <span className="ate-flux-label">
            {flux.nouveaux > 1 ? "jamais ouverts" : "jamais ouvert"}
          </span>
        </button>

        <div className="ate-flux-item ate-flux-item--fixe">
          <span className="ate-flux-val">{flux.demandesAujourdhui}</span>
          {/* Chaîne construite d'un bloc : un texte JSX coupé par une
              expression perd son espace au passage à la ligne, et « arrivées »
              se collait à « aujourd'hui ». */}
          <span className="ate-flux-label">
            {`${flux.demandesAujourdhui > 1 ? "arrivées" : "arrivée"} aujourd\u2019hui`}
          </span>
        </div>

        <div className="ate-flux-item ate-flux-item--fixe">
          <span className="ate-flux-val">{flux.demandesSemaine}</span>
          <span className="ate-flux-label">sur 7 jours</span>
        </div>

        {/* Ce n'est PAS du travail d'atelier : un dépôt non terminé est une
            relance. Affiché à part, en gris, pour qu'on ne le compte jamais
            dans la charge.

            « Dépôt non terminé » et non « sans photos » : le compteur
            regroupe deux situations, et l'une d'elles porte cinquante-cinq
            photos. L'ancien libellé faisait lire « dossier vide » sur un
            dossier plein, et personne ne rappelait la cliente. */}
        <div
          className="ate-flux-item ate-flux-item--fixe ate-flux-item--pale"
          title="Questionnaire rempli, dépôt jamais envoyé. Photos ou pas : elle n'a pas cliqué."
        >
          <span className="ate-flux-val">{flux.sansDepot}</span>
          <span className="ate-flux-label">dépôt non terminé</span>
        </div>

        <div className="ate-flux-frise" aria-hidden title="Demandes reçues, 14 derniers jours">
          {flux.parJour.map((j) => (
            <span
              key={j.date}
              className={j.demandes > 0 ? "ate-flux-barre ate-flux-barre--pleine" : "ate-flux-barre"}
              style={{ height: `${Math.max(6, (j.demandes / max) * 100)}%` }}
            />
          ))}
        </div>

        {flux.nouveaux > 0 && !demo ? (
          <button type="button" className="ate-flux-vu" onClick={toutVu} disabled={occupe}>
            {occupe ? "…" : "Tout marquer vu"}
          </button>
        ) : null}
      </div>

      {flux.marqueurAbsent ? (
        <p className="ate-flux-note">
          Marqueur de lecture non installé (migration <code>dossiers_vus</code> à appliquer) — « nouveau »
          retombe sur « arrivé depuis moins de 24 h ».
        </p>
      ) : null}
    </section>
  );
}
