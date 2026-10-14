"use client";

/* Le mur des styles (PRD §4.2, révision §14.6, maquette Styles).

   Un écran sans défilement de page : le bandeau des magazines (leur état),
   puis le mur qui défile chez lui (une planche par style publié, des
   filtres) et à droite le BRIEF du magazine, fixe, qui défile chez lui
   aussi. Chaque ligne du brief mène à l'endroit où elle se règle : la page
   du style pour en changer, `/style/brief` pour une partie. Le tag
   translucide « Sélection du magazine N » marque le style déjà choisi. La
   règle de Mathias est écrite : l'intérieur suit le style, seule la
   couverture peut venir d'un autre.

   Lecture seule pour l'équipe, et pour tout le monde après la clôture. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { etatDuBrief, manquesBrief, PARTS_TEXTE } from "@/lib/collectif/brief";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import { EnTeteEcran } from "../../_composants/Ecran";
import type { MagazineMur, StyleMur } from "../donnees";
import "./style.css";

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

/** « Riviera (2) et Atlas » : deux couvertures du même style ne répètent pas son nom. */
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
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const mag = p.magazines.find((m) => m.rang === rang) ?? p.magazines[0];
  const peutAgir = p.ecrire && !p.fige;
  const styleChoisi = p.styles.find((s) => s.id === mag?.style_id) ?? null;
  const manques = mag ? manquesBrief(mag) : [];
  const nbValides = p.magazines.filter((m) => m.brief_valide_le).length;
  const tousValides = p.magazines.length > 0 && nbValides === p.magazines.length;
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
  const lienBrief = `/edition/${p.token}/style/brief?m=${rang}`;
  const aimee = (styleId: string, cle: string) => mag?.couvertures_aimees.some((a) => a.style_id === styleId && a.couverture === cle) ?? false;
  const consigne =
    filtre === "tout"
      ? v("Ouvrez une planche pour découvrir le style en détail et le choisir pour votre magazine.", "Ouvre une planche pour découvrir le style en détail et le choisir pour ton magazine.")
      : filtre === "couvertures"
        ? v(
            `Toutes les couvertures côte à côte. Aimez-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`,
            `Toutes les couvertures côte à côte. Aimes-en${p.aimeesMax !== null ? ` ${p.aimeesMax} au plus` : ""}, de n'importe quel style : l'atelier s'en inspirera.`
          )
        : v("Toutes côte à côte, pour comparer. Ouvrez le style qui vous plaît.", "Toutes côte à côte, pour comparer. Ouvre le style qui te plaît.");

  const lignes = mag
    ? [
        {
          n: "1",
          titre: "Style et palette",
          valeur: styleChoisi ? `${styleChoisi.nom}${mag.palette_cle ? `, palette ${styleChoisi.palettes.find((x) => x.cle === mag.palette_cle)?.nom ?? ""}` : ""}` : "À choisir sur le mur",
          fait: Boolean(styleChoisi && mag.palette_cle),
          action: styleChoisi ? { libelle: "Changer", href: lienBrief } : null,
        },
        {
          n: "2",
          titre: "Texte",
          valeur: PARTS_TEXTE.find((t) => t.cle === mag.texte)?.libelle ?? "À choisir",
          fait: Boolean(mag.texte),
          action: styleChoisi ? { libelle: "Modifier", href: lienBrief } : null,
        },
        {
          n: "3",
          titre: "Doubles pages préférées",
          valeur: mag.doubles.length ? mag.doubles.map((d) => TYPES_DOUBLES.find((t) => t.cle === d)?.libelle).join(", ") : "À choisir dans la page du style",
          fait: mag.doubles.length > 0,
          action: styleChoisi ? { libelle: "Modifier", href: lienBrief } : null,
        },
        {
          n: "4",
          titre: `Couvertures aimées, ${mag.couvertures_aimees.length}${p.aimeesMax !== null ? ` sur ${p.aimeesMax}` : ""}`,
          valeur: mag.couvertures_aimees.length
            ? nomsGroupes(mag.couvertures_aimees.map((a) => p.styles.find((s) => s.id === a.style_id)?.nom ?? "un style retiré"))
            : "Facultatif. Elles peuvent venir de n'importe quel style.",
          fait: mag.couvertures_aimees.length > 0,
          action: { libelle: mag.couvertures_aimees.length ? "Modifier" : "Choisir", href: styleChoisi ? lienBrief : null },
        },
      ]
    : [];

  return (
    <section className="ec-ecran ec-mur">
      <EnTeteEcran titre="Le style" sous="Un brief par magazine">
        {mag && styleChoisi ? (
          <Link className="ec-bouton ec-bouton--clair ec-bouton--petit" href={lienBrief} prefetch={false}>
            {peutAgir ? "Modifier le brief" : "Voir le brief"}
          </Link>
        ) : null}
      </EnTeteEcran>

      {p.magazines.length ? (
        <div className="ec-st-mags">
          <span className="ec-st-etiquette">{v("Vous préparez", "Tu prépares")}</span>
          <div className="ec-st-mags-liste" role="group" aria-label="Magazine">
            {p.magazines.map((m) => (
              <button key={m.id} type="button" className="ec-st-mag" aria-pressed={m.rang === rang} onClick={() => setRang(m.rang)}>
                <span>
                  Magazine {m.rang} · {m.nom}
                </span>
                <span className={m.brief_valide_le ? "ec-st-mag-etat ec-st-ok" : "ec-st-mag-etat"}>{etatDuBrief({ valide: Boolean(m.brief_valide_le), style: p.styles.find((x) => x.id === m.style_id)?.nom ?? null })}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="ec-mur-corps">
        <div className="ec-mur-mur ec-defile">
          <div className="ec-mur-intro">
            <h2 className="ec-st-grand">Le mur des styles</h2>
            <p className="ec-texte">{consigne}</p>
          </div>
          <nav className="ec-onglets" aria-label="Filtrer le mur">
            {FILTRES.map((f) => (
              <button key={f.cle} type="button" className="ec-onglet" aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>
                {f.libelle}
              </button>
            ))}
          </nav>

          {p.styles.length === 0 ? (
            <div className="ec-a-venir">
              <p className="ec-texte">Les styles arrivent sur ce mur dès que l&apos;atelier les publie.</p>
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
            <div className="ec-planches">
              {p.styles.flatMap((s) =>
                s.couvertures.map((c) => (
                  <figure key={`${s.id}-${c.cle}`} className="ec-planche">
                    <div className="ec-planche-image">{c.url ? <img src={c.url} alt="" loading="lazy" decoding="async" /> : null}</div>
                    <figcaption className="ec-planche-nom">{s.nom}</figcaption>
                    {peutAgir ? (
                      <button
                        type="button"
                        className={aimee(s.id, c.cle) ? "ec-bouton ec-bouton--petit" : "ec-bouton ec-bouton--clair ec-bouton--petit"}
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
          <aside className="ec-mur-brief ec-defile" aria-labelledby="ec-brief-titre">
            <div className="ec-mur-brief-tete">
              <h2 className="ec-st-titre" id="ec-brief-titre">
                Brief du magazine {mag.rang}
              </h2>
              <span className="ec-st-accent">
                {nbValides} brief{nbValides > 1 ? "s" : ""} validé{nbValides > 1 ? "s" : ""} sur {p.magazines.length}
              </span>
              <span className="ec-note">
                {v(
                  "Il se remplit quand vous choisissez un style dans sa page. L'intérieur suit ce style ; seule la couverture peut venir d'un autre.",
                  "Il se remplit quand tu choisis un style dans sa page. L'intérieur suit ce style ; seule la couverture peut venir d'un autre."
                )}
              </span>
            </div>

            {!styleChoisi ? (
              <div className="ec-mur-brief-vide">
                <span className="ec-note">{v("Ouvrez une planche du mur, puis choisissez-la pour ce magazine.", "Ouvre une planche du mur, puis choisis-la pour ce magazine.")}</span>
                {peutAgir && premier ? (
                  <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => agir({ action: "reprendre", depuisMagazineId: premier.id })}>
                    Reprendre le style du magazine {premier.rang}
                  </button>
                ) : null}
              </div>
            ) : null}

            <ul className="ec-mur-lignes">
              {lignes.map((l) => (
                <li key={l.n}>
                  <span className={l.fait ? "ec-st-signe ec-st-signe--fait" : "ec-st-signe"} aria-hidden="true">
                    {l.fait ? "✓" : l.n}
                  </span>
                  <span className="ec-mur-ligne-texte">
                    <span className="ec-note">{l.titre}</span>
                    <span>{l.valeur}</span>
                  </span>
                  {peutAgir && l.action ? (
                    l.action.href ? (
                      <Link className="ec-st-lien" href={l.action.href} prefetch={false}>
                        {l.action.libelle}
                      </Link>
                    ) : (
                      <button type="button" className="ec-st-lien" onClick={() => setFiltre("couvertures")}>
                        {l.action.libelle}
                      </button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>

            {mag.brief_valide_le ? (
              <div className="ec-mur-envoye">
                <strong>Brief validé</strong>
                {styleChoisi ? (
                  <span className="ec-note">
                    L&apos;atelier compose dans le style {styleChoisi.nom}
                    {mag.couvertures_aimees.length
                      ? v(", en s'appuyant sur vos doubles pages préférées et les couvertures que vous avez aimées.", ", en s'appuyant sur tes doubles pages préférées et les couvertures que tu as aimées.")
                      : v(", en s'appuyant sur vos doubles pages préférées.", ", en s'appuyant sur tes doubles pages préférées.")}
                  </span>
                ) : null}
              </div>
            ) : manques.length && styleChoisi ? (
              <p className="ec-note">Il manque {manques.join(", ")}.</p>
            ) : null}

            {peutAgir ? (
              <div className="ec-mur-gestes">
                {mag.brief_valide_le ? (
                  <>
                    {suivant ? (
                      <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => setRang(suivant.rang)}>
                        Passer au magazine {suivant.rang} →
                      </button>
                    ) : null}
                    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => agir({ action: "devalider" })}>
                      Rouvrir le brief
                    </button>
                  </>
                ) : (
                  <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe || manques.length > 0} onClick={() => agir({ action: "valider" })}>
                    Valider le brief du magazine {mag.rang}
                  </button>
                )}
              </div>
            ) : null}
            {p.fige ? <p className="ec-note">La collecte est close : l&apos;atelier compose avec ce brief.</p> : null}
            {tousValides ? <p className="ec-note">Tous les briefs sont validés. L&apos;atelier commence la composition dès que les photos sont réunies.</p> : null}
            {erreur ? (
              <p className="ec-note ec-note--erreur" role="alert">
                {erreur}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
