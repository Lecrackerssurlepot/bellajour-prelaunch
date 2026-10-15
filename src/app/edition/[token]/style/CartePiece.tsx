"use client";

/* Une pièce du mur (D24, maquette « Tout, en vrac ») : son visuel, ce
   qu'elle est et d'où elle vient (« Palette · du style Riviera »), le geste
   (Ajouter, ou ce qui est déjà choisi) et « Voir tout le style ». Une
   couverture ou une double page choisie se RETIRE d'un clic ; une palette ou
   des typographies choisies se remplacent en en prenant d'autres. */

import Link from "next/link";
import type { PieceVue } from "./pieces";
import { genre } from "./pieces";

const CHOISIE: Record<PieceVue["genre"], string> = { couverture: "Aimée", typos: "Choisies", palette: "Choisie", double: "Ajoutée" };

export default function CartePiece({
  piece,
  choisie,
  raison,
  peutAgir,
  occupe,
  lienStyle,
  onAgir,
}: {
  piece: PieceVue;
  choisie: boolean;
  /** Pourquoi elle est proposée en haut (« Du style de votre palette »). */
  raison?: string;
  peutAgir: boolean;
  occupe: boolean;
  lienStyle: string;
  onAgir: () => void;
}) {
  const g = genre(piece.genre);
  const retirable = choisie && (piece.genre === "couverture" || piece.genre === "double");
  const large = piece.genre !== "couverture";
  return (
    <article className={choisie ? "ec-piece ec-piece--choisie" : "ec-piece"}>
      <div className={large ? "ec-piece-visuel ec-piece-visuel--large" : "ec-piece-visuel"}>
        {piece.genre === "palette" ? (
          <span className="ec-piece-bandes" aria-label={`Palette ${piece.titre}`}>
            {piece.couleurs.map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </span>
        ) : piece.url ? (
          <img src={piece.url} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="ec-piece-sans">{piece.titre}</span>
        )}
      </div>
      <div className="ec-piece-pied">
        <span className="ec-piece-texte">
          <strong>
            {g.un}
            {piece.genre === "typos" || piece.genre === "couverture" ? "" : ` · ${piece.titre}`}
          </strong>
          <span className="ec-note">
            {piece.genre === "typos" ? `${piece.titre}, du style ${piece.style.nom}` : `du style ${piece.style.nom}`}
          </span>
          {raison ? <span className="ec-piece-raison">{raison}</span> : null}
        </span>
        {peutAgir ? (
          <button
            type="button"
            className={choisie ? "ec-bouton ec-bouton--petit" : "ec-bouton ec-bouton--clair ec-bouton--petit"}
            aria-pressed={choisie}
            disabled={occupe || (choisie && !retirable)}
            title={retirable ? "Retirer" : undefined}
            onClick={onAgir}
          >
            {choisie ? CHOISIE[piece.genre] : "Ajouter"}
          </button>
        ) : choisie ? (
          <span className="ec-note">{CHOISIE[piece.genre]}</span>
        ) : null}
      </div>
      <Link className="ec-piece-style" href={lienStyle} prefetch={false}>
        Voir tout le style {piece.style.nom} →
      </Link>
    </article>
  );
}
