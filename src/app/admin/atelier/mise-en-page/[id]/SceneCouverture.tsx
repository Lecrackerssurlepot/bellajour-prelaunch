"use client";

import { useEffect, useState } from "react";
import {
  apercu, apercuDepot, aplatsDeCouverture, bilanCouverture, cadresDeCouverture, couvertureDe, SEUIL_DPI, SEUIL_DPI_CONFORT,
  type CadreCouvertureEcran, type CadrePhoto, type EtatEditeur, type Geste, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import {
  GABARITS_COUVERTURE, ID_COUVERTURE, contenuImprime, decorCouverture, cadresCouverture, gabaritCouverture, type Couverture, type GabaritCouverture,
} from "@/lib/mise-en-page/couverture";
import { PAGE_H, PAGE_L, largeurCouverture } from "@/lib/mise-en-page/geometrie";
import type { Magazine } from "@/lib/mise-en-page/magazine";
import { cls, fermerTexteDom, memeRef, pc, useEd } from "./contexte";
import { dosDeLaCouverture, type DosCouverture } from "./dosCouverture";
import { grandeDe, vignetteDe } from "./images";
import { demanderHd, useHd } from "./hd";
import { libelleApercu } from "./glisser";
import { Ico } from "./icones";

/* La couverture à plat (lot B, 12/11) : 4e · dos · 1re, la largeur suit le dos, deux plis, le dos en bande avec sa cote.
   Comme la planche : aucun calcul du magazine ici, on envoie des gestes (référence « couverture ») et on dessine l'état. */

/** Dos inconnu : la bande s'affiche hachurée sur 3 mm, POUR L'ÉCRAN SEULEMENT (l'export, lui, s'arrête). */
const DOS_ECRAN_INCONNU = 3;
const mm = (v: number): string => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Le dos de l'écran : celui du projet ou des pages saisies, finition par défaut dite. */
export function useDosCouverture(): DosCouverture {
  const { etat } = useEd();
  return dosDeLaCouverture(etat.projet, couvertureDe(etat.magazine).pages ?? null);
}

/** Le magazine montré en transparence : un dépôt en cours, un gabarit survolé, une sélection qui attend. */
function apercuCouverture(etat: EtatEditeur, ui: ReturnType<typeof useEd>["ui"]): Magazine | null {
  const d = etat.glisser;
  if (d && d.survol && d.apercu && !d.apercu.refus && d.apercu.magazine.couverture !== etat.magazine.couverture) return d.apercu.magazine;
  if (ui.apercuGab && ui.apercuGab.couverture !== etat.magazine.couverture) return ui.apercuGab;
  const ss = ui.survolSel;
  if (ss && ss.apercu && !ss.apercu.refus && ss.apercu.magazine.couverture !== etat.magazine.couverture) return ss.apercu.magazine;
  return null;
}

export default function SceneCouverture() {
  const { etat, envoyer, ui, majUi, adresses, lectureSeule: ro, clicSupprime } = useEd();
  const dos = useDosCouverture();
  const d = dos.dos ?? DOS_ECRAN_INCONNU;
  const W = largeurCouverture(d);
  const ap = apercuCouverture(etat, ui);
  const frames = cadresDeCouverture(etat, d);
  const framesA = ap ? cadresDeCouverture({ ...etat, magazine: ap }, d) : null;
  const aplats = aplatsDeCouverture(ap ? { ...etat, magazine: ap } : etat, d);
  const aplatsVus = framesA ? aplatsDeCouverture(etat, d) : aplats;
  const g = gabaritCouverture(couvertureDe(etat.magazine).templateId);
  const glisse = etat.glisser;
  const bulle = glisse && glisse.survol && glisse.apercu && glisse.survol.type === "cadre" ? libelleApercu(glisse.source, glisse.survol, glisse.apercu)
    : ui.survolSel && !glisse ? libelleApercu(ui.survolSel.source, ui.survolSel.cible, ui.survolSel.apercu) : null;

  /* la haute définition des photos de la couverture, tirée de l'original */
  const ids = frames.flatMap((f) => (f.role === "photo" && f.photoId ? [f.photoId] : []));
  const cle = ids.join("|");
  useEffect(() => {
    demanderHd(cle ? cle.split("|").map((id) => ({ id, source: adresses.get(id)?.original })) : [], 2e9);
  }, [cle, adresses]);

  return (
    <div className="ed-scene ed-scene--couv">
      <button type="button" className="ed-nav ed-nav--g" aria-label="Avant la couverture" disabled>‹</button>
      <button type="button" className="ed-nav ed-nav--d" aria-label="Planche 1" onClick={() => envoyer({ type: "naviguer", sens: 1 })}>›</button>
      <div className="ed-couv" style={{ "--couv-l": W } as React.CSSProperties} aria-label="Couverture : quatrième, dos, première"
        onClick={(e) => { if (clicSupprime() || ro) return; if (!(e.target as HTMLElement).closest("[data-cadre], .ed-txt, button, .ed-cadre-barre") && etat.cadreActif) envoyer({ type: "activerCadre", ref: null }); }}>
        <div className="ed-feuille ed-feuille--couv" />
        {aplatsVus.map((a, i) => (
          <div key={`a${i}`} className={cls("ed-aplat", `ed-aplat--${a.teinte}`)} aria-hidden="true"
            style={{ left: pc(a.x, W), top: pc(a.y, PAGE_H), width: pc(a.l, W), height: pc(a.h, PAGE_H) }} />
        ))}
        {/* les vrais cadres restent cliquables ; l'aperçu (dépôt, gabarit survolé) se peint PAR-DESSUS, sans attraper la souris */}
        {frames.map((f) => (f.role === "photo"
          ? <CadreCouv key={`p${f.ref.index}`} f={f} W={W} fantome={false} sous={!!framesA} />
          : <TexteCouv key={`t${f.ref.index}`} f={f} W={W} fantome={false} sous={!!framesA} />))}
        {framesA ? (
          <div className="ed-fantome ed-fantome--plein" aria-hidden="true">
            {aplats.map((a, i) => (
              <div key={`fa${i}`} className={cls("ed-aplat", `ed-aplat--${a.teinte}`)} style={{ left: pc(a.x, W), top: pc(a.y, PAGE_H), width: pc(a.l, W), height: pc(a.h, PAGE_H) }} />
            ))}
            {framesA.map((f) => (f.role === "photo"
              ? <CadreCouv key={`p${f.ref.index}`} f={f} W={W} fantome />
              : <TexteCouv key={`t${f.ref.index}`} f={f} W={W} fantome />))}
          </div>
        ) : null}
        {/* le dos : sa bande, ses deux plis, sa cote */}
        <div className={cls("ed-couv-dos", dos.dos === null && "ed-couv-dos--inconnu")} style={{ left: pc(PAGE_L, W), width: pc(d, W) }} aria-hidden="true" />
        <i className="ed-couv-pli" style={{ left: pc(PAGE_L, W) }} aria-hidden="true" />
        <i className="ed-couv-pli" style={{ left: pc(PAGE_L + d, W) }} aria-hidden="true" />
        <span className={cls("ed-couv-cote", dos.dos === null && "ed-couv-cote--manque")} style={{ left: pc(PAGE_L + d / 2, W) }}>
          {dos.dos === null ? "Dos ?" : `Dos ${mm(dos.dos)} mm`}
        </span>
        <span className="ed-couv-face" style={{ left: 0 }}>4e</span>
        <span className="ed-couv-face" style={{ left: pc(PAGE_L + d, W) }}>1re</span>
        {g ? (
          <button type="button" className="ed-pastille ed-pastille--couv" aria-expanded={ui.rangee === "double"} aria-haspopup="true"
            onClick={(e) => { e.stopPropagation(); majUi({ rangee: ui.rangee === "double" ? null : "double", apercuGab: null }); }}>
            {g.nom} {Ico.bas}
          </button>
        ) : null}
        {!framesA && !glisse && !ro ? <Selection frames={frames} W={W} /> : null}
        {bulle ? <div className="ed-bulle">{bulle}</div> : null}
      </div>
      {etat.recadrage && etat.recadrage.ref.plancheId === ID_COUVERTURE ? <OutilsRecadrageCouv frames={frames} /> : null}
    </div>
  );
}

/* ─── un cadre photo de la couverture ─── */
function CadreCouv({ f, W, fantome, sous }: { f: CadreCouvertureEcran & CadrePhoto; W: number; fantome: boolean; sous?: boolean }) {
  const { etat, envoyer, envoyerAvec, adresses, ui, majUi, lectureSeule: ro, commencerAppui, clicSupprime } = useEd();
  const hd = useHd(f.photoId);
  const ref = f.ref;
  const st: React.CSSProperties = {
    left: pc(f.x, W), top: pc(f.y, PAGE_H), width: pc(f.l, W), height: pc(f.h, PAGE_H),
    ...(f.rotation ? { transform: `rotate(${f.rotation}deg)` } : {}),
    ...(f.rayon ? { borderRadius: `${(f.rayon / W) * 100}cqw` } : {}),
    ...(sous ? { opacity: 0 } : {}),
  };
  const d = etat.glisser;
  const cibleCour = d?.survol ?? ui.survolSel?.cible ?? null;
  const cible = !fantome && !!cibleCour && cibleCour.type === "cadre" && memeRef(cibleCour.ref, ref);
  const actif = !fantome && memeRef(etat.cadreActif, ref);
  const arme = !fantome && memeRef(etat.echangeArme, ref);
  const attrs = fantome ? {} : { "data-cadre": `${ID_COUVERTURE}|double|${ref.index}` };
  const sel = etat.selection.ids;
  /* une sélection qui attend : le survol montre la pose, le clic la fait */
  const survol = fantome || ro || !sel.length ? undefined : () => {
    const source: SourceGlisser = { type: "bibliotheque", ids: sel.slice(0, 1) };
    const c = { type: "cadre" as const, ref };
    majUi({ survolSel: { cle: `couv${ref.index}`, cible: c, source, apercu: apercuDepot(etat, c, source) } });
  };
  const clic = (e: React.MouseEvent) => {
    if (fantome || clicSupprime() || ro) return;
    e.stopPropagation();
    if (sel.length) { majUi({ survolSel: null }); envoyer({ type: "deposer", source: { type: "bibliotheque", ids: sel.slice(0, 1) }, cible: { type: "cadre", ref } }); return; }
    if (etat.echangeArme) { envoyer({ type: "cliquerCible", cible: { type: "cadre", ref } }); return; }
    if (f.photoId) envoyer({ type: "activerCadre", ref: actif ? null : ref });
  };
  if (!f.photoId) {
    return (
      <div className={cls("ed-cadre ed-cadre--couv-vide", cible && "ed-cadre--cible", fantome && "ed-cadre--fantome")} style={st} {...attrs}
        onClick={clic} onMouseEnter={survol} onMouseLeave={survol ? () => majUi({ survolSel: null }) : undefined}>
        {fantome ? null : <span>{sel.length ? "Poser ici" : "Glisser une photo"}</span>}
      </div>
    );
  }
  const src = hd ?? grandeDe(adresses.get(f.photoId));
  const k = f.cadrage;
  const imgSt: React.CSSProperties = { left: pc(k.x, f.l), top: pc(k.y, f.h), width: pc(k.l, f.l), height: pc(k.h, f.h) };
  const recad = !fantome && !!etat.recadrage && memeRef(etat.recadrage.ref, ref);
  if (recad && src) {
    return (
      <div className="ed-cadre ed-cadre--recadrage" style={st} {...attrs}
        onPointerDown={(e) => debutRecadrage(e, f, envoyerAvec)}
        ref={(el) => {
          if (!el) return;
          const roue = (ev: WheelEvent) => {
            ev.preventDefault();
            const sens = ev.deltaY > 0 ? 0.92 : 1.08;
            envoyerAvec((e) => {
              const a = e.recadrage ? couvertureDe(e.magazine).photos[e.recadrage.ref.index] : null;
              return a ? { type: "zoomerImage", zoom: a.recadrage.zoom * sens } : null;
            });
          };
          el.addEventListener("wheel", roue, { passive: false });
          return () => el.removeEventListener("wheel", roue);
        }}>
        <img className="ed-fantome-img" src={src} alt="" decoding="async" draggable={false} style={imgSt} />
        <div className="ed-cadre-clip"><img src={src} alt="" decoding="async" draggable={false} style={imgSt} /></div>
      </div>
    );
  }
  return (
    <div className={cls("ed-cadre", (actif || arme) && "ed-cadre--actif", cible && "ed-cadre--cible", fantome && "ed-cadre--fantome", f.indisponible && "ed-cadre--indispo")}
      style={st} {...attrs} tabIndex={fantome ? -1 : 0} role={fantome ? undefined : "button"} aria-label={fantome ? undefined : `${f.nom ?? "Photo"}, ${f.face === "premiere" ? "première" : "quatrième"}`}
      onClick={clic} onMouseEnter={survol} onMouseLeave={survol ? () => majUi({ survolSel: null }) : undefined}
      onPointerDown={fantome || ro ? undefined : (e) => { if (sel.length || etat.echangeArme || (e.target as HTMLElement).closest(".ed-cadre-barre")) return; commencerAppui(e, { type: "cadre", ref, photoId: f.photoId }); }}
      onDoubleClick={fantome || ro ? undefined : (e) => { e.stopPropagation(); envoyer({ type: "ouvrirRecadrage", ref }); }}
      onKeyDown={fantome ? undefined : (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "ouvrirRecadrage", ref }); } }}>
      {f.indisponible || !src ? <span>Photo indisponible</span> : <img src={src} alt="" decoding="async" draggable={false} style={imgSt} />}
      {f.bord ? <span className="ed-bord" style={{ borderWidth: `${(f.bord / W) * 100}cqw` }} aria-hidden="true" /> : null}
      {!fantome && f.basseDef && f.dpi !== null ? <span className="ed-cadre-reps"><span className="ed-rep ed-rep--basse" title={`${Math.round(f.dpi)} dpi`}>Basse déf.</span></span> : null}
      {arme ? <span className="ed-bulle" style={{ top: 6 }}>Choisir l&apos;autre cadre</span> : null}
    </div>
  );
}

/* ─── un texte de la couverture : le mot-titre se dessine au corps calculé, le motif ligne à ligne ─── */
function TexteCouv({ f, W, fantome, sous }: { f: CadreCouvertureEcran & { role: "titre" | "texte" | "legende"; repeter: number }; W: number; fantome: boolean; sous?: boolean }) {
  const { etat, envoyer, lectureSeule: ro } = useEd();
  const ref = f.ref;
  const libelle = f.vide && !f.parDefaut;
  const vu = f.vide ? f.parDefaut ?? f.contenu : f.contenu;
  const style: React.CSSProperties = {
    left: pc(f.x, W), top: pc(f.y, PAGE_H), width: pc(f.l, W), height: pc(f.h, PAGE_H),
    fontSize: `max(6px, ${((f.taille * 25.4) / 72 / W) * 100}cqw)`, fontWeight: f.gras ? 700 : 400, ...(f.blanc ? { color: "#fff" } : {}),
    ...(sous ? { opacity: 0 } : {}),
  };
  const enEdition = !fantome && !!etat.texte && memeRef(etat.texte.ref, ref);
  if (enEdition) {
    return (
      <div className="ed-txt ed-txt--couv ed-txt--edit" style={{ ...style, color: undefined }} contentEditable suppressContentEditableWarning role="textbox" aria-label="Texte de la couverture"
        ref={(n) => {
          if (n && !n.dataset.pret) {
            n.dataset.pret = "1";
            n.textContent = f.vide ? f.parDefaut ?? "" : f.contenu;
            setTimeout(() => {
              if (!n.isConnected) return;
              n.focus();
              const s = window.getSelection();
              if (s) { s.selectAllChildren(n); s.collapseToEnd(); }
            }, 0);
          }
        }}
        onBlur={() => fermerTexteDom(envoyer)}
        onKeyDown={(e) => { if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) { e.preventDefault(); e.currentTarget.blur(); } }} />
    );
  }
  return (
    <div className={cls("ed-txt ed-txt--couv", libelle && "ed-txt--libelle", f.vide && f.parDefaut && "ed-txt--auto")} style={style}
      role={fantome ? undefined : "button"} tabIndex={fantome || ro ? -1 : 0} aria-label={fantome ? undefined : `Modifier : ${vu}`}
      onClick={fantome || ro ? undefined : (e) => { e.stopPropagation(); envoyer({ type: "ouvrirTexte", ref }); }}
      onKeyDown={fantome || ro ? undefined : (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "ouvrirTexte", ref }); } }}>
      {contenuImprime(vu, { repeter: f.repeter })}
    </div>
  );
}

/* ─── le cadre actif : contour et deux gestes ─── */
function Selection({ frames, W }: { frames: CadreCouvertureEcran[]; W: number }) {
  const { etat, envoyer } = useEd();
  if (etat.recadrage) return null;
  const f = frames.find((x): x is CadreCouvertureEcran & CadrePhoto => x.role === "photo" && !!x.photoId && memeRef(etat.cadreActif, x.ref));
  if (!f) return null;
  const st: React.CSSProperties = { left: pc(f.x, W), top: pc(f.y, PAGE_H), width: pc(f.l, W), height: pc(f.h, PAGE_H) };
  return (
    <div className="ed-cs" style={st}>
      <span className="ed-cs-boite" />
      {etat.echangeArme ? null : (
        <span className="ed-cadre-barre" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          {f.dpi !== null ? <span className={cls("ed-qualite", f.dpi < SEUIL_DPI ? "ed-qualite--basse" : f.dpi < SEUIL_DPI_CONFORT && "ed-qualite--juste")}>{Math.round(f.dpi)} dpi</span> : null}
          <button type="button" onClick={() => envoyer({ type: "armerEchange", ref: f.ref })}>Échanger</button>
          <button type="button" onClick={() => envoyer({ type: "ouvrirRecadrage", ref: f.ref })}>Recadrer</button>
          <button type="button" onClick={() => envoyer({ type: "retirer", ref: f.ref })}>Retirer</button>
        </span>
      )}
    </div>
  );
}

function debutRecadrage(e: React.PointerEvent, f: CadrePhoto, envoyerAvec: ReturnType<typeof useEd>["envoyerAvec"]) {
  e.stopPropagation();
  e.preventDefault();
  const box = e.currentTarget.getBoundingClientRect();
  const mmParPx = f.l / box.width;
  let x = e.clientX, y = e.clientY;
  const mv = (ev: PointerEvent) => {
    const ddx = (ev.clientX - x) * mmParPx, ddy = (ev.clientY - y) * mmParPx;
    x = ev.clientX; y = ev.clientY;
    envoyerAvec(() => ({ type: "deplacerImage", ddx, ddy }));
  };
  const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
}

function OutilsRecadrageCouv({ frames }: { frames: CadreCouvertureEcran[] }) {
  const { etat, envoyer } = useEd();
  const r = etat.recadrage;
  const c = r ? frames.find((x): x is CadreCouvertureEcran & CadrePhoto => x.role === "photo" && memeRef(x.ref, r.ref)) : undefined;
  if (!c) return null;
  const dpi = c.dpi ? Math.round(c.dpi) : null;
  return (
    <div className="ed-recadre" onPointerDown={(e) => e.stopPropagation()}>
      <span>Zoom</span>
      <input type="range" min="1" max="8" step="0.05" value={c.recadrage.zoom} aria-label="Zoom" onChange={(e) => envoyer({ type: "zoomerImage", zoom: Number(e.currentTarget.value) })} />
      {dpi ? <span className={cls("ed-qualite", dpi < SEUIL_DPI ? "ed-qualite--basse" : dpi < SEUIL_DPI_CONFORT && "ed-qualite--juste")}>{dpi} dpi</span> : null}
      <button type="button" className="ed-bt" onClick={() => envoyer({ type: "recentrer" })}>Recentrer</button>
      <button type="button" className="ed-bt ed-bt--action" onClick={() => envoyer({ type: "fermerRecadrage" })}>OK</button>
    </div>
  );
}

/* ─── sous la couverture : le dos, les pages, ce que la règle du titre en dit ─── */
export function BandeCouverture() {
  const { etat, envoyer, lectureSeule: ro } = useEd();
  const dos = useDosCouverture();
  const b = bilanCouverture(etat);
  const saisies = couvertureDe(etat.magazine).pages;
  const [pages, setPages] = useState<string>(saisies ? String(saisies) : "");
  const valider = () => {
    const v = pages.trim();
    if (!v) { if (saisies !== undefined) envoyer({ type: "pagesCouverture", pages: null }); return; }
    const n = Number(v);
    if (Number.isInteger(n) && n >= 2 && n <= 400 && n !== saisies) envoyer({ type: "pagesCouverture", pages: n });
  };
  return (
    <div className="ed-bande ed-bande--couv" aria-label="La couverture">
      <div className="ed-bande-t">Couverture<b>{b.posees} / {b.cadres}</b></div>
      <span className={cls("ed-couv-info", dos.dos === null && "ed-couv-info--manque")}>
        {dos.dos !== null ? <>Dos <b>{mm(dos.dos)} mm</b></> : <b>{dos.manque}</b>}
        {dos.source === "projet" ? <> · {dos.pages} pages payées</> : null}
        {" · "}{dos.finition === "matte" ? "papier mat" : "papier brillant"}{dos.finitionParDefaut ? " par défaut" : ""}
      </span>
      {dos.source !== "projet" ? (
        <label className="ed-couv-pages">
          <span>Pages</span>
          <input className="adm-input" type="number" inputMode="numeric" min={24} max={60} step={2} value={pages} disabled={ro} placeholder="32" aria-label="Pages du magazine, pour le dos"
            onChange={(e) => setPages(e.currentTarget.value)} onBlur={valider} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }} />
        </label>
      ) : null}
      <span className="ed-esp" />
      {b.premiereSansPhoto ? <span className="ed-couv-alerte">1re sans photo</span> : null}
      {b.motTitreCourt ? <span className="ed-couv-alerte" title="Le mot-titre doit couvrir 60 % de la 1re">Titre court · {Math.round((b.partMotTitre ?? 0) * 100)} %</span> : null}
      {b.titreSurLeSujet ? <span className="ed-couv-alerte" title="Le titre recouvre le sujet de la photo : un autre gabarit, ou recadrer">Titre sur le sujet</span> : null}
    </div>
  );
}

/* ─── une couverture en petit : chemin de fer et tiroir ─── */
export function DessinCouverture({ c, l, photos }: { c: Pick<Couverture, "templateId" | "photos">; l: number; photos?: boolean }) {
  const { adresses } = useEd();
  const d = DOS_ECRAN_INCONNU;
  const W = largeurCouverture(d);
  let iP = 0;
  return (
    <span className="ed-gab-dessin ed-couv-dessin" style={{ width: l, height: l * (PAGE_H / W) }} aria-hidden="true">
      {decorCouverture(c, d).map((a, i) => (
        <i key={`a${i}`} className={`a a--${a.teinte}`} style={{ left: pc(a.x, W), top: pc(a.y, PAGE_H), width: pc(a.l, W), height: pc(a.h, PAGE_H) }} />
      ))}
      {cadresCouverture(c, d).map((x, i) => {
        const st = { left: pc(x.x, W), top: pc(x.y, PAGE_H), width: pc(x.l, W), height: pc(x.h, PAGE_H) };
        if (x.role !== "photo") return <i key={i} className="t" style={st} />;
        const id = c.photos[iP++]?.photoId;
        const src = photos && id ? vignetteDe(adresses.get(id)) : null;
        return <i key={i} className={x.bord ? "b" : undefined} style={st}>{src ? <img src={src} alt="" decoding="async" draggable={false} /> : null}</i>;
      })}
    </span>
  );
}

/* ─── le tiroir des gabarits de couverture : survol = aperçu en direct, clic = choisi ─── */
export function RangeeCouverture() {
  const { etat, envoyer, majUi } = useEd();
  const c = couvertureDe(etat.magazine);
  const geste = (g: GabaritCouverture): Geste => ({ type: "choisirGabarit", plancheId: ID_COUVERTURE, cible: "double", templateId: g.id });
  const voir = (g: GabaritCouverture) => () => {
    if (g.id === c.templateId) { majUi({ apercuGab: null }); return; }
    const x = apercu(etat, geste(g));
    majUi({ apercuGab: x.magazine !== etat.magazine ? x.magazine : null });
  };
  return (
    <div className="ed-rangee-gab" role="menu" aria-label="Gabarits de couverture" onClick={(e) => e.stopPropagation()} onMouseLeave={() => majUi({ apercuGab: null })}>
      <span className="ed-rangee-tete"><span className="ed-rangee-t">Couverture<b>{GABARITS_COUVERTURE.length} gabarits</b></span></span>
      {GABARITS_COUVERTURE.map((g) => (
        <button key={g.id} type="button" className="ed-gab" role="menuitemradio" aria-checked={g.id === c.templateId} title={`${g.nom} · ${g.idees.join(", ")}`}
          onMouseEnter={voir(g)} onFocus={voir(g)}
          onClick={() => { majUi({ apercuGab: null }); if (g.id !== c.templateId || !etat.magazine.couverture) envoyer(geste(g)); }}>
          <DessinCouverture c={{ templateId: g.id, photos: g.id === c.templateId ? c.photos : [] }} l={124} photos={g.id === c.templateId} />
          <span>{g.nom}</span>
        </button>
      ))}
      <span className="ed-esp" />
      <button type="button" className="ed-ico" aria-label="Fermer les gabarits" onClick={() => majUi({ rangee: null, apercuGab: null })}>{Ico.fermer}</button>
    </div>
  );
}
