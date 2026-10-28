"use client";

/* La coquille de l'espace client (PRD §4.1, révision §14.1) : le menu de
   gauche, persistant, identique sur tous les écrans.

   - Révision du 13/10 : le vrai logo (cuivre la nuit, bleu le jour), le
     bouton soleil / lune en bas du menu (le mode vit dans `RacineEspace`),
     la pastille des non-lus sur « Parler à l'atelier », et AUCUNE page qui
     défile sur un écran d'ordinateur : chaque section tient dans la colonne
     de contenu et fait défiler ses propres zones longues (espace.css).

   - Le layout ne se re-rend pas en navigation (Next 16) : l'entrée active se
     lit donc ici, par `usePathname`, et chaque section est un `<Link>` :
     aucun rechargement de document.
   - Le menu affiche TOUJOURS les sept entrées (demande de Mathias). Une étape
     pas encore ouverte est grisée, avec un cadenas, non cliquable, et dit
     pourquoi au survol (title) ET au tap (la bulle s'ouvre sous l'entrée).
     La règle vient de `verrousPour`, lue aussi par la page elle-même.
   - Sur téléphone, le menu devient un tiroir. Il se referme à chaque
     navigation : au toucher d'une entrée (tout de suite, sans attendre que la
     page d'arrivée soit prête), et au changement de chemin (retour arrière,
     carte du tableau de bord), sans qu'aucune ouverture ne reste en mémoire.
   - Planche 1 du 21/10/2026 : la barre du haut fait 52 px (`--ec-barre-h`) et
     porte le logo ; quand le grand titre de l'écran défile dessous, il prend la
     place du logo (`TitreEcran` : un `IntersectionObserver`, un portail, rien au
     défilement). Le tiroir a son propre en-tête de 52 px : le logo, et la croix
     à la hauteur du bouton menu, sous le doigt.
   - Le bon à tirer est IMMERSIF (28/10, retour de Mathias : « on arrive dans une étape où le plus important est de
     contempler le magazine ») : ni menu à gauche ni barre du haut, le magazine prend tout l'écran. Le menu reste à un
     geste, en tiroir, ouvert par le bouton de l'en-tête du BAT (`ouvrirMenuEspace`, un événement du navigateur : la
     coquille garde seule l'état du tiroir). Le CSS le lit par `:has(.ec-bat3)` : le bon à tirer VERROUILLÉ garde
     la coquille ordinaire. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LOGO_MODE } from "@/lib/collectif/affichage";
import { relireAuRetour } from "@/lib/collectif/arrivees";
import { curseur, type Message } from "@/lib/collectif/messages";
import { cheminSection, MENU, sectionDuChemin, type CleSection, type Verrous } from "@/lib/collectif/verrous";
import { AppareilFournisseur } from "../_composants/AppareilContexte";
import { DepotFournisseur, HoteFenetreEnvoi } from "../_composants/depot/DepotContexte";
import { useModeEspace } from "../_composants/RacineEspace";
import { useRetourFerme } from "../_composants/useRetourFerme";
import { useSondage } from "../_composants/useSondage";
import { useVerrouDefilement } from "../_composants/useVerrouDefilement";
import RelireAuRetour from "../_composants/RelireAuRetour";
import { BarreTitreContexte } from "../_composants/TitreEcran";
import PartageEquipe from "./PartageEquipe";

/** Le signal qu'envoie la conversation quand elle a marqué les messages lus : la pastille s'éteint sans recharger. */
export const EVENEMENT_MESSAGES_LUS = "ec-messages-lus";

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
  /** Relire les messages de l'atelier sans recharger (le responsable, y compris sur un appareil pas encore reconnu). */
  suivreMessages: boolean;
  /** Le curseur (ISO, heure du serveur) : seuls les messages arrivés après lui s'ajoutent à `nonLus`. */
  depuis: string;
  /** Le responsable dépose : son moteur d'envoi vit ici, pas dans la page. */
  peutDeposer: boolean;
  /** 2A : les photos d'un envoi coupé du responsable sur cet appareil (lues au layout). */
  coupees: number;
  /** Le registre « tu » (école) : la fenêtre d'envoi tutoie. */
  tu: boolean;
  /** T-154 : le responsable sur un appareil pas encore reconnu (il lit ; un code par mail pour modifier). */
  appareil: { adresse: string } | null;
  /** T-187 : le lien d'équipe, pour « Partager avec mon équipe ». Null sauf pour le responsable (`voitLienEquipe`). */
  lienEquipe: string | null;
  children: React.ReactNode;
};

function Icone({ cle }: { cle: CleSection | "cadenas" | "menu" | "fermer" | "soleil" | "lune" }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
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
      return <svg {...p}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h6" /></svg>;
    case "atelier":
      return <svg {...p}><path d="M4 5h16v11H8l-4 4z" /></svg>;
    case "cadenas":
      return <svg {...p} width={14} height={14}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "menu":
      return <svg {...p} width={22} height={22}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "fermer":
      return <svg {...p} width={22} height={22}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "soleil":
      return <svg {...p} width={16} height={16} strokeWidth={1.8}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "lune":
      return <svg {...p} width={16} height={16} strokeWidth={1.8}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
  }
}

/** Le nom de l'événement qui ouvre le tiroir depuis un écran immersif (le bon à tirer). */
const EVENEMENT_MENU = "ec-ouvrir-menu";
export function ouvrirMenuEspace() {
  window.dispatchEvent(new Event(EVENEMENT_MENU));
}

export default function Coquille(props: Props) {
  const chemin = usePathname();
  const active = sectionDuChemin(chemin);
  const { mode, basculer } = useModeEspace();
  /* La pastille vient du layout (lu une fois) ; la conversation l'éteint en
     marquant les messages lus. */
  const [nonLus, setNonLus] = useState(props.nonLus);
  useEffect(() => {
    const eteindre = () => setNonLus(0);
    window.addEventListener(EVENEMENT_MESSAGES_LUS, eteindre);
    return () => window.removeEventListener(EVENEMENT_MESSAGES_LUS, eteindre);
  }, []);
  /* Un message de l'atelier arrivé pendant qu'on est ailleurs (Photos, le tableau de bord) allume la pastille sans
     recharger. Même route que la conversation (lecture seule, rien n'est marqué lu), toutes les 30 s, onglet visible
     seulement, et tout de suite au retour sur l'onglet (`useSondage`). Sur « Parler à l'atelier », la conversation
     lit elle-même et éteint la pastille : ici on ne fait qu'avancer le curseur. */
  const depuis = useRef(props.depuis);
  const surAtelier = active === "atelier";
  const surAtelierRef = useRef(surAtelier);
  useEffect(() => {
    surAtelierRef.current = surAtelier;
  });
  useSondage(
    async () => {
      const rep = await fetch("/api/collectif/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: props.token, depuis: depuis.current }),
      });
      if (!rep.ok) return;
      const j: { messages?: Message[] } | null = await rep.json().catch(() => null);
      const nouveaux = j?.messages ?? [];
      if (!nouveaux.length) return;
      depuis.current = curseur(nouveaux) ?? depuis.current;
      const deLAtelier = nouveaux.filter((m) => m.auteur === "atelier").length;
      if (deLAtelier && !surAtelierRef.current) setNonLus((n) => n + deLAtelier);
    },
    30_000,
    props.suivreMessages
  );
  /* Le tiroir et la bulle d'un verrou sont ouverts POUR un chemin : une
     navigation les referme d'elle-même, sans effet ni état à remettre à zéro. */
  const [tiroirPour, setTiroirPour] = useState<string | null>(null);
  const [bulleLue, setBulleLue] = useState<{ chemin: string; cle: CleSection } | null>(null);
  const ouvert = tiroirPour === chemin;
  const bulle = bulleLue?.chemin === chemin ? bulleLue.cle : null;
  const setOuvert = (v: boolean | ((o: boolean) => boolean)) =>
    setTiroirPour((typeof v === "function" ? v(ouvert) : v) ? chemin : null);
  const setBulle = (cle: CleSection | null) => setBulleLue(cle ? { chemin, cle } : null);
  /* L'ouverture est OUBLIÉE dès que le chemin change (21/10, test de Mathias : « quand je clique les photos, cela m'y
     emmène en laissant le menu ouvert »). Rattachée au seul chemin, elle restait en mémoire après la navigation :
     revenir plus tard sur ce MÊME chemin (une carte du tableau de bord) rouvrait le tiroir tout seul. Le nettoyage de
     l'effet part quand `ouvert` retombe, que ce soit un geste ou un changement de chemin : il vide la mémoire APRÈS le
     rendu (aucun setState pendant le rendu, aucun dans le corps de l'effet). Même chose pour la bulle d'un verrou. */
  useEffect(() => {
    if (!ouvert) return;
    return () => setTiroirPour(null);
  }, [ouvert]);
  useVerrouDefilement(ouvert);
  useEffect(() => {
    const ouvrir = () => setTiroirPour(chemin);
    window.addEventListener(EVENEMENT_MENU, ouvrir);
    return () => window.removeEventListener(EVENEMENT_MENU, ouvrir);
  }, [chemin]);
  /* Le geste « retour » du téléphone ferme le tiroir avant de quitter la page. */
  useRetourFerme(() => setTiroirPour(null), ouvert);
  useEffect(() => {
    if (!ouvert) return;
    function touche(e: KeyboardEvent) {
      if (e.key === "Escape") setTiroirPour(null);
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouvert]);
  useEffect(() => {
    if (!bulle) return;
    return () => setBulleLue(null);
  }, [bulle]);

  /* La barre du téléphone et la place de son titre : posées par les refs, lues par `TitreEcran` (le grand titre de
     l'écran, qui dit « je suis passé sous la barre » : `data-defile`). Aucun effet, aucun calcul au défilement. */
  const [barre, setBarre] = useState<HTMLElement | null>(null);
  const [cibleTitre, setCibleTitre] = useState<HTMLElement | null>(null);
  const [defile, setDefile] = useState(false);
  const titreBarre = useMemo(() => ({ barre, cible: cibleTitre, signaler: setDefile }), [barre, cibleTitre]);

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
            onClick={() => setOuvert(false)}
          >
            <Icone cle={e.cle} />
            <span className="ec-menu-libelle">{e.libelle}</span>
            {e.cle === "atelier" && nonLus > 0 ? (
              <span className="ec-menu-pastille" aria-label={`${nonLus} message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}`}>
                {nonLus}
              </span>
            ) : null}
          </Link>
        </li>
      );
    });

  return (
    <div className="ec-coquille" data-tiroir={ouvert ? "ouvert" : "ferme"} data-nonlus={nonLus > 0 ? "oui" : undefined}>
      <RelireAuRetour actif={relireAuRetour(active)} />
      <header className="ec-barre-mobile" ref={setBarre} data-defile={defile ? "oui" : undefined}>
        <span className="ec-barre-gauche">
          <img className="ec-logo ec-logo--mobile" src={LOGO_MODE[mode]} alt="Bellajour" width={96} height={36} />
          <span className="ec-barre-titre" aria-hidden="true" ref={setCibleTitre} />
        </span>
        {/* Le bouton garde SON dessin (le menu) tiroir ouvert : la croix est dans le tiroir, sous le doigt. */}
        <button
          type="button"
          className="ec-bouton-tiroir"
          aria-expanded={ouvert}
          aria-controls="ec-menu"
          aria-label={ouvert ? "Fermer le menu" : nonLus > 0 ? `Ouvrir le menu, ${nonLus} message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}` : "Ouvrir le menu"}
          onClick={() => setOuvert((o) => !o)}
        >
          <Icone cle="menu" />
          {/* La pastille sur le bouton, comme sur l'icône d'une messagerie : visible tiroir fermé. */}
          {nonLus > 0 && !ouvert ? (
            <span className="ec-bouton-pastille" aria-hidden="true">
              {nonLus > 9 ? "9+" : nonLus}
            </span>
          ) : null}
        </button>
      </header>

      <aside className="ec-menu" id="ec-menu" aria-label="Menu de l'édition">
        {/* L'en-tête du tiroir : le logo, et (téléphone seulement) la croix. Sur ordinateur, `display: contents` : le logo
            reste un enfant du menu, rien ne bouge. */}
        <div className="ec-menu-tete">
          <img className="ec-logo" src={LOGO_MODE[mode]} alt="Bellajour" width={116} height={43} />
          <button type="button" className="ec-bouton-tiroir ec-menu-fermer" aria-label="Fermer le menu" onClick={() => setOuvert(false)}>
            <Icone cle="fermer" />
          </button>
        </div>
        {/* Un lien ne mène qu'à UNE édition : le sélecteur n'est qu'un repère. */}
        <div className="ec-edition">
          <span className="ec-edition-nom">{props.evenement}</span>
          <span className="ec-edition-orga">{props.organisation}</span>
        </div>
        <nav>
          <ul className="ec-menu-liste">{entrees(1)}</ul>
          <hr className="ec-menu-filet" />
          <ul className="ec-menu-liste">{entrees(2)}</ul>
        </nav>
        {/* T-187 : le lien d'équipe, au responsable seulement ; le tiroir se referme quand la fenêtre s'ouvre. */}
        {props.lienEquipe ? <PartageEquipe lien={props.lienEquipe} tu={props.tu} avantOuvrir={() => setOuvert(false)} /> : null}
        <div className="ec-moi">
          <span className="ec-avatar" aria-hidden="true">
            {props.initiales}
          </span>
          <span className="ec-moi-texte">
            <span className="ec-moi-nom">{props.nom}</span>
            <span className="ec-moi-role">{props.libelleRole}</span>
          </span>
          <span className="ec-mode-choix" role="group" aria-label="Affichage">
            <button type="button" className="ec-mode" aria-pressed={mode === "jour"} onClick={() => mode !== "jour" && basculer()} aria-label="Mode jour" title="Mode jour">
              <Icone cle="soleil" />
            </button>
            <button type="button" className="ec-mode" aria-pressed={mode === "nuit"} onClick={() => mode !== "nuit" && basculer()} aria-label="Mode nuit" title="Mode nuit">
              <Icone cle="lune" />
            </button>
          </span>
        </div>
      </aside>

      {ouvert ? <button type="button" className="ec-voile" aria-label="Fermer le menu" onClick={() => setOuvert(false)} /> : null}

      <DepotFournisseur token={props.token} actif={props.peutDeposer} tu={props.tu} coupees={props.coupees}>
        {/* La lecture seule (lien d'équipe) se dit dans le menu, sous le nom :
            plus de bandeau qui s'empile au-dessus de chaque écran. */}
        <div className="ec-contenu" data-lecture={props.lectureSeule ? "oui" : undefined}>
          <BarreTitreContexte.Provider value={titreBarre}>
            <AppareilFournisseur token={props.token} appareil={props.appareil} tu={props.tu}>
              {props.children}
            </AppareilFournisseur>
          </BarreTitreContexte.Provider>
          <HoteFenetreEnvoi />
        </div>
      </DepotFournisseur>
    </div>
  );
}
