"use client";

/* Le mur des styles (PRD §4.2, maquette Styles).

   Une planche par style publié, des filtres (Tout, Couvertures,
   Typographies, Palettes, Doubles pages), un magazine à la fois, et à
   droite le BRIEF de ce magazine, dont chaque ligne mène à l'endroit où
   elle se règle. Le tag translucide « Sélection du magazine N » marque le
   style déjà choisi. La règle de Mathias est écrite : l'intérieur suit le
   style, seule la couverture peut venir d'un autre.

   Lecture seule pour l'équipe, et pour tout le monde après la clôture. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { manquesBrief, PARTS_TEXTE } from "@/lib/collectif/brief";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import type { MagazineMur, StyleMur } from "../donnees";

const FILTRES = [
  { cle: "tout", libelle: "Tout" },
  { cle: "couvertures", libelle: "Couvertures" },
  { cle: "typos", libelle: "Typographies" },
  { cle: "palettes", libelle: "Palettes" },
  { cle: "doubles", libelle: "Doubles pages" },
] as const;
type Filtre = (typeof FILTRES)[number]["cle"];

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

export default function Mur(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [rang, setRang] = useState(p.rangInitial);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const mag = p.magazines.find((m) => m.rang === rang) ?? p.magazines[0];
  const peutAgir = p.ecrire && !p.fige;
  const styleChoisi = p.styles.find((s) => s.id === mag?.style_id) ?? null;
  const manques = mag ? manquesBrief(mag) : [];
  const tousValides = p.magazines.length > 0 && p.magazines.every((m) => m.brief_valide_le);
  const suivant = p.magazines.find((m) => m.rang > rang && !m.brief_valide_le) ?? p.magazines.find((m) => !m.brief_valide_le && m.rang !== rang);
  const premier = p.magazines.find((m) => m.rang !== rang && m.style_id);

  async function agir(corps: Record<string, unknown>) {
    if (!mag) return;
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, magazineId: mag.id, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) setErreur(json.message ?? `Non enregistré (erreur ${rep.status}).`);
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
    } finally {
      setOccupe(false);
    }
  }

  const lienStyle = (slug: string) => `/edition/${p.token}/style/${slug}?m=${rang}`;
  const aimee = (styleId: string, cle: string) => mag?.couvertures_aimees.some((a) => a.style_id === styleId && a.couverture === cle) ?? false;

  return (
    <section className="ec-page ec-mur">
      <p className="ec-surtitre">Le style · un brief par magazine</p>
      <h1 className="ec-h1">Le mur des styles</h1>
      <p className="ec-texte ec-regle">
        Dans un magazine, tout l&apos;intérieur suit le style choisi ; seule la couverture peut venir d&apos;un autre style.
      </p>

      {p.magazines.length > 1 ? (
        <nav className="ec-onglets" aria-label="Magazine">
          {p.magazines.map((m) => (
            <button key={m.id} type="button" className="ec-onglet" aria-pressed={m.rang === rang} onClick={() => setRang(m.rang)}>
              Magazine {m.rang} · {m.nom}
              {m.brief_valide_le ? " ✓" : ""}
            </button>
          ))}
        </nav>
      ) : null}

      <nav className="ec-onglets" aria-label="Filtrer le mur">
        {FILTRES.map((f) => (
          <button key={f.cle} type="button" className="ec-onglet" aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>
            {f.libelle}
          </button>
        ))}
      </nav>

      <div className="ec-mur-corps">
        <div>
          {p.styles.length === 0 ? (
            <div className="ec-a-venir">
              <p className="ec-texte">{v("Les styles arrivent sur ce mur dès que l'atelier les publie.", "Les styles arrivent sur ce mur dès que l'atelier les publie.")}</p>
            </div>
          ) : null}

          {filtre === "tout" ? (
            <div className="ec-planches">
              {p.styles.map((s) => (
                <Link key={s.id} href={lienStyle(s.slug)} className="ec-planche" prefetch={false}>
                  <div className="ec-planche-image">
                    {s.couvertures[0]?.url ? <img src={s.couvertures[0].url} alt="" loading="lazy" decoding="async" /> : null}
                    {s.id === mag?.style_id ? <span className="ec-tag" title="Le style choisi pour ce magazine">Sélection du magazine {rang}</span> : null}
                  </div>
                  <span className="ec-planche-nom">{s.nom}</span>
                  {s.description ? <span className="ec-note">{s.description}</span> : null}
                  <span className="ec-planche-ouvrir">Ouvrir le style →</span>
                </Link>
              ))}
            </div>
          ) : null}

          {filtre === "couvertures" ? (
            <>
              <p className="ec-note">
                {v("Toutes les couvertures côte à côte. Aimez-en de n'importe quel style : l'atelier s'en inspirera.", "Toutes les couvertures côte à côte. Aimes-en de n'importe quel style : l'atelier s'en inspirera.")}
                {p.aimeesMax !== null ? ` ${p.aimeesMax} au plus par magazine.` : ""}
              </p>
              <div className="ec-planches">
                {p.styles.flatMap((s) =>
                  s.couvertures.map((c) => (
                    <figure key={`${s.id}-${c.cle}`} className="ec-planche">
                      <div className="ec-planche-image">{c.url ? <img src={c.url} alt="" loading="lazy" decoding="async" /> : null}</div>
                      <figcaption className="ec-planche-nom">{s.nom}</figcaption>
                      {peutAgir ? (
                        <button
                          type="button"
                          className={aimee(s.id, c.cle) ? "ec-bouton" : "ec-bouton ec-bouton--clair"}
                          disabled={occupe}
                          onClick={() => agir({ action: "couverture", styleId: s.id, couverture: c.cle, aimer: !aimee(s.id, c.cle) })}
                        >
                          {aimee(s.id, c.cle) ? "Aimée · retirer" : "J'aime cette couverture"}
                        </button>
                      ) : aimee(s.id, c.cle) ? (
                        <span className="ec-note">Aimée</span>
                      ) : null}
                    </figure>
                  ))
                )}
              </div>
            </>
          ) : null}

          {filtre === "typos" ? (
            <div className="ec-planches">
              {p.styles.map((s) => (
                <Link key={s.id} href={lienStyle(s.slug)} className="ec-planche" prefetch={false}>
                  <div className="ec-planche-image ec-planche-image--large">{s.typos.echantillon ? <img src={s.typos.echantillon} alt="" loading="lazy" /> : null}</div>
                  <span className="ec-planche-nom">{s.nom}</span>
                  <span className="ec-note">
                    Titres · {s.typos.titres || "à venir"} · Texte · {s.typos.texte || "à venir"}
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {filtre === "palettes" ? (
            <div className="ec-planches">
              {p.styles.map((s) => (
                <Link key={s.id} href={lienStyle(s.slug)} className="ec-planche" prefetch={false}>
                  {s.palettes.map((pal) => (
                    <div key={pal.cle} className="ec-bandes" aria-label={`Palette ${pal.nom}`}>
                      {pal.couleurs.map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </div>
                  ))}
                  <span className="ec-planche-nom">{s.nom}</span>
                </Link>
              ))}
            </div>
          ) : null}

          {filtre === "doubles" ? (
            <div className="ec-planches ec-planches--larges">
              {p.styles.flatMap((s) =>
                s.doubles
                  .filter((d) => d.url)
                  .map((d) => (
                    <Link key={`${s.id}-${d.type}`} href={lienStyle(s.slug)} className="ec-planche" prefetch={false}>
                      <div className="ec-planche-image ec-planche-image--large">
                        <img src={d.url as string} alt="" loading="lazy" decoding="async" />
                      </div>
                      <span className="ec-planche-nom">
                        {s.nom} · {TYPES_DOUBLES.find((t) => t.cle === d.type)?.libelle}
                      </span>
                    </Link>
                  ))
              )}
            </div>
          ) : null}
        </div>

        {mag ? (
          <aside className="ec-carte ec-brief" aria-labelledby="ec-brief-titre">
            <h2 className="ec-h2" id="ec-brief-titre">
              Brief du magazine {mag.rang}
            </h2>
            <p className="ec-note">{mag.nom}</p>
            <ul className="ec-lignes">
              <li>
                <span>Style et palette</span>
                <strong>
                  {styleChoisi ? (
                    <Link href={lienStyle(styleChoisi.slug)} prefetch={false}>
                      {styleChoisi.nom}
                      {mag.palette_cle ? `, ${styleChoisi.palettes.find((x) => x.cle === mag.palette_cle)?.nom ?? ""}` : ""}
                    </Link>
                  ) : (
                    "À choisir"
                  )}
                </strong>
              </li>
              <li>
                <span>Texte</span>
                <strong>{PARTS_TEXTE.find((t) => t.cle === mag.texte)?.libelle ?? "À choisir"}</strong>
              </li>
              <li>
                <span>Doubles pages préférées</span>
                <strong>{mag.doubles.length ? mag.doubles.map((d) => TYPES_DOUBLES.find((t) => t.cle === d)?.libelle).join(", ") : "À choisir dans la page du style"}</strong>
              </li>
              <li>
                <span>Couvertures aimées</span>
                <strong>
                  <button type="button" className="ec-lien-texte" onClick={() => setFiltre("couvertures")}>
                    {mag.couvertures_aimees.length}
                    {p.aimeesMax !== null ? ` sur ${p.aimeesMax}` : ""}
                  </button>
                </strong>
              </li>
            </ul>
            <p className="ec-note">Facultatif pour les couvertures : elles peuvent venir de n&apos;importe quel style.</p>

            {mag.brief_valide_le ? (
              <p className="ec-statut ec-statut--ok">Brief validé</p>
            ) : manques.length ? (
              <p className="ec-note">Brief incomplet : il manque {manques.join(", ")}.</p>
            ) : null}

            {peutAgir ? (
              <div className="ec-actions">
                {mag.brief_valide_le ? (
                  <button type="button" className="ec-bouton ec-bouton--clair" disabled={occupe} onClick={() => agir({ action: "devalider" })}>
                    Modifier le brief
                  </button>
                ) : (
                  <button type="button" className="ec-bouton" disabled={occupe || manques.length > 0} onClick={() => agir({ action: "valider" })}>
                    Valider le brief du magazine {mag.rang}
                  </button>
                )}
                {premier && !mag.style_id ? (
                  <button type="button" className="ec-bouton ec-bouton--clair" disabled={occupe} onClick={() => agir({ action: "reprendre", depuisMagazineId: premier.id })}>
                    Reprendre le style du magazine {premier.rang}
                  </button>
                ) : null}
                {mag.brief_valide_le && suivant ? (
                  <button type="button" className="ec-bouton" onClick={() => setRang(suivant.rang)}>
                    Passer au magazine {suivant.rang} →
                  </button>
                ) : null}
              </div>
            ) : null}
            {p.fige ? <p className="ec-note">La collecte est close : l&apos;atelier compose avec ce brief.</p> : null}
            {tousValides ? <p className="ec-note">Tous les briefs sont validés. L&apos;atelier commence la composition dès que les photos sont réunies.</p> : null}
            {erreur ? <p className="ec-note ec-note--erreur" role="alert">{erreur}</p> : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
