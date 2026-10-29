"use client";

import { useEffect } from "react";
import {
  actionsPlanche, aplatsPlanche, apercuDepot, cadresPlanche, idsPlanche, LIBELLE, photosDe, reperesBibliotheque, resumeIssue, SEUIL_DPI, selectionOrdonnee,
  type CadrePhoto, type CadrePlanche, type CadreTexte, type CibleDepot, type EtatEditeur, type RefCadre, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import type { Magazine, Planche } from "@/lib/mise-en-page/magazine";
import { PAGE_H, PLANCHE_L } from "@/lib/mise-en-page/geometrie";
import { cls, fermerTexteDom, memeRef, pc, useEd, type Ui } from "./contexte";
import { cibleSous, libelleApercu } from "./glisser";
import { grandeDe, precharger } from "./images";
import { Pastilles } from "./Gabarits";

/* La double page, en grand. Aucun calcul du magazine ici : on envoie des gestes, on dessine l'état rendu.
   Pendant un glisser, le module pur joue le dépôt à blanc (`glisser.apercu`) : on le montre en transparence. */

const NOM_COTE = { gauche: "page gauche", droite: "page droite", double: "double page" } as const;

type Apercu = { magazine: Magazine; genre: "echange" | "pose" | "gabarit" };

function apercuCourant(etat: EtatEditeur, ui: Ui): Apercu | null {
  const d = etat.glisser;
  const ss = ui.survolSel;
  if (d && d.survol && d.apercu && !d.apercu.refus) return { magazine: d.apercu.magazine, genre: d.survol.type === "cadre" ? "echange" : "pose" };
  if (ui.apercuGab) return { magazine: ui.apercuGab, genre: "gabarit" };
  if (ss && ss.apercu && !ss.apercu.refus) return { magazine: ss.apercu.magazine, genre: ss.cible.type === "cadre" ? "echange" : "pose" };
  return null;
}

export default function Scene() {
  const { etat, envoyer, adresses, ui, majUi, lectureSeule: ro, clicSupprime, flasher } = useEd();
  const m = etat.magazine;
  const idx = Math.max(0, m.planches.findIndex((p) => p.id === etat.plancheCourante));
  const pl = m.planches[idx];
  const premiere = idx === 0;
  const d = etat.glisser;
  const ss = ui.survolSel;
  const ap = apercuCourant(etat, ui);
  const plA = ap ? ap.magazine.planches.find((x) => x.id === pl.id) ?? null : null;
  const montrerApercu = !!(plA && plA !== pl);
  const cibleCour: CibleDepot | null = d?.survol ?? ss?.cible ?? null;
  const refusIssue = d?.apercu?.refus ? d.apercu : ss?.apercu?.refus ? ss.apercu : null;
  const refus = !!refusIssue;
  const rep = reperesBibliotheque(etat);
  const sel = etat.selection.ids;
  const act = actionsPlanche(etat, pl.id);
  const glisseUnePhoto = !!d && d.source.type !== "planche";
  const zoneDouble = glisseUnePhoto && !!act?.zoneDouble;
  const cotes = pl.mode === "double" ? (["double"] as const) : premiere ? (["droite"] as const) : (["gauche", "droite"] as const);
  const estCibleCote = (c: string) => !!cibleCour && ((cibleCour.type === "page" && cibleCour.cote === c && cibleCour.plancheId === pl.id) || (cibleCour.type === "double" && c === "double" && cibleCour.plancheId === pl.id));
  const frames = cadresPlanche(etat, pl.id);
  const framesA = montrerApercu ? cadresPlanche({ ...etat, magazine: ap!.magazine }, pl.id) : null;
  const nouveaux = framesA ? framesA.filter((f) => f.role === "photo" && f.photoId && !frames.some((g) => g.role === "photo" && memeRef(g.ref, f.ref) && g.photoId === f.photoId)).map((f) => f.ref) : [];

  const survolSelection = (e: React.PointerEvent) => {
    if (d || ro || etat.recadrage) return;
    const arme = etat.echangeArme;
    if (!sel.length && !arme) { if (ss) majUi({ survolSel: null }); return; }
    if ((e.target as HTMLElement).closest("button")) return;
    const plArme = arme ? m.planches.find((x) => x.id === arme.plancheId) : null;
    const source: SourceGlisser = arme
      ? { type: "cadre", ref: arme, photoId: plArme ? photosDe(plArme).find((y) => memeRef(y.ref, arme))?.photoId ?? null : null }
      : { type: "bibliotheque", ids: selectionOrdonnee(etat) };
    let c = cibleSous(e.clientX, e.clientY, source, etat);
    if (c && !(c.type === "page" || c.type === "double" || c.type === "cadre")) c = null;
    if (arme && c && c.type !== "cadre") c = null;
    const cle = c ? JSON.stringify(c) : null;
    if (cle !== (ss?.cle ?? null)) majUi({ survolSel: c && cle ? { cle, cible: c, source, apercu: apercuDepot(etat, c, source) } : null });
  };
  const clicPlanche = (e: React.MouseEvent) => {
    if (clicSupprime() || ro) return;
    if ((e.target as HTMLElement).closest(".ed-pastille, .ed-rangee-gab, .ed-txt, .ed-cadre-barre, .ed-confirm, button")) return;
    if (ss && ss.apercu && !ss.apercu.refus) { majUi({ survolSel: null }); envoyer({ type: "cliquerCible", cible: ss.cible }); flasher(ss.cible); return; }
    if (!(e.target as HTMLElement).closest("[data-cadre]") && etat.cadreActif) envoyer({ type: "activerCadre", ref: null });
  };

  /* les planches voisines en grand : la navigation est immédiate */
  useEffect(() => {
    const vs = [m.planches[idx + 1], m.planches[idx - 1]].filter((x): x is Planche => !!x);
    precharger(vs.flatMap((x) => idsPlanche(x)).map((id) => grandeDe(adresses.get(id))), 1.5e9);
  }, [m, idx, adresses]);

  const poserIci = (c: "gauche" | "droite" | "double"): CibleDepot => (c === "double" ? { type: "double", plancheId: pl.id } : { type: "page", plancheId: pl.id, cote: c });
  const survolBouton = (c: "gauche" | "droite" | "double") => () => {
    const source: SourceGlisser = { type: "bibliotheque", ids: selectionOrdonnee(etat) };
    const cb = poserIci(c);
    majUi({ survolSel: { cle: `bt${c}`, cible: cb, source, apercu: apercuDepot(etat, cb, source) } });
  };
  const bullePose = d && d.survol && d.apercu && !d.apercu.refus && ["page", "double", "cadre"].includes(d.survol.type) ? libelleApercu(d.source, d.survol, d.apercu) : null;
  const bulleSel = ss && ss.apercu && !ss.apercu.refus && !d ? libelleApercu(ss.source, ss.cible, ss.apercu) : null;
  const conf = etat.confirmation;

  return (
    <div className="ed-scene" onPointerMove={survolSelection} onPointerLeave={() => { if (ss) majUi({ survolSel: null }); }}>
      <button type="button" className="ed-nav ed-nav--g" aria-label="Double page précédente" disabled={idx === 0} onClick={() => envoyer({ type: "naviguer", sens: -1 })}>‹</button>
      <button type="button" className="ed-nav ed-nav--d" aria-label="Double page suivante" disabled={idx >= m.planches.length - 1} onClick={() => envoyer({ type: "naviguer", sens: 1 })}>›</button>
      <div key={pl.id} className={cls("ed-planche", ui.dir === "d" && "ed-planche--d", ui.dir === "g" && "ed-planche--g")} aria-label={`Planche ${idx + 1}`} onClick={clicPlanche}>
        <div className="ed-feuille" />
        {premiere ? <div className="ed-couv-int" aria-hidden="true">Couverture intérieure</div> : null}
        {cotes.map((c) => {
          const vide = !(c === "double" ? pl.double : pl[c]);
          return (
            <div key={c} className={cls("ed-cote", c === "gauche" ? "ed-cote--g" : c === "droite" ? "ed-cote--d" : "ed-cote--double", estCibleCote(c) && (refus ? "ed-cote--refus" : "ed-cote--cible"))} data-cote={`${pl.id}|${c}`}>
              {vide && !montrerApercu ? <div className="ed-cote-vide"><span>Glissez des photos ici</span></div> : null}
              {estCibleCote(c) && refus ? <div className="ed-bulle ed-bulle--refus" style={{ top: "45%" }}>{resumeIssue(refusIssue)}</div> : null}
            </div>
          );
        })}
        {aplatsPlanche(etat, pl.id).map((a, i) => (
          <div key={`a${i}`} className={cls("ed-aplat", `ed-aplat--${a.teinte}`)} aria-hidden="true"
            style={{ left: pc(a.x, PLANCHE_L), top: pc(a.y, PAGE_H), width: pc(a.l, PLANCHE_L), height: pc(a.h, PAGE_H), ...(montrerApercu ? { opacity: 0 } : {}) }} />
        ))}
        {frames.map((f) => (
          <CadreVue key={`${f.ref.cible}${f.ref.index}${f.role}`} f={f} pl={pl} rep={rep} sous={montrerApercu} cibleCour={cibleCour} refus={refus} />
        ))}
        {framesA ? (
          <div className={cls("ed-fantome", ap!.genre !== "echange" && "ed-fantome--plein")} aria-hidden="true">
            {framesA.map((f) => (
              <CadreVue key={`${f.ref.cible}${f.ref.index}${f.role}`} f={f} pl={plA!} rep={rep} fantome nouv={f.role === "photo" && nouveaux.some((r) => memeRef(r, f.ref))} cibleCour={null} refus={false} />
            ))}
          </div>
        ) : null}
        {cibleCour && (cibleCour.type === "page" || cibleCour.type === "double") && cibleCour.plancheId === pl.id ? (
          <div className={cls("ed-anneau", refus && "ed-anneau--refus")} style={cibleCour.type === "double" ? { left: 0, width: "100%" } : cibleCour.cote === "gauche" ? { left: 0, width: "50%" } : { left: "50%", width: "50%" }} />
        ) : null}
        {zoneDouble ? <div className={cls("ed-zone-double", cibleCour?.type === "double" && "ed-zone-double--cible")}>Double page</div> : null}
        {!d && !ro && !(ss && ss.apercu) && act ? <Pastilles pl={pl} act={act} /> : null}
        {bullePose ? <div className="ed-bulle">{bullePose}</div> : null}
        {bulleSel ? <div className="ed-bulle">{bulleSel}</div> : null}
        {sel.length && !d && !ro && !conf ? cotes.map((c) => (
          <button key={c} type="button" className="ed-bt ed-bt--action ed-poser" style={{ left: c === "gauche" ? "25%" : c === "droite" ? "75%" : "50%" }}
            onMouseEnter={survolBouton(c)} onFocus={survolBouton(c)} onMouseLeave={() => majUi({ survolSel: null })} onBlur={() => majUi({ survolSel: null })}
            onClick={(e) => { e.stopPropagation(); const cb = poserIci(c); majUi({ survolSel: null }); envoyer({ type: "poser", cible: cb }); flasher(cb); }}>Poser ici</button>
        )) : null}
        {conf ? (
          <div className="ed-confirm" role="alertdialog" aria-label="Photo à ne pas publier">
            <p><span className="ed-rep ed-rep--drapeau">!</span>{conf.total > 1 ? `${conf.nb} à ne pas publier sur ${conf.total}` : "À ne pas publier"}</p>
            <div>
              <button type="button" className="ed-bt ed-bt--action" onClick={() => envoyer({ type: "confirmer" })}>Poser quand même</button>
              <button type="button" className="ed-bt" onClick={() => envoyer({ type: "annulerConfirmation" })}>Annuler</button>
            </div>
          </div>
        ) : null}
      </div>
      {etat.recadrage ? <OutilsRecadrage /> : null}
    </div>
  );
}

/** Une longueur en mm, à l'échelle de la planche (la planche est un conteneur `inline-size`). */
const mmEnCqw = (mm: number): string => `${(mm / PLANCHE_L) * 100}cqw`;

/* ─── un cadre de la planche ─── */
type Rep = ReturnType<typeof reperesBibliotheque>;

function CadreVue({ f, pl, rep, sous, fantome, nouv, cibleCour, refus }: {
  f: CadrePlanche; pl: Planche; rep: Rep; sous?: boolean; fantome?: boolean; nouv?: boolean; cibleCour: CibleDepot | null; refus: boolean;
}) {
  const { etat, envoyer, envoyerAvec, adresses, ui, lectureSeule: ro, commencerAppui, clicSupprime } = useEd();
  const st: React.CSSProperties = {
    left: pc(f.x, PLANCHE_L), top: pc(f.y, PAGE_H), width: pc(f.l, PLANCHE_L), height: pc(f.h, PAGE_H),
    ...(f.rotation ? { transform: `rotate(${f.rotation}deg)` } : {}), ...(sous ? { opacity: 0 } : {}),
    ...(f.role === "photo" && f.rayon ? { borderRadius: mmEnCqw(f.rayon) } : {}),
  };
  if (f.role !== "photo") return <TexteVue f={f} st={st} fantome={!!fantome} />;
  const ref = f.ref;
  const d = etat.glisser;
  const actif = !fantome && memeRef(etat.cadreActif, ref);
  const arme = !fantome && memeRef(etat.echangeArme, ref);
  const trainee = !fantome && !!d && d.source.type === "cadre" && memeRef(d.source.ref, ref);
  const cible = !!cibleCour && cibleCour.type === "cadre" && memeRef(cibleCour.ref, ref) && !refus;
  const fl = ui.flash;
  const flash = !fantome && !!fl && (fl.type === "cadre" ? memeRef(fl.ref, ref) : "plancheId" in fl && fl.plancheId === pl.id && ((fl.type === "page" && fl.cote === ref.cible) || fl.type === "double"));
  const eclair = !fantome && etat.eclair === pl.id;
  const recad = !fantome && !!etat.recadrage && memeRef(etat.recadrage.ref, ref);
  const attrs = fantome ? {} : { "data-cadre": `${pl.id}|${ref.cible}|${ref.index}`, "data-cote": `${pl.id}|${ref.cible}` };
  if (!f.photoId) return <div className={cls("ed-cadre", fantome && nouv && "ed-cadre--nouv")} style={st} {...attrs} />;
  const clic = (e: React.MouseEvent) => {
    if (fantome || clicSupprime() || etat.selection.ids.length) return;
    e.stopPropagation();
    envoyer(etat.echangeArme ? { type: "cliquerCible", cible: { type: "cadre", ref } } : { type: "activerCadre", ref: actif ? null : ref });
  };
  const appui = fantome || ro ? undefined : (e: React.PointerEvent) => {
    if (!etat.selection.ids.length && !etat.echangeArme && !(e.target as HTMLElement).closest(".ed-cadre-barre")) commencerAppui(e, { type: "cadre", ref, photoId: f.photoId });
  };
  const src = grandeDe(adresses.get(f.photoId));
  if (f.indisponible || !src) {
    return (
      <div className={cls("ed-cadre ed-cadre--indispo", actif && "ed-cadre--actif", cible && "ed-cadre--cible")} style={st} {...attrs} tabIndex={fantome ? -1 : 0} role={fantome ? undefined : "button"} aria-label="Photo indisponible"
        onClick={clic} onPointerDown={appui}>
        <span>Photo indisponible</span>
        {actif && !d && !ro ? <BarreCadre refC={ref} indispo /> : null}
      </div>
    );
  }
  const k = f.cadrage;
  const imgSt: React.CSSProperties = { left: pc(k.x, f.l), top: pc(k.y, f.h), width: pc(k.l, f.l), height: pc(k.h, f.h) };
  const n = rep.utilisations.get(f.photoId) || 0;
  const ph = etat.catalogue.get(f.photoId);
  const am = ph ? ph.autresMagazines : [];
  const reps: React.ReactNode[] = [];
  if (f.signalee) reps.push(<span key="s" className="ed-rep ed-rep--drapeau" title="À ne pas publier">!</span>);
  if (f.basseDef && f.dpi !== null) reps.push(<span key="b" className="ed-rep ed-rep--basse" title={`${Math.round(f.dpi)} dpi`}>Basse déf.</span>);
  if (n > 1) reps.push(<span key="n" className="ed-rep">×{n}</span>);
  if (am.length) reps.push(<span key="m" className="ed-rep ed-rep--mag">Mag. {am[0]}</span>);
  if (recad) {
    return (
      <div className="ed-cadre ed-cadre--recadrage" style={st} {...attrs}
        onPointerDown={(e) => debutRecadrage(e, f, envoyerAvec)}
        ref={(el) => {
          if (!el) return;
          const roue = (ev: WheelEvent) => {
            ev.preventDefault();
            const sens = ev.deltaY > 0 ? 0.92 : 1.08;
            envoyerAvec((e) => {
              const c = e.recadrage ? cadresPlanche(e, e.recadrage.ref.plancheId).find((x): x is CadrePhoto => x.role === "photo" && memeRef(x.ref, e.recadrage!.ref)) : null;
              return c ? { type: "zoomerImage", zoom: c.recadrage.zoom * sens } : null;
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
    <div className={cls("ed-cadre", (actif || arme) && "ed-cadre--actif", trainee && "ed-cadre--trainee", cible && "ed-cadre--cible", (flash || eclair) && "ed-cadre--flash", fantome && nouv && "ed-cadre--nouv")}
      style={st} {...attrs}
      tabIndex={fantome ? -1 : 0} role={fantome ? undefined : "button"} aria-label={fantome ? undefined : `${f.nom ?? "Photo"}, ${NOM_COTE[ref.cible]}`}
      onPointerDown={appui} onClick={clic}
      onDoubleClick={fantome || ro ? undefined : (e) => { e.stopPropagation(); envoyer({ type: "ouvrirRecadrage", ref }); }}
      onKeyDown={fantome ? undefined : (e) => {
        if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "ouvrirRecadrage", ref }); }
        else if (e.key === " ") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "activerCadre", ref }); }
      }}>
      <img src={src} alt="" decoding="async" draggable={false} style={imgSt} />
      {f.bord ? <span className="ed-bord" style={{ borderWidth: mmEnCqw(f.bord), borderRadius: f.rayon ? mmEnCqw(f.rayon) : undefined }} aria-hidden="true" /> : null}
      {reps.length ? <span className="ed-cadre-reps">{reps}</span> : null}
      {actif && !arme && !d && !ro ? <BarreCadre refC={ref} /> : null}
      {arme ? <span className="ed-bulle" style={{ top: 6 }}>Choisir l&apos;autre cadre</span> : null}
    </div>
  );
}

function BarreCadre({ refC, indispo }: { refC: RefCadre; indispo?: boolean }) {
  const { envoyer } = useEd();
  return (
    <span className="ed-cadre-barre" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => envoyer({ type: "armerEchange", ref: refC })}>Échanger</button>
      {indispo ? null : <button type="button" onClick={() => envoyer({ type: "ouvrirRecadrage", ref: refC })}>Recadrer</button>}
      <button type="button" onClick={() => envoyer({ type: "retirer", ref: refC })}>Retirer</button>
    </span>
  );
}

/* Glisser l'image dans son cadre : des millimètres, bornés par le module de recadrage. */
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

function OutilsRecadrage() {
  const { etat, envoyer } = useEd();
  const r = etat.recadrage;
  if (!r) return null;
  const c = cadresPlanche(etat, r.ref.plancheId).find((x): x is CadrePhoto => x.role === "photo" && memeRef(x.ref, r.ref));
  if (!c) return null;
  const dpi = c.dpi ? Math.round(c.dpi) : null;
  return (
    <div className="ed-recadre" onPointerDown={(e) => e.stopPropagation()}>
      <span>Zoom</span>
      <input type="range" min="1" max="8" step="0.05" value={c.recadrage.zoom} aria-label="Zoom" onChange={(e) => envoyer({ type: "zoomerImage", zoom: Number(e.currentTarget.value) })} />
      {dpi ? <span className={cls("ed-dpi", dpi < SEUIL_DPI && "ed-dpi--bas")}>{dpi} dpi</span> : null}
      <button type="button" className="ed-bt" onClick={() => envoyer({ type: "recentrer" })}>Recentrer</button>
      <button type="button" className="ed-bt ed-bt--action" onClick={() => envoyer({ type: "fermerRecadrage" })}>OK</button>
    </div>
  );
}

/* ─── un cadre de texte ─── */
function TexteVue({ f, st, fantome }: { f: CadreTexte; st: React.CSSProperties; fantome: boolean }) {
  const { etat, envoyer, lectureSeule: ro } = useEd();
  const refT = f.ref;
  const libelle = f.vide || !f.contenu;
  const style: React.CSSProperties = { ...st, fontSize: `max(9px, ${((f.taille * 25.4) / 72 / PLANCHE_L) * 100}cqw)`, fontWeight: f.gras ? 600 : 400, ...(f.blanc ? { color: "#fff" } : {}) };
  const enEdition = !fantome && !!etat.texte && memeRef(etat.texte.ref, refT);
  if (enEdition) {
    return (
      <div className="ed-txt ed-txt--edit" style={style} contentEditable suppressContentEditableWarning role="textbox" aria-label={`Texte : ${LIBELLE[f.role]}`}
        ref={(n) => {
          if (n && !n.dataset.pret) {
            n.dataset.pret = "1";
            n.textContent = libelle ? "" : f.contenu;
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
    <div className={cls("ed-txt", libelle && "ed-txt--libelle")} style={style} role={fantome ? undefined : "button"} tabIndex={fantome || ro ? -1 : 0}
      aria-label={fantome ? undefined : `Modifier : ${libelle ? LIBELLE[f.role] : f.contenu}`}
      onClick={fantome || ro ? undefined : (e) => { e.stopPropagation(); envoyer({ type: "ouvrirTexte", ref: refT }); }}
      onKeyDown={fantome || ro ? undefined : (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "ouvrirTexte", ref: refT }); } }}>
      {libelle ? f.contenu || LIBELLE[f.role] : f.contenu}
    </div>
  );
}

