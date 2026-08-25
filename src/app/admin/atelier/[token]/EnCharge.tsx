"use client";

/**
 * Qui a ce dossier en main.
 *
 * Un seul bouton, deux positions : je le prends, je le relâche. Pas de liste
 * déroulante des collègues — « Louis, occupe-toi de ça » est une phrase, pas
 * un bouton, et un dossier posé sur le bureau de quelqu'un qui ne le sait pas
 * ne bouge pas. Ce qu'on veut ici, c'est dire à l'autre « celui-là, je m'en
 * occupe », rien de plus.
 *
 * Prendre un dossier qui est déjà à quelqu'un est PERMIS : c'est le mot
 * « relais » de la demande. Le bouton le dit franchement (« Reprendre à
 * Mathias ») plutôt que de refuser — et le journal garde qui a pris à qui.
 */

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export default function EnCharge({
  token,
  enCharge,
  moi,
  prenoms,
  demo,
}: {
  token: string;
  /** Clé du compte qui l'a en main, ou null. */
  enCharge: string | null;
  /** Clé du compte connecté. */
  moi: string;
  /** Clé → prénom affichable, calculé côté serveur. */
  prenoms: Record<string, string>;
  demo?: boolean;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const aMoi = enCharge === moi;
  const nomTitulaire = enCharge ? (prenoms[enCharge] ?? enCharge) : null;

  const basculer = useCallback(async () => {
    if (demo) return;
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, prendre: !aMoi }),
      });
      if (r.status === 503) throw new Error("migration");
      if (!r.ok) throw new Error("charge");
      router.refresh();
    } catch (e) {
      setErreur(
        (e as Error)?.message === "migration"
          ? "La migration 20260826 n'est pas passée sur cette base."
          : "Le changement n'a pas été enregistré. Réessaie.",
      );
    } finally {
      setOccupe(false);
    }
  }, [token, aMoi, demo, router]);

  return (
    <div className="ate-charge">
      <span className="ate-charge-etat">
        {aMoi ? (
          <>
            <span className="ate-charge-pastille ate-charge-pastille--moi" aria-hidden />
            En main : <strong>vous</strong>
          </>
        ) : nomTitulaire ? (
          <>
            <span className="ate-charge-pastille" aria-hidden />
            En main : <strong>{nomTitulaire}</strong>
          </>
        ) : (
          <span className="ate-faint">Personne ne s&apos;en occupe.</span>
        )}
      </span>

      <button
        type="button"
        className="adm-btn adm-btn--ghost"
        onClick={basculer}
        disabled={occupe || demo}
      >
        {occupe
          ? "…"
          : aMoi
            ? "Relâcher"
            : nomTitulaire
              ? `Reprendre à ${nomTitulaire}`
              : "Je m'en occupe"}
      </button>

      {erreur ? <p className="ate-charge-erreur">{erreur}</p> : null}
    </div>
  );
}
