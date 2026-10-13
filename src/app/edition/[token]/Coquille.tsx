"use client";

/* La coquille de l'espace client (PRD §4.1) : le menu de gauche, persistant.

   - Le layout ne se re-rend pas en navigation (Next 16) : l'entrée active se
     lit donc ici, par `usePathname`, et chaque section est un `<Link>` :
     aucun rechargement de document.
   - Le menu affiche TOUJOURS les sept entrées (demande de Mathias). Une étape
     pas encore ouverte est grisée, avec un cadenas, non cliquable, et dit
     pourquoi au survol (title) ET au tap (la bulle s'ouvre sous l'entrée).
     La règle vient de `verrousPour`, lue aussi par la page elle-même.
   - Sur téléphone, le menu devient un tiroir. Il se referme à chaque
     navigation. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cheminSection, MENU, sectionDuChemin, type CleSection, type Verrous } from "@/lib/collectif/verrous";

type Props = {
  token: string;
  organisation: string;
  evenement: string;
  nom: string;
  initiales: string;
  libelleRole: string;
  lectureSeule: boolean;
  verrous: Verrous;
  nonLus: number;
  bandeauLecture: string;
  children: React.ReactNode;
};

function Icone({ cle }: { cle: CleSection | "cadenas" | "menu" | "fermer" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (cle) {
    case "tableau":
      return <svg {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
    case "style":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="8.5" cy="10" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="15.5" cy="10" r="1.2" /><path d="M12 21a3 3 0 0 1 0-6h1.5" /></svg>;
    case "photos":
      return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg>;
    case "bat":
      return <svg {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" /></svg>;
    case "livraison":
      return <svg {...p}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></svg>;
    case "dossier":
      return <svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case "atelier":
      return <svg {...p}><path d="M4 5h16v11H8l-4 4z" /></svg>;
    case "cadenas":
      return <svg {...p} width={14} height={14}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "menu":
      return <svg {...p} width={22} height={22}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "fermer":
      return <svg {...p} width={22} height={22}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
}

export default function Coquille(props: Props) {
  const chemin = usePathname();
  const active = sectionDuChemin(chemin);
  /* Le tiroir et la bulle d'un verrou sont ouverts POUR un chemin : une
     navigation les referme d'elle-même, sans effet ni état à remettre à zéro. */
  const [tiroirPour, setTiroirPour] = useState<string | null>(null);
  const [bulleLue, setBulleLue] = useState<{ chemin: string; cle: CleSection } | null>(null);
  const ouvert = tiroirPour === chemin;
  const bulle = bulleLue?.chemin === chemin ? bulleLue.cle : null;
  const setOuvert = (v: boolean | ((o: boolean) => boolean)) =>
    setTiroirPour((typeof v === "function" ? v(ouvert) : v) ? chemin : null);
  const setBulle = (cle: CleSection | null) => setBulleLue(cle ? { chemin, cle } : null);

  const entrees = (groupe: 1 | 2) =>
    MENU.filter((e) => e.groupe === groupe).map((e) => {
      const raison = props.verrous[e.cle];
      if (raison) {
        return (
          <li key={e.cle}>
            <span
              role="link"
              aria-disabled="true"
              tabIndex={0}
              title={raison}
              aria-label={`${e.libelle}, verrouillé : ${raison}`}
              className="ec-menu-item ec-menu-item--verrou"
              onClick={() => setBulle(bulle === e.cle ? null : e.cle)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  setBulle(bulle === e.cle ? null : e.cle);
                }
              }}
            >
              <Icone cle={e.cle} />
              <span className="ec-menu-libelle">{e.libelle}</span>
              <span className="ec-menu-cadenas">
                <Icone cle="cadenas" />
              </span>
            </span>
            {bulle === e.cle ? (
              <span className="ec-menu-bulle" role="status">
                {raison}
              </span>
            ) : null}
          </li>
        );
      }
      return (
        <li key={e.cle}>
          <Link
            href={cheminSection(props.token, e.cle)}
            className="ec-menu-item"
            aria-current={active === e.cle ? "page" : undefined}
            prefetch={false}
          >
            <Icone cle={e.cle} />
            <span className="ec-menu-libelle">{e.libelle}</span>
            {e.cle === "dossier" && props.nonLus > 0 ? (
              <span className="ec-menu-pastille" aria-label={`${props.nonLus} message${props.nonLus > 1 ? "s" : ""} non lu${props.nonLus > 1 ? "s" : ""}`}>
                {props.nonLus}
              </span>
            ) : null}
          </Link>
        </li>
      );
    });

  return (
    <div className="ec-coquille" data-tiroir={ouvert ? "ouvert" : "ferme"}>
      <header className="ec-barre-mobile">
        <span className="ec-marque">Bellajour</span>
        <button
          type="button"
          className="ec-bouton-tiroir"
          aria-expanded={ouvert}
          aria-controls="ec-menu"
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOuvert((o) => !o)}
        >
          <Icone cle={ouvert ? "fermer" : "menu"} />
        </button>
      </header>

      <aside className="ec-menu" id="ec-menu" aria-label="Menu de l'édition">
        <span className="ec-marque ec-marque--menu">Bellajour</span>
        <div className="ec-edition">
          <span className="ec-edition-nom">{props.evenement}</span>
          <span className="ec-edition-orga">{props.organisation}</span>
        </div>
        <nav>
          <ul className="ec-menu-liste">{entrees(1)}</ul>
          <hr className="ec-menu-filet" />
          <ul className="ec-menu-liste">{entrees(2)}</ul>
        </nav>
        <div className="ec-moi">
          <span className="ec-avatar" aria-hidden="true">
            {props.initiales}
          </span>
          <span className="ec-moi-texte">
            <span className="ec-moi-nom">{props.nom}</span>
            <span className="ec-moi-role">{props.libelleRole}</span>
          </span>
        </div>
      </aside>

      {ouvert ? <button type="button" className="ec-voile" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}

      <div className="ec-contenu">
        {props.lectureSeule ? <p className="ec-bandeau">{props.bandeauLecture}</p> : null}
        {props.children}
      </div>
    </div>
  );
}
