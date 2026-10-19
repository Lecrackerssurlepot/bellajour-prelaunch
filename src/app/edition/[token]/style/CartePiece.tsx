"use client";

/* Une pièce du mur (D24, maquette « Tout, en vrac ») : son visuel, ce
   qu'elle est et d'où elle vient (« Palette · Marine », « du style
   Riviera »), le geste et « Voir tout le style ».

   T-179 (planche 1 du 19/10, validée par Mathias) : une pièce CHOISIE se
   voit de loin. Un cadre épais d'accent, un sceau en haut à gauche (« ✓ Dans
   ta composition » pour une couverture ou une double page, « ✓ Ta palette »,
   « ✓ Tes typographies »), « Retirer » pour une couverture ou une double
   page, la pastille « Choisie » pour une palette ou des typographies (on les
   remplace en en prenant d'autres). Non choisie : « Aimer » (couverture),
   « Ajouter » (double page, typographies, palette), « Prendre » (une palette
   quand une autre est déjà choisie) ; au survol, ce qu'elle remplacera. */

import Link from "next/link";
import { useId } from "react";
import type { PieceVue } from "./pieces";
import { genre } from "./pieces";

export default function CartePiece({
  piece,
  choisie,
  raison,
  remplace,
  peutAgir,
  occupe,
  tu,
  lienStyle,
  onAgir,
}: {
  piece: PieceVue;
  choisie: boolean;
  /** Pourquoi elle est proposée en haut (« Du style de votre palette »). */
  raison?: string;
  /** « Remplacera ta palette Marine » : une autre palette (ou d'autres typographies) est déjà choisie. */
  remplace?: string | null;
  peutAgir: boolean;
  occupe: boolean;
  tu: boolean;
  lienStyle: string;
  onAgir: () => void;
}) {
  const id = useId();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const g = genre(piece.genre);
  const retirable = piece.genre === "couverture" || piece.genre === "double";
  const visuel = piece.genre === "couverture" ? "ec-piece-visuel" : piece.genre === "palette" ? "ec-piece-visuel ec-piece-visuel--palette" : "ec-piece-visuel ec-piece-visuel--large";
  const sceau = !choisie
    ? null
    : piece.genre === "palette"
      ? v("Votre palette", "Ta palette")
      : piece.genre === "typos"
        ? v("Vos typographies", "Tes typographies")
        : v("Dans votre composition", "Dans ta composition");
  const geste = choisie ? (retirable ? "Retirer" : null) : piece.genre === "couverture" ? "Aimer" : piece.genre === "palette" && remplace ? "Prendre" : "Ajouter";
  const titre = piece.genre === "typos" || piece.genre === "couverture" ? g.un : piece.genre === "double" ? `Double · ${piece.titre}` : `${g.un} · ${piece.titre}`;
  const nomAccessible = piece.genre === "typos" ? `typographies ${piece.titre}, du style ${piece.style.nom}` : `${titre.toLowerCase()}, du style ${piece.style.nom}`;
  const avertir = Boolean(remplace && peutAgir && !choisie);

  return (
    <article className={choisie ? "ec-piece ec-piece--choisie" : "ec-piece"}>
      <div className={visuel}>
        {piece.genre === "palette" ? (
          <span className="ec-piece-bandes" role="img" aria-label={`Palette ${piece.titre}`}>
            {piece.couleurs.map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </span>
        ) : piece.url ? (
          <img src={piece.url} alt="" loading="lazy" decoding="async" />
        ) : piece.genre === "typos" ? (
          <span className="ec-piece-aa">
            <b>Aa</b>
            <span>{piece.titre}</span>
          </span>
        ) : (
          <span className="ec-piece-sans">{piece.titre}</span>
        )}
        {sceau ? (
          <span className="ec-piece-sceau">
            <span aria-hidden="true">✓</span> {sceau}
          </span>
        ) : null}
        {avertir ? (
          <span className="ec-piece-remplace" id={id}>
            {remplace}
          </span>
        ) : null}
      </div>
      <div className="ec-piece-pied">
        <span className="ec-piece-texte">
          <strong>{titre}</strong>
          <span className="ec-piece-origine">{piece.genre === "typos" ? `${piece.titre}, du style ${piece.style.nom}` : `du style ${piece.style.nom}`}</span>
          {raison ? <span className="ec-piece-raison">{raison}</span> : null}
        </span>
        {peutAgir && geste ? (
          <button
            type="button"
            className="ec-piece-geste"
            disabled={occupe}
            aria-label={`${geste} : ${nomAccessible}`}
            aria-describedby={avertir ? id : undefined}
            onClick={onAgir}
          >
            {geste}
          </button>
        ) : choisie && !retirable ? (
          <span className="ec-piece-choisie">Choisie</span>
        ) : null}
      </div>
      <Link className="ec-piece-style" href={lienStyle} prefetch={false}>
        Voir tout le style {piece.style.nom}
        {" →"}
      </Link>
    </article>
  );
}
