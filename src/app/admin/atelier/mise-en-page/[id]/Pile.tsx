"use client";

import { visibles } from "@/lib/mise-en-page/editeur";
import { pluriel, useEd } from "./contexte";
import { libelleApercu } from "./glisser";
import { vignetteDe } from "./images";
import { Mini } from "./Gabarits";

/* Ce qui suit le pointeur pendant un glisser : la pile des photos (ou la mini planche), son compteur, la phrase
   de ce que le lâcher ferait. Sa position est écrite directement dans le DOM (voir `posPile`). */

export function posPile(x: number, y: number): string {
  const bas = y > window.innerHeight - 120;
  const droite = x > window.innerWidth - 180;
  return `translate(${droite ? x - 150 : x + 14}px, ${bas ? y - 110 : y + 10}px)`;
}

export function Pile({ x, y }: { x: number; y: number }) {
  const { etat, adresses } = useEd();
  const d = etat.glisser;
  if (!d) return null;
  const ids = d.source.type === "bibliotheque" ? d.source.ids : d.source.type === "cadre" && d.source.photoId ? [d.source.photoId] : [];
  const lib = libelleApercu(d.source, d.survol, d.apercu);
  const refus = !!(d.apercu && d.apercu.refus);
  let nbMasq = 0;
  if (d.source.type === "bibliotheque") {
    const vis = new Set(visibles(etat));
    nbMasq = ids.filter((id) => !vis.has(id)).length;
  }
  const pos = { transform: posPile(x, y) };
  const src0 = d.source;
  if (src0.type === "planche") {
    const pl = etat.magazine.planches.find((p) => p.id === src0.plancheId);
    if (!pl) return null;
    return (
      <div className="ed-pile" style={pos}>
        <span className="ed-pile-mini"><Mini planche={pl} /></span>
        {lib ? <span className="ed-pile-txt" style={{ top: 70 }}>{lib}</span> : null}
      </div>
    );
  }
  const pile = ids.slice(0, 3).reverse();
  return (
    <div className="ed-pile" style={pos}>
      {pile.map((id, i, a) => {
        const k = a.length - 1 - i;
        const src = vignetteDe(adresses.get(id));
        return (
          <span key={id} className="ed-pile-img" style={{ transform: `translate(${k * 5}px,${k * 5}px) rotate(${k * 4}deg)` }}>
            {src ? <img src={src} alt="" decoding="async" draggable={false} /> : null}
          </span>
        );
      })}
      {ids.length > 1 ? <span className="ed-pile-n">{ids.length}</span> : null}
      {lib || nbMasq ? (
        <span className={refus ? "ed-pile-txt ed-pile-txt--refus" : "ed-pile-txt"}>
          {[lib || pluriel(ids.length, "photo"), nbMasq ? `dont ${nbMasq} masquée${nbMasq > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </div>
  );
}

/* L'aperçu en grand (double clic ou Espace sur une photo). Flèches : la voisine, Échap : fermer. */
export function Loupe({ id }: { id: string }) {
  const { etat, adresses, majUi } = useEd();
  const p = etat.catalogue.get(id);
  if (!p) return null;
  const a = adresses.get(id);
  const src = a?.moyenne ?? a?.vignette ?? a?.original ?? undefined;
  const fermer = () => majUi({ loupe: null });
  return (
    <div className="ed-loupe" role="dialog" aria-label={`Aperçu de ${p.nom}`} onClick={fermer}>
      <img src={src} alt={p.nom} decoding="async" />
      <div className="ed-loupe-info">
        <span>{p.nom}{p.personne ? ` · ${p.personne}` : ""} · {p.l} × {p.h}</span>
        <button type="button" className="ed-bt" onClick={fermer}>Fermer</button>
      </div>
    </div>
  );
}

