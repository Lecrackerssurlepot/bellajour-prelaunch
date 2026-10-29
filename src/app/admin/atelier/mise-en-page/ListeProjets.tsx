"use client";

import { useState } from "react";
import Link from "next/link";
import type { OngletMep, ProjetMep, SourceMep } from "./projets";

/* La page des projets : trois onglets, une recherche, un filtre de source,
   un tableau, et un panneau d'aperçu au clic. État d'ÉCRAN seulement, rien
   n'est écrit. Tout arrive mis en forme par le serveur. */

const ONGLETS: { id: OngletMep; libelle: string; vide: string }[] = [
  { id: "demarrer", libelle: "À démarrer", vide: "Rien à démarrer" },
  { id: "cours", libelle: "En cours", vide: "Aucun projet en cours" },
  { id: "archives", libelle: "Archivés", vide: "Aucun projet archivé" },
];

const SOURCES: { id: SourceMep | null; libelle: string }[] = [
  { id: null, libelle: "Tout" },
  { id: "particulier", libelle: "Particuliers" },
  { id: "edition", libelle: "Éditions" },
  { id: "libre", libelle: "Libre" },
];

const MOT_SOURCE: Record<SourceMep, string> = { particulier: "Particulier", edition: "Édition", libre: "Création libre" };

const nbPhotos = (n: number | null) => (n === null ? "" : n === 0 ? "Aucune photo" : `${n.toLocaleString("fr-FR")} photo${n > 1 ? "s" : ""}`);

export default function ListeProjets({ projets }: { projets: ProjetMep[] }) {
  const [onglet, setOnglet] = useState<OngletMep>(() => (projets.some((p) => p.onglet === "cours") ? "cours" : "demarrer"));
  const [source, setSource] = useState<SourceMep | null>(null);
  const [q, setQ] = useState("");
  const [choisi, setChoisi] = useState<string | null>(null);

  const compte = (o: OngletMep) => projets.filter((p) => p.onglet === o).length;
  const requete = q.trim().toLowerCase();
  const visibles = projets.filter(
    (p) => p.onglet === onglet && (!source || p.source === source) && (!requete || p.nom.toLowerCase().includes(requete))
  );
  const peek = choisi ? (visibles.find((p) => p.cle === choisi) ?? null) : null;

  return (
    <>
      <div className="ate-seg mep-onglets" role="tablist" aria-label="Projets">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            className={`ate-seg-btn${onglet === o.id ? " ate-seg-btn--actif" : ""}`}
            onClick={() => {
              setOnglet(o.id);
              setChoisi(null);
            }}
          >
            {o.libelle} <span className="mep-n">{compte(o.id)}</span>
          </button>
        ))}
      </div>

      <div className="mep-outils">
        <input
          type="search"
          className="adm-input ate-recherche"
          placeholder="Rechercher"
          aria-label="Rechercher un projet"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ate-seg" role="group" aria-label="Source">
          {SOURCES.map((s) => (
            <button
              key={s.libelle}
              type="button"
              aria-pressed={source === s.id}
              className={`ate-seg-btn${source === s.id ? " ate-seg-btn--actif" : ""}`}
              onClick={() => setSource(s.id)}
            >
              {s.libelle}
            </button>
          ))}
        </div>
      </div>

      <div className={`mep-corps${peek ? " mep-corps--peek" : ""}`}>
        {visibles.length === 0 ? (
          <p className="mep-vide">{requete || source ? "Aucun résultat" : ONGLETS.find((o) => o.id === onglet)?.vide}</p>
        ) : (
          <ul className="mep-dossiers" aria-label="Projets">
            <li className="mep-ligne-tete" aria-hidden="true">
              <span>Projet</span>
              <span>Source</span>
              <span>État</span>
              <span>Photos</span>
              <span>Modifié</span>
            </li>
            {visibles.map((p) => (
              <li key={p.cle}>
                <button
                  type="button"
                  className="mep-dossier"
                  aria-pressed={choisi === p.cle}
                  onClick={() => setChoisi(choisi === p.cle ? null : p.cle)}
                >
                  <span className="mep-dossier-nom">{p.nom}</span>
                  <span className="mep-dossier-etat">{MOT_SOURCE[p.source]}</span>
                  <span className="mep-dossier-statut">
                    {p.etat}
                    {p.collecteOuverte ? <span className="ate-tag ate-tag--attente">Collecte ouverte</span> : null}
                    {p.photosSupprimees ? <span className="ate-tag ate-tag--archive">Photos supprimées</span> : null}
                  </span>
                  <span className="mep-dossier-photos">{nbPhotos(p.nbPhotos)}</span>
                  <span className="mep-dossier-date">{p.modifieLe ? `${p.modifieLe}${p.modifiePar ? ` · ${p.modifiePar}` : ""}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {peek ? <Apercu p={peek} onFermer={() => setChoisi(null)} /> : null}
      </div>
    </>
  );
}

function Apercu({ p, onFermer }: { p: ProjetMep; onFermer: () => void }) {
  const lignes: [string, string][] = [["État", p.etat]];
  if (p.nbPhotos !== null) lignes.push(["Photos", p.nbPhotos.toLocaleString("fr-FR")]);
  if (p.modifieLe) lignes.push(["Modifié", `${p.modifieLe}${p.modifiePar ? ` par ${p.modifiePar}` : ""}`]);
  lignes.push(["Export", p.exporteLe ?? "Jamais"]);

  return (
    <aside className="mep-apercu" aria-label="Aperçu du projet">
      <div className="mep-apercu-tete">
        <h2 className="mep-apercu-titre">{p.nom}</h2>
        <button type="button" className="adm-btn adm-btn--ghost mep-fermer" aria-label="Fermer l'aperçu" onClick={onFermer}>
          ×
        </button>
      </div>
      <span className="mep-dossier-etat">{MOT_SOURCE[p.source]}</span>
      {p.collecteOuverte ? <p className="mep-alerte">Des photos peuvent arriver</p> : null}
      {p.photosSupprimees ? <p className="mep-alerte mep-alerte--gris">Photos supprimées</p> : null}
      {p.sourceArchivee ? <p className="mep-alerte mep-alerte--gris">Source archivée</p> : null}
      <dl className="mep-apercu-liste">
        {lignes.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mep-apercu-gestes">
        <Link href={p.href} className="adm-btn mep-ouvrir">
          {p.onglet === "demarrer" ? "Démarrer" : "Ouvrir"}
        </Link>
      </div>
    </aside>
  );
}
