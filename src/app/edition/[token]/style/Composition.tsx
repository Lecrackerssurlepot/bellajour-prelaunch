"use client";

/* La composition d'un magazine, EN IMAGES (T-179, planches 1 et 2 du 19/10
   validées par Mathias : « un récap caché qui, quand on l'ouvre, est
   vraiment visuellement beau, et on comprend ce qu'on avait choisi »).

   - `BarreComposition` : en bas du mur, toujours visible pendant qu'on fait
     défiler (pleine largeur en bas sur téléphone). Les choix en vignettes
     (couvertures, pastilles rondes de la palette, « Aa », doubles pages ;
     une case en pointillés pour ce qui manque), la ligne d'état et « Voir ma
     composition ».
   - `Annonce` : chaque geste se DIT (`role="status"`), avec « Annuler ».
   - `FeuilleComposition` : la composition ouverte, une grande feuille
     par-dessus le mur (plein écran sur téléphone). Une case par partie,
     chacune avec « Modifier » (le panneau d'une partie qui existe déjà), et
     la validation en bas : on valide en regardant l'ensemble.

   La feuille s'ouvre dans `.ec-contenu` par un PORTAIL, comme `Fenetre`
   (un panneau de verre enferme ce qui est positionné dedans). Lecture seule
   (lien d'équipe) et après la clôture : tout se lit, aucun geste. */

import { useEffect, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { DOUBLES_MAX, PARTS_TEXTE, type BriefLigne, type Composition } from "@/lib/collectif/brief";
import type { StyleMur } from "../donnees";
import { listeEnFrancais, phraseDesStyles, visuelsDe, type Partie } from "./pieces";

const rien = () => () => {};

/** Ce qui est annoncé après un geste, et le geste qui le défait (ou rien). */
export type AnnonceVue = { texte: string; annulable: boolean };

/** L'annonce d'un geste : « Palette Marine ajoutée. Elle remplace Sable. Annuler ». */
export function Annonce({
  annonce,
  occupe,
  dansUnPied,
  onAnnuler,
  onRetenir,
  onRelacher,
}: {
  annonce: AnnonceVue | null;
  occupe: boolean;
  /** Dans le pied de la feuille ou du panneau d'une partie (sinon : au-dessus de la barre). */
  dansUnPied?: boolean;
  onAnnuler: () => void;
  /** Le survol ou le focus retient l'annonce ; elle repart quand on s'en va. */
  onRetenir: () => void;
  onRelacher: () => void;
}) {
  return (
    <div className={dansUnPied ? "ec-mur-annonce-zone ec-mur-annonce-zone--pied" : "ec-mur-annonce-zone"} role="status" aria-live="polite">
      {annonce ? (
        <div className="ec-mur-annonce" onMouseEnter={onRetenir} onMouseLeave={onRelacher} onFocus={onRetenir} onBlur={onRelacher}>
          <span>{annonce.texte}</span>
          {annonce.annulable ? (
            <button type="button" disabled={occupe} onClick={onAnnuler}>
              Annuler
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** La barre de la composition, en bas du mur (planche 1). */
export function BarreComposition({
  c,
  styles,
  rang,
  ligne,
  tu,
  boutonRef,
  onOuvrir,
  reprendre,
}: {
  c: Composition;
  styles: readonly StyleMur[];
  rang: number;
  ligne: string;
  tu: boolean;
  boutonRef: React.Ref<HTMLButtonElement>;
  onOuvrir: () => void;
  /** « Reprendre la composition du magazine N » : la composition est vide, un autre magazine en a une. */
  reprendre: { rang: number; occupe: boolean; onReprendre: () => void } | null;
}) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const vu = visuelsDe(c, styles);
  return (
    <div className="ec-mur-barre">
      <div className="ec-mur-mini" aria-hidden="true">
        {vu.couvertures.map((x) => (
          <span key={x.cle} className="ec-mur-mini-couv">
            {x.url ? <img src={x.url} alt="" decoding="async" /> : null}
          </span>
        ))}
        {vu.palette ? (
          <span className="ec-mur-mini-ronds">
            {vu.palette.couleurs.map((x, i) => (
              <i key={i} style={{ background: x }} />
            ))}
          </span>
        ) : (
          <span className="ec-mur-mini-vide" title="Palette à choisir" />
        )}
        {vu.typos ? <span className="ec-mur-mini-aa">Aa</span> : <span className="ec-mur-mini-vide" title="Typographies à choisir" />}
        {vu.doubles.length ? (
          vu.doubles.map((x) => (
            <span key={x.cle} className="ec-mur-mini-double">
              {x.url ? <img src={x.url} alt="" decoding="async" /> : null}
            </span>
          ))
        ) : (
          <span className="ec-mur-mini-vide ec-mur-mini-vide--double" title="Double page à choisir" />
        )}
      </div>
      <div className="ec-mur-quoi">
        <b>
          {v("Votre composition", "Ta composition")} · Magazine {rang}
        </b>
        <span>{ligne}</span>
      </div>
      {reprendre ? (
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit ec-mur-reprendre" disabled={reprendre.occupe} onClick={reprendre.onReprendre}>
          Reprendre la composition du magazine {reprendre.rang}
        </button>
      ) : null}
      <button type="button" ref={boutonRef} className="ec-bouton ec-bouton--petit ec-mur-voir" aria-haspopup="dialog" onClick={onOuvrir}>
        Voir ma composition
      </button>
    </div>
  );
}

/** La coquille de la feuille : voile, portail dans `.ec-contenu`, Échap. */
function Feuille({ titreId, onFermer, children }: { titreId: string; onFermer: () => void; children: React.ReactNode }) {
  const client = useSyncExternalStore(rien, () => true, () => false);
  useEffect(() => {
    function touche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onFermer]);
  const feuille = (
    <div className="ec-fenetre-voile ec-compo-voile" role="presentation" onClick={onFermer}>
      <div className="ec-compo" role="dialog" aria-modal="true" aria-labelledby={titreId} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
  const hote = client ? document.querySelector(".ec-contenu") : null;
  return hote ? createPortal(feuille, hote) : feuille;
}

/** La composition ouverte (planche 2). */
export function FeuilleComposition({
  b,
  c,
  mag,
  styles,
  aimeesMax,
  tu,
  peutAgir,
  ecrire,
  fige,
  occupe,
  erreur,
  manques,
  suivant,
  tousValides,
  annonce,
  reprendre,
  onFermer,
  onModifier,
  onValider,
  onRouvrir,
  onPasser,
}: {
  b: BriefLigne;
  c: Composition;
  mag: { rang: number; nom: string };
  styles: readonly StyleMur[];
  aimeesMax: number | null;
  tu: boolean;
  peutAgir: boolean;
  ecrire: boolean;
  fige: boolean;
  occupe: boolean;
  erreur: string | null;
  manques: string[];
  suivant: number | null;
  tousValides: boolean;
  annonce: React.ReactNode;
  reprendre: { rang: number; occupe: boolean; onReprendre: () => void } | null;
  onFermer: () => void;
  onModifier: (partie: Partie) => void;
  onValider: () => void;
  onRouvrir: () => void;
  onPasser: () => void;
}) {
  const id = useId();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const vu = visuelsDe(c, styles);
  const noms = [...new Set([vu.palette?.style, vu.typos?.style, ...vu.doubles.map((x) => x.style), ...vu.couvertures.map((x) => x.style)].filter((x): x is string => Boolean(x)))];
  const places = aimeesMax !== null ? Math.max(0, aimeesMax - vu.couvertures.length) : 0;
  const valide = Boolean(b.brief_valide_le);
  const texte = PARTS_TEXTE.find((t) => t.cle === c.texte)?.libelle ?? null;

  /** « Modifier » ouvre le panneau de CETTE partie ; une case vide dit « Choisir ». */
  const modifier = (partie: Partie, fait: boolean) =>
    peutAgir ? (
      <button type="button" className="ec-compo-modifier" onClick={() => onModifier(partie)}>
        {fait ? "Modifier" : "Choisir"}
      </button>
    ) : null;

  return (
    <Feuille titreId={id} onFermer={onFermer}>
      <div className="ec-compo-tete">
        <div className="ec-compo-titres">
          <span className="ec-compo-sur">
            Magazine {mag.rang} · {mag.nom}
          </span>
          <h2 className="ec-compo-titre" id={id}>
            {v("Votre composition", "Ta composition")}
          </h2>
          <p className="ec-compo-styles">{phraseDesStyles(noms, tu)}</p>
        </div>
        <button type="button" className="ec-compo-fermer" onClick={onFermer} autoFocus>
          Fermer <span aria-hidden="true">✕</span>
        </button>
      </div>

      <div className="ec-compo-corps">
        {reprendre ? (
          <div className="ec-compo-reprendre">
            <span>{`Le magazine ${reprendre.rang} a déjà sa composition.`}</span>
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={reprendre.occupe} onClick={reprendre.onReprendre}>
              Reprendre la composition du magazine {reprendre.rang}
            </button>
          </div>
        ) : null}

        <div className="ec-compo-planche">
          <section className="ec-compo-case" aria-label="Couvertures aimées">
            <div className="ec-compo-case-tete">
              <h3 className="ec-compo-case-titre">
                Couvertures aimées · {vu.couvertures.length}
                {aimeesMax !== null ? ` sur ${aimeesMax}` : ""}
              </h3>
              {modifier("couverture", vu.couvertures.length > 0)}
            </div>
            <div className="ec-compo-couvs">
              {vu.couvertures.map((x) => (
                <figure key={x.cle}>
                  <div className="ec-compo-couv">{x.url ? <img src={x.url} alt={`Couverture du style ${x.style}`} decoding="async" /> : null}</div>
                  <figcaption>de {x.style}</figcaption>
                </figure>
              ))}
              {Array.from({ length: places }, (_, i) => (
                <div key={`place-${i}`} className="ec-compo-place ec-compo-place--couv">
                  {i === 0 ? (!peutAgir ? "Facultatif" : vu.couvertures.length ? v("Une de plus, si vous voulez", "Une de plus, si tu veux") : v("Facultatif : aimez-en une sur le mur", "Facultatif : aimes-en une sur le mur")) : null}
                </div>
              ))}
            </div>
            {aimeesMax === null ? <p className="ec-compo-origine">Le nombre de couvertures aimées n&apos;est pas encore réglé par l&apos;atelier.</p> : null}
          </section>

          <section className="ec-compo-case" aria-label="La palette">
            <div className="ec-compo-case-tete">
              <h3 className="ec-compo-case-titre">La palette{vu.palette ? ` · ${vu.palette.nom}` : ""}</h3>
              {modifier("palette", Boolean(vu.palette))}
            </div>
            {vu.palette ? (
              <>
                <div className="ec-compo-nuancier">
                  {vu.palette.couleurs.map((x, i) => (
                    <div key={i}>
                      <span className="ec-compo-teinte" style={{ background: x }} />
                      <span className="ec-compo-code">{x.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <span className="ec-compo-origine">du style {vu.palette.style}</span>
              </>
            ) : (
              <div className="ec-compo-place ec-compo-place--case">{peutAgir ? v("À choisir : prenez une palette sur le mur.", "À choisir : prends une palette sur le mur.") : "Pas encore choisie."}</div>
            )}
          </section>

          <section className="ec-compo-case" aria-label="Les typographies">
            <div className="ec-compo-case-tete">
              <h3 className="ec-compo-case-titre">Les typographies</h3>
              {modifier("typos", Boolean(vu.typos))}
            </div>
            {vu.typos ? (
              <div className="ec-compo-specimen">
                {vu.typos.echantillon ? (
                  <img className="ec-compo-echantillon" src={vu.typos.echantillon} alt={`Échantillon des typographies ${vu.typos.polices}`} decoding="async" />
                ) : (
                  <span className="ec-compo-aa">Aa</span>
                )}
                <p className="ec-compo-polices">
                  {vu.typos.titres && vu.typos.texte ? `${vu.typos.titres} pour les titres, ${vu.typos.texte} pour le reste.` : `${vu.typos.polices}.`}
                </p>
                <span className="ec-compo-origine">du style {vu.typos.style}</span>
              </div>
            ) : (
              <div className="ec-compo-place ec-compo-place--case">{peutAgir ? v("À choisir : prenez des typographies sur le mur.", "À choisir : prends des typographies sur le mur.") : "Pas encore choisies."}</div>
            )}
          </section>

          <section className="ec-compo-case" aria-label="Doubles pages et place du texte">
            <div className="ec-compo-case-tete">
              <h3 className="ec-compo-case-titre">Doubles pages · {vu.doubles.length}</h3>
              {modifier("double", vu.doubles.length > 0)}
            </div>
            <div className="ec-compo-doubles">
              {vu.doubles.map((x) => (
                <figure key={x.cle}>
                  <div className="ec-compo-double">{x.url ? <img src={x.url} alt={`Double page ${x.libelle}, du style ${x.style}`} decoding="async" /> : null}</div>
                  <figcaption>
                    {x.libelle} · {x.style}
                  </figcaption>
                </figure>
              ))}
              {vu.doubles.length < DOUBLES_MAX ? (
                <div className="ec-compo-place ec-compo-place--double">{vu.doubles.length ? `+ jusqu'à ${DOUBLES_MAX}` : `Au moins une, jusqu'à ${DOUBLES_MAX}`}</div>
              ) : null}
            </div>

            <div className="ec-compo-case-tete ec-compo-case-tete--suite">
              <h3 className="ec-compo-case-titre">La place du texte</h3>
              {modifier("texte", Boolean(texte))}
            </div>
            <div className="ec-compo-jauge" role="img" aria-label={`La place du texte : ${texte ?? "à choisir"}`}>
              {PARTS_TEXTE.map((t) => (
                <span key={t.cle} className={c.texte === t.cle ? "ec-compo-cran ec-compo-cran--choisi" : "ec-compo-cran"}>
                  {t.libelle}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="ec-compo-pied">
        <div className="ec-compo-pied-etat">
          {valide ? (
            <span className="ec-compo-pastille ec-compo-pastille--ok">
              <span aria-hidden="true">✓</span> Brief validé
            </span>
          ) : manques.length ? (
            <span className="ec-compo-pastille">Il manque {listeEnFrancais(manques)}.</span>
          ) : (
            <span className="ec-compo-pastille ec-compo-pastille--ok">
              <span aria-hidden="true">✓</span>
              {" Tout ce qu'il faut est choisi"}
            </span>
          )}
          {valide && peutAgir ? <span className="ec-compo-note">L&apos;atelier compose avec cette composition. Changer une pièce la remet à valider.</span> : null}
          {fige ? (
            <span className="ec-compo-note">La collecte est close : l&apos;atelier compose avec ce brief.</span>
          ) : !ecrire ? (
            <span className="ec-compo-note">{v("Lecture seule : vous voyez tout, sans rien modifier.", "Lecture seule : tu vois tout, sans rien modifier.")}</span>
          ) : null}
          {tousValides ? <span className="ec-compo-note">Tous les briefs sont validés. L&apos;atelier commence la composition dès que les photos sont réunies.</span> : null}
          {erreur ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </p>
          ) : null}
          {annonce}
        </div>
        <div className="ec-compo-gestes">
          {!peutAgir ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={onFermer}>
              Fermer
            </button>
          ) : valide ? (
            <>
              <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={onRouvrir}>
                Rouvrir le brief
              </button>
              {suivant !== null ? (
                <button type="button" className="ec-bouton ec-bouton--petit" onClick={onPasser}>
                  Passer au magazine {suivant} →
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={onFermer}>
                Continuer à composer
              </button>
              <button type="button" className="ec-bouton ec-bouton--petit" disabled={occupe || manques.length > 0} onClick={onValider}>
                Valider le brief du magazine {mag.rang}
              </button>
            </>
          )}
        </div>
      </div>
    </Feuille>
  );
}
