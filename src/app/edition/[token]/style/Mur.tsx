"use client";

/* Le mur des styles (PRD §4.2, révision §14.6, D24 et les maquettes « Tout,
   en vrac », « Typographies », « Modifier une partie » validées le 14/10 ;
   T-179, planches 1 et 2 du 19/10 validées par Mathias).

   Un écran sans défilement de page : en tête le titre et les magazines (leur
   état), puis le mur, sur TOUTE la largeur, qui défile chez lui, et en bas la
   barre de la composition, toujours visible.
   - « Tout » montre toutes les pièces de tous les styles MÊLÉES. Chaque pièce
     dit d'où elle vient, s'ajoute d'un clic, et « Voir tout le style » ouvre
     le style en entier (on peut le prendre en entier).
   - Une catégorie met d'abord le choix du client, puis ce qui va avec ses
     choix (la raison dite), puis le reste (`grouperParChoix`).
   - Une pièce choisie se voit de loin (cadre, sceau, « Retirer »).
   - Chaque geste se DIT au-dessus de la barre et s'ANNULE : l'inverse
     (`gesteInverse`) repasse par le même chemin (`jouer`, `envoyer`), vérifié
     par les mêmes règles.
   - « Voir ma composition » ouvre la composition en grand (la feuille) ;
     « Modifier » sur une case ouvre SEULEMENT cette partie dans le panneau
     latéral, et « Terminé » ramène à la feuille.
   Chaque geste s'affiche aussitôt et revient en arrière, avec une phrase, si
   le serveur refuse. Lecture seule pour l'équipe, et pour tout le monde après
   la clôture : la barre et la feuille se lisent, aucun geste.
   La colonne « Votre composition » d'avant est archivée
   (`archive/composition-colonne-2026-10/`). */

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { compositionDu, grouperParChoix, manquesBrief, PARTS_TEXTE, pieceChoisie, type BriefLigne, type Genre } from "@/lib/collectif/brief";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import type { MagazineMur, StyleMur } from "../donnees";
import CartePiece from "./CartePiece";
import { Annonce, BarreComposition, FeuilleComposition, type AnnonceVue } from "./Composition";
import {
  annonceDuGeste,
  compositionVide,
  etatDuMagazine,
  genre,
  GENRES,
  gesteDeLaPiece,
  gesteInverse,
  ligneDeLaBarre,
  nomPalette,
  nomTypos,
  piecesDuGenre,
  piecesEnVrac,
  preparerGeste,
  type Geste,
  type Partie,
  type PieceVue,
} from "./pieces";
import "./style.css";

export type { Partie } from "./pieces";

type Filtre = "tout" | Genre;

type Props = {
  token: string;
  styles: StyleMur[];
  magazines: MagazineMur[];
  rangInitial: number;
  ecrire: boolean;
  fige: boolean;
  aimeesMax: number | null;
  tu: boolean;
  /** `/style/brief?partie=…` : la partie dont le panneau s'ouvre d'emblée. */
  partieInitiale?: Partie | null;
};

/** Combien de temps une annonce reste, sans qu'on la retienne. */
const DUREE_ANNONCE_MS = 6000;

/** L'annonce affichée, avec ce qu'il faut pour la défaire. */
type AnnonceGeste = AnnonceVue & { inverse: Geste | null; magId: string };

export default function Mur(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [rang, setRang] = useState(p.rangInitial);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [partie, setPartie] = useState<Partie | null>(p.partieInitiale ?? null);
  const [feuille, setFeuille] = useState(false);
  /** Le panneau d'une partie a été ouvert depuis la feuille : « Terminé » y ramène. */
  const [retourFeuille, setRetourFeuille] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [annonce, setAnnonce] = useState<AnnonceGeste | null>(null);
  const minuteur = useRef<number | null>(null);
  const boutonVoir = useRef<HTMLButtonElement>(null);
  /* La copie locale des briefs : chaque geste s'affiche tout de suite. */
  const [briefs, setBriefs] = useState<Record<string, BriefLigne>>(() => Object.fromEntries(p.magazines.map((m) => [m.id, m])));

  const mag = p.magazines.find((m) => m.rang === rang) ?? p.magazines[0];
  const b = mag ? briefs[mag.id] : null;
  const c = useMemo(() => (b ? compositionDu(b) : null), [b]);
  const peutAgir = p.ecrire && !p.fige;
  const manques = b ? manquesBrief(b) : [];
  const nbValides = p.magazines.filter((m) => briefs[m.id]?.brief_valide_le).length;
  const tousValides = p.magazines.length > 0 && nbValides === p.magazines.length;
  const suivant = p.magazines.find((m) => m.rang > rang && !briefs[m.id]?.brief_valide_le) ?? p.magazines.find((m) => !briefs[m.id]?.brief_valide_le && m.rang !== rang);
  const vide = c ? compositionVide(c) : true;
  /* Un autre magazine dont on peut reprendre la composition : la route ne reprend que palette, typographies ou doubles pages. */
  const source = p.magazines.find((m) => {
    if (m.rang === rang || !briefs[m.id]) return false;
    const s = compositionDu(briefs[m.id]);
    return Boolean(s.palette || s.typos || s.doubles.length);
  });
  const lienStyle = (slug: string) => `/edition/${p.token}/style/${slug}?m=${rang}`;

  /* ── l'annonce : elle part seule, sauf si on la retient (survol, focus) ── */
  function lancerMinuteur(ms: number) {
    if (minuteur.current !== null) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setAnnonce(null), ms);
  }
  function annoncer(a: AnnonceGeste | null) {
    if (minuteur.current !== null) window.clearTimeout(minuteur.current);
    minuteur.current = null;
    setAnnonce(a);
    if (a) lancerMinuteur(DUREE_ANNONCE_MS);
  }
  function retenir() {
    if (minuteur.current !== null) window.clearTimeout(minuteur.current);
    minuteur.current = null;
  }
  function relacher() {
    if (annonce) lancerMinuteur(DUREE_ANNONCE_MS / 2);
  }

  async function envoyer(magId: string, corps: Record<string, unknown>, apres: Partial<BriefLigne>) {
    const avant = briefs[magId];
    if (!avant) return;
    setBriefs((x) => ({ ...x, [magId]: { ...avant, ...apres } }));
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, magazineId: magId, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setBriefs((x) => ({ ...x, [magId]: avant }));
        annoncer(null);
        setErreur(json.message ?? `Non enregistré (erreur ${rep.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setBriefs((x) => ({ ...x, [magId]: avant }));
      annoncer(null);
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
    } finally {
      setOccupe(false);
    }
  }

  /**
   * Un geste sur la composition d'un magazine : vérifié ici par les MÊMES
   * règles que le serveur avant de partir (`preparerGeste`), dit dans
   * l'annonce, et annulable par son inverse quand il en a un. « Annuler »
   * rejoue l'inverse par ce même chemin, sans nouvel « Annuler ».
   */
  function jouer(g: Geste, magId: string, annulable: boolean) {
    const bl = briefs[magId];
    const m = p.magazines.find((x) => x.id === magId);
    if (!bl || !m || !peutAgir) return;
    const pret = preparerGeste(g, bl, p.styles, p.aimeesMax, new Date().toISOString());
    if (!pret.ok) {
      annoncer(null);
      setErreur(pret.message);
      return;
    }
    const avant = compositionDu(bl);
    const inverse = annulable ? gesteInverse(g, avant) : null;
    annoncer({ texte: annonceDuGeste(g, avant, p.styles, Boolean(bl.brief_valide_le), m.rang), annulable: inverse !== null, inverse, magId });
    void envoyer(magId, pret.corps, pret.patch);
  }

  function annuler() {
    if (annonce?.inverse) jouer(annonce.inverse, annonce.magId, false);
  }

  function agirSur(piece: PieceVue) {
    if (!mag || !c) return;
    const g = gesteDeLaPiece(piece, c);
    if (g) jouer(g, mag.id, true);
  }

  function reprendre() {
    if (!mag || !source) return;
    const s = briefs[source.id];
    annoncer({ texte: `Composition du magazine ${source.rang} reprise.`, annulable: false, inverse: null, magId: mag.id });
    void envoyer(
      mag.id,
      { action: "reprendre", depuisMagazineId: source.id },
      { style_id: s.style_id, palette_cle: s.palette_cle, texte: s.texte, doubles: s.doubles, palette_style_id: s.palette_style_id, typo_style_id: s.typo_style_id, doubles_aimes: s.doubles_aimes, brief_valide_le: null }
    );
  }

  function ouvrirFeuille() {
    setErreur(null);
    setFeuille(true);
  }
  function fermerFeuille() {
    setFeuille(false);
    boutonVoir.current?.focus();
  }
  /** « Modifier » sur une case de la feuille : le panneau de CETTE partie, puis retour à la feuille. */
  function modifierDepuisFeuille(x: Partie) {
    setErreur(null);
    setFeuille(false);
    setRetourFeuille(true);
    setPartie(x);
  }
  function fermerPanneau() {
    setPartie(null);
    if (retourFeuille) {
      setRetourFeuille(false);
      setFeuille(true);
    }
  }

  const carte = (piece: PieceVue, raison?: string) => {
    const choisie = c ? pieceChoisie(c, piece) : false;
    const remplace =
      !c || choisie
        ? null
        : piece.genre === "palette" && c.palette
          ? v(`Remplacera votre palette ${nomPalette(p.styles, c.palette.style_id, c.palette.cle)}`, `Remplacera ta palette ${nomPalette(p.styles, c.palette.style_id, c.palette.cle)}`)
          : piece.genre === "typos" && c.typos
            ? v(`Remplacera vos typographies ${nomTypos(p.styles, c.typos.style_id)}`, `Remplacera tes typographies ${nomTypos(p.styles, c.typos.style_id)}`)
            : null;
    return (
      <CartePiece
        key={piece.id}
        piece={piece}
        choisie={choisie}
        raison={raison}
        remplace={remplace}
        peutAgir={peutAgir}
        occupe={occupe}
        tu={p.tu}
        lienStyle={lienStyle(piece.style.slug)}
        onAgir={() => agirSur(piece)}
      />
    );
  };

  /** Une catégorie rangée : le choix, ce qui va avec, le reste. */
  function categorie(g: Genre, dansPanneau: boolean) {
    if (!c) return null;
    const groupes = grouperParChoix(piecesDuGenre(p.styles, g), c);
    const titre = genre(g).plusieurs.toLowerCase();
    const grille = g === "couverture" ? "ec-pieces" : "ec-pieces ec-pieces--larges";
    return (
      <>
        {groupes.choisies.length || groupes.avec.length ? (
          <section className="ec-mur-groupe">
            <h3 className="ec-mur-groupe-titre">{dansPanneau ? v("Votre choix, et ce qui va avec", "Ton choix, et ce qui va avec") : "Avec vos choix"}</h3>
            <div className={grille}>
              {groupes.choisies.map((x) => carte(x, v("Votre choix", "Ton choix")))}
              {groupes.avec.map((x) => carte(x.piece, x.raison))}
            </div>
          </section>
        ) : null}
        {groupes.autres.length ? (
          <section className="ec-mur-groupe">
            <h3 className="ec-mur-groupe-titre">{groupes.choisies.length || groupes.avec.length ? `Les autres ${titre}` : `Toutes les ${titre}`}</h3>
            <div className={grille}>{groupes.autres.map((x) => carte(x))}</div>
          </section>
        ) : null}
      </>
    );
  }

  const consigne =
    filtre === "tout"
      ? "Une pièce ici, une autre là, de n'importe quel style. « Voir tout le style » montre l'ensemble."
      : filtre === "couverture"
        ? v(
            `Aimez-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`,
            `Aimes-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`
          )
        : v("Votre choix d'abord, puis ce qui va avec vos autres choix.", "Ton choix d'abord, puis ce qui va avec tes autres choix.");

  const zoneAnnonce = (dansUnPied: boolean) => (
    <Annonce annonce={annonce} occupe={occupe} dansUnPied={dansUnPied} onAnnuler={annuler} onRetenir={retenir} onRelacher={relacher} />
  );
  const repriseVue = vide && peutAgir && source ? { rang: source.rang, occupe, onReprendre: reprendre } : null;

  return (
    <section className="ec-ecran ec-mur">
      <EnTeteEcran titre="Le style" sous={v("Composez librement, une pièce à la fois", "Compose librement, une pièce à la fois")}>
        {p.magazines.length ? (
          <div className="ec-mur-mags" role="group" aria-label="Magazine">
            {p.magazines.map((m) => (
              <button key={m.id} type="button" className="ec-mur-mag" aria-pressed={m.rang === rang} onClick={() => setRang(m.rang)}>
                <span>
                  Magazine {m.rang} · {m.nom}
                </span>
                <small className={briefs[m.id]?.brief_valide_le ? "ec-mur-mag-etat ec-st-ok" : "ec-mur-mag-etat"}>{briefs[m.id] ? etatDuMagazine(briefs[m.id]) : "À composer"}</small>
              </button>
            ))}
          </div>
        ) : null}
      </EnTeteEcran>

      <div className="ec-mur-corps">
        <div className="ec-mur-mur ec-defile">
          <div className="ec-mur-outils">
            <nav className="ec-onglets" aria-label="Filtrer le mur">
              <button type="button" className="ec-onglet" aria-pressed={filtre === "tout"} onClick={() => setFiltre("tout")}>
                Tout
              </button>
              {GENRES.map((g) => (
                <button key={g.cle} type="button" className="ec-onglet" aria-pressed={filtre === g.cle} onClick={() => setFiltre(g.cle)}>
                  {g.plusieurs}
                </button>
              ))}
            </nav>
            <p className="ec-mur-consigne">{consigne}</p>
          </div>

          {p.styles.length === 0 ? (
            <div className="ec-a-venir">
              <p className="ec-texte">Les styles arrivent sur ce mur dès que l&apos;atelier les publie.</p>
            </div>
          ) : filtre === "tout" ? (
            <div className="ec-pieces ec-pieces--vrac">{piecesEnVrac(p.styles).map((x) => carte(x))}</div>
          ) : (
            categorie(filtre, false)
          )}
        </div>

        {mag && b && c ? (
          <div className="ec-mur-bas">
            {!partie && !feuille ? (
              <>
                {erreur ? (
                  <div className="ec-mur-annonce-zone">
                    <p className="ec-mur-annonce ec-mur-annonce--erreur" role="alert">
                      <span>{erreur}</span>
                      <button type="button" onClick={() => setErreur(null)}>
                        Fermer
                      </button>
                    </p>
                  </div>
                ) : (
                  zoneAnnonce(false)
                )}
              </>
            ) : null}
            <BarreComposition c={c} styles={p.styles} rang={mag.rang} ligne={ligneDeLaBarre(b)} tu={p.tu} boutonRef={boutonVoir} onOuvrir={ouvrirFeuille} reprendre={repriseVue} />
          </div>
        ) : null}
      </div>

      {feuille && mag && b && c ? (
        <FeuilleComposition
          b={b}
          c={c}
          mag={mag}
          styles={p.styles}
          aimeesMax={p.aimeesMax}
          tu={p.tu}
          peutAgir={peutAgir}
          ecrire={p.ecrire}
          fige={p.fige}
          occupe={occupe}
          erreur={erreur}
          manques={manques}
          suivant={suivant ? suivant.rang : null}
          tousValides={tousValides}
          annonce={zoneAnnonce(true)}
          reprendre={repriseVue}
          onFermer={fermerFeuille}
          onModifier={modifierDepuisFeuille}
          onValider={() => jouer({ quoi: "valider" }, mag.id, true)}
          onRouvrir={() => jouer({ quoi: "devalider" }, mag.id, true)}
          onPasser={() => {
            if (!suivant) return;
            setFeuille(false);
            setRang(suivant.rang);
          }}
        />
      ) : null}

      {partie && c && mag ? (
        <Fenetre
          cote
          titre={partie === "texte" ? "La place du texte" : genre(partie).panneau}
          sous={v("Seulement ce que vous modifiez. Votre choix reste en haut.", "Seulement ce que tu modifies. Ton choix reste en haut.")}
          onFermer={fermerPanneau}
          pied={
            <>
              <div className="ec-mur-pied-gauche">
                {zoneAnnonce(true)}
                {annonce ? null : <span className="ec-note">{occupe ? "Enregistrement…" : "Enregistré à chaque clic"}</span>}
              </div>
              <button type="button" className="ec-bouton" onClick={fermerPanneau}>
                Terminé
              </button>
            </>
          }
        >
          {erreur ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </p>
          ) : null}
          {partie === "texte" ? (
            <div className="ec-mur-textes" role="radiogroup" aria-label="La place du texte">
              {PARTS_TEXTE.map((t) => (
                <button
                  key={t.cle}
                  type="button"
                  role="radio"
                  aria-checked={c.texte === t.cle}
                  className="ec-mur-texte"
                  disabled={!peutAgir || occupe}
                  onClick={() => {
                    if (c.texte !== t.cle) jouer({ quoi: "texte", texte: t.cle }, mag.id, true);
                  }}
                >
                  {t.libelle}
                </button>
              ))}
            </div>
          ) : (
            categorie(partie, true)
          )}
        </Fenetre>
      ) : null}
    </section>
  );
}
