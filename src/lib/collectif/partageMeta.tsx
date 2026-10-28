/* Ce qu'un lien du collectif montre quand on le colle dans un message
   (WhatsApp, iMessage, mail) : le nom de l'événement, rien du produit
   particulier, aucun prix. `imagePartage` fabrique l'image, sans police
   téléchargée (la leçon du 15/09 : une police injoignable fait échouer l'image).

   ⚠️ Un lien inconnu, fermé ou archivé donne `metaNeutre` : « Bellajour », et
   AUCUNE information sur l'édition (pas d'annuaire, PRD §10). */

import { ImageResponse } from "next/og";
import type { Metadata } from "next";
import type { Registre } from "./types";

export const TAILLE_PARTAGE = { width: 1200, height: 630 } as const;

export type TeteDePartage = { evenement: string; registre: Registre };

const NEUTRE = "Bellajour";

/** Les balises d'un lien sans édition lisible : le nom de la maison, c'est tout. */
export function metaNeutre(): Metadata {
  return {
    title: NEUTRE,
    description: NEUTRE,
    robots: { index: false, follow: false, nocache: true },
    openGraph: { title: NEUTRE, description: NEUTRE, url: "/", siteName: NEUTRE, type: "website", locale: "fr_FR" },
    twitter: { card: "summary_large_image", title: NEUTRE, description: NEUTRE },
  };
}

/** Les balises d'un lien lisible. `deposer` : le lien des participants ; sinon l'espace du responsable. */
export function metaDeLEdition(t: TeteDePartage, deposer: boolean): Metadata {
  const titre = `${t.evenement} · Bellajour`;
  const tu = t.registre === "ecole_tu";
  const description = deposer
    ? tu
      ? "Dépose tes photos pour le magazine."
      : "Déposez vos photos pour le magazine."
    : tu
      ? "Ton espace pour le magazine."
      : "Votre espace pour le magazine.";
  return {
    title: titre,
    description,
    robots: { index: false, follow: false, nocache: true },
    /* `url: "/"` : l'origine seule (metadataBase), jamais le token ni `?p=`. */
    openGraph: { title: titre, description, url: "/", siteName: NEUTRE, type: "website", locale: "fr_FR" },
    twitter: { card: "summary_large_image", title: titre, description },
  };
}

/** Taille de police selon la longueur, pour que le nom tienne en deux lignes au plus. */
function tailleDuNom(nom: string): number {
  const n = nom.length;
  if (n <= 14) return 150;
  if (n <= 28) return 110;
  if (n <= 52) return 80;
  return 60;
}

/** L'image 1200×630 : le nom de l'événement en grand, « Bellajour » discret. */
export function imagePartage(evenement: string | null): ImageResponse {
  const nom = evenement ? evenement.trim().slice(0, 90) : "";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0e0e10",
          color: "#f5f0e7",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: nom ? tailleDuNom(nom) : 120,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            maxHeight: 360,
            overflow: "hidden",
          }}
        >
          {nom || NEUTRE}
        </div>
        {nom ? (
          <div style={{ display: "flex", marginTop: 44, fontSize: 34, letterSpacing: "0.32em", textTransform: "uppercase", color: "#d68a63" }}>
            Bellajour
          </div>
        ) : null}
      </div>
    ),
    { ...TAILLE_PARTAGE }
  );
}
