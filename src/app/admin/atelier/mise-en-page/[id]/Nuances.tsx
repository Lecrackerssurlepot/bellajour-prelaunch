"use client";

import { useEffect, useRef, useState } from "react";
import { couleursPosees } from "@/lib/mise-en-page/editeur";
import { estRole, hexDeCouleur, majuscule, nomDeCouleur, type CouleurLibre } from "@/lib/mise-en-page/couleursLibres";
import { ROLES_COULEUR, estHex, normaliserHex, type RoleCouleur } from "@/lib/mise-en-page/nuancier";
import { NOM_ROLE } from "@/lib/mise-en-page/style";
import { cls, useEd } from "./contexte";
import { couleursDesPhotos, useCombos } from "./couleursEcran";

/**
 * Le SÉLECTEUR de couleur (lot G) : ce qu'on pose sur un fond de page ou sur un texte. En tête, les rôles du nuancier, ceux du combo
 * appliqué d'abord (un rôle suit le nuancier : changer de combo recolore tout ce qui le porte) ; puis les couleurs des photos de la
 * page, la pipette (Chrome) et le choix libre. Écran seulement : il n'envoie qu'un choix (`onChoix`), le geste est chez l'appelant.
 */

type Pipette = new () => { open: () => Promise<{ sRGBHex: string }> };
const pipette = (): Pipette | null => (typeof window !== "undefined" ? ((window as unknown as { EyeDropper?: Pipette }).EyeDropper ?? null) : null);

const nomDe = (c: CouleurLibre): string => (estRole(c) ? NOM_ROLE[c] : `${majuscule(nomDeCouleur(c))} ${c}`);

export function Nuances({ valeur, onChoix, photos, retirer, compact, titre }: {
  valeur: CouleurLibre | null;
  onChoix: (c: CouleurLibre | null) => void;
  /** Les photos dont la palette est proposée (celles de la page, de la double, de la couverture). */
  photos: readonly string[];
  /** Le mot du retrait : « Sans fond », « Couleur du gabarit ». */
  retirer: string;
  /** Une seule ligne, sans titres (la barre d'un texte qu'on écrit). */
  compact?: boolean;
  titre?: string;
}) {
  const { etat, lectureSeule: ro } = useEd();
  const style = etat.magazine.style ?? null;
  const { applique } = useCombos(etat);
  const roles: RoleCouleur[] = applique ? [...applique.roles, ...ROLES_COULEUR.filter((r) => !applique.roles.includes(r))] : [...ROLES_COULEUR];
  const depuisPhotos = couleursDesPhotos(etat, photos, compact ? 6 : 10);
  const posees = couleursPosees(etat.magazine).filter((c): c is `#${string}` => estHex(c) && !depuisPhotos.includes(c)).slice(0, compact ? 3 : 8);
  const P = pipette();

  /* le choix libre : la roue du navigateur ; le choix part une fois la main posée */
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current); }, []);
  const libre = (v: string) => {
    const hex = normaliserHex(v);
    if (!hex) return;
    setBrouillon(hex);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => { onChoix(hex as CouleurLibre); setBrouillon(null); }, 400);
  };
  const prendre = async () => {
    if (!P) return;
    try {
      const r = await new P().open();
      const hex = normaliserHex(r.sRGBHex);
      if (hex) onChoix(hex as CouleurLibre);
    } catch { /* Échap : rien */ }
  };
  /* garder le texte en cours d'écriture : un appui sur le sélecteur ne lui retire pas la main */
  const garder = (e: React.PointerEvent) => { e.stopPropagation(); if ((e.target as HTMLElement).tagName !== "INPUT") e.preventDefault(); };

  const point = (c: CouleurLibre) => (
    <button key={c} type="button" className={cls("ed-nu-pt", valeur === c && "ed-nu-pt--choisi")} disabled={ro} aria-pressed={valeur === c}
      title={`${nomDe(c)}${estRole(c) ? ` · ${hexDeCouleur(c, style)}` : ""}`} aria-label={nomDe(c)}
      style={{ background: hexDeCouleur(c, style) }} onClick={() => onChoix(c)} />
  );
  const valeurLibre = brouillon ?? (valeur ? hexDeCouleur(valeur, style) : "#ffffff");
  const outils = (
    <>
      {P ? (
        <button type="button" className="ed-nu-outil" disabled={ro} title="Pipette : une couleur à l'écran" aria-label="Pipette" onClick={() => void prendre()}>
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m13 3 4 4-2 2-4-4 2-2ZM11 5l-7 7v4h4l7-7" /></svg>
        </button>
      ) : null}
      <label className="ed-nu-outil ed-nu-libre" title="Couleur libre">
        <span style={{ background: valeurLibre }} aria-hidden="true" />
        <input type="color" value={valeurLibre} disabled={ro} aria-label="Couleur libre" onChange={(e) => libre(e.currentTarget.value)} />
      </label>
    </>
  );

  if (compact) {
    return (
      <div className="ed-nuances ed-nuances--compact" role="group" aria-label="Couleur du texte" onPointerDown={garder} onClick={(e) => e.stopPropagation()}>
        {roles.map(point)}
        {depuisPhotos.length || posees.length ? <i className="ed-nu-sep" aria-hidden="true" /> : null}
        {depuisPhotos.map((c) => point(c as CouleurLibre))}
        {posees.map(point)}
        <i className="ed-nu-sep" aria-hidden="true" />
        {outils}
        {valeur ? <button type="button" className="ed-nu-outil" disabled={ro} title={retirer} aria-label={retirer} onClick={() => onChoix(null)}>×</button> : null}
      </div>
    );
  }
  return (
    <div className="ed-nuances" role="group" aria-label={titre ?? "Couleur"} onPointerDown={garder} onClick={(e) => e.stopPropagation()}>
      {titre ? <b className="ed-nu-titre">{titre}</b> : null}
      <span className="ed-nu-t">{applique ? applique.nom : "Nuancier"}</span>
      <span className="ed-nu-ligne">{roles.map(point)}</span>
      {depuisPhotos.length ? (
        <>
          <span className="ed-nu-t">Photos</span>
          <span className="ed-nu-ligne">{depuisPhotos.map((c) => point(c as CouleurLibre))}</span>
        </>
      ) : null}
      <span className="ed-nu-t">Libre</span>
      <span className="ed-nu-ligne">{posees.map(point)}{outils}</span>
      {valeur ? <button type="button" className="ed-lien ed-nu-retirer" disabled={ro} onClick={() => onChoix(null)}>{retirer}</button> : null}
    </div>
  );
}
