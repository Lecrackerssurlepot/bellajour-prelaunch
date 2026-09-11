"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LigneDossier } from "./types";

/**
 * « Relancer », sur la ligne.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE N'EST PAS UNE ACTION COMME LES AUTRES
 *
 * Les sept gestes d'`ActionRapide` viennent de `transitions.ts` : ils
 * changent l'état du dossier. La relance, non — elle redit ce qu'on avait
 * déjà dit. La mêler à la table des transitions aurait obligé à y inventer
 * une action sans `vers`, c'est-à-dire à casser la seule chose que cette
 * table garantit.
 *
 * Elle en garde en revanche la RÈGLE qui compte : jamais d'un seul clic. Un
 * mail part vraiment, vers une vraie personne.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE BOUTON ÉTEINT DIT POURQUOI
 *
 * Un bouton grisé sans explication finit par être contourné à la main, en
 * base. Quand la relance est impossible, la raison est écrite au survol ET
 * dans le panneau : « un mail lui est parti il y a 6 h », « son dépôt est
 * terminé », « il faut appeler, pas écrire ».
 *
 * Et quand elle n'a aucun sens — un dossier livré, un dossier payé — le
 * bouton n'existe pas du tout (`pertinent`). Vingt boutons éteints sur vingt
 * lignes, ce n'est plus une information, c'est du bruit.
 * ══════════════════════════════════════════════════════════════════════════
 */

export default function Relance({
  ligne,
  demo,
  onFait,
}: {
  ligne: LigneDossier;
  demo?: boolean;
  onFait: (message: string) => void;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  /* Échap referme, un clic ailleurs aussi : un panneau armé qu'on oublie sur
     une ligne pendant qu'on lit ailleurs est un piège. Même règle,
     volontairement, que celle d'`ActionRapide`. */
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        setErreur(null);
      }
    };
    const surClic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) {
        setOuvert(false);
        setErreur(null);
      }
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("mousedown", surClic);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("mousedown", surClic);
    };
  }, [ouvert]);

  const r = ligne.relance;
  if (!r.possible && !r.pertinent) return null;

  async function envoyer() {
    if (demo) {
      setOuvert(false);
      onFait("Démonstration : aucune relance n'est partie.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/admin/atelier/relance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ligne.token }),
      });
      const data = (await rep.json()) as { message?: string; raison?: string; error?: string };
      if (!rep.ok) {
        /* La raison vient du serveur et s'affiche telle quelle : c'est lui
           qui a relu l'état du dossier à l'instant du clic, pas cet écran. */
        setErreur(data.raison ?? "La relance n'est pas partie.");
        setOccupe(false);
        /* L'écran est en retard sur la base — on le remet à jour pour que le
           bouton reflète ce que le serveur vient de dire. */
        router.refresh();
        return;
      }
      setOuvert(false);
      onFait(data.message ?? "Relance envoyée.");
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu.");
    } finally {
      setOccupe(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="ate-act" ref={boite}>
        <button
          type="button"
          className={
            r.possible
              ? "ate-act-btn ate-relance-btn"
              : "ate-act-btn ate-relance-btn ate-relance-btn--eteint"
          }
          title={r.possible ? r.libelle : r.raison}
          onClick={() => setOuvert(true)}
        >
          Relancer
        </button>
      </div>
    );
  }

  return (
    <div className="ate-act ate-act--armee" ref={boite}>
      <div className="ate-act-boite">
        {r.possible ? (
          <>
            <p className="ate-act-quoi">
              {r.libelle}
              {r.rang > 1 ? <span className="ate-faint"> (il en a déjà reçu {r.rang - 1})</span> : null}
            </p>
            {/* La dernière chose lue avant de confirmer, comme pour les
                transitions : ce qu'il va VRAIMENT recevoir. */}
            <p className="ate-act-mail">
              Il recevra « {r.objet} ».
              <span className="ate-faint"> Écrit dans le journal, signé.</span>
            </p>
          </>
        ) : (
          <p className="ate-act-quoi">{r.raison}</p>
        )}

        {erreur ? <p className="ate-act-erreur">{erreur}</p> : null}

        <div className="ate-act-boutons">
          <button
            type="button"
            className="ate-act-btn ate-act-btn--annuler"
            onClick={() => {
              setOuvert(false);
              setErreur(null);
            }}
          >
            {r.possible ? "Annuler" : "Fermer"}
          </button>
          {r.possible ? (
            <button
              type="button"
              className="ate-act-btn ate-act-btn--confirmer"
              disabled={occupe}
              onClick={envoyer}
            >
              {occupe ? "…" : "Envoyer la relance"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
