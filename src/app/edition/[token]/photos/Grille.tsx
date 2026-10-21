"use client";

/* La grille des photos (planches 1B, 1C, 2A, 2F du 20/10).

   - Toucher une photo l'AGRANDIT (planche 3) ; en mode « cocher », toucher la
     coche ou la décoche.
   - La case en haut à gauche : au survol, puis sur toutes dès la première
     cochée. L'étoile en haut à droite garde le geste en un clic : Ma sélection.
   - Téléphone : un APPUI LONG ouvre le mode « cocher » sur la photo touchée ;
     les vignettes portent les INITIALES de qui l'a envoyée (le nom entier est
     dans la photo agrandie).
   - Une tuile hors écran ne coûte rien à peindre (`content-visibility`). */

import { useRef } from "react";
import { initialesDe, jourLong, photosDe, type JourVu } from "./filtres";

export type Photo = {
  id: string;
  vignette: string | null;
  nom: string | null;
  /** Qui l'a envoyée (T-180) : le nom du participant, le responsable ou l'atelier. */
  qui: string;
  role: "participant" | "responsable" | "atelier";
  /** L'instant d'arrivée, tel que la base l'a rendu (T-181). */
  arrivee: string;
  jour: string;
  jourCle: string;
  preselection: boolean;
  doublonDe: string | null;
  heic: boolean;
  /** « Ne pas publier », relu à chaque page (lot w2) : il survit au rechargement. */
  signalee: boolean;
  /** La photo EN GRAND de la visionneuse : l'original signé s'il s'affiche (JPEG, PNG, WebP), la vignette sinon (HEIC). */
  grande: string | null;
};

const APPUI_LONG_MS = 450;

export const ICONES = {
  etoile: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  coche: "M5 12l5 5 9-10",
  cache: "M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.4.8-1.4 2.2-2.8 3.5M6.2 7.6C4.4 8.9 3.1 10.6 2.5 12c1 1.8 4.5 6 9.5 6 1.6 0 3-.4 4.3-1M9.9 10a3 3 0 0 0 4.1 4.1",
  /* Lot w2 : la corbeille (planches 3, 4 et 5). */
  corbeille: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  restaurer: "M3 12a9 9 0 1 0 2.6-6.4L3 8M3 3v5h5",
  fusionner: "M7 4v4a5 5 0 0 0 5 5 5 5 0 0 0 5-5V4M12 13v7",
  crayon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
};

export function Trace({ d, taille = 14, plein = false, epais = 2 }: { d: string; taille?: number; plein?: boolean; epais?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill={plein ? "currentColor" : "none"} stroke="currentColor" strokeWidth={epais} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Props = {
  photos: Photo[];
  /** La vue `jour` : une tête par jour, avec son nombre quand il est connu. */
  parJour: boolean;
  jours: JourVu[];
  ecrire: boolean;
  /** Les cases sont visibles sur toutes les vignettes (une photo cochée, ou le mode « cocher » du téléphone). */
  cocher: boolean;
  estCochee: (id: string) => boolean;
  estCachee: (p: Photo) => boolean;
  /** Une vignette « nouvelle » : arrivée depuis la dernière vue (T-181, 21/10 : les siennes ne comptent pas pour le responsable). */
  estNeuve: (p: Photo) => boolean;
  /** Le nom affiché (« Toi » pour le responsable lui-même). */
  quiDe: (p: Photo) => string;
  /** Des cases d'attente à la forme des photos, pendant que la page suivante arrive. */
  attente: number;
  onOuvrir: (id: string) => void;
  onCocher: (id: string, etendre: boolean) => void;
  onEtoile: (p: Photo) => void;
  onAppuiLong: (id: string) => void;
  onCocherJour: ((cle: string) => void) | null;
};

export default function Grille(g: Props) {
  const appui = useRef<{ id: string; x: number; y: number; minuterie: number } | null>(null);
  const appuiLongFait = useRef(false);

  const finAppui = () => {
    if (appui.current) window.clearTimeout(appui.current.minuterie);
    appui.current = null;
  };

  return (
    <div className={`ec-ph-g${g.cocher ? " ec-ph-g--cocher" : ""}`}>
      {g.photos.map((ph, i) => {
        const jour = g.parJour && (i === 0 || g.photos[i - 1].jourCle !== ph.jourCle) ? g.jours.find((j) => j.cle === ph.jourCle) : null;
        const neuve = g.estNeuve(ph);
        const cochee = g.estCochee(ph.id);
        const cachee = g.estCachee(ph);
        const qui = g.quiDe(ph);
        const classe = [
          "ec-ph-t",
          cochee ? "ec-ph-t--cochee" : "",
          neuve ? "ec-ph-t--neuve" : "",
          ph.doublonDe ? "ec-ph-t--doublon" : "",
          cachee ? "ec-ph-t--cache" : "",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={ph.id} style={{ display: "contents" }}>
            {jour ? (
              <div className="ec-ph-tete-jour">
                <span>
                  {jourLong(jour.cle)}
                  {jour.complet ? ` · ${photosDe(jour.n)}` : ""}
                </span>
                {g.onCocherJour && jour.complet ? (
                  <button type="button" className="ec-ph-lien" onClick={() => g.onCocherJour?.(jour.cle)}>
                    Cocher ce jour
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className={classe}>
              <button
                type="button"
                className="ec-ph-t-ouvrir"
                aria-label={`${ph.nom ?? "Photo"}, de ${qui}${neuve ? ", nouvelle" : ""}${ph.preselection ? ", dans Ma sélection" : ""}${ph.doublonDe ? ", doublon" : ""}${cachee ? ", à ne pas publier" : ""}${g.cocher ? (cochee ? ", cochée" : ", pas cochée") : ""}`}
                onClick={(e) => {
                  if (appuiLongFait.current) {
                    appuiLongFait.current = false;
                    return;
                  }
                  if (g.cocher && g.ecrire) g.onCocher(ph.id, e.shiftKey);
                  else g.onOuvrir(ph.id);
                }}
                onPointerDown={(e) => {
                  if (!g.ecrire || e.pointerType === "mouse") return;
                  finAppui();
                  appuiLongFait.current = false;
                  const minuterie = window.setTimeout(() => {
                    appuiLongFait.current = true;
                    appui.current = null;
                    g.onAppuiLong(ph.id);
                    /* Une petite vibration, seulement après un premier geste (sinon Chrome la refuse et le note en console). */
                    if ((navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) navigator.vibrate?.(12);
                  }, APPUI_LONG_MS);
                  appui.current = { id: ph.id, x: e.clientX, y: e.clientY, minuterie };
                }}
                onPointerMove={(e) => {
                  const a = appui.current;
                  if (a && (Math.abs(e.clientX - a.x) > 10 || Math.abs(e.clientY - a.y) > 10)) finAppui();
                }}
                onPointerUp={finAppui}
                onPointerCancel={finAppui}
                onContextMenu={(e) => {
                  if (appui.current || appuiLongFait.current) e.preventDefault();
                }}
              >
                {ph.vignette ? (
                  <img src={ph.vignette} alt="" loading="lazy" decoding="async" draggable={false} />
                ) : (
                  <span className="ec-tuile-sans">{ph.heic ? "HEIC · aperçu indisponible" : ph.nom ?? "Photo"}</span>
                )}
              </button>
              {g.ecrire ? (
                <button
                  type="button"
                  className="ec-ph-t-case"
                  aria-pressed={cochee}
                  aria-label={cochee ? "Décocher cette photo" : "Cocher cette photo"}
                  onClick={(e) => g.onCocher(ph.id, e.shiftKey)}
                >
                  <Trace d={ICONES.coche} taille={13} epais={2.8} />
                </button>
              ) : null}
              {g.ecrire ? (
                <button
                  type="button"
                  className={ph.preselection ? "ec-ph-t-etoile ec-ph-t-etoile--on" : "ec-ph-t-etoile"}
                  aria-pressed={ph.preselection}
                  aria-label={ph.preselection ? "Retirer de Ma sélection" : "Ajouter à Ma sélection"}
                  title={ph.preselection ? "Dans Ma sélection" : "Ajouter à Ma sélection"}
                  onClick={() => g.onEtoile(ph)}
                >
                  <Trace d={ICONES.etoile} taille={13} plein={ph.preselection} epais={1.8} />
                </button>
              ) : ph.preselection ? (
                <span className="ec-ph-t-etoile ec-ph-t-etoile--on" aria-hidden="true">
                  <Trace d={ICONES.etoile} taille={13} plein epais={1.8} />
                </span>
              ) : null}
              {neuve ? <span className="ec-ph-neuve">nouvelle</span> : null}
              {cachee ? (
                <span className="ec-ph-badge ec-ph-badge--rond" title="Ne sera pas dans le magazine">
                  <Trace d={ICONES.cache} taille={13} epais={1.8} />
                </span>
              ) : ph.doublonDe ? (
                <span className="ec-ph-badge">
                  <span className="ec-ph-badge-long">Doublon</span>
                  <span className="ec-ph-badge-court" aria-hidden="true">
                    D
                  </span>
                </span>
              ) : null}
              <span className="ec-ph-qui">
                <span className="ec-ph-qui-nom">{qui}</span>
                <span className="ec-ph-qui-ini" aria-hidden="true">
                  {initialesDe(ph.qui)}
                </span>
              </span>
            </div>
          </div>
        );
      })}
      {Array.from({ length: g.attente }, (_, i) => (
        <div key={`attente-${i}`} className="ec-ph-t ec-ph-t--attente" aria-hidden="true" />
      ))}
    </div>
  );
}
