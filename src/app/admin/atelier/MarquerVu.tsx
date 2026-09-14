"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * « Tout marquer vu » : les dossiers à l'écran cessent d'être « jamais
 * ouverts » pour la personne connectée.
 *
 * Vivait dans le flux entrant (archive/admin-flux-2026-09) ; depuis le
 * 11/09/2026, il est dans la barre de filtres, à côté du compteur qu'il
 * remet à zéro. Un geste sans conséquence : un marqueur non posé fait
 * réapparaître un point bleu, rien de plus. D'où l'absence de message
 * d'erreur.
 */
export default function MarquerVu({
  tokens,
  nouveaux,
  demo,
}: {
  /** Les dossiers actuellement à l'écran. */
  tokens: string[];
  nouveaux: number;
  demo?: boolean;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);

  if (nouveaux === 0 || demo) return null;

  async function toutVu() {
    setOccupe(true);
    try {
      await fetch("/api/admin/atelier/vu", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokens }),
      });
      router.refresh();
    } catch {
      /* Voir ci-dessus : rien à dire. */
    } finally {
      setOccupe(false);
    }
  }

  return (
    <button type="button" className="ate-vu-btn" onClick={toutVu} disabled={occupe}>
      {occupe ? "…" : "Tout marquer vu"}
    </button>
  );
}
