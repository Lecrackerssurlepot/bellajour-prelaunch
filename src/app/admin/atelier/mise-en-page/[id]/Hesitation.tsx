"use client";

import { useEffect } from "react";
import { cadresPlanche, type CadrePhoto, type EtatEditeur, type Geste, type RefCadre } from "@/lib/mise-en-page/editeur";
import { memeRef, useEd, type Ui } from "./contexte";
import { Nette } from "./Tri";

/* L'hésitation (lot 3) : deux photos dans le même cadre, confrontées côte à côte. Celle de devant à gauche.
   T intervertit, « Garder celle-ci » tranche (la délaissée reste notée derrière le cadre), Échap revient. */

/** Le cadre photo visé, tel que la planche le dessine. */
export function cadreHesitant(e: EtatEditeur, ref: RefCadre | null): CadrePhoto | null {
  if (!ref) return null;
  const c = cadresPlanche(e, ref.plancheId).find((x): x is CadrePhoto => x.role === "photo" && memeRef(x.ref, ref));
  return c && c.photoId && c.hesitation ? c : null;
}

type CtxConf = { etat: EtatEditeur; ui: Ui; majUi: (p: Partial<Ui>) => void; envoyer: (g: Geste) => void; lectureSeule: boolean };

/** Le clavier de la confrontation : il passe avant tout le reste. Rend true si la touche est prise. */
export function clavierConfrontation(c: CtxConf, ev: KeyboardEvent): boolean {
  const ref = c.ui.confronter;
  if (!ref) return false;
  const k = ev.key.toLowerCase();
  const prends = () => { ev.preventDefault(); return true; };
  if (k === "escape" || k === " ") { c.majUi({ confronter: null }); return prends(); }
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return false;
  if (c.lectureSeule) return false;
  if (k === "t") { c.envoyer({ type: "hesiter", ref, action: "intervertir" }); return prends(); }
  if (k === "arrowleft" || k === "1") { trancher(c, ref, "garderDevant"); return prends(); }
  if (k === "arrowright" || k === "2") { trancher(c, ref, "garderDerriere"); return prends(); }
  return false;
}

function trancher(c: Pick<CtxConf, "envoyer" | "majUi">, ref: RefCadre, action: "garderDevant" | "garderDerriere") {
  c.envoyer({ type: "hesiter", ref, action });
  c.majUi({ confronter: null });
}

export default function Confrontation() {
  const c = useEd();
  const { etat, ui, majUi, adresses, lectureSeule: ro } = c;
  const cadre = cadreHesitant(etat, ui.confronter);
  const ouverte = !!cadre?.hesitation?.ouverte;
  /* l'hésitation a disparu (annulée, tranchée ailleurs) : on referme */
  useEffect(() => { if (ui.confronter && !ouverte) majUi({ confronter: null }); });
  if (!ui.confronter || !cadre || !cadre.photoId || !cadre.hesitation || !ouverte) return null;
  const ref = ui.confronter;
  const cotes = [
    { id: cadre.photoId, nom: cadre.nom ?? cadre.photoId, mot: "Devant", action: "garderDevant" as const, touche: "←" },
    { id: cadre.hesitation.photoId, nom: cadre.hesitation.nom, mot: "Derrière", action: "garderDerriere" as const, touche: "→" },
  ];
  return (
    <div className="ed-vt ed-conf" role="dialog" aria-modal="true" aria-label="Hésitation entre deux photos">
      <div className="ed-vt-tete">
        <button type="button" className="ed-vt-retour" title="Retour · Échap" onClick={() => majUi({ confronter: null })}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4l-6 6 6 6" /></svg>Retour
        </button>
        <h2>Hésitation<span>Seule celle de devant part à l&apos;export</span></h2>
        <span className="ed-esp" />
        {ro ? null : (
          <button type="button" className="ed-conf-t" title="Intervertir · T" onClick={() => c.envoyer({ type: "hesiter", ref, action: "intervertir" })}>
            <kbd>T</kbd>Intervertir
          </button>
        )}
      </div>
      <div className="ed-conf-scene">
        {cotes.map((x, i) => (
          <figure key={x.id} className="ed-conf-cote">
            <div className="ed-conf-img"><Nette a={adresses.get(x.id)} alt={x.nom} /></div>
            <figcaption>
              <span className={i === 0 ? "ed-conf-mot ed-conf-mot--devant" : "ed-conf-mot"}>{x.mot}</span>
              <span className="ed-conf-nom">{x.nom}</span>
              {ro ? null : (
                <button type="button" className="ed-conf-garder" title={`Garder celle-ci · ${x.touche}`} onClick={() => trancher(c, ref, x.action)}>
                  Garder celle-ci
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
