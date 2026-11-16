"use client";

import { Fragment, useState } from "react";
import { PAS_TIROIR, PLAFOND_TIROIR, actionsPlanche, apercu, dansFamille, gabaritsPour, idsPlanche, typesPour, type ActionsPlanche, type Cible, type FamilleGabarits, type GabaritPour, type Geste } from "@/lib/mise-en-page/editeur";
import { cssDeCouleur, hexDeCouleur, piecesDuFond, type CouleurLibre } from "@/lib/mise-en-page/couleursLibres";
import { Nuances } from "./Nuances";
import type { Planche } from "@/lib/mise-en-page/magazine";
import { cadresDe, decorDe, dispositionDe, templateParId, type CoteSeul } from "@/lib/mise-en-page/magazine";
import { enregistrerGabarit } from "./gabaritsClient";
import { PAGE_H, PAGE_L, PLANCHE_L } from "@/lib/mise-en-page/geometrie";
import { legendesDistinctes } from "@/lib/mise-en-page/genere";
import type { Template } from "@/lib/mise-en-page/types";
import { cls, pc, pluriel, useEd } from "./contexte";
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

/** Lot C : les aplats d'une planche en petit (repère planche), pour que la miniature suive le style. */
function aplatsMini(p: Planche): { x: number; y: number; l: number; h: number; teinte: string }[] {
  const un = (d: Planche["double"], cible: Cible) => (d ? decorDe(d, cible) : []);
  return p.mode === "double" ? un(p.double, "double") : [...un(p.gauche, "gauche"), ...un(p.droite, "droite")];
}

/** `seule` : le côté de la page seule (planche 1 : droite, la moitié gauche est la couverture intérieure ; dernière page, lot E : gauche), `null` pour une planche courante. */
export function Mini({ planche, seule }: { planche: Planche; seule?: CoteSeul | null }) {
  const { adresses, etat } = useEd();
  return (
    <span className="ed-mini" aria-hidden="true">
      {seule ? <span className={seule === "gauche" ? "ed-mini-g ed-mini-g--d" : "ed-mini-g"} /> : null}
      {/* lot G : le fond de couleur de la planche, en petit */}
      {piecesDuFond(planche.fond, seule ?? null, { perdu: false }).map((f) => (
        <i key={`f${f.cote}`} className="ed-mini-a" style={{ left: pc(f.rect.x, PLANCHE_L), top: pc(f.rect.y, PAGE_H), width: pc(f.rect.l, PLANCHE_L), height: pc(f.rect.h, PAGE_H), background: cssDeCouleur(f.couleur) }} />
      ))}
      {etat.magazine.style ? aplatsMini(planche).map((a, i) => (
        <i key={`a${i}`} className={`ed-mini-a ed-aplat--${a.teinte}`} style={{ left: pc(a.x, PLANCHE_L), top: pc(a.y, PAGE_H), width: pc(a.l, PLANCHE_L), height: pc(a.h, PAGE_H) }} />
      )) : null}
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
    if (act.seule !== "droite") {
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
    if (act.seule !== "gauche") {
      const n = nb(pl.droite);
      out.push(pastille("droite", "d", n ? pluriel(n, "photo") : "Page vide"));
    }
  }
  if (!ouverte) centre.push(<Famille key="fam" pl={pl} />);
  if (centre.length) out.push(<span key="c" className="ed-pastilles-c">{centre}</span>);
  return <>{out}</>;
}

/** La légende d'une vignette : courte et distincte pour un généré (lot R, D4 : le schéma, sa variante ; le nom entier à l'infobulle), l'id sinon. */
function Legende({ g, legende }: { g: GabaritPour; legende?: string[] }) {
  if (g.template.origine === "genere" && legende && legende.length) {
    return <span className={`ed-gab-nom${g.template.portee === "double" ? " ed-gab-nom--double" : ""}`}>{legende.map((l, i) => <span key={i} className="ed-gab-l">{l}</span>)}</span>;
  }
  return <span>{g.template.origine === "atelier" ? "Le mien" : g.id}</span>;
}

/* ─── le tiroir : les gabarits compatibles en vignettes. La double page reste entière sous l'aperçu en direct. ─── */
export function Rangee({ pl, cible }: { pl: Planche; cible: Cible }) {
  const { etat, envoyer, ui, majUi } = useEd();
  /* lot D : les générés se comptent par centaines ; le tiroir en montre `PLAFOND_TIROIR`, « Plus » en ajoute (le parent le remonte à chaque page ou côté : `key`) */
  const [montres, setMontres] = useState(PLAFOND_TIROIR);
  const [fondOuvert, setFondOuvert] = useState(false);
  /* T-208 : les variantes du type posé, ouvertes par un clic sur sa vignette (l'id de la tête du type ouvert ; R, qui change de type, les referme) */
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [montresVar, setMontresVar] = useState(PLAFOND_TIROIR);
  if ((pl.mode === "double") !== (cible === "double")) return null;
  const act = actionsPlanche(etat, pl.id);
  if (!act) return null;
  const liste = gabaritsPour(etat, pl.id, cible);
  /* T-208 : le tiroir montre des TYPES (une disposition), chacun par sa tête ou par le gabarit posé ; ses variantes s'ouvrent dessous */
  const types = typesPour(etat, pl.id, cible, liste);
  const dansLaFamille = types.filter((t) => t.membres.some((g) => dansFamille(g.template, etat.familleGabarits))).length;
  const typePose = types.find((t) => t.pose);
  const montre = (t: (typeof types)[number]): GabaritPour => t.pose ?? t.tete;
  const typesVus = [...(typePose && types.indexOf(typePose) >= montres ? [typePose] : []), ...types.slice(0, montres)];
  /* lot R (D4) : la légende d'un généré est COURTE et distincte parmi ce que le tiroir montre ; le nom entier et l'id restent à l'infobulle */
  const legendeDe = (liste: readonly GabaritPour[]) => new Map(legendesDistinctes(liste.map((g) => g.template)).map((x, i) => [liste[i].id, x] as const));
  const legendes = legendeDe(typesVus.map(montre));
  const variantesOuvertes = typePose && typePose.membres.length > 1 && ouvert === typePose.tete.id ? typePose : null;
  /* le gabarit posé en premier : une variante du plateau qui lui ressemble reçoit son rang (·2), elle ne répète pas sa légende */
  const legendesVar = variantesOuvertes && variantesOuvertes.pose ? legendeDe([variantesOuvertes.pose, ...variantesOuvertes.membres.filter((g) => !g.courant)]) : new Map<string, string[]>();
  /* lot 4 : une page retouchée s'enregistre comme gabarit, ou revient à son gabarit d'origine */
  const d = dispositionDe(pl, cible);
  const retouchee = act.retouchees.includes(cible);
  const tD = d ? templateParId(d.templateId) : null;
  const remettre: Geste | null = d && tD && tD.nbPhotos === d.photos.length ? { type: "choisirGabarit", plancheId: pl.id, cible, templateId: tD.id } : null;
  const apercuGeste = (g: Geste) => { const x = apercu(etat, g); return x.magazine !== etat.magazine ? x.magazine : null; };
  const voir = (g: Geste) => () => majUi({ apercuGab: apercuGeste(g) });
  const fermer = () => majUi({ rangee: null, apercuGab: null });
  /* lot G : le fond de couleur de cette page (ou de la double entière), indépendant du gabarit ; la page seule ne connaît que son côté */
  const seul = act.seule;
  const fondDe = (): CouleurLibre | null => {
    const f = pl.fond;
    if (!f) return null;
    if (seul) return f[seul] ?? null;
    if (cible === "double") return f.gauche && f.gauche === f.droite ? f.gauche : null;
    return f[cible] ?? null;
  };
  const fond = fondDe();
  /* T-212 : la grille que l'écran montre guide la place du texte (6 × 6 sinon) */
  const texte: Geste = { type: "ajouterTexte", plancheId: pl.id, cible, trame: ui.grille && ui.trame !== "artiste" ? ui.trame : 6 };
  return (
    <>
    <div className="ed-rangee-gab" role="menu" aria-label="Gabarits compatibles" onClick={(e) => e.stopPropagation()} onMouseLeave={() => majUi({ apercuGab: null })}>
      {/* 06/11 : « Séparer » (ou « Double page ») sous le titre, à gauche : plus besoin d'aller au bout de la rangée */}
      <span className="ed-rangee-tete">
        <span className="ed-rangee-t" title={liste.length ? `${pluriel(liste.length, "gabarit")} · R type · V variante` : undefined}>{NOM_COTE[cible]}<b>{dansLaFamille ? pluriel(dansLaFamille, "type") : liste.length ? "Aucun ici" : ""}</b></span>
        <Famille pl={pl} />
        {act.separer ? (
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "separer", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "separer", plancheId: pl.id }); }}>Séparer</button>
        ) : act.fusionner ? (
          <button type="button" className="ed-bt" onMouseEnter={voir({ type: "fusionner", plancheId: pl.id })} onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer({ type: "fusionner", plancheId: pl.id }); }}>Double page</button>
        ) : null}
        {/* lot G : le fond ; T-212 : le texte. Côte à côte : la colonne de tête du tiroir n'a que quatre rangs */}
        <span className="ed-rangee-duo">
          <button type="button" className="ed-bt ed-bt-fond" aria-expanded={fondOuvert} onClick={() => setFondOuvert(!fondOuvert)}>
            <i className={fond ? undefined : "ed-bt-fond--vide"} style={fond ? { background: hexDeCouleur(fond, etat.magazine.style) } : undefined} aria-hidden="true" />Fond
          </button>
          {/* T-212 : un titre posé à sa place (la plus grande zone libre, alignée sur la grille affichée ; sinon l'endroit calme d'une photo) ;
              le survol montre où, le clic le pose, Annuler le défait */}
          <button type="button" className="ed-bt" disabled={!d} title={d ? "Ajouter un titre à sa place" : "Page vide"}
            onMouseEnter={d ? voir(texte) : undefined} onFocus={d ? voir(texte) : undefined}
            onClick={() => { majUi({ rangee: null, apercuGab: null }); envoyer(texte); }}>Texte</button>
        </span>
      </span>
      {!liste.length ? <span className="ed-sous">Aucune photo</span> : null}
      {/* T-208 : une vignette par TYPE. Le type posé reste sous les yeux même au-delà du plafond (en tête) ; il montre le gabarit posé, et un
          clic sur lui ouvre ses variantes. Un clic sur un autre type pose sa tête (un gabarit dessiné l'est toujours, R175). */}
      {typesVus.map((t) => {
        const g = montre(t);
        const pose = !!t.pose;
        const n = t.membres.length;
        const geste: Geste = { type: "choisirGabarit", plancheId: pl.id, cible, templateId: t.tete.id };
        const ouvre = pose && n > 1;
        const vignette = (
          <button key={t.tete.id} type="button" className={cls("ed-gab", n > 1 && "ed-gab--pile", variantesOuvertes === t && "ed-gab--ouvert")} role="menuitemradio"
            aria-checked={pose} aria-current={pose} aria-expanded={ouvre ? variantesOuvertes === t : undefined}
            title={`${g.template.origine === "genere" ? `${g.nom} · ${g.id}` : g.nom}${n > 1 ? ` · ${pluriel(n, "variante")}` : ""}`}
            onMouseEnter={pose ? () => majUi({ apercuGab: null }) : voir(geste)} onFocus={pose ? undefined : voir(geste)}
            onClick={() => {
              majUi({ apercuGab: null });
              if (pose) { if (ouvre) { setOuvert(variantesOuvertes === t ? null : t.tete.id); setMontresVar(PLAFOND_TIROIR); } return; }
              setOuvert(null);
              envoyer(geste);
            }}>
            <DessinGab t={g.template} l={g.template.portee === "double" ? 120 : 60} />
            <Legende g={g} legende={legendes.get(g.id)} />
            {n > 1 ? <b className="ed-gab-n" aria-hidden="true">{n}</b> : null}
          </button>
        );
        if (variantesOuvertes !== t) return vignette;
        /* les AUTRES variantes du type posé (celle qui est posée est déjà sa vignette), dans l'ordre du classement, la tête d'abord ; V les parcourt au clavier */
        return (
          <Fragment key={t.tete.id}>
            {vignette}
            <span className="ed-gab-var" role="group" aria-label="Variantes">
              {t.membres.filter((g) => !g.courant).slice(0, montresVar).map((g) => {
                const gv: Geste = { type: "choisirGabarit", plancheId: pl.id, cible, templateId: g.id };
                const genere = g.template.origine === "genere";
                return (
                  <button key={g.id} type="button" className="ed-gab" role="menuitemradio" aria-checked={g.courant} title={genere ? `${g.nom} · ${g.id}` : g.nom}
                    onMouseEnter={g.courant ? () => majUi({ apercuGab: null }) : voir(gv)} onFocus={g.courant ? undefined : voir(gv)}
                    onClick={() => { majUi({ apercuGab: null }); envoyer(gv); }}>
                    <DessinGab t={g.template} l={g.template.portee === "double" ? 120 : 60} />
                    <Legende g={g} legende={legendesVar.get(g.id)} />
                  </button>
                );
              })}
              {n - 1 > montresVar ? (
                <button type="button" className="ed-bt ed-gab-plus" onClick={() => setMontresVar(montresVar + PAS_TIROIR)}>Plus<b>{(n - 1 - montresVar).toLocaleString("fr-FR")}</b></button>
              ) : null}
            </span>
          </Fragment>
        );
      })}
      {types.length > montres ? (
        <button type="button" className="ed-bt ed-gab-plus" title={pluriel(types.length - montres, "type autre", "types autres")}
          onClick={() => setMontres(montres + PAS_TIROIR)}>Plus<b>{(types.length - montres).toLocaleString("fr-FR")}</b></button>
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
    {fondOuvert ? (
      <div className="ed-fond-pop">
        <Nuances titre={seul || cible !== "double" ? "Fond de la page" : "Fond de la double"} valeur={fond} photos={idsPlanche(pl)} retirer="Sans fond"
          onChoix={(c) => envoyer({ type: "colorerFond", plancheId: pl.id, cible, couleur: c })} />
      </div>
    ) : null}
    </>
  );
}

