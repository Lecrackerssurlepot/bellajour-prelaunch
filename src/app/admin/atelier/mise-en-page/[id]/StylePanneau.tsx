"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { proposerNuancier } from "@/lib/mise-en-page/nuancier";
import { COULEURS_ORIGINE, NOM_ROLE, PAIRES, ROLES_COULEUR, paireParId, styleDePaire, texteTypo, type Role, type StyleMagazine } from "@/lib/mise-en-page/style";
import { cls, useEd } from "./contexte";
import { palettesDuMagazine, useCombos } from "./couleursEcran";
import type { Combo } from "@/lib/mise-en-page/combos";
import { Ico } from "./icones";

/**
 * Le panneau « Style » (lot C) : la paire de polices du magazine avec son humeur, le nuancier en six pastilles (chacune se
 * modifie), le nuancier PROPOSÉ d'après les photos (un clic pour l'appliquer). Changer la paire ou une couleur change tout le
 * magazine : l'écran, le PDF et l'IDML lisent le même style. Rien n'est écrit ailleurs que dans le magazine (clé `style`).
 * Lot G (14/11) : les COMBOS (combos.ts) en pastilles sous le nuancier : un clic pose le combo sur les rôles, « Annuler » rend le
 * nuancier d'avant ; chaque pose est aussi une entrée d'historique (⌘Z).
 */


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
  /* l'échantillon n'invente rien : le titre du magazine tel qu'il est (le mot « Titre » à défaut), puis deux lignes neutres,
     jamais un lieu ni une date qui ne viennent pas du dossier */
  const titreEchantillon = texteTypo(etat.magazine.titre.trim() || "Titre");
  const { palettes, posees } = useMemo(() => palettesDuMagazine(etat), [etat]);
  const prop = useMemo(() => proposerNuancier(palettes), [palettes]);
  /* lot G : les combos, et ce qu'« Annuler » rend (le nuancier d'avant le dernier combo appliqué ici) */
  const { combos, applique } = useCombos(etat);
  const [avant, setAvant] = useState<{ couleurs: StyleMagazine["couleurs"]; combo: string } | null>(null);
  const annulable = !!avant && !!applique && applique.id === avant.combo;
  const memeNuancier = !!style && !!prop && ROLES_COULEUR.every((r) => style.couleurs[r] === prop.couleurs[r]);

  /* la liste des paires : le fondu du bas disparaît quand on est au bout ; la paire choisie est ramenée dans la vue à l'ouverture (le haut de la liste sinon) */
  const liste = useRef<HTMLDivElement | null>(null);
  const [finListe, setFinListe] = useState(false);
  const suivreListe = () => { const n = liste.current; if (n) setFinListe(n.scrollTop + n.clientHeight >= n.scrollHeight - 2); };
  useEffect(() => {
    const n = liste.current;
    if (!n) return;
    n.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView({ block: "nearest" });
    suivreListe();
  }, []);

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
  const appliquerCombo = (c: Combo) => {
    if (!style || ro) return;
    if (applique?.id === c.id) return;
    /* « Annuler » rend le nuancier d'AVANT le premier combo essayé : passer d'un combo à l'autre ne perd pas le point de départ */
    setAvant({ couleurs: annulable && avant ? avant.couleurs : { ...style.couleurs }, combo: c.id });
    envoyer({ type: "styler", style: { paire: style.paire, couleurs: { ...c.couleurs } } });
  };
  const annulerCombo = () => {
    if (!style || !avant || ro) return;
    envoyer({ type: "styler", style: { paire: style.paire, couleurs: { ...avant.couleurs } } });
    setAvant(null);
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
          <span className="ed-sty-ech-t" style={{ fontFamily: `var(--pf-${paire.niveaux.titre.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.titre.graisse, textTransform: paire.niveaux.titre.capitales ? "uppercase" : "none", color: `var(--mep-r-encre)` }}>{titreEchantillon}</span>
          <span className="ed-sty-ech-x" style={{ fontFamily: `var(--pf-${paire.niveaux.texte.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.texte.graisse }}>{texteTypo("Le texte courant s'écrit ainsi.")}</span>
          <span className="ed-sty-ech-l" style={{ fontFamily: `var(--pf-${paire.niveaux.legende.police}), var(--bj-font-ui)`, fontWeight: paire.niveaux.legende.graisse, textTransform: paire.niveaux.legende.capitales ? "uppercase" : "none", letterSpacing: paire.niveaux.legende.approche ? `${paire.niveaux.legende.approche}em` : undefined }}>Légende de la photo</span>
        </div>
      ) : (
        <p className="ed-sty-vide">Rendu d&apos;origine. Choisir une paire de polices applique un style à tout le magazine.</p>
      )}

      {/* lot R (D9) : les dix-huit paires sont TOUTES atteignables : le nombre est dit, la liste prend la place qui reste dans le panneau et défile (barre toujours visible,
          fondu en bas tant qu'il en reste), la paire choisie est ramenée dans la vue à l'ouverture */}
      <div className="ed-sty-paires-t"><span>Paires de polices</span><small>{PAIRES.length} paires · {style ? "défiler pour voir les autres" : "faire défiler"}</small></div>
      <div className={cls("ed-sty-paires", !finListe && "ed-sty-paires--suite")} ref={liste} role="radiogroup" aria-label="Paire de polices" onScroll={suivreListe}>
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
          {combos.length ? (
            <div className="ed-sty-combos" role="group" aria-label="Combos">
              <div className="ed-sty-combos-t">
                <b>Combos</b>
                {annulable ? <button type="button" className="ed-lien" disabled={ro} onClick={annulerCombo}>Annuler</button> : null}
              </div>
              {combos.map((c) => (
                <button key={c.id} type="button" className="ed-sty-combo" aria-pressed={applique?.id === c.id} disabled={ro} onClick={() => appliquerCombo(c)}
                  title={c.roles.map((r) => `${NOM_ROLE[r]} ${c.couleurs[r]}`).join(" · ")}>
                  <span className="ed-sty-mini" aria-hidden="true">{c.roles.map((r) => <i key={r} style={{ background: c.couleurs[r] }} />)}</span>
                  <span className="ed-sty-combo-t"><b>{c.nom}</b><small>{c.raison}</small></span>
                </button>
              ))}
            </div>
          ) : null}
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
