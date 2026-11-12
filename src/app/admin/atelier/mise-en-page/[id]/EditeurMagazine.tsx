"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  appliquer, apercuDepot, creerEtat, estTour, lectureSeule as estLectureSeule, visibles,
  type CibleDepot, type EtatEditeur, type Geste, type Projet, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import type { CatalogueCharge, SourceCatalogue } from "./chargerCatalogue";
import { chargerGabarits } from "./gabaritsClient";
import { CtxEd, basculerGrille, fermerTexteDom, uiDeDepart, type Adresse, type Ctx, type Import, type Ui } from "./contexte";
import { cibleSous, type Glisse } from "./glisser";
import { Bandeaux, Barre } from "./Barre";
import { Bande, CheminDeFer, Toast } from "./Bas";
import { ExportFeuille } from "./ExportFeuille";
import { Rangee } from "./Gabarits";
import { Loupe, Pile, posPile } from "./Pile";
import Panneau from "./Panneau";
import { useSauvegarde, type CleSauvegarde } from "./sauvegardeClient";
import Scene from "./Scene";
import SceneCouverture, { BandeCouverture, RangeeCouverture } from "./SceneCouverture";
import { ID_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { clavierTri } from "./triEcran";
import Confrontation, { clavierConfrontation } from "./Hesitation";
import { useLecture } from "./mesuresClient";
import { useLecons } from "./leconsClient";
import { variablesStyle } from "@/lib/mise-en-page/style";
import { StylePanneau } from "./StylePanneau";

/**
 * L'éditeur d'UN magazine : il porte l'état pur (`EtatEditeur`, jamais muté : `appliquer(etat, geste)`), l'état
 * d'écran, le glisser en événements pointeur, le clavier, la sauvegarde. Les morceaux dessinent et envoient des gestes.
 */

type Props = {
  catalogue: CatalogueCharge;
  source: SourceCatalogue;
  cle: CleSauvegarde;
  projet: Projet;
  archive: boolean;
  collecteOuverte: boolean;
  retour: { href: string; libelle: string };
  suite: { href: string; mot: string };
  selecteur: React.ReactNode;
  imp?: Import;
};

export default function EditeurMagazine({ catalogue, source, cle, projet, archive, collecteOuverte, retour, suite, selecteur, imp }: Props) {
  const [etat, setEtat] = useState<EtatEditeur | null>(null);
  const [ui, setUi] = useState<Ui>(uiDeDepart);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [vu, setVu] = useState<{ pl: string; mag: unknown } | null>(null);
  const sauve = useSauvegarde(cle, etat?.magazine ?? null);
  const G = useRef<Glisse | null>(null);
  const supprime = useRef(false);
  const etatRef = useRef<EtatEditeur | null>(null);
  const pointeur = useRef<{ x: number; y: number } | null>(null);
  const clavierRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const adresses = useMemo<ReadonlyMap<string, Adresse>>(
    () => new Map(catalogue.photos.map((p) => [p.id, { vignette: p.vignette, moyenne: p.moyenne, original: catalogue.originaux[p.id] ?? null }])),
    [catalogue],
  );

  /* 06/11 : la barre latérale et le grand écran ont chacun leur vue. Les tours ne vivent qu'en grand écran ;
     la barre garde « Toutes » (ou « À côté »). Chacun retrouve la sienne en revenant. */
  const majUi = (p: Partial<Ui>) => {
    let vues: Partial<Ui> = {};
    if (p.grand !== undefined && p.grand !== ui.grand && etat) {
      const m = etat.filtres.marque;
      const vueBarre = p.grand ? m : ui.vueBarre, vueTour = !p.grand && estTour(m) ? m : ui.vueTour;
      vues = { vueBarre, vueTour };
      const vers = p.grand ? vueTour : vueBarre;
      if (vers !== m) envoyer({ type: "filtrer", filtres: { marque: vers, etiquette: "" } });
    }
    setUi((u) => ({ ...u, ...p, ...vues }));
  };
  const envoyer = (g: Geste) => setEtat((e) => (e ? appliquer(e, g) : e));
  const envoyerAvec = (f: (e: EtatEditeur) => Geste | null) => setEtat((e) => {
    if (!e) return e;
    const g = f(e);
    return g ? appliquer(e, g) : e;
  });
  /* couche 1 (09/11) : les vignettes sont mesurées dans le navigateur, floues et piles arrivent dans l'état */
  useLecture(etat?.catalogue ?? null, adresses, envoyer);
  /* lot 2 (G1, G2, G6) : les gestes contraires deviennent des leçons, envoyées au serveur sans rien demander */
  const memoire = useLecons(cle.cle, etat, envoyer);
  const flasher = (cible: CibleDepot) => majUi({ flash: cible });
  const gesteAvecAnnuler = (g: Geste, texte: string) => setEtat((e) => {
    if (!e) return e;
    const x = appliquer(e, g);
    return x.magazine !== e.magazine && !x.message ? { ...x, message: { texte, action: { libelle: "Annuler" } } } : x;
  });

  /* ─── l'ouverture : copie du serveur, sinon locale, sinon un magazine neuf ───
     Pas de garde « une seule fois » : le crochet de sauvegarde se suspend au démontage (et React le simule en
     développement), `ouvrir` le remet en marche. Le résultat d'un passage annulé est ignoré. */
  const { ouvrir, lectureSeule: figer } = sauve;
  /* Le catalogue est lu par une référence : un import (création libre) l'enrichit sans rouvrir la sauvegarde. */
  const catalogueRef = useRef(catalogue);
  /* Le projet passe ENTIER à `creerEtat` (jamais reconstruit champ par champ : un champ ajouté au type ne se perd plus en
     silence). Sa clé (le JSON de ses champs) tient lieu de dépendance : la page en refait un objet à chaque rendu, et le
     moindre champ qui change, présent ou futur, rouvre la sauvegarde comme avant. */
  const projetRef = useRef(projet);
  const cleProjet = JSON.stringify(projet);
  useEffect(() => { catalogueRef.current = catalogue; projetRef.current = projet; });
  useEffect(() => {
    let annule = false;
    void ouvrir().then((magazine) => {
      if (annule) return;
      let e = creerEtat({ magazine, catalogue: catalogueRef.current.photos, projet: projetRef.current });
      if (archive) { figer("archive"); e = appliquer(e, { type: "ouvrirLectureSeule", raison: "archive" }); }
      setEtat((prev) => prev ?? e);
    });
    return () => { annule = true; };
  }, [ouvrir, figer, cleProjet, archive]);

  useEffect(() => { etatRef.current = etat; });

  /* lot 4 : les gabarits enregistrés par l'atelier rejoignent le catalogue (l'éditeur marche sans eux) */
  const [, setGabaritsCharges] = useState(false);
  useEffect(() => {
    let annule = false;
    void chargerGabarits().then((ok) => { if (!annule && ok) setGabaritsCharges(true); });
    return () => { annule = true; };
  }, []);

  /* Création libre : des photos importées après l'ouverture rejoignent le catalogue (le magazine ne bouge pas). */
  if (etat && catalogue.photos.some((p) => !etat.catalogue.has(p.id))) {
    setEtat(appliquer(etat, { type: "ajouterAuCatalogue", photos: catalogue.photos }));
  }

  /* ─── la sauvegarde parle : un conflit passe l'écran en lecture seule ─── */
  const sv = sauve.etat;
  if (etat && sv.etat === "conflit" && etat.sauvegarde.etat !== "conflit") {
    setEtat(appliquer(etat, { type: "sauvegardeConflit", enBase: { version: sv.enBase.version, modifie_par: sv.enBase.modifie_par ?? undefined, modifie_le: sv.enBase.modifie_le } }));
  }

  const prendreSaVersion = () => {
    if (sv.etat !== "conflit") return;
    const enBase = sv.enBase;
    void sauve.recharger().then((m) => { if (m) envoyer({ type: "prendreSaVersion", magazine: m, version: enBase.version, le: enBase.modifie_le }); });
  };
  const garderLaMienne = () => { sauve.ecraser(); envoyer({ type: "garderLaMienne" }); };

  /* ─── ce qui change quand la planche courante change (sens de glissement, tiroir fermé) ─── */
  if (etat && (!vu || vu.pl !== etat.plancheCourante || vu.mag !== etat.magazine)) {
    setVu({ pl: etat.plancheCourante, mag: etat.magazine });
    if (vu && vu.pl !== etat.plancheCourante) {
      const ia = etat.magazine.planches.findIndex((p) => p.id === vu.pl);
      const ib = etat.magazine.planches.findIndex((p) => p.id === etat.plancheCourante);
      majUi({ dir: ia < 0 ? null : ib > ia ? "d" : "g", rangee: null, apercuGab: null });
    } else if (vu) majUi({ apercuGab: null });
  }

  /* ─── messages, halo, éclair : de courtes vies ─── */
  const message = etat?.message ?? null;
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setEtat((e) => (e ? appliquer(e, { type: "fermerMessage" }) : e)), 5000);
    return () => clearTimeout(t);
  }, [message]);
  const halo = etat?.halo ?? null;
  useEffect(() => {
    if (!halo) return;
    const t1 = setTimeout(() => document.querySelector(`[data-photo="${halo}"]`)?.scrollIntoView({ block: "nearest" }), 30);
    const t2 = setTimeout(() => setEtat((e) => (e && e.halo === halo ? { ...e, halo: null } : e)), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [halo]);
  const flash = ui.flash;
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setUi((u) => (u.flash === flash ? { ...u, flash: null } : u)), 750);
    return () => clearTimeout(t);
  }, [flash]);

  /* ─── un menu ou le tiroir se ferme au premier appui ailleurs ─── */
  useEffect(() => {
    const f = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return;
      setUi((u) => {
        let n = u;
        if (u.menu && !t.closest(".ed-menu, .ed-ancre, .ed-cf-menu-bt")) n = { ...n, menu: null };
        if (u.rangee && !t.closest(".ed-rangee-gab, .ed-pastille")) n = { ...n, rangee: null, apercuGab: null };
        return n;
      });
    };
    window.addEventListener("pointerdown", f, true);
    return () => window.removeEventListener("pointerdown", f, true);
  }, []);

  /* ─── le glisser, en événements pointeur ─── */
  const clicSupprime = () => supprime.current;
  const annulerGlisser = () => {
    const g = G.current;
    if (!g) return;
    g.nettoyer();
    G.current = null;
    setUi((u) => (u.ressortId ? { ...u, ressortId: null } : u));
    if (g.actif) envoyer({ type: "abandonnerGlisser" });
  };
  const commencerAppui = (e: React.PointerEvent, source: SourceGlisser) => {
    const ed = etatRef.current;
    if (!ed || e.button !== 0 || estLectureSeule(ed) || ed.recadrage || ed.texte) return;
    G.current?.nettoyer();
    let ok = false;
    const g: Glisse = { source, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, actif: false, cle: null, ressort: null, nettoyer: () => {} };
    let alt = false;
    const bouger = (ev: { clientX: number; clientY: number; altKey: boolean }) => {
      g.x = ev.clientX; g.y = ev.clientY;
      const altChange = ev.altKey !== alt;
      alt = ev.altKey;
      if (!g.actif) {
        if (Math.hypot(ev.clientX - g.x0, ev.clientY - g.y0) < 8) return; /* un clic n'est jamais un glisser */
        g.actif = true;
        setPos({ x: ev.clientX, y: ev.clientY });
        setUi((u) => ({ ...u, rangee: null, apercuGab: null, menu: null, survolSel: null }));
        envoyer({ type: "commencerGlisser", source });
      }
      const pile = document.querySelector<HTMLElement>(".ed-pile");
      if (pile) pile.style.transform = posPile(ev.clientX, ev.clientY);
      const cur = etatRef.current;
      if (!cur) return;
      const cible = cibleSous(ev.clientX, ev.clientY, source, cur, alt);
      const cle = cible ? JSON.stringify(cible) : null;
      if (cle === g.cle && !altChange) return;
      g.cle = cle;
      if (g.ressort) clearTimeout(g.ressort);
      g.ressort = null;
      setUi((u) => (u.ressortId ? { ...u, ressortId: null } : u));
      ok = !!cible && !apercuDepot(cur, cible, source).refus;
      if (cible && cible.type === "vignette" && source.type !== "planche" && cible.plancheId !== cur.plancheCourante) {
        const pid = cible.plancheId;
        setUi((u) => ({ ...u, ressortId: pid }));
        g.ressort = setTimeout(() => { /* ressort 600 ms : on navigue pour viser un cadre */
          if (G.current !== g || g.cle !== cle) return;
          g.cle = null;
          setUi((u) => ({ ...u, ressortId: null }));
          envoyer({ type: "naviguer", plancheId: pid });
          envoyer({ type: "survoler", cible: null });
        }, 600);
      }
      envoyer({ type: "survoler", cible });
    };
    const lacher = () => {
      g.nettoyer();
      G.current = null;
      setUi((u) => (u.ressortId ? { ...u, ressortId: null } : u));
      if (!g.actif) return;
      supprime.current = true;
      setTimeout(() => { supprime.current = false; }, 0);
      const cible = g.cle ? (JSON.parse(g.cle) as CibleDepot) : null;
      envoyer({ type: "lacher" });
      if (ok && cible) flasher(cible);
    };
    /* ⌥ pressé ou relâché sans bouger : la cible change (pose en libre, lot 4) */
    const touche = (ev: KeyboardEvent) => { if (ev.key === "Alt" && g.actif) { ev.preventDefault(); bouger({ clientX: g.x, clientY: g.y, altKey: ev.type === "keydown" }); } };
    g.nettoyer = () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("keyup", touche);
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", lacher);
      window.removeEventListener("pointercancel", annulerGlisser);
      if (g.ressort) clearTimeout(g.ressort);
    };
    G.current = g;
    window.addEventListener("keydown", touche);
    window.addEventListener("keyup", touche);
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", lacher);
    window.addEventListener("pointercancel", annulerGlisser);
  };
  useEffect(() => () => G.current?.nettoyer(), []);

  /* ─── le clavier : l'écran d'abord, puis le module (geste « touche ») ─── */
  const clavier = (e: KeyboardEvent) => {
    const ed = etatRef.current;
    if (!ed || ui.exportOuvert) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
      if (e.key === "Escape") t.blur();
      return; /* pendant la saisie, aucun raccourci de l'éditeur */
    }
    /* 10/11 : L montre ou cache la lecture dessinée (chaleur, visages, zone), partout */
    if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); majUi({ lecture: !ui.lecture }); return; }
    /* 12/11 : O montre ou cache la grille d'artiste (tiers, nombre d'or, diagonales), comme l'« overlay » des logiciels de retouche.
       Les lettres prises : planche M R X P T Z (⌘ Z) ; tri X P F R U C Z N D G T 0 à 3 ; L la lecture. O est libre dans les trois. */
    if ((e.key === "o" || e.key === "O") && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); basculerGrille(ui, majUi); return; }
    /* le tri d'abord, quand la bande des photos a la main ou en plein écran (P, X, flèches, Entrée, N…) */
    if (clavierConfrontation({ etat: ed, ui, majUi, envoyer, lectureSeule: estLectureSeule(ed) }, e)) return;
    if (ui.confronter) return;
    if (clavierTri({ etat: ed, ui, majUi, envoyer, lectureSeule: estLectureSeule(ed) }, e)) return;
    if (ui.loupe) {
      if (e.key === "Escape" || e.key === " ") { e.preventDefault(); majUi({ loupe: null }); }
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const v = visibles(ed);
        const j = v.indexOf(ui.loupe) + (e.key === "ArrowRight" ? 1 : -1);
        if (v[j]) majUi({ loupe: v[j] });
      }
      return;
    }
    if (e.key === "Escape" && G.current) { annulerGlisser(); return; }
    if (e.key === "Escape" && (ui.rangee || ui.menu)) { majUi({ rangee: null, menu: null, apercuGab: null }); return; }
    const dansGrille = t && t.closest && t.closest(".ed-grille, .ed-cf-piste");
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && dansGrille && !e.altKey) return;
    if (e.key === "Enter" && t && t.tagName === "BUTTON") return;
    const k = e.key;
    /* lot 4 : ⌘] ⌘[ (et ⌘↑ ⌘↓) rangent le cadre actif dans les calques */
    const calque = (e.metaKey || e.ctrlKey) && !!ed.cadreActif && ["]", "[", "ArrowUp", "ArrowDown"].includes(k);
    if (!calque && !["Escape", "ArrowLeft", "ArrowRight", "Backspace", "Delete", "Enter", "r", "R", "x", "X", "p", "P", "t", "T", "m", "M", "z", "Z"].includes(k)) return;
    if ((k === "z" || k === "Z") && !(e.metaKey || e.ctrlKey)) return;
    if ((e.metaKey || e.ctrlKey) && !(k === "z" || k === "Z") && !calque) return;
    e.preventDefault();
    const g: Geste = { type: "touche", cle: k, shift: e.shiftKey, meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey };
    if ((k === "r" || k === "R") && pointeur.current) {
      const el = document.elementFromPoint(pointeur.current.x, pointeur.current.y);
      const c = el?.closest?.(".ed-planche [data-cote]");
      if (c) {
        const [plancheId, cible] = (c.getAttribute("data-cote") ?? "").split("|");
        if (cible === "gauche" || cible === "droite" || cible === "double") g.survol = { plancheId, cible };
      }
    }
    envoyer(g);
  };
  useEffect(() => { clavierRef.current = clavier; });
  useEffect(() => {
    const f = (e: KeyboardEvent) => clavierRef.current(e);
    const p = (e: PointerEvent) => { pointeur.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("keydown", f);
    window.addEventListener("pointermove", p, { passive: true });
    return () => { window.removeEventListener("keydown", f); window.removeEventListener("pointermove", p); };
  }, []);

  if (!etat) {
    return <div className="ed-racine ed-racine--attente" aria-busy="true"><span className="ed-sous">Ouverture du magazine</span></div>;
  }

  const ro = estLectureSeule(etat);
  const ctx: Ctx = {
    etat, envoyer, envoyerAvec, adresses, ui, majUi, lectureSeule: ro, commencerAppui, clicSupprime, flasher, gesteAvecAnnuler, imp,
  };
  /* le tri plein écran vit dans la bande des photos : elle doit être ouverte */
  if (ui.grand && !etat.panneau.ouvert) envoyer({ type: "panneau", ouvert: true });
  const d = etat.glisser;
  const annonce = etat.message ? etat.message.texte : etat.derniere ? etat.derniere.libelle : "";
  const planche = etat.magazine.planches.find((p) => p.id === etat.plancheCourante) ?? etat.magazine.planches[0];
  /* lot B : la couverture à plat a sa scène, sa bande et son tiroir */
  const surCouverture = etat.plancheCourante === ID_COUVERTURE;

  return (
    <CtxEd.Provider value={ctx}>
      <div className={`ed-racine${d ? " ed-racine--glisse" : ""}${ui.grand ? " ed-racine--grand" : ""}${etat.magazine.style ? " ed-racine--style" : ""}`}
        style={etat.magazine.style ? (variablesStyle(etat.magazine.style) as React.CSSProperties) : undefined}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (etat.recadrage && !t.closest(".ed-cadre--recadrage, .ed-recadre")) envoyer({ type: "fermerRecadrage" });
          if (etat.texte && !t.closest(".ed-txt--edit")) fermerTexteDom(envoyer);
        }}>
        <Barre projet={projet} sv={sv} reessayer={sauve.reessayer} lien={retour} selecteur={selecteur} onExporter={() => { if (etat.recadrage) envoyer({ type: "fermerRecadrage" }); majUi({ exportOuvert: true }); }} />
        {ui.style ? <StylePanneau /> : null}
        <Bandeaux projet={projet} sv={sv} collecteOuverte={collecteOuverte} prendreSaVersion={prendreSaVersion} garderLaMienne={garderLaMienne} />
        <div className={`ed-corps${ui.grand ? " ed-corps--grand" : ""}${ui.confronter && !ui.grand ? " ed-corps--conf" : ""}`}>
          <Panneau />
          <div className="ed-centre" onPointerDown={() => { if (ui.zone !== "planche") majUi({ zone: "planche" }); }}>
            {surCouverture ? <SceneCouverture /> : <Scene />}
            {surCouverture ? <BandeCouverture /> : <Bande />}
            <CheminDeFer />
            {ui.rangee && !d && !ro ? (surCouverture ? <RangeeCouverture /> : planche ? <Rangee key={`${planche.id}|${ui.rangee}`} pl={planche} cible={ui.rangee} /> : null) : null}
            {ui.grand ? null : <Toast />}
          </div>
          {ui.confronter && !ui.grand ? <Confrontation /> : null}
        </div>
        <div className="ed-sr" aria-live="polite">{annonce}</div>
        {d ? <Pile x={pos.x} y={pos.y} /> : null}
        {ui.loupe ? <Loupe id={ui.loupe} /> : null}
        {ui.exportOuvert ? <ExportFeuille catalogue={catalogue} source={source} projet={projet} suite={suite} onFermer={() => majUi({ exportOuvert: false })} onExporte={memoire.exporte} memoire={memoire} /> : null}
      </div>
    </CtxEd.Provider>
  );
}
