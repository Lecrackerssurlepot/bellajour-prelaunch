"use client";

import { useState } from "react";
import Link from "next/link";

/* La liste des dossiers à mettre en page, filtrée par état (état d'ÉCRAN,
   rien n'est écrit). Tout arrive mis en forme par la page serveur : noms,
   libellés et dates ne se recalculent pas ici. */

export type LigneDossierMep = {
  token: string;
  nom: string;
  etat: string;
  libelle: string;
  nbPhotos: number;
  date: string;
  archive: boolean;
};

export type FiltreEtatMep = { etat: string; libelle: string; n: number };

export default function ListeDossiers({ lignes, filtres }: { lignes: LigneDossierMep[]; filtres: FiltreEtatMep[] }) {
  const [etat, setEtat] = useState<string | null>(null);
  const visibles = etat ? lignes.filter((l) => l.etat === etat) : lignes;

  if (lignes.length === 0) return <p className="mep-vide">Aucun dossier avec photos.</p>;

  return (
    <>
      <div className="ate-seg mep-filtres" role="group" aria-label="Filtrer par état">
        <button
          type="button"
          className={`ate-seg-btn${etat === null ? " ate-seg-btn--actif" : ""}`}
          aria-pressed={etat === null}
          onClick={() => setEtat(null)}
        >
          Tous{" "}<span className="mep-n">{lignes.length}</span>
        </button>
        {filtres.map((f) => (
          <button
            key={f.etat}
            type="button"
            className={`ate-seg-btn${etat === f.etat ? " ate-seg-btn--actif" : ""}`}
            aria-pressed={etat === f.etat}
            onClick={() => setEtat(f.etat)}
          >
            {f.libelle}{" "}<span className="mep-n">{f.n}</span>
          </button>
        ))}
      </div>

      <ul className="mep-dossiers">
        {visibles.map((l) => (
          <li key={l.token}>
            <Link href={`/admin/atelier/mise-en-page/${l.token}`} className="mep-dossier">
              <span className="mep-dossier-nom">{l.nom}</span>
              <span className="mep-dossier-etat">{l.libelle}</span>
              <span className="mep-dossier-photos">
                {l.nbPhotos}{" "}photo{l.nbPhotos > 1 ? "s" : ""}
              </span>
              <span className="mep-dossier-date">{l.date}</span>
              <span className="mep-dossier-archive">{l.archive ? "Archivé" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
