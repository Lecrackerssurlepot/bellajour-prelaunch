"use client";

import { useEffect, useRef, useState } from "react";
import {
  compteurs, emplacements, groupes as lesGroupes, planchesDesPhotos, triDe, reperesBibliotheque, selectionMasquee, selectionOrdonnee,
  type Filtres, type PhotoMaq, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import { CheminDeFer, Toast } from "./Bas";
import { cls, useEd } from "./contexte";
import { Ico } from "./icones";
import { grandeDe, precharger, vignetteDe } from "./images";
import Tri from "./Tri";
import { BoutonsTri, BullesTri, CROIX, ETOILE, JaugeTri, OngletsTri } from "./TriBulles";
import { focusCourant, marquerTri, nouvelleDouble, ouvrirComparaison, poserTri } from "./triEcran";

/* Le panneau Photos : filtres, sélection collée en haut, grille VIRTUALISÉE (seules les rangées proches
   de l'écran existent), préchargement en avant dans le sens du défilement.
   C'est AUSSI l'écran de tri : agrandi en plein écran (T), la grille devient justifiée (chaque photo garde sa forme),
   le chemin de fer reste en bas, et la visionneuse (une photo, comparer) se pose par-dessus. Maquette du 31/10. */

const TYPES = { lien: "Liens d'équipe", responsable: "Le responsable", atelier: "Atelier" } as const;
const STATUTS = { toutes: "Toutes", libres: "Libres", utilisees: "Utilisées", planche: "Sur cette double page" } as const;
const ORIENT = { P: "Portrait", L: "Paysage", C: "Carré" } as const;
const TAILLES = { S: 52, M: 88, L: 136 } as const;
const HAUT_TITRE = 30;
const ECART = 4;

type Rangee = { type: "g"; lib: string; n: number; y: number; ids: string[] } | { type: "r"; ids: string[]; y: number }
  /* plein écran : une rangée justifiée, chaque photo à sa largeur */
  | { type: "j"; items: { id: string; l: number }[]; y: number; h: number };

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
  const c = useEd();
  const { etat, envoyer, ui, majUi, adresses, commencerAppui, clicSupprime, imp, lectureSeule: ro } = c;
  const grand = ui.grand;
  const choix = useRef<HTMLInputElement>(null);
  /* « ×n » cliqué : la liste de ses emplacements, posée sous le repère. */
  const [ou, setOu] = useState<{ id: string; x: number; y: number } | null>(null);
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
  const triM = triDe(etat.magazine);
  const choisies = new Set(triM.choisies), ecartees = new Set(triM.ecartees);
  const planches = planchesDesPhotos(etat);
  const focus = focusCourant(etat, ui);
  const focusVu = grand || ui.zone === "photos";
  const grille = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState(0);
  const [hauteur, setHauteur] = useState(800);
  const [largGrille, setLargGrille] = useState(0);
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
    const mesure = () => { setHauteur(g.clientHeight || 800); setLargGrille(g.clientWidth); };
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(mesure) : null;
    ro?.observe(g);
    window.addEventListener("resize", mesure);
    return () => { ro?.disconnect(); window.removeEventListener("resize", mesure); };
  }, [grand]);

  /* La mise en rangées : affichage seulement (les groupes viennent du module pur). */
  const W = grand ? Math.max(200, (largGrille || 1200) - 28) : largeur - 16 - 10;
  const cible = TAILLES[f.taille] || 88;
  const cols = Math.max(2, Math.floor((W + ECART) / (cible + ECART)));
  const cell = Math.floor((W - (cols - 1) * ECART) / cols);
  const rangees: Rangee[] = [];
  let y = 0;
  const avecTitres = f.groupe !== "aucun";
  const T = ui.tailleGrand;
  for (const g of groupes) {
    if (avecTitres) { rangees.push({ type: "g", lib: g.libelle, n: g.ids.length, y, ids: g.ids }); y += HAUT_TITRE; }
    if (!grand) {
      for (let i = 0; i < g.ids.length; i += cols) { rangees.push({ type: "r", ids: g.ids.slice(i, i + cols), y }); y += cell + ECART; }
      continue;
    }
    /* rangées justifiées : on remplit jusqu'à la largeur, puis la rangée prend la hauteur qui la fait tenir pile */
    let lot: { id: string; ar: number }[] = [];
    let somme = 0;
    const fermer = (fin: boolean) => {
      const h = fin ? T : (W - ECART * (lot.length - 1)) / somme;
      rangees.push({ type: "j", y, h, items: lot.map((x) => ({ id: x.id, l: Math.floor(x.ar * h) })) });
      y += h + ECART; lot = []; somme = 0;
    };
    for (const id of g.ids) {
      const p = cat.get(id);
      const ar = p && p.l > 0 && p.h > 0 ? Math.min(4, Math.max(0.25, p.l / p.h)) : 1;
      lot.push({ id, ar }); somme += ar;
      if (somme * T + ECART * (lot.length - 1) >= W) fermer(false);
    }
    if (lot.length) fermer(true);
  }
  const hautDe = (r: Rangee): number => (r.type === "g" ? HAUT_TITRE : r.type === "j" ? r.h : cell);
  const total = y + 8;
  const deb = scroll - 400;
  const fin = scroll + hauteur + 400;
  const vues = rangees.filter((r) => r.y + hautDe(r) >= deb && r.y <= fin);
  const idsDe = (r: Rangee): string[] => (r.type === "g" ? [] : r.type === "j" ? r.items.map((x) => x.id) : r.ids);
  const titres = rangees.filter((r): r is Extract<Rangee, { type: "g" }> => r.type === "g");
  const gColle = [...titres].reverse().find((g) => g.y <= scroll);

  /* Préchargement : trois écrans en avant dans le sens du défilement. */
  useEffect(() => {
    const s = sens.current;
    if (scroll !== s.dernier) { s.dir = scroll > s.dernier ? 1 : -1; s.dernier = scroll; }
    const av = hauteur * 3;
    const a = s.dir > 0 ? fin : deb - av;
    const b = s.dir > 0 ? fin + av : deb;
    const rs = rangees.filter((r) => r.type !== "g" && r.y + hautDe(r) >= a && r.y <= b);
    if (s.dir < 0) rs.reverse();
    precharger(rs.flatMap(idsDe).map((id) => (grand ? grandeDe(adresses.get(id)) : vignetteDe(adresses.get(id)))), 1e9);
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
    const r = rangees.find((x) => idsDe(x).includes(defiler));
    if (r) g.scrollTop = Math.max(0, r.y - 40);
    majUi({ defilerVers: null });
  });

  /* Le focus du tri reste à l'écran (la grille est virtualisée : on défile d'après le calcul, pas d'après le DOM). */
  const focusDefile = useRef<string | null>(null);
  useEffect(() => {
    const g = grille.current;
    if (!g || !focus || !focusVu || focusDefile.current === focus) return;
    focusDefile.current = focus;
    const r = rangees.find((x) => idsDe(x).includes(focus));
    if (!r) return;
    const h = hautDe(r);
    if (r.y < g.scrollTop + 8) g.scrollTop = Math.max(0, r.y - 8);
    else if (r.y + h > g.scrollTop + g.clientHeight - 8) g.scrollTop = r.y + h - g.clientHeight + 8;
  });

  /* « Poser » sur un titre de groupe : ses photos GARDÉES encore libres (sinon toutes ses libres non écartées),
     en doubles pages neuves après la planche courante. Le pont direct entre le tri et la page. */
  const poserGroupe = (ids: string[]) => {
    if (ro) return null;
    const nonPosees = ids.filter((id) => !rep.utilisations.get(id) && !ecartees.has(id));
    const gardees = nonPosees.filter((id) => choisies.has(id));
    const libres = gardees.length ? gardees : nonPosees;
    if (!libres.length) return null;
    const k = Math.ceil(libres.length / 12);
    return (
      <button type="button" className="ed-groupe-poser" title={`${libres.length} photo${libres.length > 1 ? "s" : ""} libre${libres.length > 1 ? "s" : ""} sur ${k > 1 ? `${k} doubles pages` : "une double page"}`}
        onClick={() => envoyer({ type: "creerDoubles", ids: libres })}>Poser</button>
    );
  };

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
  const photoDe = (id: string): PhotoMaq | undefined => cat.get(id);

  /* Une vignette : la même en bande étroite (carrée) et en plein écran (à sa forme). */
  const vignette = (id: string, l: number, h: number) => {
    const p = photoDe(id);
    if (!p) return null;
    const n = rep.utilisations.get(id) || 0;
    const nums = planches.get(id);
    const trainee = etat.glisser?.source.type === "bibliotheque" && etat.glisser.source.ids.includes(id);
    const src = grand && h > 140 ? grandeDe(adresses.get(id)) : vignetteDe(adresses.get(id));
    const sel1 = selSet.has(id);
    const ec = ecartees.has(id);
    return (
      <button key={id} type="button" data-photo={id} style={{ width: l, height: h }}
        className={cls("ed-vg", sel1 && "ed-vg--sel", rep.surPlanche.has(id) && "ed-vg--ici", ec && "ed-vg--ecartee", trainee && "ed-vg--trainee", etat.halo === id && "ed-vg--halo", focusVu && focus === id && "ed-vg--focus")}
        aria-pressed={sel1} aria-label={p.nom + (choisies.has(id) ? ", gardée" : ec ? ", écartée" : "") + (n ? ", posée" : "") + (p.signalee ? ", à ne pas publier" : "")}
        onPointerDown={(e) => commencerAppui(e, sourcePour(id))}
        onClick={(e) => {
          if (clicSupprime()) return;
          envoyer({ type: "cliquerPhoto", id, mode: e.shiftKey ? "plage" : (e.metaKey || e.ctrlKey) ? "ajout" : "simple" });
          majUi({ focus: id, zone: "photos" });
        }}
        onDoubleClick={() => { if (etat.selection.ids.length > 1) envoyer({ type: "viderSelection" }); majUi({ grand: true, vue: "une", focus: id, zone: "photos", loupeTri: false }); }}>
        {src ? <img src={src} alt="" decoding="async" draggable={false} /> : <span className="ed-indispo-mini">Indisponible</span>}
        <span className="ed-vg-cercle" role="checkbox" aria-checked={sel1}
          aria-label={(sel1 ? "Retirer de la sélection : " : "Ajouter à la sélection : ") + p.nom}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); envoyer({ type: "cliquerPhoto", id, mode: "ajout" }); }} />
        {ro ? null : (
          <span className="ed-vg-gestes" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <span className="ed-vg-geste ed-vg-geste--k" role="button" tabIndex={-1} aria-label={`Garder : ${p.nom}`} title="Garder · P"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); marquerTri(c, "choisie", id); }} dangerouslySetInnerHTML={{ __html: ETOILE }} />
            <span className="ed-vg-geste ed-vg-geste--x" role="button" tabIndex={-1} aria-label={`Écarter : ${p.nom}`} title="Écarter · X"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); marquerTri(c, "ecartee", id); }} dangerouslySetInnerHTML={{ __html: CROIX }} />
          </span>
        )}
        <span className="ed-vg-rep ed-vg-rep--h">
          {choisies.has(id) ? <span className="ed-rep ed-rep--choisie" title="Gardée" dangerouslySetInnerHTML={{ __html: ETOILE }} /> : null}
          {p.coeur ? <span className="ed-rep ed-rep--coeur" aria-hidden="true">♥</span> : null}
          {p.signalee ? <span className="ed-rep ed-rep--drapeau" aria-hidden="true">!</span> : null}
        </span>
        <span className="ed-vg-rep ed-vg-rep--b">
          {ec ? <span className="ed-rep ed-rep--ecartee">Écartée</span> : null}
          {p.autresMagazines.length ? <span className="ed-rep ed-rep--mag">Mag. {p.autresMagazines[0]}</span> : null}
          {p.nouvelle ? <span className="ed-rep ed-rep--neuve">Nouvelle</span> : null}
          {rep.bassesDef.has(id) ? <span className="ed-rep ed-rep--basse">Basse déf.</span> : null}
          <span className="ed-esp" />
          {nums?.length ? (
            <span className="ed-rep ed-rep--posee" role="button" tabIndex={-1} title={n > 1 ? `Posée ${n} fois : voir où` : `Sur la planche ${nums[0]}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation(); e.preventDefault();
                if (n > 1) { const b = e.currentTarget.getBoundingClientRect(); setOu(ou?.id === id ? null : { id, x: b.left, y: b.bottom + 4 }); }
                else envoyer({ type: "naviguer", plancheId: etat.magazine.planches[nums[0] - 1].id });
              }}>
              <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1" y="2" width="4.5" height="8" rx=".8" /><rect x="6.5" y="2" width="4.5" height="8" rx=".8" /></svg>
              {nums[0]}{n > 1 ? ` ×${n}` : ""}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <aside className={cls("ed-ph", grand && "ed-ph--grand", cibleBib && "ed-ph--cible")} style={{ "--ph-l": `${largeur}px` } as React.CSSProperties} aria-label="Photos"
      onPointerDown={() => { if (ui.zone !== "photos") majUi({ zone: "photos" }); }}
      onClick={() => { if (menu && menu.startsWith("ph-")) majUi({ menu: null }); }} {...glisserFichiers}>
      <div className="ed-ph-tete">
        <h2>{grand ? "Trier" : "Photos"}</h2>
        <span className="ed-esp" />
        {imp ? (
          <>
            <input ref={choix} type="file" accept="image/*" multiple hidden
              onChange={(e) => { const l = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ""; imp.importer(l); }} />
            <button type="button" className="ed-bt" disabled={!!imp.enCours} onClick={() => choix.current?.click()}>
              {imp.enCours ? `${imp.enCours.fait} / ${imp.enCours.total}` : "Importer"}
            </button>
          </>
        ) : null}
        {grand ? <JaugeTri /> : (
          <span className="ed-seg" role="group" aria-label="Taille des vignettes">
            {(["S", "M", "L"] as const).map((t) => (
              <button key={t} type="button" aria-pressed={f.taille === t} onClick={() => filtrer({ taille: t })}>{t}</button>
            ))}
          </span>
        )}
        <BoutonsTri />
        {grand ? null : <button type="button" className="ed-ico" aria-label="Replier les photos" title="Replier les photos" onClick={() => envoyer({ type: "panneau", ouvert: false })}>{Ico.panneau}</button>}
      </div>
      <OngletsTri />
      {grand ? null : <div className="ed-ph-jauge"><JaugeTri /></div>}
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
          <button type="button" className="ed-filtre" aria-haspopup="menu" aria-expanded={menu === "ph-t"} onClick={ouvrirMenu("ph-t")}>Ordre {Ico.bas}</button>
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
        onScroll={(e) => { setScroll(e.currentTarget.scrollTop); setOu(null); }}
        onClick={(e) => { if (!(e.target as HTMLElement).closest(".ed-vg") && sel.length && !clicSupprime()) envoyer({ type: "viderSelection" }); }}>
        {gColle ? <div className="ed-groupe ed-groupe--colle">{gColle.lib} <span>{gColle.n}</span>{poserGroupe(gColle.ids)}</div> : null}
        {!vis.length ? (
          <div className="ed-ph-vide">
            <span>{imp && !cpt.total ? "Glissez vos photos ici" : f.marque === "a_trier" && cpt.total ? "Tout est trié" : "Aucune photo"}</span>
            {imp && !cpt.total ? <button type="button" className="ed-bt" onClick={() => choix.current?.click()}>Importer</button> : null}
            {actifs.length ? <button type="button" className="ed-bt" onClick={() => envoyer({ type: "effacerFiltres" })}>Tout effacer</button> : null}
          </div>
        ) : null}
        <div className="ed-grille-haut" style={{ height: total }}>
          {vues.map((r) => r.type === "g" ? (
            <div key={`g${r.y}`} className="ed-groupe" style={{ top: r.y }}>{r.lib} <span>{r.n}</span>{poserGroupe(r.ids)}</div>
          ) : r.type === "j" ? (
            <div key={`j${r.y}`} className="ed-rangee ed-rangee--j" style={{ top: r.y, height: r.h }}>
              {r.items.map((x) => vignette(x.id, x.l, Math.round(r.h)))}
            </div>
          ) : (
            <div key={`r${r.y}`} className="ed-rangee" style={{ top: r.y, gridTemplateColumns: `repeat(${cols}, ${cell}px)` }}>
              {r.ids.map((id) => vignette(id, cell, cell))}
            </div>
          ))}
        </div>
      </div>
      {ou ? (
        <>
          <div className="ed-ou-fond" onClick={() => setOu(null)} />
          <div className="ed-menu ed-ou" role="menu" style={{ left: ou.x, top: ou.y }}>
            {emplacements(etat, ou.id).map((x) => (
              <button key={`${x.ref.plancheId}${x.ref.cible}${x.ref.index}`} type="button" role="menuitem"
                onClick={() => { setOu(null); envoyer({ type: "naviguer", plancheId: x.ref.plancheId }); envoyer({ type: "activerCadre", ref: x.ref }); }}>
                Planche {x.numero}<span>p. {x.pages}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
      {cibleBib ? <div className="ed-ph-retirer">{depose ? "Lâcher pour importer" : "Lâcher pour retirer"}</div> : null}
      {imp?.bilan ? <div className="ed-ph-bilan" role="status">{imp.bilan}</div> : null}
      {grand ? (
        <div className="ed-ph-bas">
          <CheminDeFer />
          <Toast />
        </div>
      ) : null}
      <Tri />
      <BullesTri />
      {grand ? null : (
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
      )}
    </aside>
  );
}

/* La bande de sélection, collée en haut du panneau : toujours à l'écran pendant le défilement et le glisser.
   Les photos que les filtres cachent y restent, marquées « masquée ». On glisse depuis elle : tout part. */
function BandeSelection() {
  const c = useEd();
  const { etat, envoyer, adresses, commencerAppui, lectureSeule } = c;
  const ids = selectionOrdonnee(etat);
  const masq = new Set(selectionMasquee(etat));
  const n = ids.length;
  return (
    <div className="ed-sel" role="region" aria-label="Sélection">
      <div className="ed-sel-t">
        <b>{n} sélectionnée{n > 1 ? "s" : ""}</b>
        {masq.size ? <span>· {masq.size} masquée{masq.size > 1 ? "s" : ""}</span> : null}
        <span className="ed-esp" />
        {lectureSeule ? null : (
          <>
            <button type="button" className="ed-lien" title="Garder · P" onClick={() => marquerTri(c, "choisie")}>★ Garder</button>
            <button type="button" className="ed-lien" title="Écarter · X" onClick={() => marquerTri(c, "ecartee")}>Écarter</button>
            {n >= 2 && n <= 4 ? <button type="button" className="ed-lien" title="Comparer · C" onClick={() => ouvrirComparaison(c)}>Comparer</button> : null}
            <button type="button" className="ed-lien" title="Poser sur la double · Entrée" onClick={() => poserTri(c)}>Poser</button>
            <button type="button" className="ed-lien" title="Nouvelle double page · N" onClick={() => nouvelleDouble(c)}>Nouvelle double</button>
          </>
        )}
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
