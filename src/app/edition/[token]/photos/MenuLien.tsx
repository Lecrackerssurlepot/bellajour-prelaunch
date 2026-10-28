"use client";

/* Le menu « … » d'une tuile de lien (Partager, QR code, Modifier le nom et le nombre, Supprimer le lien).
   Déplacé tel quel de `Liens.tsx` le 21/10 (la mosaïque des liens, planche 3 : la tuile le porte, plus la carte) :
   Liens.tsx et Mosaique.tsx l'importent tous les deux, il ne pouvait plus vivre dans l'un des deux.

   21/10 (« vérifier bien les chevauchements ») : un vrai menu, ancré sous son bouton, fond opaque, qui se ferme
   au clic dehors, à Échap, au défilement (ordinateur), et rend le focus à son bouton. Avant, un bloc de verre posé
   en travers de la carte, qui laissait lire son titre et son QR à travers.

   21/10 (planche 3B) : le même menu sur téléphone, plus une feuille du bas : un petit menu de 292 px sous le « … »,
   son bord sur le bord de la tuile, du côté où il y a de la place (les autres tuiles s'éteignent, `mosaique.css`). */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRetourFerme } from "@/components/couche/useRetourFerme";
import { useVerrouDefilement } from "@/components/couche/useVerrouDefilement";
import { Trace } from "./Grille";

/** Une action du menu : son nom, son icône (un tracé de `Trace`), et ce qu'elle fait. `danger` : en rouge, après un filet. `filetAvant` : un filet avant elle, sans la mettre en rouge (« Terminer la collecte », le geste final, à part). */
export type ActionMenu = { cle: string; libelle: string; icone: string; danger?: boolean; filetAvant?: boolean; faire: () => void };

/** Où est le bouton « … » quand on l'ouvre, de quel côté le menu s'accroche (bord droit sur bord droit, ou bord gauche sur bord gauche
    quand il sortirait de la colonne de contenu et couvrirait le menu de gauche) et dans quel sens il se déroule (en bas, ou au-dessus s'il n'y a pas la place). */
export type OuvertMenu = { cle: string; cote: "droite" | "gauche"; x: number; ligne: number; sens: "bas" | "haut" };
/** Largeur du menu (espace.css : `min(292px, 100vw - 24px)`). */
const LARGEUR_MENU = 292;
/** Hauteur d'une ligne du menu (48 px) et ce qui l'entoure (marges, filet du danger) : de quoi décider du sens sans mesurer le menu. */
const HAUTEUR_LIGNE_MENU = 48;
const HAUTEUR_AUTOUR_MENU = 24;

const rien = () => () => {};

/** Les traits des icônes du menu (les mêmes que la planche 3B). */
export const ICONES_MENU = {
  partager: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  crayon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  corbeille: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
};

/** Où poser le menu d'un bouton « … » : voir `OuvertMenu`. Lu AU CLIC (les rectangles de l'écran à cet instant). */
export function placerLeMenu(cle: string, bouton: HTMLElement, nbActions: number): OuvertMenu {
  const r = bouton.getBoundingClientRect();
  const largeur = Math.min(LARGEUR_MENU, window.innerWidth - 24);
  const sens = window.innerHeight - r.bottom >= nbActions * HAUTEUR_LIGNE_MENU + HAUTEUR_AUTOUR_MENU + 16 ? "bas" : "haut";
  const ligne = Math.round(sens === "bas" ? r.bottom + 2 : window.innerHeight - r.top + 6);
  if (window.matchMedia("(max-width: 860px)").matches) {
    /* Planche 3B : le bord du menu sur le bord de sa tuile, du côté de l'écran où elle est (sans jamais sortir de l'écran). */
    const t = (bouton.closest<HTMLElement>(".ec-tu") ?? bouton).getBoundingClientRect();
    const cote = t.left < window.innerWidth / 2 ? "gauche" : "droite";
    const x = cote === "gauche" ? t.left : window.innerWidth - t.right;
    return { cle, cote, x: Math.round(Math.max(8, Math.min(x, window.innerWidth - largeur - 8))), ligne, sens };
  }
  /* Ordinateur : bord droit sur bord droit, sauf si le menu sortait à gauche de la colonne de contenu (le bouton est alors tout à gauche d'une
     tuile) : bord gauche sur bord gauche, sans dépasser l'écran à droite. */
  const colonne = document.querySelector(".ec-contenu")?.getBoundingClientRect().left ?? 0;
  const cote = r.right - largeur >= colonne + 8 ? "droite" : "gauche";
  const x = cote === "droite" ? window.innerWidth - r.right : Math.min(r.left, window.innerWidth - largeur - 8);
  return { cle, cote, x: Math.round(x), ligne, sens };
}

/** L'état du menu ouvert d'une mosaïque (ou de la tuile d'un album) : un seul menu à la fois, et le bouton qui l'a ouvert pour lui rendre le focus. */
export function useMenuLien() {
  const [menu, setMenu] = useState<OuvertMenu | null>(null);
  /* Le bouton qui a ouvert le menu : Échap lui rend le focus. */
  const declencheur = useRef<HTMLElement | null>(null);
  const basculer = (cle: string, bouton: HTMLElement, nbActions: number) => {
    if (menu?.cle === cle) {
      setMenu(null);
      return;
    }
    declencheur.current = bouton;
    setMenu(placerLeMenu(cle, bouton, nbActions));
  };
  const fermer = () => setMenu(null);
  return { menu, basculer, fermer, declencheur };
}

/**
 * Le menu d'actions d'un lien : un vrai menu.
 * - Il s'ouvre dans `.ec-contenu` par un portail (comme `Fenetre`) : la tuile est découpée (`overflow: hidden`), et une
 *   carte de verre (`backdrop-filter`) enfermerait un élément positionné dedans.
 * - Posé en `fixed` depuis la position du bouton (variables CSS : `--m-droite` ou `--m-gauche`, `--m-haut` ou `--m-bas`), fond opaque.
 * - Se ferme au clic dehors (le voile, transparent : il n'attrape que le clic), à Échap ou à Tab (le focus revient au bouton), à la rotation
 *   ou au redimensionnement, et, sur ordinateur seulement, au défilement (le bouton a bougé). Choisir une action le ferme AVANT d'ouvrir
 *   sa fenêtre, sans rendre le focus (la fenêtre prend le sien).
 * - Flèches haut / bas d'une ligne à l'autre ; la première ligne a le focus à l'ouverture.
 */
export function MenuLien(m: {
  nom: string;
  ouvert: OuvertMenu;
  actions: ActionMenu[];
  declencheur: React.RefObject<HTMLElement | null>;
  onFermer: () => void;
  /** Le menu « … » du haut de la page (22/10) : son nom pour la voix (sinon « Actions sur le lien « … » ») et ses icônes à DROITE du mot, comme sur iPhone. */
  etiquette?: string;
  iconeADroite?: boolean;
}) {
  const client = useSyncExternalStore(rien, () => true, () => false);
  const racine = useRef<HTMLDivElement>(null);
  const { onFermer, declencheur } = m;
  /* Le retour du téléphone le ferme ; et au téléphone le fond ne défile pas (le menu, posé depuis son bouton, ne se détache plus). */
  useRetourFerme(onFermer);
  const petit = useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia("(max-width: 860px)");
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false
  );
  useVerrouDefilement(petit);
  useEffect(() => {
    /* Au clavier, la 1re ligne prend le focus ; au doigt ou à la souris, le focus entre dans le menu sans cercler une ligne (comme MenuPhoto). */
    const auClavier = declencheur.current?.matches(":focus-visible") ?? false;
    if (auClavier) racine.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    else racine.current?.focus({ preventScroll: true });
    const telephone = window.matchMedia("(max-width: 860px)");
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFermer();
        declencheur.current?.focus();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onFermer();
        declencheur.current?.focus();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const lignes = [...(racine.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
        if (!lignes.length) return;
        e.preventDefault();
        const i = lignes.indexOf(document.activeElement as HTMLElement);
        lignes[(i + (e.key === "ArrowDown" ? 1 : -1) + lignes.length) % lignes.length].focus();
      }
    };
    const defilement = () => {
      if (!telephone.matches) onFermer();
    };
    document.addEventListener("keydown", touche, true);
    window.addEventListener("resize", onFermer);
    document.addEventListener("scroll", defilement, true);
    return () => {
      document.removeEventListener("keydown", touche, true);
      window.removeEventListener("resize", onFermer);
      document.removeEventListener("scroll", defilement, true);
    };
  }, [onFermer, declencheur]);
  const hote = client ? document.querySelector(".ec-contenu") : null;
  if (!hote) return null;
  const position = { [m.ouvert.cote === "droite" ? "--m-droite" : "--m-gauche"]: `${m.ouvert.x}px`, [m.ouvert.sens === "bas" ? "--m-haut" : "--m-bas"]: `${m.ouvert.ligne}px` } as React.CSSProperties;
  return createPortal(
    <>
      <div className="ec-li-voile" role="presentation" onClick={onFermer} />
      <div ref={racine} className={`ec-li-menu ec-li-menu--${m.ouvert.sens}${m.iconeADroite ? " ec-li-menu--droite" : ""}`} role="menu" tabIndex={-1} aria-label={m.etiquette ?? `Actions sur le lien « ${m.nom} »`} style={{ ...position, outline: "none" }}>
        {m.actions.map((a) => (
          <button
            key={a.cle}
            type="button"
            role="menuitem"
            className={a.danger ? "ec-li-menu-danger" : a.filetAvant ? "ec-li-menu-filet" : undefined}
            onClick={() => {
              onFermer();
              a.faire();
            }}
          >
            <Trace d={a.icone} taille={20} epais={1.7} />
            <span>{a.libelle}</span>
          </button>
        ))}
      </div>
    </>,
    hote
  );
}
