"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  appliquer, apercuDepot, creerEtat, lectureSeule as estLectureSeule, visibles,
  type CibleDepot, type EtatEditeur, type Geste, type SourceGlisser,
} from "@/lib/mise-en-page/editeur";
import type { CatalogueCharge, SourceCatalogue } from "./chargerCatalogue";
import { CtxEd, UI_NEUVE, fermerTexteDom, type Adresse, type Ctx, type Projet, type Ui } from "./contexte";
import { cibleSous, type Glisse } from "./glisser";
import { Bandeaux, Barre } from "./Barre";
import { Bande, CheminDeFer } from "./Bas";
import { ExportFeuille } from "./ExportFeuille";
import { Rangee } from "./Gabarits";
import { Loupe, Pile, posPile } from "./Pile";
import Panneau from "./Panneau";
import { useSauvegarde, type CleSauvegarde } from "./sauvegardeClient";
import Scene from "./Scene";

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
};

export default function EditeurMagazine({ catalogue, source, cle, projet, archive, collecteOuverte, retour, suite, selecteur }: Props) {
  const [etat, setEtat] = useState<EtatEditeur | null>(null);
  const [ui, setUi] = useState<Ui>(UI_NEUVE);
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

  const majUi = (p: Partial<Ui>) => setUi((u) => ({ ...u, ...p }));
  const envoyer = (g: Geste) => setEtat((e) => (e ? appliquer(e, g) : e));
  const envoyerAvec = (f: (e: EtatEditeur) => Geste | null) => setEtat((e) => {
    if (!e) return e;
    const g = f(e);
    return g ? appliquer(e, g) : e;
  });
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
  const { nom, source: sourceProjet, nbPagesCible } = projet;
  useEffect(() => {
    let annule = false;
    void ouvrir().then((magazine) => {
      if (annule) return;
      let e = creerEtat({ magazine, catalogue: catalogue.photos, projet: { nom, source: sourceProjet, nbPagesCible } });
      if (archive) { figer("archive"); e = appliquer(e, { type: "ouvrirLectureSeule", raison: "archive" }); }
      setEtat((prev) => prev ?? e);
    });
    return () => { annule = true; };
  }, [ouvrir, figer, catalogue, nom, sourceProjet, nbPagesCible, archive]);

  useEffect(() => { etatRef.current = etat; });

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
    const bouger = (ev: PointerEvent) => {
      g.x = ev.clientX; g.y = ev.clientY;
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
      const cible = cibleSous(ev.clientX, ev.clientY, source, cur);
      const cle = cible ? JSON.stringify(cible) : null;
      if (cle === g.cle) return;
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
    g.nettoyer = () => {
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", lacher);
      window.removeEventListener("pointercancel", annulerGlisser);
      if (g.ressort) clearTimeout(g.ressort);
    };
    G.current = g;
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
    if (!["Escape", "ArrowLeft", "ArrowRight", "Backspace", "Delete", "Enter", "r", "R", "x", "X", "p", "P", "z", "Z"].includes(k)) return;
    if ((k === "z" || k === "Z") && !(e.metaKey || e.ctrlKey)) return;
    if ((e.metaKey || e.ctrlKey) && !(k === "z" || k === "Z")) return;
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
    etat, envoyer, envoyerAvec, adresses, ui, majUi, lectureSeule: ro, commencerAppui, clicSupprime, flasher, gesteAvecAnnuler,
  };
  const d = etat.glisser;
  const annonce = etat.message ? etat.message.texte : etat.derniere ? etat.derniere.libelle : "";
  const planche = etat.magazine.planches.find((p) => p.id === etat.plancheCourante) ?? etat.magazine.planches[0];

  return (
    <CtxEd.Provider value={ctx}>
      <div className={`ed-racine${d ? " ed-racine--glisse" : ""}`}
        onPointerDown={(e) => {
          const t = e.target as HTMLElement;
          if (etat.recadrage && !t.closest(".ed-cadre--recadrage, .ed-recadre")) envoyer({ type: "fermerRecadrage" });
          if (etat.texte && !t.closest(".ed-txt--edit")) fermerTexteDom(envoyer);
        }}>
        <Barre projet={projet} sv={sv} reessayer={sauve.reessayer} lien={retour} selecteur={selecteur} onExporter={() => { if (etat.recadrage) envoyer({ type: "fermerRecadrage" }); majUi({ exportOuvert: true }); }} />
        <Bandeaux projet={projet} sv={sv} collecteOuverte={collecteOuverte} prendreSaVersion={prendreSaVersion} garderLaMienne={garderLaMienne} />
        <div className="ed-corps">
          <Panneau />
          <div className="ed-centre">
            <Scene />
            <Bande />
            <CheminDeFer />
            {ui.rangee && !d && !ro && planche ? <Rangee pl={planche} cible={ui.rangee} /> : null}
            {etat.message ? (
              <div className="ed-toast" role="status">
                {etat.message.texte}
                {etat.message.action ? (
                  <button type="button" className="ed-bt" onClick={() => {
                    const a = etat.message?.action;
                    if (!a) return;
                    if (a.id) { majUi({ defilerVers: a.id }); envoyer({ type: "voirRetiree", id: a.id }); } else envoyer({ type: "annuler" });
                  }}>{etat.message.action.libelle}</button>
                ) : null}
                <button type="button" className="ed-ico" aria-label="Fermer le message" onClick={() => envoyer({ type: "fermerMessage" })}>×</button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="ed-sr" aria-live="polite">{annonce}</div>
        {d ? <Pile x={pos.x} y={pos.y} /> : null}
        {ui.loupe ? <Loupe id={ui.loupe} /> : null}
        {ui.exportOuvert ? <ExportFeuille catalogue={catalogue} source={source} projet={projet} suite={suite} onFermer={() => majUi({ exportOuvert: false })} /> : null}
      </div>
    </CtxEd.Provider>
  );
}
