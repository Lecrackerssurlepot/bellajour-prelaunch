"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { idsMagazine, marqueDe, type EtatEditeur } from "@/lib/mise-en-page/editeur";
import { proposerNuancier } from "@/lib/mise-en-page/nuancier";
import { COULEURS_ORIGINE, NOM_ROLE, PAIRES, ROLES_COULEUR, paireParId, styleDePaire, type Role, type StyleMagazine } from "@/lib/mise-en-page/style";
import { cls, useEd } from "./contexte";
import { Ico } from "./icones";

/**
 * Le panneau « Style » (lot C) : la paire de polices du magazine avec son humeur, le nuancier en six pastilles (chacune se
 * modifie), le nuancier PROPOSÉ d'après les photos (un clic pour l'appliquer). Changer la paire ou une couleur change tout le
 * magazine : l'écran, le PDF et l'IDML lisent le même style. Rien n'est écrit ailleurs que dans le magazine (clé `style`).
 */

/** Les palettes des photos du magazine : les posées, sinon toutes celles que la lecture a mesurées (hors écartées). */
function palettesDuNuancier(e: EtatEditeur): { palettes: string[][]; posees: boolean } {
  const mesures = e.lecture.mesures ?? {};
  const posees = [...new Set(idsMagazine(e.magazine))];
  const ids = posees.length ? posees : [...e.catalogue.keys()].filter((id) => marqueDe(e.magazine, id) !== "ecartee");
  return { palettes: ids.flatMap((id) => (mesures[id]?.palette ? [mesures[id].palette as string[]] : [])), posees: posees.length > 0 };
}

/** Une pastille : un clic ouvre le sélecteur de couleur du navigateur ; le choix s'enregistre une fois la main posée. */
function Pastille({ role, hex, desactive, onChoix }: { role: Role; hex: string; desactive: boolean; onChoix: (r: Role, v: string) => void }) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);
  const change = (v: string) => {
    setBrouillon(v);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => { onChoix(role, v); setBrouillon(null); }, 450);
  };
  const valeur = brouillon ?? hex;
  return (
    <label className={cls("ed-sty-past", desactive && "ed-sty-past--off")} title={`${NOM_ROLE[role]} · ${valeur}`}>
      <span className="ed-sty-rond" style={{ background: valeur }} />
      <input type="color" value={valeur} disabled={desactive} aria-label={`${NOM_ROLE[role]} ${valeur}`} onChange={(e) => change(e.currentTarget.value.toLowerCase())} />
      <small>{NOM_ROLE[role]}</small>
    </label>
  );
}

export function StylePanneau() {
  const { etat, envoyer, majUi, lectureSeule: ro } = useEd();
  const style = etat.magazine.style;
  const paire = style ? paireParId(style.paire) : null;
  const { palettes, posees } = useMemo(() => palettesDuNuancier(etat), [etat]);
  const prop = useMemo(() => proposerNuancier(palettes), [palettes]);
  const memeNuancier = !!style && !!prop && ROLES_COULEUR.every((r) => style.couleurs[r] === prop.couleurs[r]);

  const choisirPaire = (id: string) => {
    const s = styleDePaire(id, style?.couleurs ?? { ...COULEURS_ORIGINE });
    if (s && !ro) envoyer({ type: "styler", style: s });
  };
  const choisirCouleur = (r: Role, v: string) => {
    if (!style || ro) return;
    const suite: StyleMagazine = { paire: style.paire, couleurs: { ...style.couleurs, [r]: v } };
    envoyer({ type: "styler", style: suite });
  };
  const appliquer = () => {
    if (!style || !prop || ro) return;
    envoyer({ type: "styler", style: { paire: style.paire, couleurs: { ...prop.couleurs } } });
  };

  return (
    <div className="ed-style" role="dialog" aria-label="Style du magazine" onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); majUi({ style: false }); } }}>
      <div className="ed-sty-tete">
        <h2>Style</h2>
        {style ? <button type="button" className="ed-lien" disabled={ro} onClick={() => envoyer({ type: "styler", style: null })}>Retirer</button> : null}
        <button type="button" className="ed-ico" aria-label="Fermer" onClick={() => majUi({ style: false })}>{Ico.fermer}</button>
      </div>

      {paire && style ? (
        <div className="ed-sty-echantillon" aria-hidden="true">
          <span className="ed-sty-ech-t" style={{ fontFamily: `var(--pf-${paire.niveaux.titre.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.titre.graisse, textTransform: paire.niveaux.titre.capitales ? "uppercase" : "none", color: `var(--mep-r-encre)` }}>Lisbonne</span>
          <span className="ed-sty-ech-x" style={{ fontFamily: `var(--pf-${paire.niveaux.texte.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.texte.graisse }}>Ce que vous avez vécu, nous le composons.</span>
          <span className="ed-sty-ech-l" style={{ fontFamily: `var(--pf-${paire.niveaux.legende.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.legende.graisse, textTransform: paire.niveaux.legende.capitales ? "uppercase" : "none", letterSpacing: paire.niveaux.legende.approche ? `${paire.niveaux.legende.approche}em` : undefined }}>12 juin · Alfama</span>
        </div>
      ) : (
        <p className="ed-sty-vide">Rendu d&apos;origine. Choisir une paire de polices applique un style à tout le magazine.</p>
      )}

      <div className="ed-sty-paires" role="radiogroup" aria-label="Paire de polices">
        {PAIRES.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={style?.paire === p.id} disabled={ro} className="ed-sty-paire" onClick={() => choisirPaire(p.id)}>
            <b>{p.nom}</b>
            <span>{p.humeur}</span>
          </button>
        ))}
      </div>

      {style ? (
        <>
          <div className="ed-sty-nuancier" aria-label="Nuancier du magazine">
            {ROLES_COULEUR.map((r) => <Pastille key={r} role={r} hex={style.couleurs[r]} desactive={ro} onChoix={choisirCouleur} />)}
          </div>
          {prop ? (
            <div className="ed-sty-prop">
              <div className="ed-sty-prop-t">
                <b>Proposé d&apos;après {posees ? "les photos posées" : "vos photos"}</b>
                <span>{prop.accord}</span>
              </div>
              <div className="ed-sty-prop-r">
                <span className="ed-sty-mini" aria-hidden="true">
                  {ROLES_COULEUR.map((r) => <i key={r} style={{ background: prop.couleurs[r] }} title={`${NOM_ROLE[r]} · ${prop.pourquoi[r]}`} />)}
                </span>
                <button type="button" className="ed-bt ed-bt--action" disabled={ro || memeNuancier} onClick={appliquer}>{memeNuancier ? "Appliqué" : "Appliquer"}</button>
              </div>
            </div>
          ) : (
            <p className="ed-sty-vide">Aucune couleur proposée : la lecture des photos n&apos;est pas finie, ou aucune photo n&apos;est posée.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
