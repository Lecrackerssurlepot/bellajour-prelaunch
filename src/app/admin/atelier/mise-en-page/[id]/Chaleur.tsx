"use client";

/* 10/11 : la lecture DESSINÉE. Par-dessus une photo (posée dans un cadre ou ouverte en grand), ce que la machine a vu :
   la carte de chaleur (ce qui ressort de l'image : contrastes, formes isolées ; 16 × 16 cases), les visages détectés
   (boîtes) et la zone qu'elle protège au recadrage (pointillés). Une aide pour juger, jamais imprimée ni exportée. */

import type { Mesure } from "@/lib/mise-en-page/editeur";

export function Chaleur({ m, style }: { m: Mesure | undefined; style?: React.CSSProperties }) {
  if (!m) return <span className="ed-chaleur ed-chaleur--rien" style={style}><span>Pas encore lue</span></span>;
  const cases = m.chaleur ?? "";
  return (
    <svg className="ed-chaleur" style={style} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {cases.length === 256 ? [...cases].map((c, i) => {
        const v = Number(c);
        return v > 1 ? <rect key={i} x={(i % 16) / 16} y={Math.floor(i / 16) / 16} width={1 / 16} height={1 / 16} fill="#ff5a1f" fillOpacity={(v / 9) * 0.6} /> : null;
      }) : null}
      {m.zone ? <rect x={m.zone.x} y={m.zone.y} width={m.zone.l} height={m.zone.h} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" /> : null}
      {(m.visages ?? []).map((v, i) => (
        <rect key={`v${i}`} x={v.x} y={v.y} width={v.l} height={v.h} fill="none" stroke="#3ddc84" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
