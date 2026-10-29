"use client";

import { actionsPlanche, apercu, gabaritsPour, type ActionsPlanche, type Cible, type Geste } from "@/lib/mise-en-page/editeur";
import type { Planche } from "@/lib/mise-en-page/magazine";
import { cadresDe } from "@/lib/mise-en-page/magazine";
import { PAGE_H, PAGE_L, PLANCHE_L } from "@/lib/mise-en-page/geometrie";
import type { Template } from "@/lib/mise-en-page/types";
import { pc, pluriel, useEd } from "./contexte";
import { Ico } from "./icones";
import { vignetteDe } from "./images";

const NOM_COTE = { gauche: "Page gauche", droite: "Page droite", double: "Double page" } as const;

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
      {texte} {Ico.bas}
    </button>
  );
  const out: React.ReactNode[] = [];
  if (pl.mode === "double") {
    const n = nb(pl.double);
    out.push(pastille("double", "c", n ? `Double page · ${pluriel(n, "photo")}` : "Double page vide"));
  } else {
    if (!act.premiere) {
      const n = nb(pl.gauche);
      out.push(pastille("gauche", "g", n ? pluriel(n, "photo") : "Page vide"));
      if (act.fusionner && ouverte !== "gauche" && ouverte !== "droite") {
        out.push(
          <button type="button" key="fus" className="ed-pastille ed-pastille--c"
            onClick={(e) => { e.stopPropagation(); majUi({ apercuGab: null }); envoyer({ type: "fusionner", plancheId: pl.id }); }}
            onMouseEnter={() => majUi({ apercuGab: apercuGeste({ type: "fusionner", plancheId: pl.id }) })}
            onMouseLeave={() => majUi({ apercuGab: null })}>Passer en double page</button>
        );
      }
    }
    const n = nb(pl.droite);
    out.push(pastille("droite", "d", n ? pluriel(n, "photo") : "Page vide"));
  }
  return <>{out}</>;
}

/* ─── le tiroir : les gabarits compatibles en vignettes. La double page reste entière sous l'aperçu en direct. ─── */
export function Rangee({ pl, cible }: { pl: Planche; cible: Cible }) {
  const { etat, envoyer, majUi } = useEd();
  if ((pl.mode === "double") !== (cible === "double")) return null;
  const act = actionsPlanche(etat, pl.id);
  if (!act) return null;
  const liste = gabaritsPour(etat, pl.id, cible);
  const apercuGeste = (g: Geste) => { const x = apercu(etat, g); return x.magazine !== etat.magazine ? x.magazine : null; };
  const voir = (g: Geste) => () => majUi({ apercuGab: apercuGeste(g) });
  const fermer = () => majUi({ rangee: null, apercuGab: null });
  return (
    <div className="ed-rangee-gab" role="menu" aria-label="Gabarits compatibles" onClick={(e) => e.stopPropagation()} onMouseLeave={() => majUi({ apercuGab: null })}>
      <span className="ed-rangee-t">{NOM_COTE[cible]}<b>{liste.length ? pluriel(liste.length, "gabarit") : ""}</b></span>
      {!liste.length ? <span className="ed-sous">Aucune photo</span> : null}
      {liste.map((g) => {
        const geste: Geste = { type: "choisirGabarit", plancheId: pl.id, cible, templateId: g.id };
        return (
          <button key={g.id} type="button" className="ed-gab" role="menuitemradio" aria-checked={g.courant} aria-current={g.courant} title={g.nom}
            onMouseEnter={g.courant ? () => majUi({ apercuGab: null }) : voir(geste)} onFocus={g.courant ? undefined : voir(geste)}
            onClick={() => { majUi({ apercuGab: null }); envoyer(geste); }}>
            <DessinGab t={g.template} l={g.template.portee === "double" ? 120 : 60} />
            <span>{g.id}</span>
          </button>
        );
      })}
      {act.separer ? (
        <span className="ed-gab-actions">
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "separer", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "separer", plancheId: pl.id }); }}>Séparer</button>
        </span>
      ) : null}
      {act.fusionner ? (
        <span className="ed-gab-actions">
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "fusionner", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "fusionner", plancheId: pl.id }); }}>Double page</button>
        </span>
      ) : null}
      <span className="ed-esp" />
      <button type="button" className="ed-ico" aria-label="Fermer les gabarits" onClick={fermer}>{Ico.fermer}</button>
    </div>
  );
}

