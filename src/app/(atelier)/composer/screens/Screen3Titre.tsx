'use client'

/* Écran 3 — « Donnez un titre à votre numéro. »
   Le champ écrit EN DIRECT dans les deux couvertures d'exemple.

   ⚠️ LE SAUT A ÉTÉ RETIRÉ (28/08/2026). « Je ne sais pas encore, choisissez
   pour moi » posait un titre nul en base, et l'atelier héritait d'un dossier
   nommé « Sans titre » dans sa table de travail. Personne ne choisissait à sa
   place : la promesse était creuse, et elle a été prise au mot dès le premier
   dossier venu de l'extérieur. Le titre se change de toute façon plus tard.

   ⚠️ LES COUVERTURES SONT REDEVENUES UN CHOIX LE 15/09/2026 (T-091), et
   cette fois le choix compte. Il faut connaître l'aller-retour pour ne pas
   le refaire à l'envers :
   — à l'origine (PRD §7.3) deux couvertures d'exemple, cliquables mais sans
     effet : « rien ne s'enregistre, aucune sélection n'a de conséquence » ;
   — lot 4 (07/09) : le clic est RETIRÉ, parce qu'un bouton qui ne fait rien
     est le « dead click » que Mathias reproche au site. Elles deviennent de
     simples aperçus ; sur téléphone une seule s'affiche ;
   — 15/09 : quatre modèles réels remplacent les deux dessins CSS, le clic
     revient AVEC son effet (le choix part à l'atelier), et une cinquième
     case dit « aucune préférence ». Le grief du lot 4 est réglé non pas en
     enlevant le clic, mais en lui donnant une conséquence.

   Le titre du client ne s'écrit pas encore SUR ces visuels : il y faut les
   fichiers de police des quatre lettrages. Voir `coverModels.ts`.

   NOUVEAU 03/09 — les mots de couverture facultatifs : un sous-titre pour la
   première de couverture, un mot pour la quatrième. Repliés par défaut
   derrière un déplieur discret : la question de l'écran reste LE titre. */

import { useState } from 'react'
import {
  COVER_MODELS, MODELE_AUCUN, MODELE_LARGEURS, modeleSrcSet, TITRE_MAX, TITRE_PLACEHOLDER,
} from '../coverModels'

export const SOUS_TITRE_MAX = 80
export const MOT_QUATRIEME_MAX = 160

export default function Screen3Titre({
  value, onChange, sousTitre, motQuatrieme, onExtra, modele, onModele,
}: {
  value: string
  onChange: (v: string) => void
  sousTitre: string
  motQuatrieme: string
  onExtra: (champ: 'sousTitre' | 'motQuatrieme', v: string) => void
  modele: string
  onModele: (v: string) => void
}) {
  /* Déplié d'office si un brouillon porte déjà un des deux mots : un champ
     rempli ne doit jamais être caché derrière son propre déplieur. */
  const [extras, setExtras] = useState(() => Boolean(sousTitre || motQuatrieme))

  return (
    <>
      <p className="at-kicker">Le titre</p>
      <h2>Donnez un titre<br />à votre numéro.</h2>
      <p className="at-lede at-q-lede">
        Il sera imprimé sur la couverture. Vous pourrez encore le changer plus tard.
      </p>

      <input
        className="at-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={TITRE_PLACEHOLDER}
        autoComplete="off"
        maxLength={TITRE_MAX}
        aria-label="Titre du numéro"
      />

      <div className="at-extras">
        {!extras ? (
          <button type="button" className="at-extras-ouvrir" onClick={() => setExtras(true)}>
            <span aria-hidden="true">+</span> D’autres mots sur la couverture (facultatif)
          </button>
        ) : (
          <>
            <span className="at-extras-titre">D’autres mots sur la couverture (facultatif)</span>
            <label className="at-lbl" htmlFor="at-t-soustitre">Sous-titre · première de couverture</label>
            <input
              id="at-t-soustitre"
              className="at-inp"
              value={sousTitre}
              onChange={(e) => onExtra('sousTitre', e.target.value)}
              maxLength={SOUS_TITRE_MAX}
              autoComplete="off"
            />
            <label className="at-lbl" htmlFor="at-t-quatrieme">Un mot · quatrième de couverture</label>
            <input
              id="at-t-quatrieme"
              className="at-inp"
              value={motQuatrieme}
              onChange={(e) => onExtra('motQuatrieme', e.target.value)}
              placeholder="« À la bande. »"
              maxLength={MOT_QUATRIEME_MAX}
              autoComplete="off"
            />
          </>
        )}
      </div>

      {/* ── LE STYLE (15/09/2026, T-091) ───────────────────────────────────
          Les deux couvertures dessinées en CSS deviennent quatre modèles
          livrés par l'atelier graphique, et le choix EST enregistré : « on
          vise déjà juste sur ses goûts ».

          ⚠️ FACULTATIF, ET ÇA DOIT SE VOIR. Le questionnaire exige ses six
          champs (garantie nº1) ; celui-ci n'en fait pas partie. Le mot
          « facultatif » est dans le chapeau, la cinquième case dit « aucune
          préférence » en toutes lettres, et ne rien cocher n'empêche jamais
          de passer à l'écran suivant.

          ⚠️ Ces vignettes SONT cliquables, contrairement aux aperçus qu'elles
          remplacent — le « dead click » reproché au site le 07/09 venait de
          boutons sans effet. Ici le clic fait quelque chose, et l'état
          sélectionné se voit. */}
      <p className="at-covers-chapeau">
        Un style vous parle déjà&nbsp;? <span>Facultatif — et l’atelier composera le vôtre avec vos photos.</span>
      </p>
      <div className="at-covers" role="group" aria-label="Style de couverture">
        {COVER_MODELS.map((m) => {
          const actif = modele === m.id
          return (
            <button
              key={m.id}
              type="button"
              className={`at-cov ${actif ? 'is-on' : ''}`}
              aria-pressed={actif}
              onClick={() => onModele(actif ? '' : m.id)}
            >
              <img
                className="at-cov-img"
                src={`/images/v2/composer/${m.image}-${MODELE_LARGEURS[1]}.webp`}
                srcSet={modeleSrcSet(m.image)}
                sizes="(max-width: 720px) 28vw, 112px"
                width={336}
                height={475}
                alt={`Couverture « ${m.titreOrigine} », style ${m.tag.toLowerCase()}`}
                loading="lazy"
                decoding="async"
              />
              <span className="at-cov-tag">{m.tag}</span>
            </button>
          )
        })}

        {/* La cinquième case. Elle a la forme des quatre autres pour qu'on
            comprenne qu'elle est une réponse, pas un bouton d'annulation. */}
        <button
          type="button"
          className={`at-cov at-cov--aucun ${modele === MODELE_AUCUN ? 'is-on' : ''}`}
          aria-pressed={modele === MODELE_AUCUN}
          onClick={() => onModele(modele === MODELE_AUCUN ? '' : MODELE_AUCUN)}
        >
          <span className="at-cov-aucun-boite">
            <span className="at-cov-aucun-t">Aucune préférence</span>
          </span>
          <span className="at-cov-tag">Surprenez-moi</span>
        </button>
      </div>
    </>
  )
}
