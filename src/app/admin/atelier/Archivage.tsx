"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VerdictSuppression } from "@/lib/atelier/archive";

/**
 * Archiver, récupérer, supprimer un dossier (T-113, 14/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX VARIANTES, UNE RÈGLE
 *
 *   « fiche »   vivant : un bouton discret « Archiver », armé en deux temps
 *               (il dit ce qui va se passer, attend un second clic).
 *               archivé : un bandeau, avec « Récupérer » d'un clic (ça ne
 *               casse rien) et « Supprimer définitivement », armé, rouge,
 *               qui liste ce qui part et pourquoi c'est sans retour.
 *   « ligne »   dans la liste, sous le filtre « Archivés » : « Récupérer »
 *               seulement. Supprimer se fait sur la fiche, où l'on VOIT ce
 *               qu'on supprime.
 *
 * La règle (peut-on supprimer, et que faut-il savoir) vient du serveur
 * (archive.ts) : le composant l'affiche, il ne la réinvente pas. Et le
 * serveur la relit au clic : un écran qui a vieilli ne décide de rien.
 * ══════════════════════════════════════════════════════════════════════════
 */

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

export default function Archivage({
  token,
  archiveLe,
  absent,
  suppression,
  nbPhotos,
  demo,
  variante,
}: {
  token: string;
  archiveLe: string | null;
  /** La migration 20260914 n'est pas passée. */
  absent?: boolean;
  suppression?: VerdictSuppression;
  nbPhotos?: number;
  demo?: boolean;
  variante: "fiche" | "ligne";
}) {
  const router = useRouter();
  const [arme, setArme] = useState<"archiver" | "supprimer" | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const boite = useRef<HTMLDivElement | null>(null);

  /* Échap et un clic ailleurs désarment : même règle que les actions. */
  useEffect(() => {
    if (!arme) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setArme(null);
    };
    const surClic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setArme(null);
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("mousedown", surClic);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("mousedown", surClic);
    };
  }, [arme]);

  async function archiver(archiverOuiNon: boolean) {
    if (demo) {
      setArme(null);
      setErreur("Démonstration : rien n'a été écrit.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/archiver", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, archiver: archiverOuiNon }),
      });
      if (r.status === 503) throw new Error("migration");
      if (!r.ok) throw new Error("archiver");
      setArme(null);
      router.refresh();
    } catch (e) {
      setErreur(
        (e as Error)?.message === "migration"
          ? "La migration 20260914 n'est pas passée sur cette base."
          : "Le changement n'a pas été enregistré. Réessaie.",
      );
    } finally {
      setOccupe(false);
    }
  }

  async function supprimer() {
    if (demo) {
      setArme(null);
      setErreur("Démonstration : rien n'a été supprimé.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/supprimer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const corps = (await r.json().catch(() => ({}))) as { raison?: string; echecs?: number; supprimes?: number };
      if (r.status === 503) throw new Error("La migration 20260914 n'est pas passée sur cette base.");
      if (r.status === 422) throw new Error(corps.raison ?? "Refusé.");
      if (r.status === 502)
        throw new Error(
          `Le coffre n'a pas tout rendu (${corps.echecs} objet(s) restent). Rien n'a été retiré en base : réessaie.`,
        );
      if (!r.ok) throw new Error("La suppression a échoué. Réessaie.");
      router.push("/admin/atelier");
      router.refresh();
    } catch (e) {
      setErreur((e as Error)?.message || "La suppression a échoué.");
      setOccupe(false);
    }
  }

  /* ── dans la liste ── */
  if (variante === "ligne") {
    return (
      <span className="ate-arch-ligne">
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => archiver(false)} disabled={occupe}>
          {occupe ? "…" : "Récupérer"}
        </button>
        {erreur ? <span className="ate-arch-erreur">{erreur}</span> : null}
      </span>
    );
  }

  /* ── sur la fiche, dossier vivant ── */
  if (!archiveLe) {
    return (
      <div className="ate-rangement" ref={boite}>
        {arme === "archiver" ? (
          <div className="ate-arch-boite">
            <p className="ate-act-quoi">
              Le dossier sort de la table de travail, des mails automatiques et de la page du client.
              Rien n&apos;est effacé : « Récupérer » le remet exactement comme il est.
            </p>
            {erreur ? <p className="ate-act-erreur">{erreur}</p> : null}
            <div className="ate-arch-boutons">
              <button type="button" className="adm-btn" onClick={() => archiver(true)} disabled={occupe}>
                {occupe ? "…" : "Oui, archiver"}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArme(null)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="ate-arch-lien"
            onClick={() => {
              setErreur(null);
              setArme("archiver");
            }}
            disabled={absent}
            title={absent ? "La migration 20260914 n'est pas passée sur cette base." : undefined}
          >
            Archiver ce dossier
          </button>
        )}
        {erreur && arme !== "archiver" ? <p className="ate-arch-erreur">{erreur}</p> : null}
      </div>
    );
  }

  /* ── sur la fiche, dossier archivé ── */
  const verdict = suppression ?? { possible: false as const, raison: "Verdict inconnu." };
  return (
    <div className="ate-bandeau ate-bandeau--archive" ref={boite}>
      <div className="ate-arch-tete">
        <span>
          <strong>Archivé</strong> le {fmt(archiveLe)}. Invisible dans la table de travail, ignoré par les
          mails automatiques, sa page client répond « introuvable ». Rien n&apos;est effacé.
        </span>
        <span className="ate-arch-boutons">
          <button type="button" className="adm-btn" onClick={() => archiver(false)} disabled={occupe}>
            {occupe && arme !== "supprimer" ? "…" : "Récupérer"}
          </button>
          <button
            type="button"
            className="adm-btn ate-btn-danger"
            onClick={() => {
              setErreur(null);
              setArme("supprimer");
            }}
            disabled={!verdict.possible || arme === "supprimer"}
            title={verdict.possible ? undefined : verdict.raison}
          >
            Supprimer définitivement
          </button>
        </span>
      </div>

      {!verdict.possible ? <p className="ate-arch-raison">{verdict.raison}</p> : null}

      {arme === "supprimer" && verdict.possible ? (
        <div className="ate-arch-boite ate-arch-boite--danger">
          <p className="ate-act-quoi">
            <strong>Sans retour.</strong> Ce qui part : {nbPhotos ?? 0} photo{(nbPhotos ?? 0) > 1 ? "s" : ""} et
            tous les fichiers du coffre (vignettes, planches, PDF), puis le dossier lui-même avec son journal,
            ses notes et ses mails. Le lien du client ne mènera plus nulle part.
          </p>
          {verdict.avertissements.map((a) => (
            <p key={a} className="ate-act-quoi ate-arch-avert">
              {a}
            </p>
          ))}
          {erreur ? <p className="ate-act-erreur">{erreur}</p> : null}
          <div className="ate-arch-boutons">
            <button type="button" className="adm-btn ate-btn-danger" onClick={supprimer} disabled={occupe}>
              {occupe ? "Suppression…" : "Supprimer pour de bon"}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArme(null)} disabled={occupe}>
              Annuler
            </button>
          </div>
        </div>
      ) : erreur ? (
        <p className="ate-act-erreur">{erreur}</p>
      ) : null}
    </div>
  );
}
