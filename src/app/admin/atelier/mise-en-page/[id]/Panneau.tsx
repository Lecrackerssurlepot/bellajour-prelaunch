"use client";

import { useEffect, useRef, useState } from "react";
import {
  compteurs, groupes as lesGroupes, reperesBibliotheque, selectionMasquee, selectionOrdonnee,
  type Filtres, type PhotoMaq, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import { cls, useEd } from "./contexte";
import { Ico } from "./icones";
import { precharger, vignetteDe } from "./images";

/* Le panneau Photos : filtres, sélection collée en haut, grille VIRTUALISÉE (seules les rangées proches
   de l'écran existent), préchargement en avant dans le sens du défilement, « Utilisées » en pied. */

const TYPES = { lien: "Liens d'équipe", responsable: "Le responsable", atelier: "Atelier" } as const;
const STATUTS = { toutes: "Toutes", libres: "Libres", utilisees: "Utilisées", planche: "Sur cette double page" } as const;
const ORIENT = { P: "Portrait", L: "Paysage", C: "Carré" } as const;
const TAILLES = { S: 52, M: 88, L: 136 } as const;
const HAUT_TITRE = 30;
const ECART = 4;

type Rangee = { type: "g"; lib: string; n: number; y: number } | { type: "r"; ids: string[]; y: number };

export default function Panneau() {
  const { etat } = useEd();
  if (!etat.panneau.ouvert) return <PanneauReplie />;
  return <PanneauOuvert />;
}

function PanneauReplie() {
  const { etat, envoyer } = useEd();
  const cible = etat.glisser?.survol?.type === "bibliotheque";
  return (
    <aside className={cls("ed-ph ed-ph--ferme", cible && "ed-ph--cible")} aria-label="Photos">
      <button type="button" className="ed-ico" aria-label="Ouvrir les photos (P)" onClick={() => envoyer({ type: "panneau", ouvert: true })}>{Ico.panneau}</button>
      <span className="ed-ph-vertical">Photos · {etat.catalogue.size.toLocaleString("fr-FR")}</span>
    </aside>
  );
}

function PanneauOuvert() {
  const { etat, envoyer, ui, majUi, adresses, commencerAppui, clicSupprime, imp } = useEd();
  const choix = useRef<HTMLInputElement>(null);
  const [depose, setDepose] = useState(false);
  const f = etat.filtres;
  const largeur = etat.panneau.largeur;
  const cat = etat.catalogue;
  const groupes = lesGroupes(etat);
  const vis = groupes.flatMap((g) => g.ids);
  const sel = etat.selection.ids;
  const cpt = compteurs(etat);
  const rep = reperesBibliotheque(etat);
  const selSet = rep.selection;
  const grille = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [hauteur, setHauteur] = useState(800);
  const sens = useRef({ dernier: 0, dir: 1 });
  const cibleBib = etat.glisser?.survol?.type === "bibliotheque" || depose;
  /* Création libre : des fichiers glissés depuis le Finder (le glisser interne passe par le pointeur, jamais par ici). */
  const fichiersDe = (e: React.DragEvent): boolean => Array.from(e.dataTransfer.types).includes("Files");
  const glisserFichiers = imp ? {
    onDragOver: (e: React.DragEvent) => { if (!fichiersDe(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setDepose(true); },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDepose(false); },
    onDrop: (e: React.DragEvent) => { if (!fichiersDe(e)) return; e.preventDefault(); setDepose(false); imp.importer(Array.from(e.dataTransfer.files)); },
  } : {};

  /* La hauteur visible de la grille, relue quand la fenêtre change. */
  useEffect(() => {
    const g = grille.current;
    if (!g) return;
    const mesure = () => setHauteur(g.clientHeight || 800);
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(mesure) : null;
    ro?.observe(g);
    window.addEventListener("resize", mesure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", mesure); };
  }, []);

  /* La mise en rangées : affichage seulement (les groupes viennent du module pur). */
  const W = largeur - 16 - 10;
  const cible = TAILLES[f.taille] || 88;
  const cols = Math.max(2, Math.floor((W + ECART) / (cible + ECART)));
  const cell = Math.floor((W - (cols - 1) * ECART) / cols);
  const rangees: Rangee[] = [];
  let y = 0;
  const avecTitres = f.groupe !== "aucun";
  for (const g of groupes) {
    if (avecTitres) { rangees.push({ type: "g", lib: g.libelle, n: g.ids.length, y }); y += HAUT_TITRE; }
    for (let i = 0; i < g.ids.length; i += cols) { rangees.push({ type: "r", ids: g.ids.slice(i, i + cols), y }); y += cell + ECART; }
  }
  const total = y + 8;
  const deb = scroll - 400;
  const fin = scroll + hauteur + 400;
  const vues = rangees.filter((r) => r.y + (r.type === "g" ? HAUT_TITRE : cell) >= deb && r.y <= fin);
  const titres = rangees.filter((r): r is Extract<Rangee, { type: "g" }> => r.type === "g");
  const gColle = [...titres].reverse().find((g) => g.y <= scroll);

  /* Préchargement : trois écrans en avant dans le sens du défilement. */
  useEffect(() => {
    const s = sens.current;
    if (scroll !== s.dernier) { s.dir = scroll > s.dernier ? 1 : -1; s.dernier = scroll; }
    const av = hauteur * 3;
    const a = s.dir > 0 ? fin : deb - av;
    const b = s.dir > 0 ? fin + av : deb;
    const rs = rangees.filter((r): r is Extract<Rangee, { type: "r" }> => r.type === "r" && r.y + cell >= a && r.y <= b);
    if (s.dir < 0) rs.reverse();
    precharger(rs.flatMap((r) => r.ids).map((id) => vignetteDe(adresses.get(id))), 1e9);
  });
  /* Puis, au repos, tout le reste en fond. */
  useEffect(() => {
    const t = setTimeout(() => precharger(vis.map((id) => vignetteDe(adresses.get(id))), 0), 600);
    return () => clearTimeout(t);
  });

  /* « Voir » : défiler jusqu'à la photo retirée. */
  const defiler = ui.defilerVers;
  useEffect(() => {
    const g = grille.current;
    if (!defiler || !g) return;
    const r = rangees.find((x): x is Extract<Rangee, { type: "r" }> => x.type === "r" && x.ids.includes(defiler));
    if (r) g.scrollTop = Math.max(0, r.y - 40);
    majUi({ defilerVers: null });
  });

  const sourcePour = (id: string): SourceGlisser => (selSet.has(id) ? { type: "bibliotheque", ids: selectionOrdonnee(etat) } : { type: "bibliotheque", ids: [id] });
  const personnes = [...new Set([...cat.values()].map((p) => p.personne).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
  const filtrer = (filtres: Partial<Filtres>) => envoyer({ type: "filtrer", filtres });
  const bascule = <K extends "personnes" | "types" | "orientations">(cle: K, v: Filtres[K][number]) => {
    const l = f[cle] as string[];
    filtrer({ [cle]: l.includes(v as string) ? l.filter((x) => x !== v) : [...l, v as string] } as Partial<Filtres>);
  };
  const actifs: [string, () => void][] = [];
  if (f.recherche) actifs.push([`« ${f.recherche} »`, () => envoyer({ type: "retirerFiltre", cle: "recherche" })]);
  if (f.statut !== "toutes") actifs.push([STATUTS[f.statut], () => envoyer({ type: "retirerFiltre", cle: "statut" })]);
  f.personnes.forEach((x) => actifs.push([x, () => bascule("personnes", x)]));
  f.types.forEach((x) => actifs.push([TYPES[x], () => bascule("types", x)]));
  if (f.coeur) actifs.push(["♥ Sélection", () => envoyer({ type: "retirerFiltre", cle: "coeur" })]);
  f.orientations.forEach((x) => actifs.push([ORIENT[x], () => bascule("orientations", x)]));
  if (f.montrerSignalees) actifs.push(["À ne pas publier", () => envoyer({ type: "retirerFiltre", cle: "montrerSignalees" })]);
  const menu = ui.menu;
  const ouvrirMenu = (id: string) => (e: React.MouseEvent) => { e.stopPropagation(); majUi({ menu: menu === id ? null : id }); };
  const focusVoisin = (e: React.KeyboardEvent, id: string, delta: number) => {
    const j = vis.indexOf(id) + delta;
    if (j < 0 || j >= vis.length) return;
    e.preventDefault();
    const g = grille.current;
    const el = g?.querySelector<HTMLElement>(`[data-photo="${vis[j]}"]`);
    if (el) el.focus();
    else if (g) g.scrollTop += delta > 0 ? cell : -cell;
  };
  const photoDe = (id: string): PhotoMaq | undefined => cat.get(id);

  return (
    <aside className={cls("ed-ph", cibleBib && "ed-ph--cible")} style={{ "--ph-l": `${largeur}px` } as React.CSSProperties} aria-label="Photos"
      onClick={() => { if (menu && menu.startsWith("ph-")) majUi({ menu: null }); }} {...glisserFichiers}>
      <div className="ed-ph-tete">
        <h2>Photos <span>{vis.length.toLocaleString("fr-FR")} / {cpt.total.toLocaleString("fr-FR")}</span></h2>
        {imp ? (
          <>
            <input ref={choix} type="file" accept="image/*" multiple hidden
              onChange={(e) => { const l = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ""; imp.importer(l); }} />
            <button type="button" className="ed-bt" disabled={!!imp.enCours} onClick={() => choix.current?.click()}>
              {imp.enCours ? `${imp.enCours.fait} / ${imp.enCours.total}` : "Importer"}
            </button>
          </>
        ) : null}
        <span className="ed-seg" role="group" aria-label="Taille des vignettes">
          {(["S", "M", "L"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={f.taille === t} onClick={() => filtrer({ taille: t })}>{t}</button>
          ))}
        </span>
        <button type="button" className="ed-ico" aria-label="Replier les photos (P)" onClick={() => envoyer({ type: "panneau", ouvert: false })}>{Ico.panneau}</button>
      </div>
      <div className="ed-ph-outils">
        <label className="ed-recherche">{Ico.loupe}
          <input type="search" placeholder="Rechercher" aria-label="Rechercher une photo" value={f.recherche} onChange={(e) => filtrer({ recherche: e.currentTarget.value })} />
        </label>
        <span className="ed-ancre">
          <button type="button" className={cls("ed-filtre", actifs.length > 0 && "ed-filtre--actif")} aria-haspopup="menu" aria-expanded={menu === "ph-f"} onClick={ouvrirMenu("ph-f")}>
            Filtres{actifs.length ? ` · ${actifs.length}` : ""} {Ico.bas}
          </button>
          {menu === "ph-f" ? (
            <div className="ed-menu ed-menu--haut" role="menu" onClick={(e) => e.stopPropagation()}>
              <span className="ed-menu-t">Statut</span>
              {Object.entries(STATUTS).map(([v, l]) => (
                <button key={v} type="button" role="menuitemradio" aria-checked={f.statut === v} onClick={() => filtrer({ statut: v as Filtres["statut"] })}>{l}</button>
              ))}
              {personnes.length > 1 ? (
                <>
                  <hr /><span className="ed-menu-t">Personne</span>
                  {personnes.map((x) => <button key={x} type="button" role="menuitemcheckbox" aria-checked={f.personnes.includes(x)} onClick={() => bascule("personnes", x)}>{x}</button>)}
                </>
              ) : null}
              {[...cat.values()].some((p) => p.type !== "responsable") ? (
                <>
                  <hr /><span className="ed-menu-t">Dépôt</span>
                  {(Object.entries(TYPES) as [keyof typeof TYPES, string][]).map(([v, l]) => <button key={v} type="button" role="menuitemcheckbox" aria-checked={f.types.includes(v)} onClick={() => bascule("types", v)}>{l}</button>)}
                </>
              ) : null}
              {[...cat.values()].some((p) => p.coeur) ? (
                <>
                  <hr />
                  <button type="button" role="menuitemcheckbox" aria-checked={f.coeur} onClick={() => filtrer({ coeur: !f.coeur })}>♥ Sélection</button>
                </>
              ) : null}
              <hr /><span className="ed-menu-t">Orientation</span>
              {(Object.entries(ORIENT) as [keyof typeof ORIENT, string][]).map(([v, l]) => <button key={v} type="button" role="menuitemcheckbox" aria-checked={f.orientations.includes(v)} onClick={() => bascule("orientations", v)}>{l}</button>)}
              {[...cat.values()].some((p) => p.signalee) ? (
                <>
                  <hr />
                  <button type="button" role="menuitemcheckbox" aria-checked={f.montrerSignalees} onClick={() => filtrer({ montrerSignalees: !f.montrerSignalees })}>Montrer « à ne pas publier »</button>
                </>
              ) : null}
            </div>
          ) : null}
        </span>
        <span className="ed-ancre">
          <button type="button" className="ed-filtre" aria-haspopup="menu" aria-expanded={menu === "ph-t"} onClick={ouvrirMenu("ph-t")}>Trier {Ico.bas}</button>
          {menu === "ph-t" ? (
            <div className="ed-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              {([["date", "Date de prise"], ["nom", "Nom"], ["personne", "Personne"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="menuitemradio" aria-checked={f.tri === v} onClick={() => { majUi({ menu: null }); filtrer({ tri: v }); }}>{l}</button>
              ))}
            </div>
          ) : null}
        </span>
        <span className="ed-ancre">
          <button type="button" className="ed-filtre" aria-haspopup="menu" aria-expanded={menu === "ph-g"} onClick={ouvrirMenu("ph-g")}>Grouper {Ico.bas}</button>
          {menu === "ph-g" ? (
            <div className="ed-menu ed-menu--droite" role="menu" onClick={(e) => e.stopPropagation()}>
              {([["jour", "Jour"], ["personne", "Personne"], ["type", "Dépôt"], ["aucun", "Aucun"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="menuitemradio" aria-checked={f.groupe === v} onClick={() => { majUi({ menu: null }); filtrer({ groupe: v }); }}>{l}</button>
              ))}
            </div>
          ) : null}
        </span>
      </div>
      {actifs.length ? (
        <div className="ed-ph-actifs">
          {actifs.map(([l, fn]) => (
            <button key={l} type="button" className="ed-filtre ed-filtre--actif" aria-label={`Retirer le filtre ${l}`} onClick={fn}>{l} <span aria-hidden="true">×</span></button>
          ))}
          <button type="button" className="ed-lien" onClick={() => envoyer({ type: "effacerFiltres" })}>Tout effacer</button>
        </div>
      ) : null}
      {sel.length ? <BandeSelection /> : null}
      <div ref={grille} className={cls("ed-grille", sel.length > 0 && "ed-grille--sel")} tabIndex={-1}
        onScroll={(e) => setScroll(e.currentTarget.scrollTop)}
        onClick={(e) => { if (!(e.target as HTMLElement).closest(".ed-vg") && sel.length && !clicSupprime()) envoyer({ type: "viderSelection" }); }}>
        {gColle ? <div className="ed-groupe ed-groupe--colle">{gColle.lib} <span>{gColle.n}</span></div> : null}
        {!vis.length ? (
          <div className="ed-ph-vide">
            <span>{imp && !cpt.total ? "Glissez vos photos ici" : "Aucune photo"}</span>
            {imp && !cpt.total ? <button type="button" className="ed-bt" onClick={() => choix.current?.click()}>Importer</button> : null}
            {actifs.length ? <button type="button" className="ed-bt" onClick={() => envoyer({ type: "effacerFiltres" })}>Tout effacer</button> : null}
          </div>
        ) : null}
        <div className="ed-grille-haut" style={{ height: total }}>
          {vues.map((r) => r.type === "g" ? (
            <div key={`g${r.y}`} className="ed-groupe" style={{ top: r.y }}>{r.lib} <span>{r.n}</span></div>
          ) : (
            <div key={`r${r.y}`} className="ed-rangee" style={{ top: r.y, gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
              {r.ids.map((id) => {
                const p = photoDe(id);
                if (!p) return null;
                const n = rep.utilisations.get(id) || 0;
                const trainee = etat.glisser?.source.type === "bibliotheque" && etat.glisser.source.ids.includes(id);
                const src = vignetteDe(adresses.get(id));
                const choisie = selSet.has(id);
                return (
                  <button key={id} type="button" data-photo={id} style={{ width: cell, height: cell }}
                    className={cls("ed-vg", choisie && "ed-vg--sel", n > 0 && "ed-vg--utilisee", rep.surPlanche.has(id) && "ed-vg--ici", trainee && "ed-vg--trainee", etat.halo === id && "ed-vg--halo")}
                    aria-pressed={choisie} aria-label={p.nom + (n ? ", posée" : "") + (p.signalee ? ", à ne pas publier" : "")}
                    onPointerDown={(e) => commencerAppui(e, sourcePour(id))}
                    onClick={(e) => { if (clicSupprime()) return; envoyer({ type: "cliquerPhoto", id, mode: e.shiftKey ? "plage" : (e.metaKey || e.ctrlKey) ? "ajout" : "simple" }); }}
                    onDoubleClick={() => majUi({ loupe: id })}
                    onKeyDown={(e) => {
                      if (e.key === " ") { e.preventDefault(); majUi({ loupe: id }); }
                      else if (e.key === "Enter") { e.preventDefault(); envoyer({ type: "cliquerPhoto", id, mode: e.shiftKey ? "plage" : "ajout" }); }
                      else if (e.key === "ArrowRight") focusVoisin(e, id, 1);
                      else if (e.key === "ArrowLeft") focusVoisin(e, id, -1);
                      else if (e.key === "ArrowDown") focusVoisin(e, id, cols);
                      else if (e.key === "ArrowUp") focusVoisin(e, id, -cols);
                    }}>
                    {src ? <img src={src} alt="" decoding="async" draggable={false} /> : <span className="ed-indispo-mini">Indisponible</span>}
                    {n > 0 ? <span className="ed-vg-voile" aria-hidden="true" /> : null}
                    <span className="ed-vg-cercle" role="checkbox" aria-checked={choisie}
                      aria-label={(choisie ? "Retirer de la sélection : " : "Ajouter à la sélection : ") + p.nom}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); envoyer({ type: "cliquerPhoto", id, mode: "ajout" }); }} />
                    <span className="ed-vg-rep ed-vg-rep--h">
                      {p.coeur ? <span className="ed-rep ed-rep--coeur" aria-hidden="true">♥</span> : null}
                      {p.signalee ? <span className="ed-rep ed-rep--drapeau" aria-hidden="true">!</span> : null}
                    </span>
                    <span className="ed-vg-rep ed-vg-rep--b">
                      {n > 1 ? <span className="ed-rep">×{n}</span> : null}
                      {p.autresMagazines.length ? <span className="ed-rep ed-rep--mag">Mag. {p.autresMagazines[0]}</span> : null}
                      {p.nouvelle ? <span className="ed-rep ed-rep--neuve">Nouvelle</span> : null}
                      {rep.bassesDef.has(id) ? <span className="ed-rep ed-rep--basse">Basse déf.</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {cibleBib ? <div className="ed-ph-retirer">{depose ? "Lâcher pour importer" : "Lâcher pour retirer"}</div> : null}
      {imp?.bilan ? <div className="ed-ph-bilan" role="status">{imp.bilan}</div> : null}
      <div className="ed-ph-pied">
        <span>{cpt.photosPosees} posées</span>
        <span className="ed-esp" />
        <button type="button" className={cls("ed-util", f.masquerUtilisees && "ed-util--masque")} aria-pressed={!f.masquerUtilisees}
          title={f.masquerUtilisees ? "Montrer les photos utilisées" : "Masquer les photos utilisées"}
          onClick={() => filtrer({ masquerUtilisees: !f.masquerUtilisees })}>
          {f.masquerUtilisees ? Ico.oeilBarre : Ico.oeil}Utilisées
        </button>
      </div>
      <div className="ed-poignee" role="separator" aria-orientation="vertical" aria-label="Largeur des photos" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); envoyer({ type: "panneau", largeur: largeur + (e.key === "ArrowRight" ? 24 : -24) }); } }}
        onPointerDown={(e) => {
          e.preventDefault();
          const x0 = e.clientX, l0 = largeur;
          const mv = (ev: PointerEvent) => envoyer({ type: "panneau", largeur: Math.min(560, l0 + ev.clientX - x0) });
          const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
          window.addEventListener("pointermove", mv);
          window.addEventListener("pointerup", up);
        }} />
    </aside>
  );
}

/* La bande de sélection, collée en haut du panneau : toujours à l'écran pendant le défilement et le glisser.
   Les photos que les filtres cachent y restent, marquées « masquée ». On glisse depuis elle : tout part. */
function BandeSelection() {
  const { etat, envoyer, adresses, commencerAppui } = useEd();
  const ids = selectionOrdonnee(etat);
  const masq = new Set(selectionMasquee(etat));
  const n = ids.length;
  return (
    <div className="ed-sel" role="region" aria-label="Sélection">
      <div className="ed-sel-t">
        <b>{n} sélectionnée{n > 1 ? "s" : ""}</b>
        {masq.size ? <span>· {masq.size} masquée{masq.size > 1 ? "s" : ""}</span> : null}
        <span className="ed-esp" />
        <button type="button" className="ed-lien" onClick={() => envoyer({ type: "viderSelection" })}>Effacer</button>
      </div>
      <div className="ed-sel-piste">
        {ids.map((id) => {
          const p = etat.catalogue.get(id);
          const m = masq.has(id);
          const src = vignetteDe(adresses.get(id));
          return (
            <span key={id} className={cls("ed-ps", m && "ed-ps--masquee")} title={(p ? p.nom : id) + (m ? " · masquée" : "")}
              onPointerDown={(e) => { if (!(e.target as HTMLElement).closest(".ed-ps-x")) commencerAppui(e, { type: "bibliotheque", ids: selectionOrdonnee(etat) }); }}>
              {src ? <img src={src} alt="" decoding="async" draggable={false} /> : null}
              {m ? <span className="ed-ps-m">masquée</span> : null}
              <button type="button" className="ed-ps-x" aria-label={`Retirer de la sélection : ${p ? p.nom : id}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); envoyer({ type: "cliquerPhoto", id, mode: "ajout" }); }}>×</button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
