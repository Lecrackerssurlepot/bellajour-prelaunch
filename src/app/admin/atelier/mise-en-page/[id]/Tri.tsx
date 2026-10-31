"use client";

import { useEffect, useRef, useState } from "react";
import { bilanTri, listeTri, marqueDe, type VueTri } from "@/lib/mise-en-page/editeur";
import { cls, useEd } from "./contexte";
import { grandeDe, precharger, vignetteDe } from "./images";

/* L'écran de tri (lot 2) : une photo en grand, on décide au clavier OU aux boutons.
   P garder (pré-choisie), X écarter, 0 rendre « à trier », flèches pour passer, Échap pour fermer, Cmd+Z annule.
   Dans la vue « À trier », une photo marquée sort de la liste : la suivante prend sa place. */

const VUES: [VueTri, string][] = [["a_trier", "À trier"], ["choisies", "Pré-choisies"], ["ecartees", "Écartées"], ["toutes", "Toutes"]];
const VOISINES = 7;

export default function Tri() {
  const { etat, envoyer, adresses, majUi, lectureSeule: ro } = useEd();
  const [vue, setVue] = useState<VueTri>("a_trier");
  const [courante, setCourante] = useState<string | null>(null);
  const liste = listeTri(etat, vue);
  const b = bilanTri(etat);
  /* La photo affichée : celle qu'on regarde, sinon la première de la vue. */
  const trouvee = courante ? liste.indexOf(courante) : -1;
  const i = trouvee >= 0 ? trouvee : liste.length ? 0 : -1;
  const id = i >= 0 ? liste[i] : null;
  const marque = id ? marqueDe(etat.magazine, id) : null;
  const photo = id ? etat.catalogue.get(id) : undefined;

  const aller = (j: number) => { if (liste[j]) setCourante(liste[j]); };
  const marquer = (m: "choisie" | "ecartee" | null) => {
    if (!id || ro) return;
    if (vue === "toutes" || vue === (m === "choisie" ? "choisies" : m === "ecartee" ? "ecartees" : "a_trier")) {
      /* la photo reste dans la vue : on passe à la suivante */
      envoyer({ type: "marquer", ids: [id], marque: m });
      aller(i + 1);
    } else {
      envoyer({ type: "marquer", ids: [id], marque: m });
      setCourante(liste[i + 1] ?? liste[i - 1] ?? null);
    }
  };

  /* Les touches du tri passent AVANT celles de l'éditeur (qui se tait pendant le tri). */
  const clavier = useRef<(e: KeyboardEvent) => void>(() => {});
  const surTouche = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { if (e.key === "Escape") t.blur(); return; }
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === "z") { e.preventDefault(); envoyer({ type: e.shiftKey ? "retablir" : "annuler" }); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (k === "escape") { e.preventDefault(); majUi({ trier: false }); }
    else if (k === "p") { e.preventDefault(); marquer("choisie"); }
    else if (k === "x") { e.preventDefault(); marquer("ecartee"); }
    else if (k === "0" || k === "backspace") { e.preventDefault(); marquer(null); }
    else if (k === "arrowright" || k === " ") { e.preventDefault(); aller(i + 1); }
    else if (k === "arrowleft") { e.preventDefault(); aller(i - 1); }
  };
  useEffect(() => { clavier.current = surTouche; });
  useEffect(() => {
    const f = (e: KeyboardEvent) => clavier.current(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  /* Les grandes images des suivantes, en avance. */
  useEffect(() => {
    precharger(liste.slice(i, i + 6).map((x) => grandeDe(adresses.get(x))), 1e9);
  });

  const voisines = liste.slice(Math.max(0, i - VOISINES), i + VOISINES + 1);
  const maxPart = Math.max(...b.parPersonne.map((x) => x.part), 0.0001);

  return (
    <div className="ed-tri" role="dialog" aria-modal="true" aria-label="Trier les photos">
      <div className="ed-tri-tete">
        <h2>Trier</h2>
        <span className="ed-seg" role="group" aria-label="Vue">
          {VUES.map(([v, l]) => {
            const n = v === "a_trier" ? b.aTrier : v === "choisies" ? b.choisies : v === "ecartees" ? b.ecartees : b.total;
            return <button key={v} type="button" aria-pressed={vue === v} onClick={() => { setVue(v); setCourante(null); }}>{l} <b>{n}</b></button>;
          })}
        </span>
        <span className="ed-esp" />
        <button type="button" className="ed-ico" aria-label="Fermer le tri (Échap)" onClick={() => majUi({ trier: false })}>×</button>
      </div>
      <div className="ed-tri-corps">
        <div className="ed-tri-scene">
          {id && photo ? (
            <>
              <div className="ed-tri-photo">
                <img key={id} src={grandeDe(adresses.get(id)) ?? undefined} alt={photo.nom} decoding="async" draggable={false} />
                {marque ? <span className={cls("ed-tri-marque", `ed-tri-marque--${marque}`)}>{marque === "choisie" ? "Pré-choisie" : "Écartée"}</span> : null}
                <button type="button" className="ed-tri-fleche ed-tri-fleche--g" aria-label="Précédente (←)" disabled={i <= 0} onClick={() => aller(i - 1)}>‹</button>
                <button type="button" className="ed-tri-fleche ed-tri-fleche--d" aria-label="Suivante (→)" disabled={i >= liste.length - 1} onClick={() => aller(i + 1)}>›</button>
              </div>
              <div className="ed-tri-info">{photo.nom}{photo.personne ? ` · ${photo.personne}` : ""} · {i + 1} / {liste.length}</div>
              {ro ? null : (
                <div className="ed-tri-gestes">
                  <button type="button" className={cls("ed-tri-bt ed-tri-bt--ecarter", marque === "ecartee" && "ed-tri-bt--fait")} onClick={() => marquer("ecartee")}>Écarter<kbd>X</kbd></button>
                  <button type="button" className="ed-tri-bt" disabled={!marque} onClick={() => marquer(null)}>À trier<kbd>0</kbd></button>
                  <button type="button" className={cls("ed-tri-bt ed-tri-bt--garder", marque === "choisie" && "ed-tri-bt--fait")} onClick={() => marquer("choisie")}>Garder<kbd>P</kbd></button>
                </div>
              )}
              <div className="ed-tri-voisines">
                {voisines.map((x) => {
                  const mq = marqueDe(etat.magazine, x);
                  return (
                    <button key={x} type="button" className={cls("ed-tri-v", x === id && "ed-tri-v--ici", mq && `ed-tri-v--${mq}`)} aria-label={etat.catalogue.get(x)?.nom} onClick={() => setCourante(x)}>
                      <img src={vignetteDe(adresses.get(x)) ?? undefined} alt="" decoding="async" draggable={false} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="ed-tri-vide">{vue === "a_trier" ? "Tout est trié" : "Aucune photo"}</div>
          )}
        </div>
        <aside className="ed-tri-cote" aria-label="Où on en est">
          <section>
            <h3>Objectif</h3>
            <div className="ed-tri-jauge">
              <b>{b.choisies}</b> pré-choisie{b.choisies > 1 ? "s" : ""}
              {b.besoin !== null ? <span> · il en faut ≈ {b.besoin}</span> : null}
            </div>
            {b.besoin ? <div className="ed-tri-barre"><span style={{ width: `${Math.min(100, (b.choisies / b.besoin) * 100)}%` }} /></div> : null}
            <div className="ed-tri-ligne">{b.pages} pages {b.pagesSignees ? "signées" : "dans le magazine"}</div>
            <label className="ed-tri-ligne">
              Photos par page
              <input type="number" min={1} max={12} step={1} placeholder="à fixer" disabled={ro} value={b.photosParPage ?? ""}
                onChange={(e) => { const v = e.currentTarget.value; envoyer({ type: "reglerTri", photosParPage: v === "" ? null : Number(v) }); }} />
            </label>
          </section>
          <section>
            <h3>Par personne</h3>
            {b.parPersonne.map((x) => (
              <div key={x.personne} className="ed-tri-pers">
                <div><span>{x.personne}</span><b>{x.choisies} / {x.total}</b><em>{b.choisies ? `${Math.round(x.part * 100)} %` : ""}</em></div>
                <div className="ed-tri-barre"><span style={{ width: `${(x.part / maxPart) * 100}%` }} /></div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
