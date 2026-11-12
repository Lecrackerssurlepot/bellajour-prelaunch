"use client";

import { useState } from "react";
import { PAS_TIROIR, PLAFOND_TIROIR, actionsPlanche, apercu, dansFamille, gabaritsPour, type ActionsPlanche, type Cible, type FamilleGabarits, type GabaritPour, type Geste } from "@/lib/mise-en-page/editeur";
import type { Planche } from "@/lib/mise-en-page/magazine";
import { cadresDe, dispositionDe, templateParId } from "@/lib/mise-en-page/magazine";
import { enregistrerGabarit } from "./gabaritsClient";
import { PAGE_H, PAGE_L, PLANCHE_L } from "@/lib/mise-en-page/geometrie";
import type { Template } from "@/lib/mise-en-page/types";
import { pc, pluriel, useEd } from "./contexte";
import { Ico } from "./icones";
import { vignetteDe } from "./images";

const NOM_COTE = { gauche: "Page gauche", droite: "Page droite", double: "Double page" } as const;

/* 06/11 : ce que R parcourt. Un clic passe à la suivante ; le mot dit où l'on est. */
const FAMILLES: { f: FamilleGabarits; mot: string }[] = [{ f: "tous", mot: "Tous" }, { f: "avec", mot: "Avec texte" }, { f: "sans", mot: "Sans texte" }];

function Famille({ pl }: { pl: Planche }) {
  const { etat, envoyer } = useEd();
  const f = etat.familleGabarits;
  const k = Math.max(0, FAMILLES.findIndex((x) => x.f === f));
  const suivante = FAMILLES[(k + 1) % FAMILLES.length];
  /* aucun gabarit de cette famille pour ces photos : R ne fera rien, le mot le dit */
  const cibles: Cible[] = pl.mode === "double" ? ["double"] : ["gauche", "droite"];
  const aucun = f !== "tous" && cibles.every((c) => !gabaritsPour(etat, pl.id, c).some((g) => dansFamille(g.template, f)));
  return (
    <button type="button" className={`ed-pastille ed-famille${k ? " ed-famille--on" : ""}`} title={`R ne parcourt que : ${FAMILLES[k].mot.toLowerCase()} · clic pour « ${suivante.mot} »`}
      onClick={(e) => { e.stopPropagation(); envoyer({ type: "familleGabarits", famille: suivante.f }); }}>
      <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 5h12M4 10h8M4 15h10" /></svg>
      {FAMILLES[k].mot}{aucun ? " · aucun" : ""}
    </button>
  );
}

/* ─── une planche en petit (chemin de fer, pile) ─── */
type CadreMini = { x: number; y: number; l: number; h: number; photoId: string | null; texte: boolean };

function cadresMini(p: Planche): CadreMini[] {
  const out: CadreMini[] = [];
  const un = (d: Planche["double"], cible: Cible) => {
    if (!d) return;
    let k = 0;
    for (const c of cadresDe(d, cible)) {
      if (c.role === "photo") { out.push({ x: c.x, y: c.y, l: c.l, h: c.h, photoId: d.photos[k]?.photoId ?? null, texte: false }); k += 1; }
      else out.push({ x: c.x, y: c.y, l: c.l, h: c.h, photoId: null, texte: true });
    }
  };
  if (p.mode === "double") un(p.double, "double");
  else { un(p.gauche, "gauche"); un(p.droite, "droite"); }
  return out;
}

export function Mini({ planche, premiere }: { planche: Planche; premiere?: boolean }) {
  const { adresses } = useEd();
  return (
    <span className="ed-mini" aria-hidden="true">
      {premiere ? <span className="ed-mini-g" /> : null}
      {cadresMini(planche).map((c, i) => {
        const st = { left: pc(c.x, PLANCHE_L), top: pc(c.y, PAGE_H), width: pc(c.l, PLANCHE_L), height: pc(c.h, PAGE_H) };
        if (c.texte) return <i key={i} className="ed-mini-t" style={st} />;
        const src = c.photoId ? vignetteDe(adresses.get(c.photoId)) : null;
        return <i key={i} style={st}>{src ? <img src={src} alt="" decoding="async" draggable={false} /> : null}</i>;
      })}
    </span>
  );
}

/* ─── le dessin d'un gabarit ─── */
export function DessinGab({ t, l }: { t: Template; l: number }) {
  const larg = t.portee === "double" ? PLANCHE_L : PAGE_L;
  return (
    <span className="ed-gab-dessin" style={{ width: l, height: l * (PAGE_H / larg) }}>
      {(t.decor ?? []).map((a, i) => (
        <i key={`a${i}`} className={`a a--${a.teinte}`} style={{ left: pc(a.x, larg), top: pc(a.y, PAGE_H), width: pc(a.l, larg), height: pc(a.h, PAGE_H) }} />
      ))}
      {t.cadres.map((c, i) => (
        <i key={i} className={c.role === "photo" ? (c.bord ? "b" : undefined) : "t"}
          style={{ left: pc(c.x, larg), top: pc(c.y, PAGE_H), width: pc(c.l, larg), height: pc(c.h, PAGE_H), ...(c.rotation ? { transform: `rotate(${c.rotation}deg)` } : {}), ...(c.rayon ? { borderRadius: 2 } : {}) }} />
      ))}
    </span>
  );
}

/* ─── les pastilles de gabarit, au-dessus de la planche ─── */
export function Pastilles({ pl, act }: { pl: Planche; act: ActionsPlanche }) {
  const { etat, envoyer, ui, majUi } = useEd();
  const ouverte = ui.rangee;
  const nb = (d: Planche["double"]) => (d ? d.photos.filter((a) => a.photoId).length : 0);
  const apercuGeste = (g: Geste) => { const x = apercu(etat, g); return x.magazine !== etat.magazine ? x.magazine : null; };
  const pastille = (cible: Cible, pos: string, texte: string) => (
    <button type="button" key={cible} className={`ed-pastille ed-pastille--${pos}`} aria-expanded={ouverte === cible} aria-haspopup="true"
      onClick={(e) => { e.stopPropagation(); majUi({ rangee: ouverte === cible ? null : cible, apercuGab: null }); }}>
      {texte}{act.retouchees.includes(cible) ? <span className="ed-pastille-point" title="Retouchée à la main" /> : null} {Ico.bas}
    </button>
  );
  /* lot 4 : le miroir (M), au centre, à côté de « Passer en double page » */
  const miroir = act.miroir && ouverte !== "gauche" && ouverte !== "droite" ? (
    <button type="button" key="mir" className="ed-pastille" title="Miroir · M"
      onClick={(e) => { e.stopPropagation(); majUi({ apercuGab: null }); envoyer({ type: "miroir", plancheId: pl.id }); }}
      onMouseEnter={() => majUi({ apercuGab: apercuGeste({ type: "miroir", plancheId: pl.id }) })}
      onMouseLeave={() => majUi({ apercuGab: null })}>
      <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3v14M7 6 3 10l4 4M13 6l4 4-4 4" /></svg>
      Miroir
    </button>
  ) : null;
  const out: React.ReactNode[] = [];
  const centre: React.ReactNode[] = [];
  if (pl.mode === "double") {
    const n = nb(pl.double);
    centre.push(pastille("double", "c", n ? `Double page · ${pluriel(n, "photo")}` : "Double page vide"));
    if (miroir && ouverte !== "double") centre.push(miroir);
  } else {
    if (!act.premiere) {
      const n = nb(pl.gauche);
      out.push(pastille("gauche", "g", n ? pluriel(n, "photo") : "Page vide"));
      if (miroir) centre.push(miroir);
      if (act.fusionner && ouverte !== "gauche" && ouverte !== "droite") {
        centre.push(
          <button type="button" key="fus" className="ed-pastille"
            onClick={(e) => { e.stopPropagation(); majUi({ apercuGab: null }); envoyer({ type: "fusionner", plancheId: pl.id }); }}
            onMouseEnter={() => majUi({ apercuGab: apercuGeste({ type: "fusionner", plancheId: pl.id }) })}
            onMouseLeave={() => majUi({ apercuGab: null })}>Passer en double page</button>
        );
      }
    }
    const n = nb(pl.droite);
    out.push(pastille("droite", "d", n ? pluriel(n, "photo") : "Page vide"));
  }
  if (!ouverte) centre.push(<Famille key="fam" pl={pl} />);
  if (centre.length) out.push(<span key="c" className="ed-pastilles-c">{centre}</span>);
  return <>{out}</>;
}

/* ─── le tiroir : les gabarits compatibles en vignettes. La double page reste entière sous l'aperçu en direct. ─── */
export function Rangee({ pl, cible }: { pl: Planche; cible: Cible }) {
  const { etat, envoyer, majUi } = useEd();
  /* lot D : les générés se comptent par centaines ; le tiroir en montre `PLAFOND_TIROIR`, « Plus » en ajoute (le parent le remonte à chaque page ou côté : `key`) */
  const [montres, setMontres] = useState(PLAFOND_TIROIR);
  if ((pl.mode === "double") !== (cible === "double")) return null;
  const act = actionsPlanche(etat, pl.id);
  if (!act) return null;
  const liste = gabaritsPour(etat, pl.id, cible);
  const dansLaFamille = liste.filter((g) => dansFamille(g.template, etat.familleGabarits)).length;
  const courant: GabaritPour | undefined = liste.find((g) => g.courant);
  /* lot 4 : une page retouchée s'enregistre comme gabarit, ou revient à son gabarit d'origine */
  const d = dispositionDe(pl, cible);
  const retouchee = act.retouchees.includes(cible);
  const tD = d ? templateParId(d.templateId) : null;
  const remettre: Geste | null = d && tD && tD.nbPhotos === d.photos.length ? { type: "choisirGabarit", plancheId: pl.id, cible, templateId: tD.id } : null;
  const apercuGeste = (g: Geste) => { const x = apercu(etat, g); return x.magazine !== etat.magazine ? x.magazine : null; };
  const voir = (g: Geste) => () => majUi({ apercuGab: apercuGeste(g) });
  const fermer = () => majUi({ rangee: null, apercuGab: null });
  return (
    <div className="ed-rangee-gab" role="menu" aria-label="Gabarits compatibles" onClick={(e) => e.stopPropagation()} onMouseLeave={() => majUi({ apercuGab: null })}>
      {/* 06/11 : « Séparer » (ou « Double page ») sous le titre, à gauche : plus besoin d'aller au bout de la rangée */}
      <span className="ed-rangee-tete">
        <span className="ed-rangee-t">{NOM_COTE[cible]}<b>{dansLaFamille ? pluriel(dansLaFamille, "gabarit") : liste.length ? "Aucun ici" : ""}</b></span>
        <Famille pl={pl} />
        {act.separer ? (
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "separer", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "separer", plancheId: pl.id }); }}>Séparer</button>
        ) : act.fusionner ? (
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "fusionner", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "fusionner", plancheId: pl.id }); }}>Double page</button>
        ) : null}
      </span>
      {!liste.length ? <span className="ed-sous">Aucune photo</span> : null}
      {/* le gabarit courant reste sous les yeux même s'il est plus loin que le plafond : en tête, juste après le titre */}
      {[...(courant && liste.indexOf(courant) >= montres ? [courant] : []), ...liste.slice(0, montres)].map((g) => {
        const geste: Geste = { type: "choisirGabarit", plancheId: pl.id, cible, templateId: g.id };
        const genere = g.template.origine === "genere";
        return (
          <button key={g.id} type="button" className="ed-gab" role="menuitemradio" aria-checked={g.courant} aria-current={g.courant} title={genere ? `${g.nom} · ${g.id}` : g.nom}
            onMouseEnter={g.courant ? () => majUi({ apercuGab: null }) : voir(geste)} onFocus={g.courant ? undefined : voir(geste)}
            onClick={() => { majUi({ apercuGab: null }); envoyer(geste); }}>
            <DessinGab t={g.template} l={g.template.portee === "double" ? 120 : 60} />
            <span className={genere ? "ed-gab-nom" : undefined}>{g.template.origine === "atelier" ? "Le mien" : genere ? g.nom.split(" · ")[0] : g.id}</span>
          </button>
        );
      })}
      {liste.length > montres ? (
        <button type="button" className="ed-bt ed-gab-plus" title={`${pluriel(liste.length - montres, "gabarit autre", "gabarits autres")}`}
          onClick={() => setMontres(montres + PAS_TIROIR)}>Plus<b>{(liste.length - montres).toLocaleString("fr-FR")}</b></button>
      ) : null}
      {retouchee && d ? (
        <span className="ed-gab-actions">
          <button type="button" className="ed-bt ed-bt--action" title="Garder cette page comme gabarit, pour tous les projets"
            onClick={() => { void enregistrerGabarit(d, cible).then((r) => envoyer({ type: "annoncer", texte: r.texte })); }}>Enregistrer comme gabarit</button>
          {remettre ? (
            <button type="button" className="ed-bt" onMouseEnter={voir(remettre)} onClick={() => { majUi({ apercuGab: null }); envoyer(remettre); }}>Remettre le gabarit</button>
          ) : null}
        </span>
      ) : null}
      <span className="ed-esp" />
      <button type="button" className="ed-ico" aria-label="Fermer les gabarits" onClick={fermer}>{Ico.fermer}</button>
    </div>
  );
}

