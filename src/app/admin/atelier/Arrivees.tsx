"use client";

import Link from "next/link";
import {
  LIBELLE_MOTIF,
  ORDRE_MOTIFS,
  SOUS_TITRE_MOTIF,
  type MotifArrivee,
} from "@/lib/atelier/arrivees";
import { LIBELLE_CAMP } from "@/lib/atelier/prochaineEtape";
import type { ArriveeVue } from "./types";

/**
 * La boîte du jour : « Depuis hier ».
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA PREMIÈRE CHOSE QU'ON LIT, ET ELLE EST EN LECTURE SEULE
 *
 * Trois groupes, dans l'ordre où on se pose les questions : qu'est-ce qui est
 * arrivé à composer, qu'est-ce que le client vient de nous renvoyer, et, en
 * gris, qui a rempli un questionnaire sans rien envoyer. Chaque ligne dit le
 * geste attendu et la promesse qui court.
 *
 * Aucun bouton, par décision de Mathias (11/09/2026) : on ouvre la fiche pour
 * agir, et la ligne disparaît d'elle-même une fois qu'on a joué (la règle est
 * dans lib/atelier/arrivees.ts). Une boîte d'arrivée qu'il faut vider à la
 * main devient une corvée ; celle-ci se vide en travaillant.
 * ══════════════════════════════════════════════════════════════════════════
 */

function heureOuJour(iso: string, maintenant: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jour = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (jour(d) === jour(maintenant)) return heure;
  const hier = new Date(maintenant.getTime() - 86_400_000);
  if (jour(d) === jour(hier)) return `hier ${heure}`;
  return `${d.toLocaleDateString("fr-FR", { weekday: "long" })} ${heure}`;
}

function dateDuJour(maintenant: Date): string {
  return maintenant.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Arrivees({
  arrivees,
  base,
  fetchedAt,
  marqueurAbsent,
}: {
  arrivees: ArriveeVue[];
  base: string;
  fetchedAt: string;
  marqueurAbsent: boolean;
}) {
  const maintenant = new Date(fetchedAt);
  const groupes = ORDRE_MOTIFS.map((motif) => ({
    motif,
    lignes: arrivees.filter((a) => a.motif === motif),
  })).filter((g) => g.lignes.length > 0);

  return (
    <section className="ate-jour">
      <header className="ate-jour-tete">
        <h2 className="ate-jour-titre">Depuis hier</h2>
        <span className="ate-jour-sous">
          {dateDuJour(maintenant)}
          <span className="ate-sep">·</span>
          {arrivees.length === 0
            ? "rien n'est arrivé"
            : `${arrivees.length} dossier${arrivees.length > 1 ? "s ont bougé" : " a bougé"}`}
        </span>
      </header>

      {groupes.length === 0 ? (
        <p className="ate-jour-vide">Rien n&apos;est arrivé depuis hier.</p>
      ) : (
        groupes.map((g) => (
          <div key={g.motif} className={`ate-jour-groupe ate-jour-groupe--${g.motif as MotifArrivee}`}>
            <h3 className="ate-jour-groupe-titre">
              <span>{LIBELLE_MOTIF[g.motif]}</span>
              <span className="ate-jour-groupe-compte">{g.lignes.length}</span>
              <span className="ate-jour-groupe-sous">{SOUS_TITRE_MOTIF[g.motif]}</span>
            </h3>
            <ul className="ate-jour-liste">
              {g.lignes.map((a) => (
                <li key={a.token} className="ate-jour-ligne">
                  <Link href={`${base}/${a.token}`} className="ate-jour-lien">
                    <span className="ate-jour-dossier">
                      <span className="ate-jour-dossier-titre">
                        {a.titre?.trim() || <em className="ate-faint">Sans titre</em>}
                      </span>
                      <span className="ate-jour-dossier-sous">
                        {a.prenom || "—"} {a.quoi}
                        <span className="ate-sep">·</span>
                        {a.nbPhotos} photo{a.nbPhotos > 1 ? "s" : ""}
                        <span className="ate-sep">·</span>
                        {heureOuJour(a.quand, maintenant)}
                      </span>
                    </span>
                    <span className="ate-jour-suite">
                      <span className={`ate-camp ate-camp--${a.camp}`}>{LIBELLE_CAMP[a.camp]}</span>
                      <span className="ate-jour-geste">{a.promesse ?? a.geste}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {marqueurAbsent ? (
        <p className="ate-jour-note">
          Marqueur de lecture non installé (migration <code>dossiers_vus</code> à appliquer) : « jamais
          ouvert » retombe sur « arrivé depuis moins de 24 h ».
        </p>
      ) : null}
    </section>
  );
}
