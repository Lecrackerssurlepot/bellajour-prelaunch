"use client";

/* Les onglets de la fiche d'une édition (T-152, maquette « Atelier, la
   fiche ») : la longue colonne devient des onglets. Le passage d'un onglet à
   l'autre est INSTANTANÉ (tout est déjà rendu par le serveur) et l'adresse
   suit (`?onglet=`, replaceState : un rechargement rouvre le même).

   Un onglet n'est monté qu'à sa première visite, puis GARDÉ (masqué) : un
   réglage commencé ne se perd pas en allant lire les messages, et les
   messages ne sont marqués lus que si l'on ouvre leur onglet. Un lien
   `data-onglet` dans la page (les cartes de la vue d'ensemble) change
   d'onglet sans recharger. */

import Link from "next/link";
import { useState } from "react";

export type OngletFiche = { cle: string; libelle: string; badge?: number | null; href?: string };

export default function OngletsFiche({ onglets, initial, panneaux }: { onglets: OngletFiche[]; initial: string; panneaux: Record<string, React.ReactNode> }) {
  const [actif, setActif] = useState(initial in panneaux ? initial : "apercu");
  const [vus, setVus] = useState<string[]>([initial in panneaux ? initial : "apercu"]);

  function aller(cle: string) {
    if (!(cle in panneaux)) return;
    setActif(cle);
    setVus((v) => (v.includes(cle) ? v : [...v, cle]));
    const q = cle === "apercu" ? "" : `?onglet=${cle}`;
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <div
      onClick={(e) => {
        const lien = (e.target as HTMLElement).closest<HTMLElement>("[data-onglet]");
        if (!lien) return;
        e.preventDefault();
        aller(lien.dataset.onglet as string);
      }}
    >
      <nav className="eca-onglets" aria-label="Sections de la fiche">
        {onglets.map((o) =>
          o.href ? (
            <Link key={o.cle} href={o.href} className="eca-onglet">
              {o.libelle} <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <button key={o.cle} type="button" className="eca-onglet" aria-current={actif === o.cle ? "page" : undefined} onClick={() => aller(o.cle)}>
              {o.libelle}
              {o.badge && !vus.includes(o.cle) ? <span className="eca-pastille">{o.badge}</span> : null}
            </button>
          )
        )}
      </nav>
      {Object.entries(panneaux).map(([cle, contenu]) =>
        vus.includes(cle) ? (
          <div key={cle} hidden={cle !== actif} className="eca-onglet-corps">
            {contenu}
          </div>
        ) : null
      )}
    </div>
  );
}
