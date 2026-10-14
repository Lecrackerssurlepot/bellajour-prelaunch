"use client";

/* Modifier le brief partie par partie (révision §14.6, maquette StyleBrief).

   Un onglet par magazine. À gauche, le style choisi (sa couverture, la
   palette retenue en bandes à côté, jamais une image repeinte) et « Changer
   de style » ; à droite, quatre cartes : la palette et la place du texte se
   modifient sur place, les doubles pages et les couvertures aimées par
   « Modifier », qui ouvre un panneau latéral (les couvertures se filtrent par
   style). Chaque geste s'enregistre tout de suite ; un brief validé repasse
   « à valider » dès qu'on le change (brief.ts). « Valider le brief » en bas.

   Le visuel du style sera retravaillé (PRD §14.6) : la mécanique est ici, la
   mise en forme reste simple. Lecture seule pour l'équipe et après la clôture. */

import Link from "next/link";
import { useState } from "react";
import { basculerCouverture, DESCRIPTION_DOUBLE, manquesBrief, PARTS_TEXTE, resumeBrief, type CouvertureAimee } from "@/lib/collectif/brief";
import { TYPES_DOUBLES, type TypeDouble } from "@/lib/collectif/styles";
import { EnTeteEcran } from "../../../_composants/Ecran";
import Fenetre from "../../../_composants/Fenetre";
import type { MagazineMur, StyleMur } from "../../donnees";
import "../style.css";

type Props = {
  token: string;
  styles: StyleMur[];
  magazines: MagazineMur[];
  rangInitial: number;
  ecrire: boolean;
  fige: boolean;
  aimeesMax: number | null;
  tu: boolean;
};

type Etat = Pick<MagazineMur, "style_id" | "palette_cle" | "texte" | "doubles" | "couvertures_aimees" | "brief_valide_le">;

export default function Brief(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [rang, setRang] = useState(p.rangInitial);
  /* La copie locale des briefs : chaque geste s'affiche tout de suite et
     revient en arrière, avec une phrase, si le serveur refuse. */
  const [briefs, setBriefs] = useState<Record<string, Etat>>(() =>
    Object.fromEntries(p.magazines.map((m) => [m.id, { style_id: m.style_id, palette_cle: m.palette_cle, texte: m.texte, doubles: m.doubles, couvertures_aimees: m.couvertures_aimees, brief_valide_le: m.brief_valide_le }]))
  );
  const [tiroir, setTiroir] = useState<"doubles" | "couvertures" | null>(null);
  const [filtreStyle, setFiltreStyle] = useState<string>("tous");
  const [etat, setEtat] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [occupe, setOccupe] = useState(false);

  const mag = p.magazines.find((m) => m.rang === rang) ?? p.magazines[0];
  const b = mag ? briefs[mag.id] : null;
  const style = p.styles.find((s) => s.id === b?.style_id) ?? null;
  const peutAgir = p.ecrire && !p.fige;
  const mur = `/edition/${p.token}/style?m=${rang}`;
  const libelleDouble = (cle: string) => TYPES_DOUBLES.find((t) => t.cle === cle)?.libelle ?? cle;
  const palette = style?.palettes.find((x) => x.cle === b?.palette_cle) ?? null;
  const manques = b ? manquesBrief(b) : [];

  async function enregistrer(corps: Record<string, unknown>, apres: Partial<Etat>) {
    if (!mag || !b) return;
    const avant = b;
    setBriefs((x) => ({ ...x, [mag.id]: { ...avant, ...apres } }));
    setOccupe(true);
    setEtat(null);
    try {
      const rep = await fetch("/api/collectif/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, magazineId: mag.id, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setBriefs((x) => ({ ...x, [mag.id]: avant }));
        setEtat({ texte: json.message ?? `Non enregistré (erreur ${rep.status}).`, erreur: true });
        return;
      }
      setEtat({ texte: "Enregistré.", erreur: false });
    } catch {
      setBriefs((x) => ({ ...x, [mag.id]: avant }));
      setEtat({ texte: "Le réseau n'a pas répondu. Rien n'a changé.", erreur: true });
    } finally {
      setOccupe(false);
    }
  }

  function basculerDouble(cle: string) {
    if (!b) return;
    const choisie = b.doubles.includes(cle);
    if (choisie && b.doubles.length <= 1) {
      setEtat({ texte: "Garder au moins une double page.", erreur: true });
      return;
    }
    const doubles = TYPES_DOUBLES.map((t) => t.cle).filter((c) => (c === cle ? !choisie : b.doubles.includes(c)));
    void enregistrer({ action: "doubles", doubles }, { doubles, brief_valide_le: null });
  }

  function basculerCouv(s: StyleMur, cle: string) {
    if (!b) return;
    const cible: CouvertureAimee = { style_id: s.id, couverture: cle };
    const aimer = !b.couvertures_aimees.some((a) => a.style_id === s.id && a.couverture === cle);
    const r = basculerCouverture(b.couvertures_aimees, cible, aimer, p.aimeesMax, { id: s.id, publie: true, palettes: s.palettes, couvertures: s.couvertures });
    if (!r.ok) {
      setEtat({ texte: r.message, erreur: true });
      return;
    }
    void enregistrer({ action: "couverture", styleId: s.id, couverture: cle, aimer }, { couvertures_aimees: r.aimees, brief_valide_le: null });
  }

  const couvertureDe = (a: CouvertureAimee) => {
    const s = p.styles.find((x) => x.id === a.style_id);
    return { style: s?.nom ?? "un style retiré", url: s?.couvertures.find((c) => c.cle === a.couverture)?.url ?? null };
  };

  return (
    <section className="ec-ecran ec-bf">
      <EnTeteEcran
        titre={
          <>
            <Link className="ec-st-ariane" href={mur} prefetch={false}>
              Le style
            </Link>
            <span className="ec-st-ariane-sep" aria-hidden="true">
              /
            </span>
            {v("Vos briefs", "Tes briefs")}
          </>
        }
      >
        <Link className="ec-bouton ec-bouton--clair ec-bouton--petit" href={mur} prefetch={false}>
          Explorer le mur des styles
        </Link>
      </EnTeteEcran>

      <div className="ec-bf-onglets">
        {p.magazines.map((m) => (
          <button key={m.id} type="button" className="ec-bf-onglet" aria-pressed={m.rang === rang} onClick={() => setRang(m.rang)}>
            Magazine {m.rang} · {m.nom}
            {briefs[m.id]?.brief_valide_le ? " ✓" : ""}
          </button>
        ))}
        <span className="ec-note ec-bf-onglets-aide">Chaque partie se modifie ici, sans repasser par tout le style</span>
      </div>

      {mag && b ? (
        <div className="ec-bf-corps">
          <aside className="ec-bf-gauche">
            <div className="ec-bf-couv">
              {style?.couvertures[0]?.url ? <img src={style.couvertures[0].url} alt={`Couverture ${style.nom}`} decoding="async" /> : <span className="ec-note">Aucun style choisi</span>}
            </div>
            {palette ? (
              <div className="ec-bandes" aria-label={`Palette ${palette.nom}`}>
                {palette.couleurs.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
            ) : null}
            <div className="ec-bf-style">
              <span className="ec-st-etiquette">Style</span>
              <strong className="ec-st-titre">{style?.nom ?? "À choisir"}</strong>
            </div>
            <p className="ec-note">L&apos;intérieur suit ce style. Seule la couverture peut venir d&apos;un autre.</p>
            {peutAgir ? (
              <Link className="ec-bouton ec-bouton--clair ec-bouton--petit" href={mur} prefetch={false}>
                {style ? "Changer de style" : "Choisir un style"}
              </Link>
            ) : null}
            <span className="ec-note ec-bf-gauche-pied">{peutAgir ? "Enregistré à chaque modification" : p.fige ? "La collecte est close : l'atelier compose avec ce brief." : "Ce lien permet de tout voir, sans rien modifier."}</span>
          </aside>

          {!style ? (
            <div className="ec-bf-vide">
              <p className="ec-texte">{v("Ce magazine n'a pas encore de style. Choisissez-en un sur le mur : le brief se remplit tout seul.", "Ce magazine n'a pas encore de style. Choisis-en un sur le mur : le brief se remplit tout seul.")}</p>
              <Link className="ec-bouton ec-bouton--petit" href={mur} prefetch={false}>
                Explorer le mur des styles
              </Link>
            </div>
          ) : (
            <section className="ec-bf-cartes" aria-label={`Brief du magazine ${mag.rang}`}>
              <div className="ec-bf-carte">
                <div className="ec-bf-carte-tete">
                  <span className="ec-st-etiquette">1 · Palette</span>
                  {b.palette_cle ? <span className="ec-st-accent">✓</span> : null}
                </div>
                <div className="ec-bf-palettes">
                  {style.palettes.map((pal) => (
                    <button
                      key={pal.cle}
                      type="button"
                      className="ec-st-choix ec-bf-palette"
                      aria-pressed={b.palette_cle === pal.cle}
                      disabled={!peutAgir || occupe}
                      onClick={() => b.palette_cle !== pal.cle && enregistrer({ action: "palette", palette_cle: pal.cle }, { palette_cle: pal.cle, brief_valide_le: null })}
                    >
                      <span className="ec-bf-pastilles" aria-hidden="true">
                        {pal.couleurs.slice(0, 3).map((c, i) => (
                          <span key={i} style={{ background: c }} />
                        ))}
                      </span>
                      {pal.nom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ec-bf-carte">
                <div className="ec-bf-carte-tete">
                  <span className="ec-st-etiquette">2 · Le texte</span>
                  {b.texte ? <span className="ec-st-accent">✓</span> : null}
                </div>
                <div className="ec-st-trois">
                  {PARTS_TEXTE.map((t) => (
                    <button
                      key={t.cle}
                      type="button"
                      className="ec-st-choix"
                      aria-pressed={b.texte === t.cle}
                      disabled={!peutAgir || occupe}
                      onClick={() => b.texte !== t.cle && enregistrer({ action: "texte", texte: t.cle }, { texte: t.cle, brief_valide_le: null })}
                    >
                      {t.libelle}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ec-bf-carte">
                <div className="ec-bf-carte-tete">
                  <span className="ec-st-etiquette">3 · Doubles pages préférées · {b.doubles.length}</span>
                  {peutAgir ? (
                    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setTiroir("doubles")}>
                      Modifier
                    </button>
                  ) : null}
                </div>
                <div className="ec-bf-vignettes ec-bf-vignettes--doubles">
                  {b.doubles.map((d) => {
                    const img = style.doubles.find((x) => x.type === d)?.url ?? null;
                    return (
                      <figure key={d}>
                        <span className="ec-bf-vignette ec-bf-vignette--double">{img ? <img src={img} alt="" loading="lazy" decoding="async" /> : null}</span>
                        <figcaption className="ec-note">{libelleDouble(d)}</figcaption>
                      </figure>
                    );
                  })}
                  {b.doubles.length === 0 ? <span className="ec-note">À choisir.</span> : null}
                </div>
              </div>

              <div className="ec-bf-carte">
                <div className="ec-bf-carte-tete">
                  <span className="ec-st-etiquette">
                    4 · Couvertures aimées · {b.couvertures_aimees.length}
                    {p.aimeesMax !== null ? ` sur ${p.aimeesMax}` : ""}
                  </span>
                  {peutAgir ? (
                    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setTiroir("couvertures")}>
                      {b.couvertures_aimees.length ? "Modifier" : "Choisir"}
                    </button>
                  ) : null}
                </div>
                <div className="ec-bf-vignettes">
                  {b.couvertures_aimees.map((a) => {
                    const c = couvertureDe(a);
                    return (
                      <figure key={`${a.style_id}-${a.couverture}`}>
                        <span className="ec-bf-vignette">{c.url ? <img src={c.url} alt="" loading="lazy" decoding="async" /> : null}</span>
                        <figcaption className="ec-note">{c.style}</figcaption>
                      </figure>
                    );
                  })}
                </div>
                <span className="ec-note">Facultatif. Une couverture d&apos;un autre style ne change que la couverture.</span>
              </div>

              <div className="ec-bf-pied">
                <div className="ec-bf-pied-texte">
                  <span>
                    {resumeBrief({ style: style.nom, palette: palette?.nom ?? null, doubles: b.doubles.map(libelleDouble), couvertures: b.couvertures_aimees.length })}
                  </span>
                  {etat ? (
                    <span className={etat.erreur ? "ec-note ec-note--erreur" : "ec-note"} role={etat.erreur ? "alert" : "status"}>
                      {etat.texte}
                    </span>
                  ) : b.brief_valide_le ? (
                    <span className="ec-note">{v("Brief validé. Une modification le remet à valider.", "Brief validé. Une modification le remet à valider.")}</span>
                  ) : manques.length ? (
                    <span className="ec-note">Il manque {manques.join(", ")}.</span>
                  ) : null}
                </div>
                {peutAgir ? (
                  b.brief_valide_le ? (
                    <span className="ec-pilule">Brief validé</span>
                  ) : (
                    <button
                      type="button"
                      className="ec-bouton"
                      disabled={occupe || manques.length > 0}
                      onClick={() => enregistrer({ action: "valider" }, { brief_valide_le: new Date().toISOString() })}
                    >
                      Valider le brief du magazine {mag.rang}
                    </button>
                  )
                ) : b.brief_valide_le ? (
                  <span className="ec-pilule">Brief validé</span>
                ) : null}
              </div>
            </section>
          )}
        </div>
      ) : null}

      {tiroir && b && style ? (
        <Fenetre
          cote
          titre={tiroir === "doubles" ? "Doubles pages préférées" : "Couvertures aimées"}
          sous={
            tiroir === "doubles"
              ? v("De une à cinq, dans le style du magazine. Chaque clic s'enregistre.", "De une à cinq, dans le style du magazine. Chaque clic s'enregistre.")
              : `De n'importe quel style${p.aimeesMax !== null ? `, ${p.aimeesMax} au plus` : ""}. Chaque clic s'enregistre.`
          }
          onFermer={() => setTiroir(null)}
          pied={
            <button type="button" className="ec-bouton" onClick={() => setTiroir(null)}>
              Terminé
            </button>
          }
        >
          {etat?.erreur ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {etat.texte}
            </p>
          ) : null}
          {tiroir === "doubles" ? (
            <div className="ec-bf-grille ec-bf-grille--deux">
              {TYPES_DOUBLES.map((t) => {
                const d = style.doubles.find((x) => x.type === t.cle);
                return (
                  <button key={t.cle} type="button" className="ec-double" aria-pressed={b.doubles.includes(t.cle)} disabled={occupe} onClick={() => basculerDouble(t.cle)}>
                    <span className="ec-double-image">{d?.url ? <img src={d.url} alt="" loading="lazy" decoding="async" /> : null}</span>
                    <span className="ec-planche-nom">{t.libelle}</span>
                    <span className="ec-note">{d?.legende || DESCRIPTION_DOUBLE[t.cle as TypeDouble]}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="ec-puces" role="group" aria-label="Filtrer par style">
                <button type="button" className="ec-onglet" aria-pressed={filtreStyle === "tous"} onClick={() => setFiltreStyle("tous")}>
                  Tous les styles
                </button>
                {p.styles
                  .filter((s) => s.couvertures.length)
                  .map((s) => (
                    <button key={s.id} type="button" className="ec-onglet" aria-pressed={filtreStyle === s.id} onClick={() => setFiltreStyle(s.id)}>
                      {s.nom}
                    </button>
                  ))}
              </div>
              <div className="ec-bf-grille">
                {p.styles
                  .filter((s) => filtreStyle === "tous" || s.id === filtreStyle)
                  .flatMap((s) =>
                    s.couvertures.map((c) => {
                      const aimee = b.couvertures_aimees.some((a) => a.style_id === s.id && a.couverture === c.cle);
                      return (
                        <button key={`${s.id}-${c.cle}`} type="button" className="ec-bf-couv-choix" aria-pressed={aimee} disabled={occupe} onClick={() => basculerCouv(s, c.cle)}>
                          <span className="ec-bf-vignette">{c.url ? <img src={c.url} alt="" loading="lazy" decoding="async" /> : null}</span>
                          <span className="ec-note">
                            {s.nom}
                            {aimee ? " · aimée" : ""}
                          </span>
                        </button>
                      );
                    })
                  )}
              </div>
            </>
          )}
        </Fenetre>
      ) : null}
    </section>
  );
}
