"use client";

import { bilanTri, visibles, type Filtres } from "@/lib/mise-en-page/editeur";
import { cls, useEd } from "./contexte";

/* Les petits morceaux du tri partagés par la bande étroite, la bande agrandie et la visionneuse :
   les onglets de marque, « Non posées », la jauge, les boutons de tête, les bulles (raccourcis, objectif). */

export const ETOILE = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.2-4 5.7-.7z"/></svg>';
export const CROIX = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>';

const ONGLETS: [Filtres["marque"], string][] = [["toutes", "Toutes"], ["choisies", "Gardées"], ["a_trier", "À trier"], ["ecartees", "Écartées"]];

/** Les onglets de marque (avec leurs comptes, « Non posées » compris) et la puce « Non posées ». */
export function OngletsTri() {
  const { etat, envoyer, majUi } = useEd();
  const f = etat.filtres;
  const compte = (v: Filtres["marque"]) => visibles({ ...etat, filtres: { ...f, marque: v } }).length;
  return (
    <div className="ed-tri-ligne">
      <nav className="ed-onglets" aria-label="Tri">
        {ONGLETS.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={f.marque === v} onClick={() => { envoyer({ type: "filtrer", filtres: { marque: v } }); majUi({ focus: null }); }}>
            {l}<b>{compte(v).toLocaleString("fr-FR")}</b>
          </button>
        ))}
      </nav>
      <button type="button" className="ed-puce" aria-pressed={f.masquerUtilisees} title="Seulement les photos pas encore posées"
        onClick={() => { envoyer({ type: "filtrer", filtres: { masquerUtilisees: !f.masquerUtilisees } }); majUi({ focus: null }); }}>
        <span className="ed-puce-lib">Non posées</span>
        <svg viewBox="0 0 12 12" className="ed-puce-pic" aria-hidden="true"><rect x="1" y="2" width="4.5" height="8" rx=".8" fill="none" stroke="currentColor" /><rect x="6.5" y="2" width="4.5" height="8" rx=".8" fill="none" stroke="currentColor" /></svg>
      </button>
    </div>
  );
}

/** La jauge : gardées et posées, sur l'objectif. Un clic ouvre l'objectif et la part de chacun. */
export function JaugeTri() {
  const { etat, ui, majUi } = useEd();
  const b = bilanTri(etat);
  const v = b.visees;
  const pc = (n: number) => (v ? Math.min(100, (n / v) * 100) : 0);
  return (
    <button type="button" className="ed-jauge" aria-label="Objectif" onClick={(e) => { e.stopPropagation(); majUi({ bulle: ui.bulle === "objectif" ? null : "objectif" }); }}>
      <span className="ed-jauge-lig">
        <span><b>{b.choisies.toLocaleString("fr-FR")}</b> gardées · <b>{b.posees.toLocaleString("fr-FR")}</b> posées</span>
        <span>{v ? `sur ${v.toLocaleString("fr-FR")}` : "objectif ?"}</span>
      </span>
      <span className="ed-jauge-fil"><i className="ed-jauge-g" style={{ width: `${pc(b.choisies)}%` }} /><i className="ed-jauge-p" style={{ width: `${pc(b.posees)}%` }} /></span>
    </button>
  );
}

const IcoInfo = <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5" strokeLinecap="round" /><circle cx="10" cy="6.3" r=".9" fill="currentColor" stroke="none" /></svg>;

/** Les boutons de tête : grille / une photo (plein écran seulement), raccourcis, plein écran. */
export function BoutonsTri({ sombre }: { sombre?: boolean }) {
  const { ui, majUi } = useEd();
  const k = sombre ? "ed-vt-ico" : "ed-ico";
  return (
    <>
      {ui.grand ? (
        <span className={cls("ed-duo", sombre && "ed-duo--sombre")} role="group" aria-label="Vue">
          <button type="button" className={k} aria-pressed={ui.vue === "grille"} aria-label="Grille" title="Grille · Espace" onClick={() => majUi({ vue: "grille", loupeTri: false })}>
            <svg viewBox="0 0 20 20" fill="currentColor"><rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" /><rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" /></svg>
          </button>
          <button type="button" className={k} aria-pressed={ui.vue === "une"} aria-label="Une photo" title="Une photo · Espace" onClick={() => majUi({ vue: "une" })}>
            <svg viewBox="0 0 20 20" fill="currentColor"><rect x="2" y="3" width="16" height="14" rx="2" /></svg>
          </button>
        </span>
      ) : null}
      <button type="button" className={k} aria-label="Raccourcis" title="Raccourcis" onClick={(e) => { e.stopPropagation(); majUi({ bulle: ui.bulle === "raccourcis" ? null : "raccourcis" }); }}>{IcoInfo}</button>
      {!sombre ? (
        <button type="button" className={k} aria-label={ui.grand ? "Revenir à la mise en page" : "Trier en plein écran"} title={ui.grand ? "Revenir à la mise en page · T" : "Trier en plein écran · T"}
          onClick={() => majUi(ui.grand ? { grand: false, vue: "grille", loupeTri: false, bulle: null } : { grand: true, vue: "grille", zone: "photos", bulle: null })}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {ui.grand ? <path d="M4 9h5V4M16 11h-5v5M9 9L3 3M11 11l6 6" /> : <path d="M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6" />}
          </svg>
        </button>
      ) : null}
    </>
  );
}

const RACCOURCIS: [string, [string, string][]][] = [
  ["Trier", [["P", "Garder · encore : retirer"], ["X", "Écarter · encore : retirer"], ["0", "Retirer la marque"], ["U", "Prochaine à trier"], ["C", "Comparer la sélection"], ["Z", "Loupe 100 %"]]],
  ["Composer", [["Entrée", "Poser sur la double"], ["N", "Nouvelle double page"]]],
  ["Naviguer", [["← →", "Photo suivante"], ["Espace", "Grille ou une photo"], ["T", "Plein écran"], ["+ −", "Taille de la grille"], ["⇧ ⌘", "Clic : plusieurs"], ["⌘ Z", "Annuler"], ["Échap", "Revenir"]]],
];

/** Les bulles : raccourcis, ou objectif et part de chacun. Un clic ailleurs les ferme. */
export function BullesTri() {
  const { etat, envoyer, ui, majUi, lectureSeule: ro } = useEd();
  if (!ui.bulle) return null;
  const b = bilanTri(etat);
  return (
    <>
      <div className="ed-bulle-fond" onClick={() => majUi({ bulle: null })} />
      <div className={cls("ed-bulle", ui.bulle === "objectif" && "ed-bulle--objectif")} role="dialog" aria-label={ui.bulle === "objectif" ? "Objectif" : "Raccourcis"}>
        {ui.bulle === "raccourcis" ? RACCOURCIS.map(([t, l]) => (
          <section key={t}>
            <h3>{t}</h3>
            <dl>{l.map(([k, d]) => <div key={k}><dt>{k.split(" ").map((x) => <kbd key={x}>{x}</kbd>)}</dt><dd>{d}</dd></div>)}</dl>
          </section>
        )) : (
          <>
            <label className="ed-bulle-champ">Photos visées
              <input type="number" min={1} step={1} disabled={ro} defaultValue={b.visees ?? ""} placeholder="à fixer" autoFocus
                onChange={(e) => {
                  const t = e.currentTarget.value, n = Number(t);
                  if (t === "") envoyer({ type: "reglerTri", visees: null });
                  else if (Number.isInteger(n) && n >= 1) envoyer({ type: "reglerTri", visees: n });
                }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { e.currentTarget.blur(); majUi({ bulle: null }); } }} />
            </label>
            <h3>Par personne</h3>
            {b.parPersonne.map((x) => (
              <div key={x.personne} className="ed-bulle-pers">
                <span>{x.personne}<small>{x.choisies} / {x.total}</small></span>
                <b>{b.choisies ? `${Math.round(x.part * 100)} %` : ""}</b>
                <span className="ed-bulle-fil"><i style={{ width: `${x.part * 100}%` }} /></span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
