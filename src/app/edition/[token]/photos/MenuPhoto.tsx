"use client";

/* Le menu d'une photo : l'APPUI LONG (planche 10 1B du 22/10, « Photos, en plus simple »).

   Comme sur iPhone : le reste de l'écran s'efface (un voile qui floute), la photo se SOULÈVE au milieu, et trois lignes s'ouvrent dessous :
   Favori · Voir qui l'a envoyée · puis, après un filet, Supprimer en rouge. Rien n'est caché à qui ne trouve pas l'appui long : « Sélectionner »
   (le « … » du haut) et la photo agrandie portent les mêmes gestes.
   Il s'ouvre DANS `.ec-contenu`, par un portail (comme les fenêtres) ; Échap, le voile ou une ligne le ferment ; le focus entre sur la première
   ligne et revient où il était. Le contenu des lignes vient de `entreesDuMenuPhoto` (photosSimples.ts, pur, au harnais). */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { type CleMenuPhoto, type EntreeMenuPhoto } from "@/lib/collectif/photosSimples";
import { useRetourFerme } from "@/components/couche/useRetourFerme";
import { useVerrouDefilement } from "@/components/couche/useVerrouDefilement";
import { ICONES, Trace, type Photo } from "./Grille";

const rien = () => () => {};
const ICONE_DE: Record<CleMenuPhoto, string> = { favori: ICONES.coeur, voirQui: ICONES.personne, supprimer: ICONES.corbeille };

export default function MenuPhoto(m: { photo: Photo; entrees: EntreeMenuPhoto[]; onChoisir: (cle: CleMenuPhoto) => void; onFermer: () => void }) {
  const client = useSyncExternalStore(rien, () => true, () => false);
  const racine = useRef<HTMLDivElement>(null);
  const { onFermer } = m;
  useRetourFerme(onFermer);
  useVerrouDefilement();
  /* La vignette d'abord (déjà en cache), l'original par-dessus dès qu'il est arrivé : la photo soulevée est plus grande que sa vignette de 320 px. */
  const [grandeLa, setGrandeLa] = useState(false);
  const [rapport, setRapport] = useState(1);
  const grande = m.photo.grande && m.photo.grande !== m.photo.vignette ? m.photo.grande : null;

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    /* Le focus entre dans le menu (la colonne), pas sur une ligne : au doigt, une ligne cerclée dès l'ouverture se lirait comme déjà choisie. Les flèches vont aux lignes. */
    racine.current?.focus({ preventScroll: true });
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onFermer();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const lignes = [...(racine.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
        if (!lignes.length) return;
        e.preventDefault();
        const i = lignes.indexOf(document.activeElement as HTMLElement);
        lignes[(i + (e.key === "ArrowDown" ? 1 : -1) + lignes.length) % lignes.length].focus();
      }
    };
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("keydown", touche, true);
      avant?.focus?.({ preventScroll: true });
    };
  }, [onFermer]);

  const hote = client ? document.querySelector(".ec-contenu") : null;
  if (!hote) return null;
  return createPortal(
    <div className="ec-s-flou" role="presentation" onClick={onFermer}>
      <div className="ec-s-flou-colonne" ref={racine} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="ec-s-souleve" style={{ aspectRatio: String(rapport) }}>
          {m.photo.vignette ? (
            <img
              src={m.photo.vignette}
              alt=""
              decoding="async"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: l, naturalHeight: h } = e.currentTarget;
                if (l > 0 && h > 0) setRapport(Math.min(1.6, Math.max(0.6, l / h)));
              }}
            />
          ) : null}
          {grande ? (
            <img
              className={grandeLa ? "ec-s-souleve-grande ec-s-souleve-grande--la" : "ec-s-souleve-grande"}
              src={grande}
              alt=""
              decoding="async"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: l, naturalHeight: h } = e.currentTarget;
                if (l > 0 && h > 0) setRapport(Math.min(1.6, Math.max(0.6, l / h)));
                setGrandeLa(true);
              }}
            />
          ) : null}
        </div>
        <div className="ec-s-menu" role="menu" aria-label="Cette photo">
          {m.entrees.map((e) => (
            <button key={e.cle} type="button" role="menuitem" className={`${e.danger ? "ec-s-danger " : ""}${e.filetAvant ? "ec-s-filet" : ""}`.trim() || undefined} aria-pressed={e.cle === "favori" ? Boolean(e.pose) : undefined} onClick={() => m.onChoisir(e.cle)}>
              {e.libelle}
              <Trace d={ICONE_DE[e.cle]} taille={20} plein={e.cle === "favori" && Boolean(e.pose)} epais={1.8} />
            </button>
          ))}
        </div>
      </div>
    </div>,
    hote
  );
}
