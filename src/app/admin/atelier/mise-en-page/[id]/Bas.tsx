"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bande, cheminDeFer, couvertureDe, idsPlanche } from "@/lib/mise-en-page/editeur";
import { ID_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { aDerniere, coteSeul } from "@/lib/mise-en-page/magazine";
import { DessinCouverture } from "./SceneCouverture";
import { cls, memeRef, pluriel, useEd } from "./contexte";
import { Mini } from "./Gabarits";
import { vignetteDe } from "./images";

/* En bas : « Sur cette double page » (les photos de la planche, dans l'ordre de lecture) et le chemin de fer
   d'une ligne (une vignette par planche, glisser pour réordonner). */

export function Bande() {
  const { etat, envoyer, adresses, lectureSeule: ro, commencerAppui, clicSupprime } = useEd();
  const m = etat.magazine;
  const d = etat.glisser;
  const segs = bande(etat);
  const pid = etat.plancheCourante;
  const ip = m.planches.findIndex((p) => p.id === pid);
  const cibleB = d?.survol?.type === "bande" ? d.survol : null;
  const n = segs.reduce((s, x) => s + x.photos.length, 0);
  const max = ip === 0 ? 6 : 12;
  const venue = d && d.source.type === "cadre" && d.source.ref.plancheId !== pid ? d.source : null;
  const idxPl = (id: string) => m.planches.findIndex((x) => x.id === id);
  let k = 0;
  const insIci = (cote: string, pos: number) => !!cibleB && cibleB.position === pos && (cibleB.cote === undefined ? (cote === "double" || segs.length === 1 || cote === segs[0].cible) : cibleB.cote === cote);
  return (
    <div className="ed-bande" aria-label="Sur cette double page">
      <div className="ed-bande-t">Sur cette double page<b>{n} / {max}</b></div>
      <div className={cls("ed-bande-piste", !!cibleB && "ed-bande-piste--cible")}>
        {venue && venue.photoId ? (
          <span className="ed-bv ed-bv--fantome" title="Vient d'une autre planche" aria-hidden="true">
            <img src={vignetteDe(adresses.get(venue.photoId)) ?? undefined} alt="" decoding="async" draggable={false} />
            <span className="ed-bv-n">Pl. {idxPl(venue.ref.plancheId) + 1}</span>
          </span>
        ) : null}
        {!n && !cibleB ? <span className="ed-bande-vide">Rien encore</span> : null}
        {segs.map((s) => {
          if (!s.photos.length && segs.length > 1 && !cibleB) return null;
          return (
            <div key={s.cible} className="ed-bande-seg" data-cote={s.cible}>
              {s.cible !== "double" && segs.length > 1 ? <span className="ed-lbl" aria-hidden="true">{s.cible === "gauche" ? "G" : "D"}</span> : null}
              {s.photos.map((x, j) => {
                const i = k++;
                const p = etat.catalogue.get(x.photoId);
                const actif = memeRef(etat.cadreActif, x.ref);
                const trainee = !!d && d.source.type === "cadre" && memeRef(d.source.ref, x.ref);
                const src = vignetteDe(adresses.get(x.photoId));
                return (
                  <Fragment key={`${x.ref.cible}${x.ref.index}`}>
                    {insIci(s.cible, j) ? <span className="ed-ins" aria-hidden="true" /> : null}
                    <span className={cls("ed-bv", actif && "ed-bv--actif", trainee && "ed-bv--trainee")} role="button" tabIndex={0} aria-label={`${p ? p.nom : "Photo indisponible"}, ${i + 1}e`}
                      onPointerDown={ro ? undefined : (e) => { if (!(e.target as HTMLElement).closest(".ed-bv-x")) commencerAppui(e, { type: "cadre", ref: x.ref, photoId: x.photoId }); }}
                      onClick={(e) => { if (clicSupprime() || (e.target as HTMLElement).closest(".ed-bv-x")) return; envoyer({ type: "activerCadre", ref: actif ? null : x.ref }); }}
                      onKeyDown={(e) => {
                        if ((e.key === "Backspace" || e.key === "Delete") && !ro) { e.preventDefault(); e.stopPropagation(); envoyer({ type: "retirer", ref: x.ref }); }
                        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "activerCadre", ref: x.ref }); }
                      }}>
                      {p && src ? <img src={src} alt="" decoding="async" draggable={false} /> : <span className="ed-indispo-mini">Indispo.</span>}
                      <span className="ed-bv-n">{i + 1}</span>
                      {x.signalee ? <span className="ed-rep ed-rep--drapeau">!</span> : x.basseDef ? <span className="ed-rep ed-rep--basse">Basse</span> : null}
                      {ro ? null : (
                        <button type="button" className="ed-bv-x" aria-label={`Retirer ${p ? p.nom : "la photo"}`}
                          onClick={(e) => { e.stopPropagation(); envoyer({ type: "retirer", ref: x.ref }); }}>×</button>
                      )}
                    </span>
                  </Fragment>
                );
              })}
              {insIci(s.cible, s.photos.length) ? <span className="ed-ins" aria-hidden="true" /> : null}
              {!s.photos.length ? <span className="ed-bande-vide">vide</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Le bandeau des messages (« Gardée · Annuler », « 3 photos restées à côté ») : sous la planche, ou en bas du tri plein écran. */
export function Toast() {
  const { etat, envoyer, majUi } = useEd();
  const msg = etat.message;
  if (!msg) return null;
  return (
    <div className="ed-toast" role="status">
      {msg.texte}
      {msg.action ? (
        <button type="button" className="ed-bt" onClick={() => {
          const a = msg.action;
          if (!a) return;
          if (a.id) { majUi({ defilerVers: a.id }); envoyer({ type: "voirRetiree", id: a.id }); } else envoyer({ type: "annuler" });
        }}>{msg.action.libelle}</button>
      ) : null}
      <button type="button" className="ed-ico" aria-label="Fermer le message" onClick={() => envoyer({ type: "fermerMessage" })}>×</button>
    </div>
  );
}

export function CheminDeFer() {
  const { etat, envoyer, ui, majUi, lectureSeule: ro, commencerAppui, clicSupprime, gesteAvecAnnuler } = useEd();
  const m = etat.magazine;
  const d = etat.glisser;
  const vignettes = cheminDeFer(etat);
  const cibleV = d?.survol?.type === "vignette" ? d.survol : null;
  /* lot E : la dernière page reste en dernier : le repère « entre » ne passe jamais derrière elle */
  const finCorps = aDerniere(m) ? m.planches.length - 1 : m.planches.length;
  const entre = d?.survol?.type === "entre" ? Math.min(d.survol.index, finCorps) : null;
  const piste = useRef<HTMLDivElement>(null);
  /* 06/11 : le menu ⋯ sort de la piste (qui défile et coupait tout ce qui dépassait) : il s'ouvre au-dessus de l'écran,
     calé sur son bouton, dans la racine de l'éditeur pour garder ses styles. */
  const [ancre, setAncre] = useState<{ x: number; y: number; racine: Element } | null>(null);
  useEffect(() => {
    const el = piste.current?.querySelector(".ed-cf-v--courante");
    if (el && "scrollIntoView" in el) (el as HTMLElement).scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [etat.plancheCourante]);
  return (
    <div className="ed-cf" aria-label="Chemin de fer">
      <div className="ed-cf-piste" ref={piste} role="listbox" aria-label="Planches">
        {/* lot B : la couverture, en tête du chemin de fer (4e · dos · 1re) */}
        <div className={cls("ed-cf-v", "ed-cf-couv", etat.plancheCourante === ID_COUVERTURE && "ed-cf-v--courante")} role="option" tabIndex={0}
          aria-selected={etat.plancheCourante === ID_COUVERTURE} aria-label="Couverture"
          onClick={() => envoyer({ type: "naviguer", plancheId: ID_COUVERTURE })}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); envoyer({ type: "naviguer", plancheId: ID_COUVERTURE }); } }}>
          <DessinCouverture c={couvertureDe(m)} l={64} photos />
          <span>Couverture</span>
        </div>
        {vignettes.map((v, i) => {
          const pl = m.planches[i];
          const seule = coteSeul(m, i);
          let plv = pl;
          let pleine = false;
          if (cibleV && cibleV.plancheId === pl.id && d?.apercu) {
            if (d.apercu.refus) pleine = d.apercu.refus === "pleine";
            else plv = d.apercu.magazine.planches.find((x) => x.id === pl.id) ?? pl;
          }
          const trainee = !!d && d.source.type === "planche" && d.source.plancheId === pl.id;
          const menuOuvert = ui.menu === `cf-${pl.id}`;
          const nbv = plv === pl ? v.nbPhotos : idsPlanche(plv).length;
          return (
            <Fragment key={pl.id}>
              {entre === i ? <span className="ed-cf-ins" aria-hidden="true" /> : null}
              <div className={cls("ed-cf-v", v.courante && "ed-cf-v--courante", !!cibleV && cibleV.plancheId === pl.id && !pleine && "ed-cf-v--cible", pleine && "ed-cf-v--pleine", trainee && "ed-cf-v--trainee", ui.ressortId === pl.id && "ed-cf-v--ressort")}
                data-vignette={pl.id} role="option" aria-selected={v.courante} tabIndex={0} aria-label={`Planche ${v.numero}, page ${v.pages}, ${pluriel(v.nbPhotos, "photo")}`}
                onPointerDown={(e) => { if (i > 0 && !seule && !ro && !(e.target as HTMLElement).closest(".ed-cf-menu-bt, .ed-menu")) commencerAppui(e, { type: "planche", plancheId: pl.id }); }}
                onClick={(e) => { if (clicSupprime() || (e.target as HTMLElement).closest(".ed-cf-menu-bt, .ed-menu")) return; envoyer({ type: "naviguer", plancheId: pl.id }); }}
                onKeyDown={(e) => {
                  const cible = e.currentTarget;
                  if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") && i > 0 && !seule && !ro) {
                    e.preventDefault(); e.stopPropagation();
                    envoyer({ type: "deplacerPlanche", plancheId: pl.id, versIndex: i + (e.key === "ArrowRight" ? 1 : -1) });
                    setTimeout(() => document.querySelector<HTMLElement>(`[data-vignette="${pl.id}"]`)?.focus(), 0);
                  } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); envoyer({ type: "naviguer", plancheId: pl.id }); }
                  else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const nx = (e.key === "ArrowRight" ? cible.nextElementSibling : cible.previousElementSibling) as HTMLElement | null;
                    nx?.focus();
                  }
                }}>
                <Mini planche={plv} seule={seule} />
                <span>{pleine ? "Pleine" : `p. ${v.pages} · ${nbv}`}</span>
                {ro ? null : (
                  <button type="button" className="ed-cf-menu-bt" aria-label={`Menu de la planche ${v.numero}`} aria-expanded={menuOuvert}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect(), racine = e.currentTarget.closest(".mep-editeur");
                      if (!menuOuvert && racine) setAncre({ x: r.left, y: r.top, racine });
                      majUi({ menu: menuOuvert ? null : `cf-${pl.id}` });
                    }}>⋯</button>
                )}
                {menuOuvert && ancre ? createPortal(
                  <div className="ed-menu ed-menu--flottant" role="menu" style={{ left: ancre.x, bottom: window.innerHeight - ancre.y + 4 }}
                    onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    <button type="button" role="menuitem" onClick={() => { majUi({ menu: null }); gesteAvecAnnuler({ type: "vider", plancheId: pl.id }, "Planche vidée"); }}>Vider</button>
                    {i > 0 && !seule ? <button type="button" role="menuitem" onClick={() => { majUi({ menu: null }); gesteAvecAnnuler({ type: "supprimerPlanche", plancheId: pl.id }, "Planche supprimée"); }}>Supprimer</button> : null}
                  </div>, ancre.racine,
                ) : null}
              </div>
            </Fragment>
          );
        })}
        {entre !== null && entre === m.planches.length ? <span className="ed-cf-ins" aria-hidden="true" /> : null}
        {ro ? null : <button type="button" className="ed-cf-plus" onClick={() => envoyer({ type: "insererDouble" })}>+ Double page</button>}
      </div>
    </div>
  );
}
