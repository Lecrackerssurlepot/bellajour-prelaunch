"use client";

/* Un style en détail (PRD §4.2, révision §14.6, maquette StyleDetail).

   Un écran : l'en-tête, le bandeau « pour quel magazine », puis le contenu
   qui défile chez lui, sous une BARRE D'ÉTAPES COLLANTE (1 Palette, 2 Le
   texte, 3 Doubles pages, 4 Couvertures) qui se coche et mène à chaque
   section ; le résumé et « Prendre tout le style … » restent fixes en bas.
   D24 : prendre le style EN ENTIER remplace la palette, les typographies et
   les doubles pages ; les couvertures aimées et la place du texte restent.
   Pour n'en prendre qu'une pièce, le mur (« Tout, en vrac »).

   ⚠️ La maquette recolore la couverture en direct. Nos couvertures sont des
   IMAGES déposées par l'atelier : on montre la palette choisie à côté, on ne
   repeint pas une image (ce serait mentir sur le rendu imprimé). */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { compositionDu, DESCRIPTION_DOUBLE, PARTS_TEXTE, stylesDeLaComposition } from "@/lib/collectif/brief";
import { TYPES_DOUBLES, type TypeDouble } from "@/lib/collectif/styles";
import { EnTeteEcran } from "../../../_composants/Ecran";
import type { MagazineMur, StyleMur } from "../../donnees";
import { TAILLES_AFFICHAGE } from "../pieces";
import "../style.css";

type Props = {
  token: string;
  style: StyleMur;
  magazine: MagazineMur;
  magazines: MagazineMur[];
  ecrire: boolean;
  fige: boolean;
  aimeesMax: number | null;
  tu: boolean;
};

export default function FicheStyle(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  /* Ce que la composition prend DÉJÀ de ce style prérègle la page. */
  const composee = compositionDu(p.magazine);
  const memeStyle = stylesDeLaComposition(composee).includes(p.style.id);
  const [palette, setPalette] = useState<string | null>(composee.palette?.style_id === p.style.id ? composee.palette.cle : p.style.palettes[0]?.cle ?? null);
  const [texte, setTexte] = useState<string | null>(composee.texte);
  const [doubles, setDoubles] = useState<string[]>(composee.doubles.filter((d) => d.style_id === p.style.id).map((d) => d.double));
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const peutAgir = p.ecrire && !p.fige;
  const mur = `/edition/${p.token}/style?m=${p.magazine.rang}`;
  const autreMag = p.magazines.find((m) => m.id !== p.magazine.id && stylesDeLaComposition(compositionDu(m)).includes(p.style.id)) ?? null;

  const manques = [!palette && "une palette", !texte && "la question du texte", doubles.length === 0 && "au moins une double page"].filter(Boolean) as string[];
  const paletteChoisie = p.style.palettes.find((x) => x.cle === palette);
  const aimee = (cle: string) => p.magazine.couvertures_aimees.some((a) => a.style_id === p.style.id && a.couverture === cle);
  const nbAimees = p.magazine.couvertures_aimees.length;
  const libelleDouble = (cle: string) => TYPES_DOUBLES.find((t) => t.cle === cle)?.libelle ?? cle;
  const etapes = [
    { ancre: "ec-etape-1", libelle: "1 · Palette", fait: Boolean(palette), obligatoire: true },
    { ancre: "ec-etape-2", libelle: "2 · Le texte", fait: Boolean(texte), obligatoire: true },
    { ancre: "ec-etape-3", libelle: "3 · Doubles pages", fait: doubles.length > 0, obligatoire: true },
    { ancre: "ec-etape-4", libelle: "4 · Couvertures", fait: nbAimees > 0, obligatoire: false },
  ];

  async function appeler(corps: Record<string, unknown>): Promise<boolean> {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, magazineId: p.magazine.id, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setErreur(json.message ?? `Non enregistré (erreur ${rep.status}).`);
        return false;
      }
      return true;
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
      return false;
    } finally {
      setOccupe(false);
    }
  }

  async function choisir() {
    if (await appeler({ action: "choisir", slug: p.style.slug, palette_cle: palette, texte, doubles })) {
      router.push(mur);
      router.refresh();
    }
  }

  return (
    <section className="ec-ecran ec-fiche">
      <EnTeteEcran
        titre={
          <>
            <Link className="ec-st-ariane" href={mur} prefetch={false}>
              Le style
            </Link>
            <span className="ec-st-ariane-sep" aria-hidden="true">
              /
            </span>
            {p.style.nom}
          </>
        }
      />

      {p.magazines.length > 1 ? (
        <div className="ec-st-mags">
          <span className="ec-st-etiquette">{v("Ce style, vous le choisissez pour un magazine", "Ce style, tu le choisis pour un magazine")}</span>
          <div className="ec-st-mags-liste" role="group" aria-label="Pour quel magazine">
            {p.magazines.map((m) => (
              <Link
                key={m.id}
                className="ec-st-mag ec-st-mag--court"
                href={`/edition/${p.token}/style/${p.style.slug}?m=${m.rang}`}
                prefetch={false}
                aria-current={m.id === p.magazine.id ? "true" : undefined}
              >
                Magazine {m.rang} · {m.nom}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ec-fiche-defile ec-defile">
        <nav className="ec-fiche-etapes" aria-label="Étapes">
          {etapes.map((e) => (
            <a key={e.ancre} href={`#${e.ancre}`} className={e.fait ? "ec-fiche-etape ec-fiche-etape--faite" : "ec-fiche-etape"}>
              <span className="ec-st-signe" aria-hidden="true">
                {e.fait ? "✓" : e.obligatoire ? "" : "·"}
              </span>
              {e.libelle}
            </a>
          ))}
          <span className="ec-note ec-fiche-etapes-resume">{manques.length ? "Les couvertures sont facultatives" : "Prêt à choisir"}</span>
        </nav>

        <div className="ec-fiche-contenu">
          <div className="ec-fiche-hero">
            <div className="ec-fiche-hero-texte">
              <span className="ec-st-etiquette">
                Style
                {autreMag ? (
                  <span className="ec-tag ec-tag--en-ligne" title={`Une pièce de ce style est dans le magazine ${autreMag.rang}`}>
                    Dans le magazine {autreMag.rang}
                  </span>
                ) : memeStyle ? (
                  <span className="ec-tag ec-tag--en-ligne">Dans le magazine {p.magazine.rang}</span>
                ) : null}
              </span>
              <h2 className="ec-st-geant">{p.style.nom}</h2>
              {p.style.description ? <p className="ec-texte">{p.style.description}</p> : null}
              <p className="ec-note">
                {v(
                  "Prenez-le en entier, ou seulement une pièce depuis le mur : chaque pièce de votre magazine peut venir d'un style différent.",
                  "Prends-le en entier, ou seulement une pièce depuis le mur : chaque pièce de ton magazine peut venir d'un style différent."
                )}
              </p>
            </div>
            <div className="ec-fiche-couv">
              {p.style.couvertures[0]?.url ? (
                <img
                  src={p.style.couvertures[0].url}
                  srcSet={p.style.couvertures[0].srcSet ?? undefined}
                  sizes={p.style.couvertures[0].srcSet ? TAILLES_AFFICHAGE.ficheCouverture : undefined}
                  alt={`Couverture ${p.style.nom}`}
                  decoding="async"
                />
              ) : null}
              {paletteChoisie ? (
                <div className="ec-bandes" aria-label={`Palette ${paletteChoisie.nom}`}>
                  {paletteChoisie.couleurs.map((c, i) => (
                    <span key={i} style={{ background: c }} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ec-fiche-deux">
            <section id="ec-etape-1" className="ec-fiche-section" aria-labelledby="ec-s1">
              <h3 className="ec-st-titre" id="ec-s1">
                <span className="ec-numero">1</span> La palette
              </h3>
              <div className="ec-palettes">
                {p.style.palettes.map((pal) => (
                  <button key={pal.cle} type="button" className="ec-palette-choix" aria-pressed={palette === pal.cle} disabled={!peutAgir} onClick={() => setPalette(pal.cle)}>
                    <span className="ec-bandes">
                      {pal.couleurs.map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </span>
                    <span>{pal.nom}</span>
                  </button>
                ))}
              </div>
            </section>

            <section id="ec-etape-2" className="ec-fiche-section" aria-labelledby="ec-s2">
              <h3 className="ec-st-titre" id="ec-s2">
                <span className="ec-numero">2</span> Le texte
              </h3>
              <p className="ec-texte">
                Titres · <strong>{p.style.typos.titres || "à venir"}</strong> · Texte · <strong>{p.style.typos.texte || "à venir"}</strong>
              </p>
              {p.style.typos.echantillon ? (
                <img
                  className="ec-echantillon"
                  src={p.style.typos.echantillon}
                  srcSet={p.style.typos.echantillonSrcSet ?? undefined}
                  sizes={p.style.typos.echantillonSrcSet ? TAILLES_AFFICHAGE.ficheEchantillon : undefined}
                  alt="Échantillon des typographies"
                  decoding="async"
                />
              ) : null}
              <p className="ec-texte">Quelle place pour le texte ?</p>
              <div className="ec-st-trois">
                {PARTS_TEXTE.map((t) => (
                  <button key={t.cle} type="button" className="ec-st-choix" aria-pressed={texte === t.cle} disabled={!peutAgir} onClick={() => setTexte(t.cle)}>
                    {t.libelle}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section id="ec-etape-3" className="ec-fiche-section" aria-labelledby="ec-s3">
            <div className="ec-fiche-section-tete">
              <h3 className="ec-st-titre" id="ec-s3">
                <span className="ec-numero">3</span> {v("Vos plus belles doubles pages", "Tes plus belles doubles pages")}
              </h3>
              <span className="ec-note">
                {doubles.length} sur {TYPES_DOUBLES.length}
              </span>
            </div>
            <p className="ec-note">
              {v(
                "Choisissez-en de une à cinq. Elles nous disent le rythme que vous aimez : beaucoup de blanc, beaucoup de photos, du texte, ou des pages qui surprennent.",
                "Choisis-en de une à cinq. Elles nous disent le rythme que tu aimes : beaucoup de blanc, beaucoup de photos, du texte, ou des pages qui surprennent."
              )}
            </p>
            <div className="ec-doubles">
              {TYPES_DOUBLES.map((t) => {
                const d = p.style.doubles.find((x) => x.type === t.cle);
                const choisie = doubles.includes(t.cle);
                return (
                  <button
                    key={t.cle}
                    type="button"
                    className="ec-double"
                    aria-pressed={choisie}
                    disabled={!peutAgir}
                    onClick={() => setDoubles((l) => (choisie ? l.filter((x) => x !== t.cle) : [...l, t.cle]))}
                  >
                    <span className="ec-double-image">
                      {d?.url ? <img src={d.url} srcSet={d.srcSet ?? undefined} sizes={d.srcSet ? TAILLES_AFFICHAGE.ficheDouble : undefined} alt="" loading="lazy" decoding="async" /> : null}
                    </span>
                    <span className="ec-planche-nom">{t.libelle}</span>
                    <span className="ec-note">{d?.legende || DESCRIPTION_DOUBLE[t.cle as TypeDouble]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section id="ec-etape-4" className="ec-fiche-section" aria-labelledby="ec-s4">
            <div className="ec-fiche-section-tete">
              <h3 className="ec-st-titre" id="ec-s4">
                <span className="ec-numero">4</span> Des couvertures de ce style
              </h3>
              <span className="ec-note">Facultatif{p.aimeesMax !== null ? ` · ${p.aimeesMax} au plus par magazine` : ""}</span>
            </div>
            <p className="ec-note">
              {v(
                "Vous pouvez aimer des couvertures de plusieurs styles : l'atelier s'en inspire pour la vôtre.",
                "Tu peux aimer des couvertures de plusieurs styles : l'atelier s'en inspire pour la tienne."
              )}
            </p>
            {p.style.couvertures.length ? (
              <div className="ec-planches">
                {p.style.couvertures.map((c) => (
                  <figure key={c.cle} className="ec-planche">
                    <div className="ec-planche-image">
                      {c.url ? <img src={c.url} srcSet={c.srcSet ?? undefined} sizes={c.srcSet ? TAILLES_AFFICHAGE.ficheCouvertures : undefined} alt="" loading="lazy" decoding="async" /> : null}
                    </div>
                    {c.legende ? <figcaption className="ec-note">{c.legende}</figcaption> : null}
                    {peutAgir ? (
                      <button
                        type="button"
                        className={aimee(c.cle) ? "ec-bouton ec-bouton--petit" : "ec-bouton ec-bouton--clair ec-bouton--petit"}
                        disabled={occupe}
                        onClick={async () => {
                          if (await appeler({ action: "couverture", styleId: p.style.id, couverture: c.cle, aimer: !aimee(c.cle) })) router.refresh();
                        }}
                      >
                        {aimee(c.cle) ? "Aimée · retirer" : "J'aime cette couverture"}
                      </button>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="ec-note">Ce style n&apos;a pas encore de couverture sur le mur.</p>
            )}
          </section>
        </div>
      </div>

      <footer className="ec-st-pied">
        <div className="ec-st-pied-texte">
          <span>
            {[
              `Tout le style ${p.style.nom}`,
              paletteChoisie ? `palette ${paletteChoisie.nom}` : null,
              doubles.length ? doubles.map(libelleDouble).join(", ") : null,
              nbAimees ? `${nbAimees} couverture${nbAimees > 1 ? "s" : ""} aimée${nbAimees > 1 ? "s" : ""}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {erreur ? (
            <span className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </span>
          ) : peutAgir ? (
            <span className="ec-note">{manques.length ? `Pour le prendre en entier, il reste : ${manques.join(" et ")}.` : `Palette, typographies et doubles pages de ${p.style.nom} pour le magazine ${p.magazine.rang} ; ${v("vos", "tes")} couvertures aimées restent.`}</span>
          ) : p.fige ? (
            <span className="ec-note">La collecte est close : l&apos;atelier compose avec le brief choisi.</span>
          ) : (
            <span className="ec-note">Ce lien permet de tout voir, sans rien choisir.</span>
          )}
        </div>
        <Link href={mur} className="ec-bouton ec-bouton--clair ec-bouton--petit" prefetch={false}>
          {peutAgir ? "Revenir sans choisir" : "Revenir au mur"}
        </Link>
        {peutAgir ? (
          <button type="button" className="ec-bouton" disabled={occupe || manques.length > 0} onClick={choisir}>
            Prendre tout le style {p.style.nom}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
