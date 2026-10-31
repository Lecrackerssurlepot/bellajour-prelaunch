"use client";

import { useEffect, useRef, useState } from "react";
import { marqueDe, planchesDesPhotos, visibles } from "@/lib/mise-en-page/editeur";
import { cls, useEd, type Adresse } from "./contexte";
import { grandeDe, precharger } from "./images";
import { focusCourant, marquerTri } from "./triEcran";
import { BoutonsTri, ETOILE, CROIX } from "./TriBulles";

/* La visionneuse du tri, par-dessus la bande agrandie : une photo (l'ORIGINAL, en pleine définition, loupe 100 %)
   ou la comparaison de 2 à 4 photos. Fond neutre sombre pour juger. Les touches vivent dans `triEcran.ts`. */

const MARQUES = { choisie: "Gardée", ecartee: "Écartée" } as const;
const FILTRES = { toutes: "Toutes", choisies: "Gardées", a_trier: "À trier", ecartees: "Écartées" } as const;

/** L'image qui se précise : l'aperçu tout de suite, l'original par-dessus dès qu'il est décodé. */
function Nette({ a, alt, onClick, imgRef }: { a: Adresse | undefined; alt: string; onClick?: (e: React.MouseEvent<HTMLImageElement>) => void; imgRef?: React.Ref<HTMLImageElement> }) {
  const apercu = grandeDe(a);
  const original = a?.original ?? null;
  const [pret, setPret] = useState<string | null>(null);
  const net = !!original && pret === original;
  return (
    <span className="ed-vt-img">
      {apercu ? <img src={apercu} alt={net ? "" : alt} draggable={false} className={cls(net && "ed-vt-dessous")} onClick={onClick} /> : null}
      {original && original !== apercu ? (
        <img key={original} ref={imgRef} src={original} alt={net ? alt : ""} draggable={false} decoding="async" className={cls("ed-vt-original", net && "ed-vt-original--pret")}
          onLoad={() => setPret(original)} onClick={onClick} />
      ) : null}
    </span>
  );
}

export default function Tri() {
  const { ui } = useEd();
  if (!ui.grand || ui.vue === "grille") return null;
  return ui.vue === "comparer" ? <Comparer /> : <UnePhoto />;
}

function Tete({ titre, sous }: { titre: string; sous: string }) {
  const { ui, majUi } = useEd();
  return (
    <div className="ed-vt-tete">
      <h2>{titre}<span>{sous}</span></h2>
      <span className="ed-esp" />
      {ui.vue !== "comparer" ? <BoutonsTri sombre /> : (
        <button type="button" className="ed-vt-ico" aria-label="Raccourcis" title="Raccourcis" onClick={(e) => { e.stopPropagation(); majUi({ bulle: ui.bulle === "raccourcis" ? null : "raccourcis" }); }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5" strokeLinecap="round" /><circle cx="10" cy="6.3" r=".9" fill="currentColor" stroke="none" /></svg>
        </button>
      )}
    </div>
  );
}

function Ronds({ id }: { id: string }) {
  const c = useEd();
  const m = marqueDe(c.etat.magazine, id);
  if (c.lectureSeule) return <span />;
  return (
    <span className="ed-vt-ronds">
      <button type="button" className={cls("ed-vt-rond ed-vt-rond--x", m === "ecartee" && "ed-vt-rond--fait")} aria-label="Écarter" title="Écarter · X" onClick={() => marquerTri(c, "ecartee")} dangerouslySetInnerHTML={{ __html: CROIX }} />
      <button type="button" className={cls("ed-vt-rond ed-vt-rond--k", m === "choisie" && "ed-vt-rond--fait")} aria-label="Garder" title="Garder · P" onClick={() => marquerTri(c, "choisie")} dangerouslySetInnerHTML={{ __html: ETOILE }} />
    </span>
  );
}

function UnePhoto() {
  const c = useEd();
  const { etat, ui, majUi, adresses } = c;
  const l = visibles(etat);
  const id = focusCourant(etat, ui);
  const i = id ? l.indexOf(id) : -1;
  const p = id ? etat.catalogue.get(id) : undefined;
  const a = id ? adresses.get(id) : undefined;
  const m = id ? marqueDe(etat.magazine, id) : null;
  const doubles = id ? planchesDesPhotos(etat).get(id) : undefined;
  const loupe = useRef<HTMLDivElement>(null);
  const [pt, setPt] = useState({ x: 0.5, y: 0.45 });

  /* les originaux des voisines, en avance : on passe d'une photo à l'autre sans attendre */
  useEffect(() => {
    if (i < 0) return;
    precharger([l[i + 1], l[i + 2], l[i - 1]].map((x) => (x ? adresses.get(x)?.original ?? grandeDe(adresses.get(x)) : null)), 1e9);
  });

  const allerA = (j: number) => { if (l[j]) majUi({ focus: l[j], loupeTri: false }); };
  const ouvrirLoupe = (e: React.MouseEvent<HTMLImageElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPt({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    majUi({ loupeTri: true });
  };
  const suivreLoupe = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPt({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };

  return (
    <div className="ed-vt" role="dialog" aria-label="Une photo">
      <Tete titre="Trier" sous={`${FILTRES[etat.filtres.marque]}${etat.filtres.masquerUtilisees ? " · non posées" : ""}`} />
      <div className="ed-vt-scene">
        {p && a ? <Nette key={id} a={a} alt={p.nom} onClick={ouvrirLoupe} /> : <div className="ed-vt-vide">{etat.filtres.marque === "a_trier" ? "Tout est trié" : "Rien ici"}</div>}
        {ui.loupeTri && p && a ? <Loupe100 a={a} pt={pt} boite={loupe} onMove={suivreLoupe} onClick={() => majUi({ loupeTri: false })} /> : null}
        <button type="button" className="ed-vt-fl ed-vt-fl--g" aria-label="Précédente" disabled={i <= 0} onClick={() => allerA(i - 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" className="ed-vt-fl ed-vt-fl--d" aria-label="Suivante" disabled={i < 0 || i >= l.length - 1} onClick={() => allerA(i + 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="ed-vt-pied">
        <div className="ed-vt-nom">
          {p ? <><b>{p.nom}</b>{p.personne ? ` · ${p.personne}` : ""}{m ? <span className={`ed-vt-etq ed-vt-etq--${m}`}>{MARQUES[m]}</span> : null}{doubles?.length ? ` · double ${doubles[0]}` : ""}</> : null}
        </div>
        {id ? <Ronds id={id} /> : <span />}
        <div className="ed-vt-rang">{i >= 0 ? `${i + 1} / ${l.length}` : ""}</div>
      </div>
      <div className="ed-vt-avance" aria-label="Avancement">
        {l.map((x, k) => {
          const mk = marqueDe(etat.magazine, x);
          return <button key={x} type="button" tabIndex={-1} aria-label={etat.catalogue.get(x)?.nom} className={cls(mk && `ed-vt-av--${mk}`, k === i && "ed-vt-av--ici")} onClick={() => allerA(k)} />;
        })}
      </div>
    </div>
  );
}

/** La loupe : l'original à sa définition (un pixel de l'image par pixel de l'écran), le point visé sous la souris. */
function Loupe100({ a, pt, boite, onMove, onClick }: { a: Adresse; pt: { x: number; y: number }; boite: React.RefObject<HTMLDivElement | null>; onMove: (e: React.MouseEvent<HTMLDivElement>) => void; onClick: () => void }) {
  const src = a.original ?? grandeDe(a);
  const [dim, setDim] = useState<{ l: number; h: number } | null>(null);
  const [vue, setVue] = useState({ l: 0, h: 0 });
  useEffect(() => {
    const b = boite.current;
    if (!b) return;
    const mesure = () => setVue({ l: b.clientWidth, h: b.clientHeight });
    mesure();
    window.addEventListener("resize", mesure);
    return () => window.removeEventListener("resize", mesure);
  }, [boite]);
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const L = dim ? dim.l / dpr : 0, H = dim ? dim.h / dpr : 0;
  const tx = Math.min(0, Math.max(vue.l - L, vue.l / 2 - pt.x * L));
  const ty = Math.min(0, Math.max(vue.h - H, vue.h / 2 - pt.y * H));
  return (
    <div ref={boite} className="ed-vt-loupe" onMouseMove={onMove} onClick={onClick}>
      <span className="ed-vt-loupe-etq">100 %</span>
      {src ? <img src={src} alt="" draggable={false} onLoad={(e) => setDim({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        style={{ width: L || undefined, height: H || undefined, transform: `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`, visibility: dim ? "visible" : "hidden" }} /> : null}
    </div>
  );
}

function Comparer() {
  const c = useEd();
  const { etat, ui, majUi, adresses } = c;
  const ids = ui.comparer.filter((x) => etat.catalogue.has(x));
  const actif = ids[ui.cmpIci] ?? ids[0];
  const p = actif ? etat.catalogue.get(actif) : undefined;
  const m = actif ? marqueDe(etat.magazine, actif) : null;
  return (
    <div className="ed-vt" role="dialog" aria-label="Comparer">
      <Tete titre="Comparer" sous={`${ids.length} photos`} />
      <div className={cls("ed-vt-cmp", ids.length === 4 && "ed-vt-cmp--4")} style={{ gridTemplateColumns: `repeat(${ids.length === 4 ? 2 : ids.length}, minmax(0, 1fr))` }}>
        {ids.map((x, k) => {
          const mk = marqueDe(etat.magazine, x);
          return (
            <div key={x} className={cls("ed-vt-cmp-c", k === ui.cmpIci && "ed-vt-cmp-c--actif", mk === "ecartee" && "ed-vt-cmp-c--ecartee")} onClick={() => majUi({ cmpIci: k })}>
              <span className="ed-vt-cmp-cadre">
                <Nette a={adresses.get(x)} alt={etat.catalogue.get(x)?.nom ?? ""} />
                {mk === "choisie" ? <span className="ed-vt-star" dangerouslySetInnerHTML={{ __html: ETOILE }} /> : null}
                {mk === "ecartee" ? <span className="ed-vt-etq ed-vt-etq--ecartee ed-vt-etq--pose">Écartée</span> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="ed-vt-pied">
        <div className="ed-vt-nom">{p ? <><b>{p.nom}</b>{p.personne ? ` · ${p.personne}` : ""}{m ? <span className={`ed-vt-etq ed-vt-etq--${m}`}>{MARQUES[m]}</span> : null}</> : null}</div>
        {actif ? <Ronds id={actif} /> : <span />}
        <div className="ed-vt-rang">{ids.length ? `${ui.cmpIci + 1} / ${ids.length} · ⇧P garde et écarte les autres` : ""}</div>
      </div>
    </div>
  );
}
