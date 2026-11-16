"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { couleursPosees, idsPlanche, libelleFond, libelleTexte, nomCouleur, propositionsApres, type Geste, type PoseCouleur } from "@/lib/mise-en-page/editeur";
import { hexDeCouleur, type CouleurLibre } from "@/lib/mise-en-page/couleursLibres";
import { idsCouverture, ID_COUVERTURE } from "@/lib/mise-en-page/couverture";
import { ROLES_COULEUR, estHex, normaliserHex, type RoleCouleur } from "@/lib/mise-en-page/nuancier";
import { NOM_ROLE } from "@/lib/mise-en-page/style";
import type { Magazine } from "@/lib/mise-en-page/magazine";
import { cls, useEd } from "./contexte";
import { couleursDesPhotos, useCombos } from "./couleursEcran";
import { cibleCouleurSous, type CibleCouleur } from "./glisser";

/**
 * La PALETTE (T-209, second temps, 16/11) : les couleurs À CÔTÉ du magazine. On GLISSE une pastille : lâchée sur une page elle la
 * remplit en uni, lâchée sur un texte elle le colore ; la pastille barrée retire (le fond d'une page, la couleur d'un texte). Juste
 * après, la palette PROPOSE ce qui va avec (`propositionsApres`, pur) ; un clic sur une proposition l'applique. Un simple clic sur
 * une pastille ne fait rien. Le glisser est en événements pointeur, comme celui des photos ; Échap l'annule ; l'aperçu est la page
 * qui se remplit, le texte qui change. Sur la couverture : les textes seulement (elle n'a pas de fond libre). Écran seulement.
 */

type Pipette = new () => { open: () => Promise<{ sRGBHex: string }> };
const pipette = (): Pipette | null => (typeof window !== "undefined" ? ((window as unknown as { EyeDropper?: Pipette }).EyeDropper ?? null) : null);

type Glisse = { couleur: CouleurLibre | null; x: number; y: number; texte: string | null };
type Suite = { pose: PoseCouleur; plancheId: string; avant: Magazine; apres: Magazine | null };

const BARRE = "Retirer";

export function Palette() {
  const { etat, gesteAvecAnnuler, lectureSeule: ro } = useEd();
  const style = etat.magazine.style ?? null;
  const { combos, applique } = useCombos(etat);
  const surCouverture = etat.plancheCourante === ID_COUVERTURE;
  const planche = etat.magazine.planches.find((p) => p.id === etat.plancheCourante);
  const photos = surCouverture ? idsCouverture(etat.magazine.couverture) : planche ? idsPlanche(planche) : [];
  const roles: RoleCouleur[] = applique ? [...applique.roles, ...ROLES_COULEUR.filter((r) => !applique.roles.includes(r))] : [...ROLES_COULEUR];
  const depuisPhotos = couleursDesPhotos(etat, photos, 8);
  const [libres, setLibres] = useState<string[]>([]);
  const posees = couleursPosees(etat.magazine).filter((c): c is `#${string}` => estHex(c) && !depuisPhotos.includes(c) && !libres.includes(c)).slice(0, 6);
  const P = pipette();

  /* ─── le glisser ─── */
  const [glisse, setGlisse] = useState<Glisse | null>(null);
  const fin = useRef<(() => void) | null>(null);
  useEffect(() => () => fin.current?.(), []);
  const etatRef = useRef(etat);
  useEffect(() => { etatRef.current = etat; });

  /* ─── ce qui va avec, après une pose ─── */
  const [suite, setSuite] = useState<Suite | null>(null);
  if (suite) {
    if (suite.plancheId !== etat.plancheCourante) setSuite(null);
    else if (!suite.apres && etat.magazine !== suite.avant) setSuite({ ...suite, apres: etat.magazine });
    else if (suite.apres && etat.magazine !== suite.apres) setSuite(null);
  }
  const propositions = useMemo(() => (suite ? propositionsApres(etat.magazine, suite.pose, combos) : []), [suite, etat.magazine, combos]);

  const poser = (couleur: CouleurLibre | null, c: CibleCouleur) => {
    const ed = etatRef.current;
    if (c.type === "fond") {
      const g: Geste = { type: "colorerFond", plancheId: c.plancheId, cible: c.cote, couleur };
      gesteAvecAnnuler(g, libelleFond(couleur));
      setSuite(couleur ? { pose: { type: "fond", plancheId: c.plancheId, cote: c.cote, couleur }, plancheId: c.plancheId, avant: ed.magazine, apres: null } : null);
    } else {
      const g: Geste = { type: "colorerTexte", ref: c.ref, couleur };
      gesteAvecAnnuler(g, libelleTexte(couleur));
      setSuite(couleur ? { pose: { type: "texte", ref: c.ref, couleur }, plancheId: c.ref.plancheId, avant: ed.magazine, apres: null } : null);
    }
  };

  const demarrer = (e: React.PointerEvent, couleur: CouleurLibre | null) => {
    const ed = etatRef.current;
    if (ro || e.button !== 0 || ed.recadrage) return;
    e.preventDefault();
    fin.current?.();
    const x0 = e.clientX, y0 = e.clientY;
    const hex = couleur ? hexDeCouleur(couleur, ed.magazine.style ?? null) : null;
    let actif = false;
    let cible: CibleCouleur | null = null;
    let cle: string | null = null;
    let apercu: HTMLElement | null = null;
    let teinte: HTMLElement | null = null;
    const effacer = () => {
      apercu?.remove(); apercu = null;
      if (teinte) { teinte.style.removeProperty("color"); teinte.classList.remove("ed-txt--cible"); teinte = null; }
    };
    const montrer = (c: CibleCouleur | null) => {
      effacer();
      if (!c) return;
      if (c.type === "texte") {
        teinte = c.el;
        c.el.classList.add("ed-txt--cible");
        if (hex) c.el.style.setProperty("color", hex, "important");
        return;
      }
      /* la page qui va se remplir : le même objet que le fond réel (sous les aplats, les photos et les textes) */
      const a = document.createElement("div");
      a.className = cls("ed-fond", "ed-fond--apercu", !hex && "ed-fond--retire");
      a.setAttribute("aria-hidden", "true");
      a.style.cssText = `left:${c.cote === "gauche" ? 0 : 50}%;top:0;width:50%;height:100%;${hex ? `background:${hex};` : ""}`;
      c.planche.appendChild(a);
      apercu = a;
    };
    const mot = (c: CibleCouleur | null, surCouv: boolean): string | null => {
      if (!c) return surCouv ? "Textes seulement" : null;
      const nom = couleur ? nomCouleur(couleur) : null;
      if (c.type === "texte") return nom ? `Texte · ${nom}` : "Couleur du gabarit";
      return nom ? `Fond · ${nom}` : "Sans fond";
    };
    const bouger = (ev: PointerEvent) => {
      if (!actif) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; /* un clic n'est jamais un glisser */
        actif = true;
        document.body.style.cursor = "grabbing";
        setSuite(null);
      }
      const c = cibleCouleurSous(ev.clientX, ev.clientY);
      const k = c ? (c.type === "texte" ? `t${c.ref.plancheId}|${c.ref.cible}|${c.ref.index}` : `f${c.plancheId}|${c.cote}`) : null;
      if (k !== cle) { cle = k; cible = c; montrer(c); }
      const surCouv = !c && !!document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".ed-couv");
      setGlisse({ couleur, x: ev.clientX, y: ev.clientY, texte: mot(c, surCouv) });
    };
    const fermer = () => {
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", lacher);
      window.removeEventListener("pointercancel", annuler);
      window.removeEventListener("keydown", touche, true);
      document.body.style.removeProperty("cursor");
      effacer();
      setGlisse(null);
      fin.current = null;
    };
    const lacher = () => {
      const c = cible;
      const etaitActif = actif;
      fermer();
      if (etaitActif && c) poser(couleur, c);
    };
    const annuler = () => fermer();
    const touche = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); fermer(); } };
    fin.current = fermer;
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", lacher);
    window.addEventListener("pointercancel", annuler);
    window.addEventListener("keydown", touche, true);
  };

  /* ─── le choix libre : la roue du navigateur (la couleur rejoint la palette, on la glisse ensuite) ─── */
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);
  const ajouter = (hex: string) => setLibres((l) => [hex, ...l.filter((x) => x !== hex)].slice(0, 6));
  const libre = (v: string) => {
    const hex = normaliserHex(v);
    if (!hex) return;
    setBrouillon(hex);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => { ajouter(hex); setBrouillon(null); }, 400);
  };
  const prendre = async () => {
    if (!P) return;
    try {
      const r = await new P().open();
      const hex = normaliserHex(r.sRGBHex);
      if (hex) ajouter(hex);
    } catch { /* Échap : rien */ }
  };

  const nomDe = (c: CouleurLibre): string => nomCouleur(c);
  const point = (c: CouleurLibre) => (
    <button key={c} type="button" className="ed-pal-pt" disabled={ro} style={{ background: hexDeCouleur(c, style) }} aria-label={`Glisser ${nomDe(c)}`}
      title={`${nomDe(c)} · glisser sur une page ou un texte`} onPointerDown={(e) => demarrer(e, c)} onClick={(e) => e.preventDefault()} />
  );
  const libresVus = [...libres, ...posees];

  return (
    <aside className="ed-pal" aria-label="Palette" onPointerDown={(e) => e.stopPropagation()}>
      {propositions.length ? (
        <section className="ed-pal-prop" aria-label="Propositions">
          <b className="ed-pal-t">Propose</b>
          {propositions.map((p, i) => (
            <button key={`${p.cible}${i}`} type="button" className="ed-pal-p" disabled={ro} title={`${p.libelle} · ${p.nom} · ${p.raison}`} aria-label={`${p.libelle} : ${p.nom}`}
              onClick={() => {
                gesteAvecAnnuler(p.geste as Geste, p.geste.type === "colorerFond" ? libelleFond(p.couleur) : libelleTexte(p.couleur));
                /* un fond proposé pour un texte est un fond posé : ses propres propositions suivent (le texte des autres cadres de la page) ;
                   les autres propositions closent la suite (jamais d'aller-retour) */
                const g = p.geste;
                setSuite(p.cible === "fond" && g.type === "colorerFond"
                  ? { pose: { type: "fond", plancheId: g.plancheId, cote: g.cible, couleur: g.couleur }, plancheId: g.plancheId, avant: etat.magazine, apres: null }
                  : null);
              }}>
              <i style={{ background: hexDeCouleur(p.couleur, style) }} aria-hidden="true" />
              <span><small>{p.libelle}</small>{p.nom}</span>
            </button>
          ))}
        </section>
      ) : null}
      <b className="ed-pal-t">{applique ? applique.nom : "Nuancier"}</b>
      <span className="ed-pal-ligne">{roles.map((r) => (
        <button key={r} type="button" className="ed-pal-pt" disabled={ro} style={{ background: hexDeCouleur(r, style) }} aria-label={`Glisser ${NOM_ROLE[r]}`}
          title={`${NOM_ROLE[r]} · glisser sur une page ou un texte`} onPointerDown={(e) => demarrer(e, r)} onClick={(e) => e.preventDefault()} />
      ))}</span>
      {depuisPhotos.length ? (
        <>
          <b className="ed-pal-t">Photos</b>
          <span className="ed-pal-ligne">{depuisPhotos.map((c) => point(c as CouleurLibre))}</span>
        </>
      ) : null}
      <b className="ed-pal-t">Libres</b>
      <span className="ed-pal-ligne">
        {libresVus.map((c) => point(c as CouleurLibre))}
        {P ? (
          <button type="button" className="ed-pal-outil" disabled={ro} title="Pipette" aria-label="Pipette" onClick={() => void prendre()}>
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 3 4 4-2 2-4-4 2-2ZM11 5l-7 7v4h4l7-7" /></svg>
          </button>
        ) : null}
        <label className="ed-pal-outil ed-pal-libre" title="Couleur libre">
          <span style={{ background: brouillon ?? "#ffffff" }} aria-hidden="true" />
          <input type="color" value={brouillon ?? "#ffffff"} disabled={ro} aria-label="Couleur libre" onChange={(e) => libre(e.currentTarget.value)} />
        </label>
      </span>
      <span className="ed-pal-ligne ed-pal-retire">
        <button type="button" className="ed-pal-pt ed-pal-pt--barre" disabled={ro} aria-label="Glisser pour retirer" title="Glisser sur une page : sans fond. Sur un texte : couleur du gabarit"
          onPointerDown={(e) => demarrer(e, null)} onClick={(e) => e.preventDefault()} />
        <small>{BARRE}</small>
      </span>
      {glisse && glisse.texte ? (
        <span className="ed-pal-bulle" style={{ left: glisse.x + 14, top: glisse.y + 14 }}>
          <i style={glisse.couleur ? { background: hexDeCouleur(glisse.couleur, style) } : undefined} aria-hidden="true" />{glisse.texte}
        </span>
      ) : null}
    </aside>
  );
}
