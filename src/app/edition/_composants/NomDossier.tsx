"use client";

/* Le nom d'un dossier de photos qui se change d'un DOUBLE CLIC (retours du
   14/10, point 3, maquette Contenus) : le nom devient un champ, Entrée garde,
   Échap annule, quitter le champ garde aussi. Au clavier : Entrée ou F2 sur le
   nom. Sans droit (l'équipe) ou pour le lien général, c'est un simple texte. */

import { useEffect, useRef, useState } from "react";
import { focusSiClavierPhysique } from "@/lib/pointeur";

export default function NomDossier({
  token,
  cle,
  nom,
  renommable,
  onRenomme,
}: {
  token: string;
  /** La clé de la source (sources.ts). */
  cle: string;
  nom: string;
  renommable: boolean;
  onRenomme: () => void;
}) {
  const [edition, setEdition] = useState(false);
  const [valeur, setValeur] = useState(nom);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  /* Au doigt, pas de focus d'office : le clavier ne doit pas s'ouvrir seul. */
  useEffect(() => {
    if (edition) focusSiClavierPhysique(champ.current);
  }, [edition]);
  /* Le nouveau nom se montre TOUT DE SUITE, tant que la page n'a pas relu le
     sien (la relecture ne se fait pas toujours aussitôt, vu le 14/10). */
  const [garde, setGarde] = useState<{ pour: string; nom: string } | null>(null);
  const affiche = garde && garde.pour === nom ? garde.nom : nom;
  /* Entrée garde, et le champ qui perd la main pendant l'envoi garderait une
     seconde fois : un seul envoi à la fois. */
  const enCours = useRef(false);

  if (!renommable) return <strong className="ec-nom-dossier">{nom}</strong>;

  async function garder() {
    if (enCours.current) return;
    const propre = valeur.trim();
    if (!propre || propre === affiche) {
      setEdition(false);
      setValeur(affiche);
      return;
    }
    enCours.current = true;
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/dossiers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, cle, nom: propre }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setErreur(json.message ?? "Nom non changé.");
        return;
      }
      setEdition(false);
      setGarde({ pour: nom, nom: propre });
      onRenomme();
    } catch {
      setErreur("Pas de réseau. Nom non changé.");
    } finally {
      enCours.current = false;
      setOccupe(false);
    }
  }

  if (edition) {
    return (
      <span className="ec-nom-dossier-edition">
        <input
          className="ec-champ ec-nom-dossier-champ"
          value={valeur}
          maxLength={80}
          ref={champ}
          disabled={occupe}
          aria-label="Nouveau nom du dossier"
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setValeur(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void garder();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              setEdition(false);
              setValeur(affiche);
              setErreur(null);
            }
          }}
          onBlur={() => void garder()}
        />
        <span className={erreur ? "ec-note ec-note--erreur" : "ec-note"}>{erreur ?? <span className="pour-souris">Entrée pour valider</span>}</span>
      </span>
    );
  }

  return (
    <strong
      className="ec-nom-dossier ec-nom-dossier--renommable"
      tabIndex={0}
      role="button"
      title="Changer le nom"
      aria-label={`${affiche}, appuyez sur Entrée pour changer le nom`}
      onDoubleClick={() => {
        setValeur(affiche);
        setEdition(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          setValeur(affiche);
          setEdition(true);
        }
      }}
    >
      {affiche}
    </strong>
  );
}
