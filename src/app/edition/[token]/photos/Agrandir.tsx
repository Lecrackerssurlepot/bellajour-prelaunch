"use client";

/* Agrandir une photo (planche 3 du 20/10, T-199) : la photo en grand ; qui l'a
   envoyée, par quel lien, quand ; Ma sélection, Ne pas publier ; précédente et
   suivante au clavier, par balayage au téléphone.

   - Ordinateur : la visionneuse couvre la colonne de contenu (le menu reste),
     la photo au centre, les flèches de chaque côté, un panneau de verre à
     droite.
   - Téléphone : plein écran ; toucher la photo masque les barres ; les gestes
     en bas, sous le pouce.
   Comme les fenêtres, elle s'ouvre DANS `.ec-contenu`, par un portail : un
   panneau de verre (`backdrop-filter`) enfermerait ce qui est positionné
   dedans.

   Lot w2 :
   - la photo EN GRAND : la vignette (déjà en cache, 320 px) tout de suite, puis
     l'original par-dessus dès qu'il est arrivé (`grande`, signé par la route :
     JPEG, PNG, WebP ; un HEIC garde sa vignette) ;
   - « Supprimer » (corbeille 30 jours, planche 3C) : `onSupprimer`, sans
     fenêtre de confirmation (« Annuler » quelques secondes, puis la corbeille).
     Le lien d'équipe ne le reçoit jamais. */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DELAI_CORBEILLE_JOURS } from "@/lib/collectif/corbeille";
import { arriveeCourte, arriveeLongue, jourCourt, jourLong } from "./filtres";
import { ICONES, Trace, type Photo } from "./Grille";

const rien = () => () => {};

type Props = {
  photo: Photo;
  /** Sa place dans la vue (1 pour la première) et le nombre de photos de la vue, s'il est connu. */
  position: number;
  total: number | null;
  /** Ce que la vue montre : « Bateau 1 », « Toutes les photos ». */
  contexte: string;
  qui: string;
  initiales: string;
  lien: string | null;
  voirSes: { libelle: string; faire: () => void } | null;
  ecrire: boolean;
  tu: boolean;
  cachee: boolean;
  voisines: string[];
  onPrecedente: (() => void) | null;
  onSuivante: (() => void) | null;
  onFermer: () => void;
  onSelection: () => void;
  onCacher: () => void;
  /** Mettre à la corbeille (le responsable seul) : absent, le bouton ne s'affiche pas. */
  onSupprimer?: () => void;
  /** Un geste est en route : les boutons attendent. */
  occupe?: boolean;
};

export default function Agrandir(a: Props) {
  const v = (vous: string, toi: string) => (a.tu ? toi : vous);
  const client = useSyncExternalStore(rien, () => true, () => false);
  const boite = useRef<HTMLDivElement>(null);
  const toucher = useRef<{ x: number; y: number } | null>(null);
  const [nu, setNu] = useState(false);
  /* Le rapport largeur / hauteur de chaque photo, lu à son chargement : le cadre prend la forme de la photo. */
  const [rapports, setRapports] = useState<Record<string, number>>({});
  /* Les originaux arrivés : ils couvrent leur vignette. */
  const [grandes, setGrandes] = useState<Record<string, boolean>>({});
  const fns = useRef(a);
  useEffect(() => {
    fns.current = a;
  });

  /* Le clavier : flèches et Échap ; le focus entre dans la visionneuse et revient où il était. */
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    /* Au téléphone, la page derrière ne défile pas sous le doigt pendant qu'on regarde une photo. */
    const html = document.documentElement;
    const debord = html.style.overflow;
    html.style.overflow = "hidden";
    boite.current?.focus({ preventScroll: true });
    function touche(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") fns.current.onFermer();
      else if (e.key === "ArrowLeft") fns.current.onPrecedente?.();
      else if (e.key === "ArrowRight") fns.current.onSuivante?.();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("keydown", touche);
      html.style.overflow = debord;
      avant?.focus?.({ preventScroll: true });
    };
  }, []);

  /* Les deux voisines se chargent d'avance : passer est immédiat. */
  useEffect(() => {
    for (const src of a.voisines) {
      const im = new Image();
      im.src = src;
    }
  }, [a.voisines]);

  const p = a.photo;
  /* L'original, seulement s'il n'est pas déjà la vignette (une photo sans vignette montre son original). */
  const grande = p.grande && p.grande !== p.vignette ? p.grande : null;
  const datee = !p.jourCle.startsWith("~");
  const pos = a.total ? `${a.position} sur ${a.total.toLocaleString("fr-FR")}` : `${a.position}`;
  const ligneTel = [`arrivée ${arriveeCourte(p.arrivee)}`, datee ? `prise le ${jourCourt(p.jourCle)}` : ""].filter(Boolean).join(" · ");

  const vue = (
    <div
      className={`ec-ag${nu ? " ec-ag--nu" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${pos}, de ${a.qui}`}
      tabIndex={-1}
      ref={boite}
    >
      <div className="ec-ag-scene">
        <div className="ec-ag-haut">
          <span className="ec-ag-pos">
            <span className="ec-ag-pos-long">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.8" />
                <path d="m21 16-5-5-8 8" />
              </svg>
              {a.contexte} · photo {pos}
            </span>
            <span className="ec-ag-pos-court">{pos}</span>
          </span>
          <button type="button" className="ec-ag-rond ec-ag-fermer" aria-label="Fermer" onClick={a.onFermer}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          {a.ecrire ? (
            <button
              type="button"
              className={p.preselection ? "ec-ag-rond ec-ag-etoile ec-ag-rond--on" : "ec-ag-rond ec-ag-etoile"}
              aria-pressed={p.preselection}
              aria-label={p.preselection ? "Retirer de Ma sélection" : "Ajouter à Ma sélection"}
              onClick={a.onSelection}
            >
              <Trace d={ICONES.etoile} taille={18} plein={p.preselection} epais={1.8} />
            </button>
          ) : null}
        </div>

        <div
          className="ec-ag-photo"
          onTouchStart={(e) => {
            const t = e.touches[0];
            toucher.current = t ? { x: t.clientX, y: t.clientY } : null;
          }}
          onTouchEnd={(e) => {
            const d = toucher.current;
            const t = e.changedTouches[0];
            toucher.current = null;
            if (!d || !t) return;
            const dx = t.clientX - d.x;
            const dy = t.clientY - d.y;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
              if (dx < 0) a.onSuivante?.();
              else a.onPrecedente?.();
            } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
              setNu((x) => !x);
            }
          }}
        >
          <div className={a.cachee ? "ec-ag-cadre ec-ag-cadre--cache" : "ec-ag-cadre"} style={{ "--ec-ag-r": String(rapports[p.id] ?? 1.5) } as React.CSSProperties}>
            {p.vignette ? (
              <img
                key={`v-${p.id}`}
                className="ec-ag-img"
                src={p.vignette}
                alt={grande ? "" : p.nom ?? "Photo"}
                decoding="async"
                draggable={false}
                onLoad={(e) => {
                  const { naturalWidth: l, naturalHeight: h } = e.currentTarget;
                  if (l > 0 && h > 0 && !rapports[p.id]) setRapports((x) => ({ ...x, [p.id]: l / h }));
                }}
              />
            ) : grande ? null : (
              <span className="ec-ag-sans">{p.heic ? "HEIC · aperçu indisponible dans ce navigateur" : p.nom ?? "Photo"}</span>
            )}
            {grande ? (
              <img
                key={`g-${p.id}`}
                className={grandes[p.id] ? "ec-ag-img ec-ag-img--grande ec-ag-img--la" : "ec-ag-img ec-ag-img--grande"}
                src={grande}
                alt={p.nom ?? "Photo"}
                decoding="async"
                draggable={false}
                onLoad={(e) => {
                  const { naturalWidth: l, naturalHeight: h } = e.currentTarget;
                  if (l > 0 && h > 0) setRapports((x) => ({ ...x, [p.id]: l / h }));
                  setGrandes((x) => ({ ...x, [p.id]: true }));
                }}
              />
            ) : null}
            {a.cachee ? (
              <span className="ec-ag-etat">
                <Trace d={ICONES.cache} taille={14} epais={1.8} />
                Ne sera pas dans le magazine
              </span>
            ) : null}
          </div>
          {a.onPrecedente ? (
            <button type="button" className="ec-ag-fleche ec-ag-fleche--g" aria-label="Photo précédente" onClick={a.onPrecedente}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
          ) : null}
          {a.onSuivante ? (
            <button type="button" className="ec-ag-fleche ec-ag-fleche--d" aria-label="Photo suivante" onClick={a.onSuivante}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          ) : null}
          <span className="ec-ag-balai" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 6-6 6 6 6" />
            </svg>
            {v("Balayez pour passer", "Balaie pour passer")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </div>
        <p className="ec-ag-clavier">Flèches gauche et droite pour passer · Échap pour fermer</p>

        {/* Téléphone : qui, quel lien, quand ; la ligne mène à ses photos. */}
        <button type="button" className="ec-ag-info" onClick={a.voirSes?.faire} disabled={!a.voirSes}>
          <span className="ec-ag-avatar" aria-hidden="true">
            {a.initiales}
          </span>
          <span className="ec-ag-info-txt">
            <b>
              {a.qui}
              {a.lien ? ` · ${a.lien}` : ""}
            </b>
            <span>{ligneTel}</span>
          </span>
          {a.voirSes ? (
            <svg className="ec-ag-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          ) : null}
        </button>
      </div>

      {/* Ordinateur : le panneau de verre. */}
      <aside className="ec-ag-cote" aria-label="Cette photo">
        <div className="ec-ag-bloc-q">
          <span className="ec-ag-avatar" aria-hidden="true">
            {a.initiales}
          </span>
          <span className="ec-ag-bloc-q-txt">
            <b>{a.qui}</b>
            {a.voirSes ? (
              <button type="button" className="ec-ph-lien" onClick={a.voirSes.faire}>
                {a.voirSes.libelle}
              </button>
            ) : null}
          </span>
        </div>
        <dl className="ec-ag-dl">
          {a.lien ? (
            <>
              <dt>Lien</dt>
              <dd>{a.lien}</dd>
            </>
          ) : null}
          <dt>Arrivée</dt>
          <dd>{arriveeLongue(p.arrivee)}</dd>
          {datee ? (
            <>
              <dt>Prise</dt>
              <dd>{jourLong(p.jourCle)}</dd>
            </>
          ) : null}
          {p.nom ? (
            <>
              <dt>Fichier</dt>
              <dd className="ec-ag-fichier">{p.nom}</dd>
            </>
          ) : null}
          {p.doublonDe ? (
            <>
              <dt>Doublon</dt>
              <dd>oui, la copie d&apos;une photo déjà reçue</dd>
            </>
          ) : null}
        </dl>
        {a.ecrire ? (
          <div className="ec-ag-gestes">
            <div className="ec-ag-geste">
              <button type="button" className={p.preselection ? "ec-bouton ec-bouton--clair ec-ag-large" : "ec-bouton ec-ag-large"} aria-pressed={p.preselection} onClick={a.onSelection}>
                <Trace d={ICONES.etoile} taille={16} plein={p.preselection} epais={1.8} />
                {p.preselection ? "Retirer de ma sélection" : "Ajouter à ma sélection"}
              </button>
            </div>
            <div className="ec-ag-geste">
              <button type="button" className={a.cachee ? "ec-bouton ec-bouton--clair ec-ag-large ec-ag-large--on" : "ec-bouton ec-bouton--clair ec-ag-large"} aria-pressed={a.cachee} onClick={a.onCacher}>
                <Trace d={ICONES.cache} taille={16} epais={1.8} />
                Ne pas publier
              </button>
              <small>{a.cachee ? "Elle ne sera pas dans le magazine. Un clic de plus l'y remet." : "Elle reste visible ici ; l'atelier ne la met pas dans le magazine."}</small>
            </div>
            {a.onSupprimer ? (
              <div className="ec-ag-geste">
                <button type="button" className="ec-bouton ec-ag-large ec-ag-large--danger" disabled={a.occupe} onClick={a.onSupprimer}>
                  <Trace d={ICONES.corbeille} taille={16} epais={1.8} />
                  Supprimer
                </button>
                <small>Elle disparaît tout de suite pour tout le monde. Corbeille : {DELAI_CORBEILLE_JOURS} jours pour la récupérer.</small>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="ec-note">Lecture seule : le responsable choisit et écarte les photos.</p>
        )}
      </aside>

      {/* Téléphone : les gestes sous le pouce. */}
      {a.ecrire ? (
        <div className="ec-ph-bas ec-ag-bas">
          <div className={a.onSupprimer ? "ec-ph-bas-actions ec-ph-bas-actions--trois" : "ec-ph-bas-actions ec-ph-bas-actions--deux"}>
            <button type="button" className={p.preselection ? "ec-ph-bas-on" : undefined} aria-pressed={p.preselection} onClick={a.onSelection}>
              <Trace d={ICONES.etoile} taille={20} plein={p.preselection} epais={1.7} />
              Ma sélection
            </button>
            <button type="button" className={a.cachee ? "ec-ph-bas-on" : undefined} aria-pressed={a.cachee} onClick={a.onCacher}>
              <Trace d={ICONES.cache} taille={20} epais={1.7} />
              Ne pas publier
            </button>
            {a.onSupprimer ? (
              <button type="button" className="ec-ph-bas-danger" disabled={a.occupe} onClick={a.onSupprimer}>
                <Trace d={ICONES.corbeille} taille={20} epais={1.7} />
                Supprimer
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
  const hote = client ? document.querySelector(".ec-contenu") : null;
  return hote ? createPortal(vue, hote) : vue;
}
