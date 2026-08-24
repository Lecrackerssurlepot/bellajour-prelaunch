"use client";

import type { Parcours as ParcoursVue } from "@/lib/atelier/parcours";
import type { Camp } from "@/lib/atelier/urgence";

/**
 * La frise du dossier — huit jalons, en haut de la fiche.
 *
 * Elle répond à la première question qu'on se pose en ouvrant un dossier
 * qu'on n'a pas touché depuis trois semaines : où en est-on, qu'est-ce qui a
 * déjà eu lieu, et qu'est-ce qui vient. Une pastille d'état ne répond qu'au
 * premier tiers.
 *
 * Trois lectures superposées, dans cet ordre de priorité visuelle :
 *   — le jalon COURANT est le seul en couleur pleine ;
 *   — ce qui est FAIT porte sa date et son auteur ;
 *   — ce qui VIENT est en gris, avec qui devra jouer.
 */

const QUI: Record<Camp, string> = {
  atelier: "à nous",
  cliente: "à elle",
  dehors: "en dehors",
  fini: "terminé",
};

function jour(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function Parcours({ parcours }: { parcours: ParcoursVue }) {
  return (
    <section className="ate-parcours">
      <ol className="ate-frise">
        {parcours.jalons.map((j) => (
          <li key={j.etat} className={`ate-jalon ate-jalon--${j.statut}`}>
            <span className="ate-jalon-barre" aria-hidden />
            <span className="ate-jalon-pastille" aria-hidden>
              {j.statut === "fait" ? "✓" : j.etape}
            </span>
            <span className="ate-jalon-titre">{j.titre}</span>
            <span className="ate-jalon-note">
              {j.statut === "fait" ? (
                /* La date manque sur les dossiers avancés à la main en SQL,
                   avant /admin : le journal n'en a pas gardé trace. Un trou
                   visible vaut mieux qu'une date inventée. */
                j.quand ? (
                  <>
                    {jour(j.quand)}
                    {j.par ? <span className="ate-jalon-par"> · {j.par}</span> : null}
                  </>
                ) : (
                  <span className="ate-faint">fait</span>
                )
              ) : j.statut === "encours" ? (
                <strong>{QUI[j.attend]}</strong>
              ) : (
                QUI[j.attend]
              )}
            </span>
          </li>
        ))}
      </ol>

      {parcours.detour ? (
        <p className={parcours.detour.actif ? "ate-detour ate-detour--actif" : "ate-detour"}>
          {parcours.detour.actif
            ? "Détour en cours : on lui a demandé plus de photos. Le dossier reviendra à l'étape 1 dès qu'elle aura redéposé."
            : `Ce dossier est passé par « photos insuffisantes »${
                parcours.detour.quand ? ` le ${jour(parcours.detour.quand)}` : ""
              }, puis est revenu.`}
        </p>
      ) : null}

      {/* « La suite » plutôt qu'un simple état : on veut savoir quoi faire,
          pas où on est rangé. */}
      <p className="ate-suite">
        <span className={`ate-suite-qui ate-suite-qui--${parcours.prochain.attend}`}>
          {QUI[parcours.prochain.attend]}
        </span>
        {parcours.prochain.quoi}
      </p>
    </section>
  );
}
