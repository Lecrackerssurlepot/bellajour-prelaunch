"use client";

import { useEffect, useState } from "react";
import type { ReponsePhotosMep } from "../typesPhotos";

/* La preuve que le dossier se charge : son nom, son état, le compte et une
   grille de vignettes. Rien d'autre tant que la maquette de l'éditeur n'est
   pas arrivée. Lecture seule (GET), aucune écriture. */

type Etat =
  | { phase: "chargement" }
  | { phase: "erreur"; message: string; reessayer: boolean }
  | { phase: "pret"; donnees: ReponsePhotosMep };

const MESSAGES: Record<number, string> = {
  401: "Session expirée.",
  404: "Dossier introuvable.",
};

export default function PhotosDossier({
  token,
  libelles,
}: {
  token: string;
  libelles: Record<string, string>;
}) {
  const [etat, setEtat] = useState<Etat>({ phase: "chargement" });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(
      `/api/admin/atelier/mise-en-page/photos?token=${encodeURIComponent(token)}`,
      {
        cache: "no-store",
        signal: ctrl.signal,
      },
    )
      .then(async (r) => {
        if (!r.ok) {
          setEtat({
            phase: "erreur",
            message: MESSAGES[r.status] ?? "Chargement impossible.",
            reessayer: !(r.status in MESSAGES),
          });
          return;
        }
        setEtat({
          phase: "pret",
          donnees: (await r.json()) as ReponsePhotosMep,
        });
      })
      .catch((e: unknown) => {
        if ((e as Error)?.name === "AbortError") return;
        setEtat({
          phase: "erreur",
          message: "Réseau injoignable.",
          reessayer: true,
        });
      });
    return () => ctrl.abort();
  }, [token, essai]);

  if (etat.phase === "chargement") {
    return (
      <div aria-busy="true" aria-live="polite">
        <header className="mep-tete">
          <div>
            <h1 className="ate-h1">
              <span className="mep-sq mep-sq--nom" />
            </h1>
            <p className="ate-bonjour">Chargement des photos…</p>
          </div>
        </header>
        <ul className="mep-vignettes" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <li key={i} className="mep-sq mep-sq--vignette" />
          ))}
        </ul>
      </div>
    );
  }

  if (etat.phase === "erreur") {
    return (
      <div className="mep-erreur" role="alert">
        <p>{etat.message}</p>
        {etat.reessayer ? (
          <button
            className="adm-btn adm-btn--ghost"
            type="button"
            onClick={() => {
              setEtat({ phase: "chargement" });
              setEssai((n) => n + 1);
            }}
          >
            Réessayer
          </button>
        ) : null}
      </div>
    );
  }

  const d = etat.donnees;
  const nom =
    d.titre?.trim() || d.prenom?.trim() || `Dossier ${d.token.slice(0, 8)}`;
  const n = d.photos.length;

  return (
    <>
      <header className="mep-tete">
        <div>
          <h1 className="ate-h1">{nom}</h1>
          <p className="ate-bonjour mep-sous-titre">
            <span className="mep-dossier-etat">
              {libelles[d.etat] ?? d.etat}
            </span>
            <span>
              {n === 0
                ? "Aucune photo"
                : `${n} photo${n > 1 ? "s" : ""} chargée${n > 1 ? "s" : ""}`}
            </span>
          </p>
        </div>
      </header>
      {n > 0 ? (
        <ul className="mep-vignettes">
          {d.photos.map((p) => {
            const src = p.urlVignette ?? p.url;
            return (
              <li
                key={p.id}
                className="mep-vignette"
                title={p.nom ?? undefined}
              >
                {src ? (
                  <img
                    src={src}
                    alt={p.nom ?? ""}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span>Illisible</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
