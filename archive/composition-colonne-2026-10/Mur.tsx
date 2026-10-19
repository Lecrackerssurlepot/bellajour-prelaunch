"use client";

/* Le mur des styles (PRD §4.2, révision §14.6, D24 et les maquettes « Tout,
   en vrac », « Typographies », « Modifier une partie » validées le 14/10).

   Un écran sans défilement de page : le bandeau des magazines (leur état),
   puis le mur qui défile chez lui et, à droite, VOTRE COMPOSITION, fixe.
   - « Tout » montre toutes les pièces de tous les styles MÊLÉES : une
     couverture ici, une typographie là, une palette ailleurs. Chaque pièce
     dit d'où elle vient, s'ajoute d'un clic, et « Voir tout le style » ouvre
     le style en entier (on peut le prendre en entier).
   - Une catégorie met d'abord le choix du client, puis ce qui va avec ses
     choix (la raison dite), puis le reste (`grouperParChoix`).
   - « Modifier » sur une ligne de la composition ouvre SEULEMENT cette
     partie dans un panneau latéral, le choix en haut ; « Terminé » revient.
   Chaque geste s'affiche aussitôt et revient en arrière, avec une phrase, si
   le serveur refuse. Lecture seule pour l'équipe, et pour tout le monde après
   la clôture. */

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  basculerCouverture,
  compositionDu,
  etatDuBrief,
  grouperParChoix,
  lirePiece,
  lireTexte,
  manquesBrief,
  nomPiece,
  PARTS_TEXTE,
  patchCouvertures,
  pieceChoisie,
  stylesDeLaComposition,
  type BriefLigne,
  type Genre,
} from "@/lib/collectif/brief";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import type { MagazineMur, StyleMur } from "../donnees";
import CartePiece from "./CartePiece";
import { genre, GENRES, piecesDuGenre, piecesEnVrac, styleBrief, type PieceVue } from "./pieces";
import "./style.css";

type Filtre = "tout" | Genre;
export type Partie = Genre | "texte";

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

/** « Riviera (2) et Atlas » : deux pièces du même style ne répètent pas son nom. */
function nomsGroupes(noms: string[]): string {
  const comptes = new Map<string, number>();
  for (const n of noms) comptes.set(n, (comptes.get(n) ?? 0) + 1);
  return [...comptes].map(([n, k]) => (k > 1 ? `${n} (${k})` : n)).join(" et ");
}

export default function Mur(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [rang, setRang] = useState(p.rangInitial);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [partie, setPartie] = useState<Partie | null>(p.partieInitiale ?? null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
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
  const nomStyle = (id: string) => p.styles.find((s) => s.id === id)?.nom ?? "un style retiré du mur";
  const nomsStyles = (bl: BriefLigne) => stylesDeLaComposition(compositionDu(bl)).map(nomStyle);
  const vide = c ? !c.palette && !c.typos && !c.doubles.length && !c.couvertures.length : true;
  const source = p.magazines.find((m) => m.rang !== rang && briefs[m.id] && stylesDeLaComposition(compositionDu(briefs[m.id])).length > 0);
  const lienStyle = (slug: string) => `/edition/${p.token}/style/${slug}?m=${rang}`;

  async function envoyer(corps: Record<string, unknown>, apres: Partial<BriefLigne>) {
    if (!mag || !b) return;
    const avant = b;
    setBriefs((x) => ({ ...x, [mag.id]: { ...avant, ...apres } }));
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, magazineId: mag.id, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setBriefs((x) => ({ ...x, [mag.id]: avant }));
        setErreur(json.message ?? `Non enregistré (erreur ${rep.status}).`);
        return;
      }
      router.refresh();
    } catch {
      setBriefs((x) => ({ ...x, [mag.id]: avant }));
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
    } finally {
      setOccupe(false);
    }
  }

  /** Le geste d'une pièce, vérifié ici par les MÊMES règles que le serveur avant de partir. */
  function agirSur(piece: PieceVue) {
    if (!b || !c) return;
    const choisie = pieceChoisie(c, piece);
    if (piece.genre === "couverture") {
      const r = basculerCouverture(c.couvertures, { style_id: piece.style_id, couverture: piece.cle }, !choisie, p.aimeesMax, styleBrief(piece.style));
      if (!r.ok) return setErreur(r.message);
      void envoyer({ action: "couverture", styleId: piece.style_id, couverture: piece.cle, aimer: !choisie }, patchCouvertures(c.couvertures, r.aimees) as Partial<BriefLigne>);
      return;
    }
    const corps = { genre: piece.genre, styleId: piece.style_id, palette_cle: piece.cle, double: piece.cle, ajouter: !choisie };
    const r = lirePiece(piece.genre, corps, styleBrief(piece.style), c);
    if (!r.ok) return setErreur(r.message);
    void envoyer({ action: "piece", ...corps }, r.patch as Partial<BriefLigne>);
  }

  function choisirTexte(cle: string) {
    const r = lireTexte({ texte: cle });
    if (!r.ok) return setErreur(r.message);
    void envoyer({ action: "texte", texte: cle }, r.patch as Partial<BriefLigne>);
  }

  const carte = (piece: PieceVue, raison?: string) => (
    <CartePiece
      key={piece.id}
      piece={piece}
      choisie={c ? pieceChoisie(c, piece) : false}
      raison={raison}
      peutAgir={peutAgir}
      occupe={occupe}
      lienStyle={lienStyle(piece.style.slug)}
      onAgir={() => agirSur(piece)}
    />
  );

  /** Une catégorie rangée : le choix, ce qui va avec, le reste. */
  function categorie(g: Genre, dansPanneau: boolean) {
    if (!c) return null;
    const groupes = grouperParChoix(piecesDuGenre(p.styles, g), c);
    const titre = genre(g).plusieurs.toLowerCase();
    return (
      <>
        {groupes.choisies.length || groupes.avec.length ? (
          <section className="ec-mur-groupe">
            <h3 className="ec-mur-groupe-titre">{dansPanneau ? v("Votre choix, et ce qui va avec", "Ton choix, et ce qui va avec") : "Avec vos choix"}</h3>
            <div className={g === "couverture" ? "ec-pieces" : "ec-pieces ec-pieces--larges"}>
              {groupes.choisies.map((x) => carte(x, v("Votre choix", "Ton choix")))}
              {groupes.avec.map((x) => carte(x.piece, x.raison))}
            </div>
          </section>
        ) : null}
        {groupes.autres.length ? (
          <section className="ec-mur-groupe">
            <h3 className="ec-mur-groupe-titre">{groupes.choisies.length || groupes.avec.length ? `Les autres ${titre}` : `Toutes les ${titre}`}</h3>
            <div className={g === "couverture" ? "ec-pieces" : "ec-pieces ec-pieces--larges"}>{groupes.autres.map((x) => carte(x))}</div>
          </section>
        ) : null}
      </>
    );
  }

  const lignes: { partie: Partie; titre: string; valeur: string; fait: boolean; facultatif?: boolean }[] =
    c && b
      ? [
          {
            partie: "couverture",
            titre: `Couvertures aimées, ${c.couvertures.length}${p.aimeesMax !== null ? ` sur ${p.aimeesMax}` : ""}`,
            valeur: c.couvertures.length ? nomsGroupes(c.couvertures.map((a) => nomStyle(a.style_id))) : "Facultatif, de n'importe quel style.",
            fait: c.couvertures.length > 0,
            facultatif: true,
          },
          {
            partie: "typos",
            titre: "Typographies",
            valeur: c.typos ? `${p.styles.find((s) => s.id === c.typos?.style_id)?.typos.titres ?? "Les typographies"}, ${nomPiece("typos", c.typos.style_id, p.styles)}` : "À choisir",
            fait: Boolean(c.typos),
          },
          {
            partie: "palette",
            titre: "Palette",
            valeur: c.palette ? nomPiece("palette", c.palette.style_id, p.styles, c.palette.cle) : "À choisir",
            fait: Boolean(c.palette),
          },
          {
            partie: "double",
            titre: `Doubles pages, ${c.doubles.length}`,
            valeur: c.doubles.length ? c.doubles.map((d) => nomPiece("double", d.style_id, p.styles, d.double)).join(", ") : "Au moins une à choisir",
            fait: c.doubles.length > 0,
          },
          {
            partie: "texte",
            titre: "La place du texte",
            valeur: PARTS_TEXTE.find((t) => t.cle === c.texte)?.libelle ?? "À choisir",
            fait: Boolean(c.texte),
          },
        ]
      : [];
  const melange = c ? stylesDeLaComposition(c).length : 0;
  const consigne =
    filtre === "tout"
      ? v(
          "Prenez une couverture ici, une typographie là, une palette ailleurs. Chaque pièce dit d'où elle vient ; « Voir tout le style » montre l'ensemble.",
          "Prends une couverture ici, une typographie là, une palette ailleurs. Chaque pièce dit d'où elle vient ; « Voir tout le style » montre l'ensemble."
        )
      : filtre === "couverture"
        ? v(
            `Aimez-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`,
            `Aimes-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`
          )
        : v("Votre choix d'abord, puis ce qui va avec vos autres choix.", "Ton choix d'abord, puis ce qui va avec tes autres choix.");

  return (
    <section className="ec-ecran ec-mur">
      <EnTeteEcran titre="Le style" sous={v("Composez librement, une pièce à la fois", "Compose librement, une pièce à la fois")} />

      {p.magazines.length ? (
        <div className="ec-st-mags">
          <span className="ec-st-etiquette">{v("Vous préparez", "Tu prépares")}</span>
          <div className="ec-st-mags-liste" role="group" aria-label="Magazine">
            {p.magazines.map((m) => (
              <button key={m.id} type="button" className="ec-st-mag" aria-pressed={m.rang === rang} onClick={() => setRang(m.rang)}>
                <span>
                  Magazine {m.rang} · {m.nom}
                </span>
                <span className={briefs[m.id]?.brief_valide_le ? "ec-st-mag-etat ec-st-ok" : "ec-st-mag-etat"}>
                  {etatDuBrief({ valide: Boolean(briefs[m.id]?.brief_valide_le), styles: briefs[m.id] ? nomsStyles(briefs[m.id]) : [] })}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ec-mur-corps">
        <div className="ec-mur-mur ec-defile">
          <div className="ec-mur-intro">
            <h2 className="ec-st-grand">{filtre === "tout" ? "Tout, en vrac" : genre(filtre).plusieurs}</h2>
            <p className="ec-texte">{consigne}</p>
          </div>
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

          {erreur && !partie ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </p>
          ) : null}

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
          <aside className="ec-mur-brief ec-defile" aria-labelledby="ec-brief-titre">
            <div className="ec-mur-brief-tete">
              <h2 className="ec-st-titre" id="ec-brief-titre">
                {v("Votre composition", "Ta composition")}
              </h2>
              <span className="ec-st-accent">
                Magazine {mag.rang} · {nbValides} brief{nbValides > 1 ? "s" : ""} validé{nbValides > 1 ? "s" : ""} sur {p.magazines.length}
              </span>
              <span className="ec-note">{v("Vos choix d'abord, d'où qu'ils viennent. L'atelier accorde l'ensemble.", "Tes choix d'abord, d'où qu'ils viennent. L'atelier accorde l'ensemble.")}</span>
            </div>

            {vide && peutAgir && source ? (
              <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => {
                  const s = briefs[source.id];
                  void envoyer(
                    { action: "reprendre", depuisMagazineId: source.id },
                    { style_id: s.style_id, palette_cle: s.palette_cle, texte: s.texte, doubles: s.doubles, palette_style_id: s.palette_style_id, typo_style_id: s.typo_style_id, doubles_aimes: s.doubles_aimes, brief_valide_le: null }
                  );
                }}>
                Reprendre la composition du magazine {source.rang}
              </button>
            ) : null}

            <ul className="ec-mur-lignes">
              {lignes.map((l, i) => (
                <li key={l.partie}>
                  <span className={l.fait ? "ec-st-signe ec-st-signe--fait" : "ec-st-signe"} aria-hidden="true">
                    {l.fait ? "✓" : i + 1}
                  </span>
                  <span className="ec-mur-ligne-texte">
                    <span className="ec-note">{l.titre}</span>
                    <span>{l.valeur}</span>
                  </span>
                  {peutAgir ? (
                    <button type="button" className="ec-st-lien" onClick={() => { setErreur(null); setPartie(l.partie); }}>
                      {l.fait ? "Modifier" : "Choisir"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {melange > 1 ? (
              <p className="ec-note">
                {melange} styles mêlés : l&apos;atelier harmonise les pages et {v("vous", "te")} le montre au bon à tirer.
              </p>
            ) : null}

            {b.brief_valide_le ? (
              <div className="ec-mur-envoye">
                <strong>Brief validé</strong>
                <span className="ec-note">{v("L'atelier compose avec cette composition. Changer une pièce le remet à valider.", "L'atelier compose avec cette composition. Changer une pièce le remet à valider.")}</span>
              </div>
            ) : manques.length && !vide ? (
              <p className="ec-note">Il manque {manques.join(", ")}.</p>
            ) : null}

            {peutAgir ? (
              <div className="ec-mur-gestes">
                {b.brief_valide_le ? (
                  <>
                    {suivant ? (
                      <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => setRang(suivant.rang)}>
                        Passer au magazine {suivant.rang} →
                      </button>
                    ) : null}
                    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => void envoyer({ action: "devalider" }, { brief_valide_le: null })}>
                      Rouvrir le brief
                    </button>
                  </>
                ) : (
                  <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe || manques.length > 0} onClick={() => void envoyer({ action: "valider" }, { brief_valide_le: new Date().toISOString() })}>
                    Valider le brief du magazine {mag.rang}
                  </button>
                )}
              </div>
            ) : null}
            {p.fige ? <p className="ec-note">La collecte est close : l&apos;atelier compose avec ce brief.</p> : null}
            {tousValides ? <p className="ec-note">Tous les briefs sont validés. L&apos;atelier commence la composition dès que les photos sont réunies.</p> : null}
          </aside>
        ) : null}
      </div>

      {partie && c ? (
        <Fenetre
          cote
          titre={partie === "texte" ? "La place du texte" : genre(partie).panneau}
          sous={v("Seulement ce que vous modifiez. Votre choix reste en haut.", "Seulement ce que tu modifies. Ton choix reste en haut.")}
          onFermer={() => setPartie(null)}
          pied={
            <>
              <span className="ec-note">{occupe ? "Enregistrement…" : "Enregistré à chaque clic"}</span>
              <button type="button" className="ec-bouton" onClick={() => setPartie(null)}>
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
                <button key={t.cle} type="button" role="radio" aria-checked={c.texte === t.cle} className="ec-mur-texte" disabled={!peutAgir || occupe} onClick={() => choisirTexte(t.cle)}>
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
