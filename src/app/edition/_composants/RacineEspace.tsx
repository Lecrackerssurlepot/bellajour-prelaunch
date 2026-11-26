/* La racine de l'espace client : un seul mode, le papier (charte V2, 26/11/2026).
   Elle ne porte plus que la classe du scope. L'ancienne bascule jour / nuit
   (cookie `bj_ec_mode`, `data-ec-mode`) est rangée dans archive/charte-v1-interfaces/. */

export default function RacineEspace({ className, children }: { className: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}
