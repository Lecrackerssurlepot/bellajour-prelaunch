"use client";

/* Un chiffre du formulaire d'une édition, en pastille : « − 30 photos par personne + »
   (T-190, planche 11 du 19/10 au soir, validée par Mathias). Il remplace le champ
   numérique du navigateur et ses petites flèches.

   - L'unité vit DANS la pastille ; le nombre se tape toujours au clavier (chiffres
     seulement, flèches haut et bas pour un de plus ou de moins).
   - VIDE reste vide : la valeur part en texte vide et la base la garde à `null`
     (« à fixer »). Aucun chiffre n'est proposé d'avance ; « + » sur un champ vide
     part du minimum du champ (1 au moins), « − » ne descend jamais sous ce minimum.
   - Des valeurs fréquentes en un clic, là où la maquette en montre (`VALEURS_RAPIDES`,
     saisie.ts) : des raccourcis, jamais une valeur par défaut. */

import { useState, type CSSProperties } from "react";

type Props = {
  id: string;
  /** Le texte du champ : des chiffres, ou vide. */
  valeur: string;
  onChange: (valeur: string) => void;
  /** « photos par personne », « pages »… Affichée dès qu'un nombre est là. */
  unite: string;
  min: number;
  /** Facultatif : un plafond (l'heure d'ouverture du dépôt tient entre 0 et 23). Les autres pastilles n'en ont pas. */
  max?: number;
  /** Ce qu'on lit quand c'est vide : « à fixer », « facultatif ». */
  vide: string;
  /** Pour les boutons : « Moins, Par personne ». */
  libelle: string;
  invalide?: boolean;
  rapides?: readonly number[];
};

/** Au plus neuf chiffres : la colonne est un entier, et 2 milliards la ferait déborder. */
const chiffres = (t: string) => t.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
/** « 2000 » → « 2 000 » (espace insécable), tel que la planche l'écrit. */
const grouper = (t: string) => t.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default function Pastille(p: Props) {
  const [focus, setFocus] = useState(false);
  const n = p.valeur === "" ? null : Number(p.valeur);
  const affiche = focus ? p.valeur : grouper(p.valeur);
  const plancher = Math.max(p.min, 0);
  const moins = () => {
    if (n !== null && n > plancher) p.onChange(String(n - 1));
  };
  const plafond = p.max ?? Infinity;
  const plus = () => {
    if (n !== null && n >= plafond) return;
    p.onChange(String(n === null ? Math.min(Math.max(plancher, 1), plafond) : n + 1));
  };
  /* Un nombre tapé au-delà du plafond s'y arrête (les chiffres seuls passent déjà par `chiffres`). */
  const saisi = (t: string) => {
    const c = chiffres(t);
    return c !== "" && Number(c) > plafond ? String(plafond) : c;
  };
  const largeur = { "--eca-fm-chiffres": Math.max(1, (affiche || p.vide).length) } as CSSProperties;

  return (
    <>
      <span className={`eca-fm-pas${p.invalide ? " eca-fm-pas--erreur" : ""}${n === null ? " eca-fm-pas--vide" : ""}`}>
        <button type="button" aria-label={`Moins, ${p.libelle}`} disabled={n === null || n <= plancher} onClick={moins}>
          −
        </button>
        <span className="eca-fm-pas-val">
          <input
            id={p.id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={affiche}
            placeholder={p.vide}
            style={largeur}
            aria-invalid={p.invalide ? true : undefined}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            onChange={(e) => p.onChange(saisi(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                plus();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                moins();
              }
            }}
          />
          {n === null ? null : <span className="eca-fm-pas-unite">{p.unite}</span>}
        </span>
        <button type="button" aria-label={`Plus, ${p.libelle}`} disabled={n !== null && n >= plafond} onClick={plus}>
          +
        </button>
      </span>
      {p.rapides?.length ? (
        <span className="eca-fm-rapides" role="group" aria-label={`Valeurs fréquentes, ${p.libelle}`}>
          {p.rapides.map((r) => (
            <button key={r} type="button" aria-pressed={n === r} onClick={() => p.onChange(String(r))}>
              {r}
            </button>
          ))}
        </span>
      ) : null}
    </>
  );
}
