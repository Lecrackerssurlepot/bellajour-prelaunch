"use client";

/* Les magazines d'une édition, une poubelle sur chaque ligne (T-190, planche 10 du
   19/10 au soir, validée par Mathias : « la renumérotation des magazines dans les
   réglages me va »).

   - À la création, rien n'existe : chaque ligne se retire, les numéros se resserrent.
   - En réglages, un magazine ENCORE VIDE se retire ; les suivants prennent le numéro
     libéré à l'enregistrement. Sur un magazine que le client a commencé, la poubelle
     est grisée : au survol (ou au toucher, sur téléphone) elle dit pourquoi et propose
     de le renommer. La règle est `retraitMagazine` (saisie.ts), relue par le PATCH
     (`planMagazines`), qui répond 409 si le magazine a été commencé entre-temps.
   - Il reste toujours au moins un magazine. */

import { Fragment, useId, useRef, useState } from "react";
import { MAX_MAGAZINES, retirerMagazine, retraitMagazine, type EtiquetteMagazine } from "@/lib/collectif/saisie";

export type MagazineFormulaire = {
  id: string | null;
  nom: string;
  vide: boolean;
  /** Où en est le client (réglages seulement) : « vide », « brief validé »… */
  etiquette?: EtiquetteMagazine;
  /** Une clé d'écran pour une ligne pas encore enregistrée (React garde le bon champ). */
  cle?: string;
};

type Props = {
  magazines: MagazineFormulaire[];
  onChange: (magazines: MagazineFormulaire[]) => void;
  invalide: boolean;
};

function Poubelle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export default function ListeMagazines({ magazines, onChange, invalide }: Props) {
  const uid = useId();
  const compteur = useRef(0);
  /* La bulle d'une poubelle grisée ouverte au toucher (le survol suffit à la souris, en CSS). */
  const [bulle, setBulle] = useState<string | null>(null);

  const cleDe = (m: MagazineFormulaire, i: number) => m.id ?? m.cle ?? `n${i}`;

  return (
    <>
      <div className="eca-fm-mags" role="group" aria-label="Les magazines">
        {magazines.map((m, i) => {
          const cle = cleDe(m, i);
          const retrait = retraitMagazine(m, magazines.length);
          const nom = m.nom.trim() || `le magazine ${i + 1}`;
          const idBulle = `${uid}-bulle-${i}`;
          return (
            <Fragment key={cle}>
              <div className="eca-fm-mag">
                <span className="eca-fm-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="eca-fm-nom">
                  <input
                    className="eca-input"
                    value={m.nom}
                    placeholder="Le séminaire, la soirée…"
                    aria-label={`Nom du magazine ${i + 1}`}
                    aria-invalid={invalide && !m.nom.trim() ? true : undefined}
                    onChange={(e) => onChange(magazines.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)))}
                  />
                  {m.etiquette ? (
                    <span className={`eca-fm-etat eca-fm-etat--${m.etiquette.ton}`}>{m.etiquette.texte}</span>
                  ) : null}
                </span>
                {retrait.ok ? (
                  <button
                    type="button"
                    className="eca-fm-poubelle"
                    aria-label={`Retirer « ${nom} »`}
                    title={`Retirer « ${nom} »`}
                    onClick={() => {
                      setBulle(null);
                      onChange(retirerMagazine(magazines, i));
                    }}
                  >
                    <Poubelle />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="eca-fm-poubelle eca-fm-poubelle--off"
                    aria-disabled="true"
                    aria-label={`« ${nom} » ne se retire pas`}
                    aria-describedby={idBulle}
                    aria-expanded={bulle === cle}
                    onClick={() => setBulle((b) => (b === cle ? null : cle))}
                  >
                    <Poubelle />
                  </button>
                )}
              </div>
              {retrait.ok ? null : (
                <p id={idBulle} className="eca-fm-bulle" hidden={bulle !== cle}>
                  {retrait.raison}
                </p>
              )}
            </Fragment>
          );
        })}
      </div>
      <div>
        <button
          type="button"
          className="eca-bouton eca-fm-ajouter"
          disabled={magazines.length >= MAX_MAGAZINES}
          onClick={() => {
            compteur.current += 1;
            onChange([...magazines, { id: null, nom: "", vide: true, cle: `a${compteur.current}` }]);
          }}
        >
          + Ajouter un magazine
        </button>
      </div>
    </>
  );
}
