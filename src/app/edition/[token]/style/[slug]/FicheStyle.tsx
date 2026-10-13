"use client";

/* La page d'un style (PRD §4.2, maquette StyleDetail) : 1 la palette, 2 le
   texte (typographies + « Quelle place pour le texte ? »), 3 vos plus belles
   doubles pages (une à cinq), les couvertures de ce style (« J'aime »), et
   la barre fixe « Choisir … pour le magazine N ».

   ⚠️ La maquette recolore la couverture en direct. Nos couvertures sont des
   IMAGES déposées par l'atelier : on montre la palette choisie à côté, on ne
   repeint pas une image (ce serait mentir sur le rendu imprimé). */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DESCRIPTION_DOUBLE, PARTS_TEXTE } from "@/lib/collectif/brief";
import { TYPES_DOUBLES, type TypeDouble } from "@/lib/collectif/styles";
import type { MagazineMur, StyleMur } from "../../donnees";

type Props = {
  token: string;
  style: StyleMur;
  magazine: MagazineMur;
  ecrire: boolean;
  fige: boolean;
  aimeesMax: number | null;
  tu: boolean;
};

export default function FicheStyle(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const memeStyle = p.magazine.style_id === p.style.id;
  const [palette, setPalette] = useState<string | null>(memeStyle ? p.magazine.palette_cle : p.style.palettes[0]?.cle ?? null);
  const [texte, setTexte] = useState<string | null>(memeStyle ? p.magazine.texte : null);
  const [doubles, setDoubles] = useState<string[]>(memeStyle ? p.magazine.doubles : []);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const peutAgir = p.ecrire && !p.fige;
  const wall = `/edition/${p.token}/style?m=${p.magazine.rang}`;

  const manques = [!palette && "une palette", !texte && "la question du texte", doubles.length === 0 && "au moins une double page"].filter(Boolean) as string[];
  const paletteChoisie = p.style.palettes.find((x) => x.cle === palette);
  const aimee = (cle: string) => p.magazine.couvertures_aimees.some((a) => a.style_id === p.style.id && a.couverture === cle);

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
      router.push(wall);
      router.refresh();
    }
  }

  return (
    <section className="ec-page ec-fiche-style">
      <nav className="ec-ariane" aria-label="Fil d'Ariane">
        <Link href={wall} prefetch={false}>
          Le style
        </Link>{" "}
        / <span>{p.style.nom}</span>
      </nav>

      <div className="ec-style-hero">
        <div>
          <p className="ec-surtitre">
            Pour le magazine {p.magazine.rang} · {p.magazine.nom}
            {memeStyle ? <span className="ec-tag ec-tag--en-ligne">Sélection du magazine {p.magazine.rang}</span> : null}
          </p>
          <h1 className="ec-h1">{p.style.nom}</h1>
          {p.style.description ? <p className="ec-texte">{p.style.description}</p> : null}
          <p className="ec-note ec-regle">
            Choisi pour un magazine, ce style en dessine tout l&apos;intérieur. Seule la couverture peut venir d&apos;un autre style.
          </p>
        </div>
        <div className="ec-style-couverture">
          {p.style.couvertures[0]?.url ? <img src={p.style.couvertures[0].url} alt={`Couverture ${p.style.nom}`} decoding="async" /> : null}
          {paletteChoisie ? (
            <div className="ec-bandes" aria-label={`Palette ${paletteChoisie.nom}`}>
              {paletteChoisie.couleurs.map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ec-style-deux">
        <section className="ec-section" aria-labelledby="ec-s1">
          <h2 className="ec-h2" id="ec-s1">
            <span className="ec-numero">1</span> La palette
          </h2>
          <div className="ec-palettes">
            {p.style.palettes.map((pal) => (
              <button
                key={pal.cle}
                type="button"
                className="ec-palette-choix"
                aria-pressed={palette === pal.cle}
                disabled={!peutAgir}
                onClick={() => setPalette(pal.cle)}
              >
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

        <section className="ec-section ec-decale" aria-labelledby="ec-s2">
          <h2 className="ec-h2" id="ec-s2">
            <span className="ec-numero">2</span> Le texte
          </h2>
          <p className="ec-texte">
            Titres · <strong>{p.style.typos.titres || "à venir"}</strong> · Texte · <strong>{p.style.typos.texte || "à venir"}</strong>
          </p>
          {p.style.typos.echantillon ? <img className="ec-echantillon" src={p.style.typos.echantillon} alt="Échantillon des typographies" decoding="async" /> : null}
          <p className="ec-texte">Quelle place pour le texte ?</p>
          <div className="ec-puces">
            {PARTS_TEXTE.map((t) => (
              <button key={t.cle} type="button" className="ec-onglet" aria-pressed={texte === t.cle} disabled={!peutAgir} onClick={() => setTexte(t.cle)}>
                {t.libelle}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="ec-section" aria-labelledby="ec-s3">
        <h2 className="ec-h2" id="ec-s3">
          <span className="ec-numero">3</span> {v("Vos plus belles doubles pages", "Tes plus belles doubles pages")}
        </h2>
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
                <span className="ec-double-image">{d?.url ? <img src={d.url} alt="" loading="lazy" decoding="async" /> : null}</span>
                <span className="ec-planche-nom">{t.libelle}</span>
                <span className="ec-note">{d?.legende || DESCRIPTION_DOUBLE[t.cle as TypeDouble]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {p.style.couvertures.length ? (
        <section className="ec-section" aria-labelledby="ec-s4">
          <h2 className="ec-h2" id="ec-s4">
            Des couvertures de ce style
          </h2>
          <p className="ec-note">
            Facultatif{p.aimeesMax !== null ? ` · ${p.aimeesMax} au plus par magazine` : ""}.{" "}
            {v("Vous pouvez aimer une couverture d'un autre style que celui du magazine : elle changera la couverture, pas les pages intérieures.", "Tu peux aimer une couverture d'un autre style que celui du magazine : elle changera la couverture, pas les pages intérieures.")}
          </p>
          <div className="ec-planches">
            {p.style.couvertures.map((c) => (
              <figure key={c.cle} className="ec-planche">
                <div className="ec-planche-image">{c.url ? <img src={c.url} alt="" loading="lazy" decoding="async" /> : null}</div>
                {c.legende ? <figcaption className="ec-note">{c.legende}</figcaption> : null}
                {peutAgir ? (
                  <button
                    type="button"
                    className={aimee(c.cle) ? "ec-bouton" : "ec-bouton ec-bouton--clair"}
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
        </section>
      ) : null}

      {peutAgir ? (
        <div className="ec-barre-fixe">
          <div>
            {manques.length ? <p className="ec-note">Il manque {manques.join(", ")}.</p> : <p className="ec-note">Tout est prêt pour le magazine {p.magazine.rang}.</p>}
            {erreur ? <p className="ec-note ec-note--erreur" role="alert">{erreur}</p> : null}
          </div>
          <div className="ec-actions">
            <Link href={wall} className="ec-bouton ec-bouton--clair" prefetch={false}>
              Revenir sans choisir
            </Link>
            <button type="button" className="ec-bouton" disabled={occupe || manques.length > 0} onClick={choisir}>
              Choisir {p.style.nom} pour le magazine {p.magazine.rang}
            </button>
          </div>
        </div>
      ) : p.fige ? (
        <p className="ec-note">La collecte est close : l&apos;atelier compose avec le brief choisi.</p>
      ) : null}
    </section>
  );
}
