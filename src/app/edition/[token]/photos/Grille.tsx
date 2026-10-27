"use client";

/* La grille des photos, rangée PAR JOUR (planche 10 du 22/10, « Photos, en plus simple »).

   - Un intertitre discret par jour (« Samedi 4 octobre · 214 »), COLLANT : il reste sous la barre du haut tant que le jour dure, le
     suivant le pousse. `position: sticky`, aucune bibliothèque, aucun écouteur de défilement. Le nombre n'est montré que quand le jour
     est fini (`GroupeJour.complet`) : un nombre faux se lit comme vrai.
   - Une vignette est UNE PHOTO : aucun texte, aucune initiale, aucun nom, aucun badge (doublon, œil barré, « nouvelle »), aucune étoile.
     Toucher l'agrandit. En mode « Sélectionner » seulement, le rond de sélection apparaît (et, sur ordinateur, au survol : la case
     reste le geste de la souris). Dans « Choisir d'abord mes préférées », les photos gardées portent en plus un petit cœur.
   - L'APPUI LONG ouvre le menu de la photo (Favori, Voir qui l'a envoyée, Supprimer) : c'est le parent qui décide quoi en faire ; en
     mode « Sélectionner », il bascule la photo.
   - En mode « Sélectionner », un rond par jour prend toute la journée d'un toucher.
   - Une tuile hors écran ne coûte rien à peindre (`content-visibility`).
   La grille d'avant (initiales, étoile, doublon, œil barré, « Cocher ce jour » souligné) est dans `archive/photos-simple-2026-10/Grille.tsx`. */

import { useRef } from "react";
import type { GroupeJour } from "./filtres";
import { nombre } from "./filtres";
import { pointeurFin } from "@/lib/pointeur";

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
  /** Le CŒUR (favori) : les marques de « Ma sélection », que l'atelier retrouve dans son téléchargement. */
  preselection: boolean;
  doublonDe: string | null;
  heic: boolean;
  /** « Ne pas publier » : plus aucun geste côté client (22/10) ; la marque reste en base pour l'atelier, la route la rend encore. */
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
  /* 22/10 : les tracés des maquettes (planches 9 à 13). */
  coeur: "M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.7 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.2 0 5.3 3.1 4.1 6.6-1.7 4.8-9.2 9.4-9.2 9.4z",
  toutes: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  liens: "M4 4h9v9H4zM15 4h5v5h-5zM15 11h5v9h-5zM4 15h9v5H4z",
  personnes: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 7M22 21a7 7 0 0 0-4-6.3",
  personne: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  chercher: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  deposer: "M12 16V4M7 9l5-5 5 5M5 20h14",
  drapeau: "M5 21V4M5 4h11l-2 4 2 4H5",
  envoyer: "M4 12l16-8-6 16-3-7z",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
  copier: "M9 9h11v11H9zM5 15V4h11",
  partager: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
};

export function Trace({ d, taille = 14, plein = false, epais = 2 }: { d: string; taille?: number; plein?: boolean; epais?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill={plein ? "currentColor" : "none"} stroke="currentColor" strokeWidth={epais} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Props = {
  /** Les photos, déjà rangées en jours qui se suivent (`regrouperParJour`). */
  groupes: GroupeJour<Photo>[];
  /** Le responsable : lui seul coche, appuie longtemps, garde un cœur. L'équipe regarde. */
  ecrire: boolean;
  /** Les ronds de sélection sont visibles sur toutes les vignettes (une photo cochée, le mode « Sélectionner » ou « Choisir mes préférées »). */
  cocher: boolean;
  /** « Choisir d'abord mes préférées » : les photos gardées portent un petit cœur, et un rond prend la journée. */
  coeurs: boolean;
  estCochee: (id: string) => boolean;
  /** Des cases d'attente à la forme des photos, pendant que la page suivante arrive. */
  attente: number;
  onOuvrir: (id: string) => void;
  onCocher: (id: string, etendre: boolean) => void;
  /** L'appui long : la photo (le menu la « soulève »). */
  onAppuiLong: (photo: Photo) => void;
  /** Cocher, ou décocher, toutes les photos d'un jour (un jour pas encore lu en entier se lit d'abord : c'est l'affaire du parent). */
  onCocherJour: ((jour: GroupeJour<Photo>, tout: boolean) => void) | null;
};

export default function Grille(g: Props) {
  const appui = useRef<{ id: string; x: number; y: number; minuterie: number } | null>(null);
  const appuiLongFait = useRef(false);

  const finAppui = () => {
    if (appui.current) window.clearTimeout(appui.current.minuterie);
    appui.current = null;
  };

  return (
    <div className="ec-s-grille">
      {g.groupes.map((jour) => {
        /* Le rond d'un jour n'est « plein » que pour un jour LU en entier dont toutes les photos sont prises : sinon on ne peut pas le dire. */
        const toutCoche = jour.complet && jour.photos.length > 0 && jour.photos.every((p) => g.estCochee(p.id));
        return (
          <section key={`${jour.cle}-${jour.photos[0]?.id}`} className="ec-s-groupe" aria-label={jour.titre}>
            <h2 className="ec-s-jour">
              <span>{jour.titre}</span>
              {(jour.complet && g.groupes.length > 1) || (g.cocher && g.onCocherJour) ? (
                <small>
                  {/* Un seul jour : son nombre redirait le total de la page. */}
                  {jour.complet && g.groupes.length > 1 ? nombre(jour.n) : null}
                  {g.cocher && g.onCocherJour ? (
                    <button type="button" className="ec-s-jour-case" aria-pressed={toutCoche} aria-label={toutCoche ? `Ne plus prendre tout le jour (${jour.titre})` : `Prendre tout le jour (${jour.titre})`} onClick={() => g.onCocherJour?.(jour, !toutCoche)}>
                      <Trace d={ICONES.coche} taille={14} epais={3} />
                    </button>
                  ) : null}
                </small>
              ) : null}
            </h2>
            <div className={`ec-ph-g${g.cocher ? " ec-ph-g--cocher" : ""}`}>
              {jour.photos.map((ph) => {
                const cochee = g.estCochee(ph.id);
                return (
                  <div key={ph.id} className={cochee ? "ec-ph-t ec-ph-t--cochee" : "ec-ph-t"} data-photo={ph.id}>
                    <button
                      type="button"
                      className="ec-ph-t-ouvrir"
                      aria-label={`${ph.nom ?? "Photo"}, de ${ph.qui}${g.cocher ? (cochee ? (g.coeurs ? ", gardée" : ", sélectionnée") : g.coeurs ? ", pas gardée" : ", pas sélectionnée") : ""}`}
                      onClick={(e) => {
                        if (appuiLongFait.current) {
                          appuiLongFait.current = false;
                          return;
                        }
                        if (g.cocher && g.ecrire) g.onCocher(ph.id, e.shiftKey);
                        else g.onOuvrir(ph.id);
                      }}
                      onPointerDown={(e) => {
                        /* Un nouveau doigt (ou un clic) : un appui long d'avant, dont le clic n'est jamais venu, ne doit pas avaler le toucher d'après. */
                        appuiLongFait.current = false;
                        if (!g.ecrire || e.pointerType === "mouse") return;
                        finAppui();
                        const minuterie = window.setTimeout(() => {
                          appuiLongFait.current = true;
                          appui.current = null;
                          g.onAppuiLong(ph);
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
                        if (appui.current || appuiLongFait.current) {
                          e.preventDefault();
                          return;
                        }
                        /* À la souris, le clic droit ouvre le MÊME menu que l'appui long (Favori, Voir qui l'a envoyée, Supprimer). */
                        if (g.ecrire && pointeurFin()) {
                          e.preventDefault();
                          g.onAppuiLong(ph);
                        }
                      }}
                    >
                      {ph.vignette ? (
                        <img src={ph.vignette} alt="" loading="lazy" decoding="async" draggable={false} />
                      ) : (
                        <span className="ec-tuile-sans">{ph.heic ? "HEIC · aperçu indisponible" : (ph.nom ?? "Photo")}</span>
                      )}
                    </button>
                    {g.ecrire ? (
                      <button type="button" className="ec-ph-t-case" aria-pressed={cochee} aria-label={cochee ? "Ne plus sélectionner cette photo" : "Sélectionner cette photo"} tabIndex={g.cocher ? 0 : -1} onClick={(e) => g.onCocher(ph.id, e.shiftKey)}>
                        <Trace d={ICONES.coche} taille={13} epais={2.8} />
                      </button>
                    ) : null}
                    {g.coeurs && cochee ? (
                      <span className="ec-s-coeur" aria-hidden="true">
                        <Trace d={ICONES.coeur} taille={16} plein epais={1.6} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {g.attente > 0 ? (
        <div className="ec-ph-g">
          {Array.from({ length: g.attente }, (_, i) => (
            <div key={`attente-${i}`} className="ec-ph-t ec-ph-t--attente" aria-hidden="true" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
