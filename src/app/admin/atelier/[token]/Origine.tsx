"use client";

/**
 * D'où vient ce dossier : chaud (réseau, bouche à oreille, fondateurs) ou
 * froid (quelqu'un qu'on ne connaît pas). Deux boutons, un seul allumé, et
 * « on ne sait pas » reste possible : ne rien poser vaut mieux que deviner,
 * le cockpit compte l'inconnu à part.
 *
 * Le cockpit lit cette valeur au passage suivant du job : la corriger ici
 * corrige l'agrégat, sans rien d'autre à faire.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Origine as ValeurOrigine } from "@/lib/cockpit/agregat";

export default function Origine({
  token,
  origine,
  demo,
}: {
  token: string;
  origine: ValeurOrigine | null;
  demo?: boolean;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const poser = useCallback(
    async (valeur: ValeurOrigine | null) => {
      if (demo || valeur === origine) return;
      setOccupe(true);
      setErreur(null);
      try {
        const r = await fetch("/api/admin/atelier/origine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, origine: valeur }),
        });
        if (r.status === 503) throw new Error("migration");
        if (!r.ok) throw new Error("origine");
        router.refresh();
      } catch (e) {
        setErreur(
          (e as Error)?.message === "migration"
            ? "La migration 20260917 n'est pas passée sur cette base."
            : "L'origine n'a pas été enregistrée. Réessaie.",
        );
      } finally {
        setOccupe(false);
      }
    },
    [token, origine, demo, router],
  );

  return (
    <div className="ate-charge ate-origine">
      <span className="ate-charge-etat">
        Origine :{" "}
        {origine === "chaud" ? (
          <strong>chaud</strong>
        ) : origine === "froid" ? (
          <strong>froid</strong>
        ) : (
          <span className="ate-faint">pas posée</span>
        )}
      </span>
      <button
        type="button"
        className={origine === "chaud" ? "adm-btn" : "adm-btn adm-btn--ghost"}
        onClick={() => poser(origine === "chaud" ? null : "chaud")}
        disabled={occupe || demo}
        title="Réseau, bouche à oreille, fondateurs"
      >
        Chaud
      </button>
      <button
        type="button"
        className={origine === "froid" ? "adm-btn" : "adm-btn adm-btn--ghost"}
        onClick={() => poser(origine === "froid" ? null : "froid")}
        disabled={occupe || demo}
        title="Quelqu’un qu’on ne connaît pas"
      >
        Froid
      </button>
      {erreur ? <p className="ate-charge-erreur">{erreur}</p> : null}
    </div>
  );
}
