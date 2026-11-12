"use client";

import { useEffect, useRef, useState } from "react";
import { distanceHash, ETIQUETTES, etiquettesDe, lectureDePhoto, marqueDe, MOT_TAG, planchesDesPhotos, visibles, type Marque } from "@/lib/mise-en-page/editeur";
import { Chaleur } from "./Chaleur";
import { cls, useEd, type Adresse } from "./contexte";
import { grandeDe, precharger } from "./images";
import { colonnesComparer, etiqueterTri, focusCourant, marquerTri, quitterVisionneuse } from "./triEcran";
import { BoutonsTri, COEUR, ETIQUETTE_UI, MARQUE_UI, NOMS_ONGLETS } from "./TriBulles";

/* La visionneuse du tri, par-dessus la bande agrandie : une photo (l'ORIGINAL, en pleine définition, loupe 100 %)
   ou la comparaison de plusieurs photos (2 et plus). Fond neutre sombre pour juger. Les touches vivent dans `triEcran.ts`. */

/** L'étiquette d'une marque, dans le pied et sur la comparaison. */
function Etiquette({ m, pose }: { m: Marque; pose?: boolean }) {
  return <span className={cls("ed-vt-etq", `ed-vt-etq--${m}`, pose && "ed-vt-etq--pose")}><i dangerouslySetInnerHTML={{ __html: MARQUE_UI[m].svg }} />{MARQUE_UI[m].mot}</span>;
}
const Client = () => <span className="ed-vt-etq ed-vt-etq--client"><i dangerouslySetInnerHTML={{ __html: COEUR }} />Client</span>;

/** L'image qui se précise : l'aperçu tout de suite, l'original par-dessus dès qu'il est décodé. */
export function Nette({ a, alt, onClick, imgRef, apercuSeul }: { a: Adresse | undefined; alt: string; onClick?: (e: React.MouseEvent<HTMLImageElement>) => void; imgRef?: React.Ref<HTMLImageElement>; apercuSeul?: boolean }) {
  const apercu = grandeDe(a);
  const original = apercuSeul ? null : a?.original ?? null;
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
  const c = useEd();
  const { ui, majUi } = c;
  return (
    <div className="ed-vt-tete">
      <button type="button" className="ed-vt-retour" title="Retour · Échap" onClick={() => quitterVisionneuse(c)}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l-6 6 6 6" /></svg>Retour
      </button>
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

/* Les deux étiquettes d'usage (05/11), sous les ronds : éteintes tant qu'elles ne sont pas posées, un clic bascule. */
function Etiquettes({ id }: { id: string }) {
  const c = useEd();
  const posees = etiquettesDe(c.etat.magazine, id);
  if (c.lectureSeule) return posees.length ? <span className="ed-vt-etqs">{posees.map((k) => <span key={k} className="ed-vt-etqb ed-vt-etqb--on">{ETIQUETTE_UI[k].mot}</span>)}</span> : null;
  return (
    <span className="ed-vt-etqs" role="group" aria-label="Étiquettes">
      {ETIQUETTES.map((k) => (
        <button key={k} type="button" className={cls("ed-vt-etqb", posees.includes(k) && "ed-vt-etqb--on")} aria-pressed={posees.includes(k)}
          title={`${ETIQUETTE_UI[k].mot} · ${ETIQUETTE_UI[k].touche}`} onClick={() => etiqueterTri(c, k, id)}>
          <kbd>{ETIQUETTE_UI[k].touche}</kbd>{ETIQUETTE_UI[k].mot}
        </button>
      ))}
    </span>
  );
}

/* Les quatre ronds, comme un super like : ✕ et ★ en gros, réserve et coup de cœur en petit de part et d'autre. */
function Ronds({ id }: { id: string }) {
  const c = useEd();
  const m = marqueDe(c.etat.magazine, id);
  if (c.lectureSeule) return <span />;
  const rond = (k: Marque, petit?: boolean) => (
    <button type="button" className={cls("ed-vt-rond", `ed-vt-rond--${k}`, petit && "ed-vt-rond--petit", m === k && "ed-vt-rond--fait")}
      aria-label={MARQUE_UI[k].verbe} aria-pressed={m === k} title={`${MARQUE_UI[k].verbe} · ${MARQUE_UI[k].touche}`} onClick={() => marquerTri(c, k)} dangerouslySetInnerHTML={{ __html: MARQUE_UI[k].svg }} />
  );
  return <span className="ed-vt-ronds">{rond("reserve", true)}{rond("ecartee")}{rond("choisie")}{rond("coupDeCoeur", true)}<Etiquettes id={id} /></span>;
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
      <Tete titre="Trier" sous={NOMS_ONGLETS[etat.filtres.marque]} />
      <div className="ed-vt-scene">
        {p && a ? <Nette key={id} a={a} alt={p.nom} onClick={ouvrirLoupe} /> : <div className="ed-vt-vide">{etat.filtres.marque === "a_trier" || etat.filtres.marque === "retenues" ? "Tout est trié" : "Rien ici"}</div>}
        {ui.loupeTri && p && a ? <Loupe100 a={a} pt={pt} boite={loupe} onMove={suivreLoupe} onClick={() => majUi({ loupeTri: false })} /> : null}
        <button type="button" className="ed-vt-fl ed-vt-fl--g" aria-label="Précédente" disabled={i <= 0} onClick={() => allerA(i - 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" className="ed-vt-fl ed-vt-fl--d" aria-label="Suivante" disabled={i < 0 || i >= l.length - 1} onClick={() => allerA(i + 1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      {ui.lecture && id && p ? <PanneauLecture id={id} /> : null}
      <div className="ed-vt-pied">
        <div className="ed-vt-nom">
          {p ? <><b>{p.nom}</b>{p.personne ? ` · ${p.personne}` : ""}{p.coeur ? <Client /> : null}{m ? <Etiquette m={m} /> : null}{doubles?.length ? ` · double ${doubles[0]}` : ""}{id && etat.pretri[id] ? <span className="ed-vt-raison">pré-tri : {etat.pretri[id].raison}</span> : null}</> : null}
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
  const cols = colonnesComparer(ids.length), rangs = Math.ceil(ids.length / cols);
  /* au-delà de 4, une planche contact : les aperçus suffisent, seul l'original de l'active se charge */
  const contact = ids.length > 4;
  const cadre = useRef<HTMLDivElement>(null);
  useEffect(() => { cadre.current?.querySelector(".ed-vt-cmp-c--actif")?.scrollIntoView({ block: "nearest" }); }, [ui.cmpIci]);
  return (
    <div className="ed-vt" role="dialog" aria-label="Comparer">
      <Tete titre="Comparer" sous={`${ids.length} photos`} />
      <div ref={cadre} className={cls("ed-vt-cmp", contact && "ed-vt-cmp--contact")}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, "--cmp-rangs": rangs } as React.CSSProperties}>
        {ids.map((x, k) => {
          const mk = marqueDe(etat.magazine, x);
          return (
            <div key={x} className={cls("ed-vt-cmp-c", k === ui.cmpIci && "ed-vt-cmp-c--actif", mk === "ecartee" && "ed-vt-cmp-c--ecartee", mk === "reserve" && "ed-vt-cmp-c--reserve")} onClick={() => majUi({ cmpIci: k })}>
              <span className="ed-vt-cmp-cadre">
                <Nette a={adresses.get(x)} alt={etat.catalogue.get(x)?.nom ?? ""} apercuSeul={contact && k !== ui.cmpIci} />
                {mk ? <Etiquette m={mk} pose /> : null}
                {etat.catalogue.get(x)?.coeur ? <span className="ed-vt-cmp-client" dangerouslySetInnerHTML={{ __html: COEUR }} /> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="ed-vt-pied">
        <div className="ed-vt-nom">{p ? <><b>{p.nom}</b>{p.personne ? ` · ${p.personne}` : ""}{p.coeur ? <Client /> : null}{m ? <Etiquette m={m} /> : null}</> : null}</div>
        {actif ? <Ronds id={actif} /> : <span />}
        <div className="ed-vt-rang">{ids.length ? `${ui.cmpIci + 1} / ${ids.length} · ⇧P garde et écarte les autres` : ""}</div>
      </div>
    </div>
  );
}

/* 10/11 : le panneau Lecture d'une photo ouverte en grand (L) : la vignette avec ce que la machine a vu dessus, et les
   chiffres qui expliquent chaque tag (où est la photo par rapport au seuil). De quoi juger, et régler, une règle. */
function PanneauLecture({ id }: { id: string }) {
  const { etat, adresses } = useEd();
  const m = etat.lecture.mesures?.[id];
  const p = etat.catalogue.get(id);
  const l = lectureDePhoto(id, etat.catalogue, etat.lecture, distanceHash);
  const src = adresses.get(id)?.vignette ?? adresses.get(id)?.moyenne ?? null;
  const pc = (x: number) => `${Math.round(x * 100)} %`;
  return (
    <aside className="ed-lec" aria-label="Lecture de la photo">
      <div className="ed-lec-img" style={{ aspectRatio: p && p.l > 1 && p.h > 1 ? `${p.l} / ${p.h}` : undefined }}>
        {src ? <img src={src} alt="" draggable={false} /> : null}
        <Chaleur m={m} />
      </div>
      <p className="ed-lec-leg"><i className="ed-lec-c" /> ce qui ressort · <i className="ed-lec-v" /> visage · <i className="ed-lec-z" /> zone protégée</p>
      {!m ? <p className="ed-lec-l">Pas encore lue.</p> : (
        <dl className="ed-lec-dl">
          <dt>Tags</dt><dd>{l.tags.length ? l.tags.map((t) => MOT_TAG[t].mot).join(", ") : "aucun"}</dd>
          <dt>Netteté</dt><dd>{l.nettete} · médiane du magazine {l.medianeNettete} · floue sous {l.seuilFloue || "—"}</dd>
          <dt>La plus ressemblante</dt><dd>{l.plusProche ? `${l.plusProche.nom} · écart ${l.plusProche.ecart} / 64 (doublon ≤ 8, similaire ≤ 12)` : "aucune"}</dd>
          <dt>Lumière</dt><dd>{l.lumi ? `moyenne ${l.lumi.moyenne} / 255 · bouchés ${pc(l.lumi.noirs)} · brûlés ${pc(l.lumi.blancs)}` : "—"}</dd>
          <dt>Aplats</dt><dd>{l.aplats !== null ? `${pc(l.aplats)} des pixels dans 3 couleurs (une information : un grand ciel en a autant qu'un écran)` : "—"}</dd>
          <dt>Appareil</dt><dd>{l.appareil === undefined ? "inconnu (photo importée avant le 10/11, ou édition)" : l.appareil ?? "aucun dans le fichier"}{p?.date ? "" : " · sans date"}{l.tags.includes("capture") ? " · capture : sans appareil et forme d'écran" : ""}</dd>
          <dt>Visages</dt><dd>{l.visages === null ? "détecteur indisponible" : l.visages}</dd>
        </dl>
      )}
    </aside>
  );
}
