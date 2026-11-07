"use client";

import { useEffect } from "react";
import {
  actionsPlanche, aimanter, aplatsPlanche, apercuDepot, cadresPlanche, COTE_MIN, DEPLACEMENT, lignesAimant, idsPlanche, LIBELLE, pageEntiere, photosDe, rangCalque, reperesBibliotheque, resumeIssue,
  SEUIL_DPI, selectionOrdonnee, type CadrePhoto, type CadrePlanche, type CadreTexte, type CibleDepot, type EtatEditeur, type Geste,
  type Guide, type SensCalque, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import type { Magazine, Planche } from "@/lib/mise-en-page/magazine";
import { cadrer } from "@/lib/mise-en-page/recadrage";
import { PAGE_H, PLANCHE_L, type Rect } from "@/lib/mise-en-page/geometrie";
import { cls, fermerTexteDom, memeRef, pc, useEd, type Ui } from "./contexte";
import { cibleSous, libelleApercu } from "./glisser";
import { grandeDe, precharger, vignetteDe } from "./images";
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
  /* lot 4 : pendant qu'on déplace ou redimensionne un cadre, il se dessine à sa place provisoire */
  const rt = ui.retouche;
  const frames = cadresPlanche(etat, pl.id).map((f) => {
    if (!rt || f.role !== "photo" || !memeRef(f.ref, rt.ref)) return f;
    const ph = f.photoId ? etat.catalogue.get(f.photoId) : null;
    return { ...f, x: rt.x, y: rt.y, l: rt.l, h: rt.h, cadrage: cadrer(ph ?? { l: 1, h: 1 }, { l: rt.l, h: rt.h }, f.recadrage) };
  });
  /* lot 4 : toute une page glissée → la bande « Inverser » au bord extérieur de l'autre page */
  const pe = d && d.source.type === "cadres" ? pageEntiere(m, d.source.refs) : null;
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
    if ((e.target as HTMLElement).closest(".ed-pastille, .ed-rangee-gab, .ed-txt, .ed-cadre-barre, .ed-confirm, .ed-cs, button")) return;
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
        {pe && pe.plancheId === pl.id ? (
          <div className={cls("ed-zone-miroir", pe.cote === "gauche" ? "ed-zone-miroir--d" : "ed-zone-miroir--g", cibleCour?.type === "miroir" && "ed-zone-miroir--cible")} data-miroir={pl.id}>
            Inverser<br />miroir
          </div>
        ) : null}
        {/* 06/11 : la ligne où le cadre s'accroche, le temps du glisser */}
        {rt ? ui.guides.map((g, i) => (
          <i key={`g${i}`} className={cls("ed-guide", g.axe === "x" ? "ed-guide--v" : "ed-guide--h")} aria-hidden="true"
            style={g.axe === "x" ? { left: pc(g.pos, PLANCHE_L) } : { top: pc(g.pos, PAGE_H) }} />
        )) : null}
        {!montrerApercu ? <Selections frames={frames} /> : null}
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
  const { etat, envoyer, envoyerAvec, adresses, ui, majUi, lectureSeule: ro, commencerAppui, clicSupprime } = useEd();
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
  /* lot 3 : pendant qu'on glisse UNE photo de la bibliothèque, l'encart « Hésiter » la met derrière au lieu de remplacer */
  const encart = !fantome && !ro && !!d && d.source.type === "bibliotheque" && d.source.ids.length === 1 && d.source.ids[0] !== f.photoId;
  const encartCible = encart && !!cibleCour && cibleCour.type === "hesiter" && memeRef(cibleCour.ref, ref) && !refus;
  const hes = f.hesitation;
  const attrs = fantome ? {} : { "data-cadre": `${pl.id}|${ref.cible}|${ref.index}`, "data-cote": `${pl.id}|${ref.cible}` };
  if (!f.photoId) return <div className={cls("ed-cadre", fantome && nouv && "ed-cadre--nouv")} style={st} {...attrs} />;
  const multi = etat.cadresSel.length > 1;
  const dansSel = etat.cadresSel.some((r) => memeRef(r, ref));
  const clic = (e: React.MouseEvent) => {
    if (fantome || clicSupprime() || etat.selection.ids.length) return;
    e.stopPropagation();
    /* lot 4 : ⇧-clic ajoute le cadre à la sélection (ou l'en retire) */
    if (e.shiftKey && !etat.echangeArme) { envoyer({ type: "basculerCadre", ref }); return; }
    envoyer(etat.echangeArme ? { type: "cliquerCible", cible: { type: "cadre", ref } } : { type: "activerCadre", ref: actif && !multi ? null : ref });
  };
  const appui = fantome || ro ? undefined : (e: React.PointerEvent) => {
    if (etat.selection.ids.length || etat.echangeArme || (e.target as HTMLElement).closest(".ed-cadre-barre")) return;
    /* lot 4 : ⌥ + glisser déplace le cadre lui-même, à la souris */
    if (e.altKey && e.button === 0 && f.role === "photo") { debutRetouche(e, f, "m", majUi, envoyer, ui.aimant ? autresCadres(etat, f) : null); return; }
    if (e.shiftKey) return;
    commencerAppui(e, multi && dansSel ? { type: "cadres", refs: etat.cadresSel } : { type: "cadre", ref, photoId: f.photoId });
  };
  const src = grandeDe(adresses.get(f.photoId));
  if (f.indisponible || !src) {
    return (
      <div className={cls("ed-cadre ed-cadre--indispo", actif && "ed-cadre--actif", cible && "ed-cadre--cible")} style={st} {...attrs} tabIndex={fantome ? -1 : 0} role={fantome ? undefined : "button"} aria-label="Photo indisponible"
        onClick={clic} onPointerDown={appui}>
        <span>Photo indisponible</span>
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
    <div className={cls("ed-cadre", (actif || arme) && "ed-cadre--actif", (trainee || (!fantome && !!d && d.source.type === "cadres" && dansSel)) && "ed-cadre--trainee", cible && "ed-cadre--cible", (flash || eclair) && "ed-cadre--flash", fantome && nouv && "ed-cadre--nouv")}
      style={st} {...attrs}
      tabIndex={fantome ? -1 : 0} role={fantome ? undefined : "button"} aria-label={fantome ? undefined : `${f.nom ?? "Photo"}, ${NOM_COTE[ref.cible]}`}
      onPointerDown={appui} onClick={clic}
      onDoubleClick={fantome || ro ? undefined : (e) => { e.stopPropagation(); if (hes?.ouverte) majUi({ confronter: ref }); else envoyer({ type: "ouvrirRecadrage", ref }); }}
      onKeyDown={fantome ? undefined : (e) => {
        if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "ouvrirRecadrage", ref }); }
        else if (e.key === " ") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "activerCadre", ref }); }
      }}>
      <img src={src} alt="" decoding="async" draggable={false} style={imgSt} />
      {f.bord ? <span className="ed-bord" style={{ borderWidth: mmEnCqw(f.bord), borderRadius: f.rayon ? mmEnCqw(f.rayon) : undefined }} aria-hidden="true" /> : null}
      {reps.length ? <span className="ed-cadre-reps">{reps}</span> : null}
      {hes && !fantome ? (
        <button type="button" className={cls("ed-hes", !hes.ouverte && "ed-hes--tranchee")} tabIndex={-1}
          title={hes.ouverte ? `Hésitation avec ${hes.nom} · double-clic pour comparer, T pour intervertir` : `Hésitation tranchée contre ${hes.nom}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); if (hes.ouverte) majUi({ confronter: ref }); else envoyer({ type: "activerCadre", ref }); }}>
          {vignetteDe(adresses.get(hes.photoId)) ? <img src={vignetteDe(adresses.get(hes.photoId)) ?? undefined} alt="" draggable={false} /> : null}
          <span>{hes.ouverte ? "2 photos" : "Tranchée"}</span>
        </button>
      ) : null}
      {encart ? <span className={cls("ed-hes-encart", encartCible && "ed-hes-encart--cible")} data-hesiter={`${pl.id}|${ref.cible}|${ref.index}`}>Hésiter</span> : null}
      {arme ? <span className="ed-bulle" style={{ top: 6 }}>Choisir l&apos;autre cadre</span> : null}
    </div>
  );
}

/* ─── lot 4 : le cadre actif (ou les cadres du ⇧-clic) par-dessus tous les calques : contour, poignées, barre ───
   Le cadre lui-même reste à son rang : on voit l'ordre des calques tel qu'il partira dans Affinity. */
const POIGNEES = ["no", "n", "ne", "e", "se", "s", "so", "o"] as const;
type Poignee = (typeof POIGNEES)[number] | "m";

function Selections({ frames }: { frames: CadrePlanche[] }) {
  const { etat, envoyer, majUi, ui, lectureSeule: ro } = useEd();
  if (etat.glisser || etat.recadrage) return null;
  const autres = (f: CadrePhoto) => (ui.aimant ? autresCadres(etat, f) : null);
  const multi = etat.cadresSel.length > 1;
  const vues = frames.filter((f): f is CadrePhoto => f.role === "photo" && !!f.photoId
    && (memeRef(etat.cadreActif, f.ref) || (multi && etat.cadresSel.some((r) => memeRef(r, f.ref)))));
  return (
    <>
      {vues.map((f) => {
        const actif = memeRef(etat.cadreActif, f.ref);
        const arme = memeRef(etat.echangeArme, f.ref);
        const st: React.CSSProperties = { left: pc(f.x, PLANCHE_L), top: pc(f.y, PAGE_H), width: pc(f.l, PLANCHE_L), height: pc(f.h, PAGE_H) };
        return (
          <div key={`${f.ref.cible}${f.ref.index}`} className={cls("ed-cs", multi && "ed-cs--multi", ui.retouche && "ed-cs--retouche")} style={st}>
            {/* la boîte suit la rotation du cadre ; la barre, elle, reste droite */}
            <span className="ed-cs-boite" style={f.rotation ? { transform: `rotate(${f.rotation}deg)` } : undefined}>
            {actif && !multi && !arme && !ro && !f.indisponible ? (
              <>
                {POIGNEES.map((p) => (
                  <span key={p} className={`ed-poignee ed-poignee--${p}`} onPointerDown={(e) => debutRetouche(e, f, p, majUi, envoyer, autres(f))} />
                ))}
                <span className="ed-poignee ed-poignee--m" title="Déplacer le cadre · ou ⌥ + glisser" onPointerDown={(e) => debutRetouche(e, f, "m", majUi, envoyer, autres(f))}>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v16M2 10h16M10 2l-2.5 2.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l-2.5 2.5" /></svg>
                </span>
              </>
            ) : null}
            </span>
            {actif && !arme && !ro && !ui.retouche ? (multi ? <BarreMulti n={etat.cadresSel.length} /> : <BarreCadre f={f} />) : null}
          </div>
        );
      })}
    </>
  );
}

function BarreCadre({ f }: { f: CadrePhoto }) {
  const { etat, envoyer, majUi, ui } = useEd();
  const refC = f.ref, hes = f.hesitation, indispo = f.indisponible;
  const rang = rangCalque(etat.magazine, refC);
  /* le menu « Position » appartient à CE cadre : il ne s'ouvre pas sur un autre */
  const cle = `${refC.plancheId}|${refC.cible}|${refC.index}`;
  const ouvert = ui.position === cle;
  const calque = (sens: SensCalque) => envoyer({ type: "calque", ref: refC, sens });
  return (
    <span className="ed-cadre-barre" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => envoyer({ type: "armerEchange", ref: refC })}>Échanger</button>
      {indispo ? null : <button type="button" onClick={() => envoyer({ type: "ouvrirRecadrage", ref: refC })}>Recadrer</button>}
      {indispo ? null : <button type="button" title="Le cadre prend le format de la photo" onClick={() => envoyer({ type: "ajusterCadre", ref: refC })}>Ajuster</button>}
      {rang && rang.total > 1 ? (
        <span className="ed-pos">
          <button type="button" aria-expanded={ouvert} onClick={() => majUi({ position: ouvert ? null : cle })}>Position</button>
          {ouvert ? (
            <span className="ed-pos-menu" role="menu">
              <button type="button" role="menuitem" disabled={rang.rang === rang.total - 1} onClick={() => calque("devant")}>Devant<kbd>⌥⌘]</kbd></button>
              <button type="button" role="menuitem" disabled={rang.rang === rang.total - 1} onClick={() => calque("avancer")}>Avancer<kbd>⌘]</kbd></button>
              <button type="button" role="menuitem" disabled={rang.rang === 0} onClick={() => calque("reculer")}>Reculer<kbd>⌘[</kbd></button>
              <button type="button" role="menuitem" disabled={rang.rang === 0} onClick={() => calque("derriere")}>Derrière<kbd>⌥⌘[</kbd></button>
              <span className="ed-pos-rang">Calque {rang.rang + 1} sur {rang.total}</span>
            </span>
          ) : null}
        </span>
      ) : null}
      {hes?.ouverte ? <button type="button" title="Double-clic sur le cadre" onClick={() => majUi({ confronter: refC })}>Comparer</button> : null}
      {hes && !hes.ouverte ? <button type="button" title={`Hésiter de nouveau avec ${hes.nom}`} onClick={() => envoyer({ type: "hesiter", ref: refC, action: "rouvrir" })}>Hésiter encore</button> : null}
      <button type="button" onClick={() => envoyer({ type: "retirer", ref: refC })}>Retirer</button>
    </span>
  );
}

function BarreMulti({ n }: { n: number }) {
  const { etat, envoyer } = useEd();
  return (
    <span className="ed-cadre-barre" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <span className="ed-cadre-barre-n">{n} photos</span>
      <button type="button" onClick={() => envoyer({ type: "retirerCadres", refs: etat.cadresSel })}>Retirer</button>
    </span>
  );
}

/** 06/11 : les autres cadres de la planche (photos et textes), où l'aimant peut accrocher celui qu'on bouge. */
function autresCadres(etat: EtatEditeur, f: CadrePhoto): Rect[] {
  return cadresPlanche(etat, f.ref.plancheId)
    .filter((g) => !(g.role === "photo" && memeRef(g.ref, f.ref)))
    .map((g) => ({ x: g.x, y: g.y, l: g.l, h: g.h }));
}

/** L'aimant accroche à 6 pixels d'écran, quelle que soit la taille de la planche. */
const AIMANT_PX = 6;

/* Déplacer (m) ou redimensionner un cadre à la souris : le cadre se dessine à sa place provisoire (ui.retouche), une seule
   entrée d'historique au lâcher. Les coins gardent le format (⇧ pour le libérer), comme Canva. `autres` = l'aimant allumé
   (06/11) : bords et centre s'accrochent, ⌘ tenu le coupe le temps du geste. */
function debutRetouche(e: React.PointerEvent, f: CadrePhoto, p: Poignee, majUi: (x: { retouche: CadreRetouche | null; position?: string | null; guides?: Guide[] }) => void, envoyer: (g: Geste) => void, autres: Rect[] | null) {
  e.stopPropagation();
  e.preventDefault();
  const planche = (e.currentTarget as HTMLElement).closest(".ed-planche");
  if (!planche) return;
  const mmParPx = PLANCHE_L / planche.getBoundingClientRect().width;
  const x0 = e.clientX, y0 = e.clientY;
  const r0 = { x: f.x, y: f.y, l: f.l, h: f.h };
  const format = r0.l / r0.h;
  let r = r0;
  const nord = p === "n" || p === "ne" || p === "no", ouest = p === "o" || p === "no" || p === "so";
  const est = p === "e" || p === "ne" || p === "se", sud = p === "s" || p === "se" || p === "so";
  const lignes = autres ? lignesAimant(autres) : null;
  const bords = p === "m" ? DEPLACEMENT : { gauche: ouest, droite: est, haut: nord, bas: sud };
  const mv = (ev: PointerEvent) => {
    const dx = (ev.clientX - x0) * mmParPx, dy = (ev.clientY - y0) * mmParPx;
    if (p === "m") r = { ...r0, x: r0.x + dx, y: r0.y + dy };
    else {
      let l = r0.l + (est ? dx : ouest ? -dx : 0), h = r0.h + (sud ? dy : nord ? -dy : 0);
      if (p.length === 2 && !ev.shiftKey) h = l / format;
      l = Math.max(COTE_MIN, l); h = Math.max(COTE_MIN, h);
      r = { x: ouest ? r0.x + r0.l - l : r0.x, y: nord ? r0.y + r0.h - h : r0.y, l, h };
    }
    let guides: Guide[] = [];
    if (lignes && !ev.metaKey && !ev.ctrlKey) {
      const a = aimanter(r, bords, lignes, AIMANT_PX * mmParPx, p.length === 2 && p !== "m" && !ev.shiftKey);
      if (a.rect.l >= COTE_MIN && a.rect.h >= COTE_MIN) { r = a.rect; guides = a.guides; }
    }
    majUi({ retouche: { ref: f.ref, ...r }, guides });
  };
  const up = () => {
    window.removeEventListener("pointermove", mv);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    /* le clic qui suit le lâcher ne doit pas désélectionner le cadre */
    const avaler = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener("click", avaler, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", avaler, { capture: true }), 0);
    majUi({ retouche: null, position: null, guides: [] });
    if (r !== r0) envoyer({ type: "placerCadre", ref: f.ref, ...r });
  };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}
type CadreRetouche = NonNullable<ReturnType<typeof useEd>["ui"]["retouche"]>;

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

