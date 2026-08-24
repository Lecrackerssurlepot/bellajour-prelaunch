"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ActiviteVue } from "./types";

/**
 * Ce qui s'est passé dans l'atelier, tous dossiers confondus.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'AUTRE MOITIÉ DU SUIVI
 *
 * La table de travail dit ce qu'il RESTE à faire. Le journal d'une fiche dit
 * ce qui est arrivé à UN dossier. Il manquait la question du soir : qu'est-ce
 * qu'on a fait aujourd'hui, et qu'est-ce qui est réellement parti chez les
 * clientes ?
 *
 * Replié par défaut. Ce n'est pas ce qu'on regarde en arrivant — c'est ce
 * qu'on ouvre quand on veut vérifier, ou quand on reprend après deux jours.
 * Le compteur du bouton suffit à savoir s'il s'est passé quelque chose.
 * ══════════════════════════════════════════════════════════════════════════
 */

function heure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* « Aujourd'hui » / « Hier » plutôt qu'une date : sur une fenêtre de deux
   jours, c'est la seule distinction qui compte, et elle se lit sans calcul. */
function nomDuJour(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  const jour = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const hier = new Date(maintenant.getTime() - 86_400_000);
  if (jour(d) === jour(maintenant)) return "Aujourd'hui";
  if (jour(d) === jour(hier)) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Activite({
  activite,
  base,
  fetchedAt,
}: {
  activite: ActiviteVue[];
  base: string;
  fetchedAt: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  const { parJour, aujourdhui } = useMemo(() => {
    const maintenant = new Date(fetchedAt);
    const groupes = new Map<string, ActiviteVue[]>();
    let compteDuJour = 0;
    for (const a of activite) {
      const nom = nomDuJour(a.createdAt, maintenant);
      if (nom === "Aujourd'hui") compteDuJour++;
      const arr = groupes.get(nom) ?? [];
      arr.push(a);
      groupes.set(nom, arr);
    }
    return { parJour: [...groupes.entries()], aujourdhui: compteDuJour };
  }, [activite, fetchedAt]);

  if (!activite.length) return null;

  return (
    <section className={ouvert ? "ate-activite ate-activite--ouvert" : "ate-activite"}>
      <button
        type="button"
        className="ate-activite-tete"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
      >
        <span className="ate-activite-titre">Ce qui s&apos;est passé</span>
        <span className="ate-activite-compte">
          {aujourdhui > 0
            ? `${aujourdhui} aujourd'hui`
            : `${activite.length} sur deux jours`}
        </span>
        <span className="ate-chevron" aria-hidden>
          {ouvert ? "▾" : "▸"}
        </span>
      </button>

      {ouvert ? (
        <div className="ate-activite-corps">
          {parJour.map(([nom, lignes]) => (
            <div key={nom} className="ate-activite-jour">
              <h3 className="ate-activite-jour-titre">{nom}</h3>
              <ul className="ate-activite-liste">
                {lignes.map((a) => (
                  <li key={a.id} className={`ate-ev ate-ev--${a.recit.ton}`}>
                    <span className="ate-ev-point" aria-hidden />
                    <span className="ate-ev-corps">
                      <span className="ate-ev-texte">
                        {a.recit.texte}
                        {" — "}
                        <Link href={`${base}/${a.token}`} className="ate-activite-lien">
                          {a.titre?.trim() || "sans titre"}
                        </Link>
                      </span>
                      {a.recit.detail ? <span className="ate-ev-detail">{a.recit.detail}</span> : null}
                    </span>
                    <span className="ate-ev-date">{heure(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="ate-activite-pied">
            Les deux derniers jours. L&apos;histoire complète d&apos;un dossier est sur sa fiche.
          </p>
        </div>
      ) : null}
    </section>
  );
}
