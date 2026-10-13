"use client";

/* L'éditeur d'un style (PRD §8) : identité, palettes, typographies,
   couvertures, cinq doubles pages types, publication.

   Les images partent une à une dès qu'on les choisit (réduites dans le
   navigateur, écrites par le serveur, nom versionné) ; elles n'entrent dans
   le style qu'à « Enregistrer ». Publier relit `manquesPourPublier` : le
   bouton dit ce qui manque, et le serveur refuse de toute façon un style
   incomplet. Rien ne s'efface : retirer une image la sort du style, pas du
   coffre. */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COULEURS_PAR_PALETTE,
  manquesPourPublier,
  TYPES_DOUBLES,
  type CouvertureStyle,
  type DoubleStyle,
  type EmplacementImage,
  type Palette,
  type Typos,
} from "@/lib/collectif/styles";
import type { Segment } from "@/lib/collectif/types";
import { reduireImage } from "../reduireImage";

export type StyleInitial = {
  id: string;
  slug: string;
  nom: string;
  description: string;
  segment: Segment;
  ordre: number;
  publie: boolean;
  palettes: Palette[];
  typos: Typos;
  couvertures: CouvertureStyle[];
  doubles: DoubleStyle[];
};

type Etat = Omit<StyleInitial, "id" | "slug" | "publie">;

function cleAleatoire(): string {
  return Math.random().toString(36).slice(2, 8) || "c0";
}

function paletteVide(): Palette {
  return { cle: "", nom: "", couleurs: Array.from({ length: COULEURS_PAR_PALETTE }, () => "#000000") };
}

export default function EditeurStyle({
  initial,
  images: imagesInitiales,
}: {
  initial: StyleInitial;
  images: Record<string, string>;
}) {
  const router = useRouter();
  const depart: Etat = {
    nom: initial.nom,
    description: initial.description,
    segment: initial.segment,
    ordre: initial.ordre,
    palettes: initial.palettes,
    typos: initial.typos,
    couvertures: initial.couvertures,
    doubles: TYPES_DOUBLES.map(
      ({ cle }) => initial.doubles.find((d) => d.type === cle) ?? { type: cle, image_key: null, legende: "" }
    ),
  };
  const [s, setS] = useState<Etat>(depart);
  const [enregistre, setEnregistre] = useState(JSON.stringify(depart));
  const [publie, setPublie] = useState(initial.publie);
  const [images, setImages] = useState<Record<string, string>>(imagesInitiales);
  const [envois, setEnvois] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const fichierCouvertures = useRef<HTMLInputElement>(null);

  const modifie = JSON.stringify(s) !== enregistre;
  const manques = useMemo(() => manquesPourPublier(s), [s]);
  const maj = (patch: Partial<Etat>) => {
    setS((x) => ({ ...x, ...patch }));
    setMessage(null);
  };

  async function envoyerImage(fichier: File, emplacement: EmplacementImage, cle: string): Promise<string | null> {
    setEnvois((n) => n + 1);
    try {
      const { blob, type } = await reduireImage(fichier);
      const rep = await fetch(
        `/api/admin/collectif/styles/${initial.id}/image?emplacement=${emplacement}&cle=${encodeURIComponent(cle)}`,
        { method: "POST", headers: { "content-type": type }, body: blob }
      );
      const json = (await rep.json().catch(() => ({}))) as { key?: string; url?: string | null; message?: string };
      if (!rep.ok || !json.key) {
        setMessage({ ok: false, texte: json.message ?? `« ${fichier.name} » n'est pas parti (erreur ${rep.status}).` });
        return null;
      }
      if (json.url) setImages((m) => ({ ...m, [json.key as string]: json.url as string }));
      return json.key;
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : `« ${fichier.name} » n'est pas parti.` });
      return null;
    } finally {
      setEnvois((n) => n - 1);
    }
  }

  async function ajouterCouvertures(fichiers: FileList | null) {
    if (!fichiers) return;
    for (const f of Array.from(fichiers)) {
      const cle = cleAleatoire();
      const key = await envoyerImage(f, "couverture", cle);
      if (key) setS((x) => ({ ...x, couvertures: [...x.couvertures, { cle, image_key: key, legende: "" }] }));
    }
    if (fichierCouvertures.current) fichierCouvertures.current.value = "";
  }

  async function remplacerDouble(i: number, fichier: File | undefined) {
    if (!fichier) return;
    const key = await envoyerImage(fichier, "double", s.doubles[i].type);
    if (key) setS((x) => ({ ...x, doubles: x.doubles.map((d, j) => (j === i ? { ...d, image_key: key } : d)) }));
  }

  async function remplacerEchantillon(fichier: File | undefined) {
    if (!fichier) return;
    const key = await envoyerImage(fichier, "echantillon", "typo");
    if (key) setS((x) => ({ ...x, typos: { ...x.typos, echantillon_key: key } }));
  }

  async function enregistrer(publier?: boolean) {
    setOccupe(true);
    setMessage(null);
    try {
      const corps: Record<string, unknown> = { ...s };
      if (publier !== undefined) corps.publie = publier;
      const rep = await fetch(`/api/admin/collectif/styles/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
      const json = (await rep.json().catch(() => ({}))) as {
        error?: string;
        manques?: string[];
        erreurs?: { message: string }[];
      };
      if (!rep.ok) {
        if (json.error === "incomplet") setMessage({ ok: false, texte: `Pas encore publiable : il manque ${json.manques?.join(", ")}.` });
        else if (json.erreurs?.length) setMessage({ ok: false, texte: json.erreurs.map((e) => e.message).join(" ") });
        else setMessage({ ok: false, texte: `Rien n'est enregistré (erreur ${rep.status}).` });
        return;
      }
      setEnregistre(JSON.stringify(s));
      if (publier !== undefined) setPublie(publier);
      setMessage({
        ok: true,
        texte: publier === true ? "Enregistré et publié sur le mur." : publier === false ? "Retiré du mur. Rien n'est effacé." : "Enregistré.",
      });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Le réseau n'a pas répondu. Rien n'est enregistré." });
    } finally {
      setOccupe(false);
    }
  }

  const image = (key: string | null, alt: string) =>
    key && images[key] ? <img src={images[key]} alt={alt} decoding="async" /> : <span>Pas d&apos;image</span>;

  return (
    <div className="eca-form">
      <fieldset className="eca-fieldset">
        <legend className="eca-legende">L&apos;identité</legend>
        <div className="eca-champs">
          <label className="eca-champ">
            <span className="eca-champ-label">Nom</span>
            <input className="eca-input" value={s.nom} onChange={(e) => maj({ nom: e.target.value })} />
          </label>
          <label className="eca-champ">
            <span className="eca-champ-label">Adresse</span>
            <input className="eca-input" value={initial.slug} readOnly />
            <span className="eca-champ-aide">Définitive.</span>
          </label>
          <label className="eca-champ">
            <span className="eca-champ-label">Public</span>
            <select className="eca-select" value={s.segment} onChange={(e) => maj({ segment: e.target.value as Segment })}>
              <option value="tous">Tous</option>
              <option value="entreprise">Entreprise</option>
              <option value="ecole">École</option>
            </select>
          </label>
          <label className="eca-champ">
            <span className="eca-champ-label">Ordre sur le mur</span>
            <input
              className="eca-input"
              type="number"
              min={0}
              step={1}
              value={s.ordre}
              onChange={(e) => maj({ ordre: Number(e.target.value) })}
            />
            <span className="eca-champ-aide">Le plus petit en premier.</span>
          </label>
          <label className="eca-champ eca-champ--large">
            <span className="eca-champ-label">Description</span>
            <textarea className="eca-textarea" value={s.description} onChange={(e) => maj({ description: e.target.value })} />
          </label>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Les palettes</legend>
        {s.palettes.length === 0 ? <p className="eca-vide">Aucune palette.</p> : null}
        {s.palettes.map((p, i) => (
          <div className="eca-palette" key={p.cle || `nouvelle-${i}`}>
            <input
              className="eca-input"
              placeholder="Nom de la palette"
              value={p.nom}
              onChange={(e) => maj({ palettes: s.palettes.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)) })}
            />
            {p.couleurs.map((c, k) => (
              <span className="eca-couleur" key={k}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(c) ? c : "#000000"}
                  aria-label={`Couleur ${k + 1}`}
                  onChange={(e) =>
                    maj({
                      palettes: s.palettes.map((x, j) =>
                        j === i ? { ...x, couleurs: x.couleurs.map((y, l) => (l === k ? e.target.value : y)) } : x
                      ),
                    })
                  }
                />
                <input
                  className="eca-input"
                  value={c}
                  aria-label={`Code de la couleur ${k + 1}`}
                  onChange={(e) =>
                    maj({
                      palettes: s.palettes.map((x, j) =>
                        j === i ? { ...x, couleurs: x.couleurs.map((y, l) => (l === k ? e.target.value.trim() : y)) } : x
                      ),
                    })
                  }
                />
              </span>
            ))}
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              onClick={() => maj({ palettes: s.palettes.filter((_, j) => j !== i) })}
            >
              Retirer
            </button>
          </div>
        ))}
        <div className="eca-barre" style={{ marginTop: 12 }}>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => maj({ palettes: [...s.palettes, paletteVide()] })}>
            Ajouter une palette
          </button>
          <span className="eca-champ-aide">Un nom et {COULEURS_PAR_PALETTE} couleurs.</span>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Les typographies</legend>
        <div className="eca-champs">
          <label className="eca-champ">
            <span className="eca-champ-label">Titres</span>
            <input className="eca-input" value={s.typos.titres} onChange={(e) => maj({ typos: { ...s.typos, titres: e.target.value } })} />
          </label>
          <label className="eca-champ">
            <span className="eca-champ-label">Texte</span>
            <input className="eca-input" value={s.typos.texte} onChange={(e) => maj({ typos: { ...s.typos, texte: e.target.value } })} />
          </label>
          <div className="eca-champ eca-champ--large">
            <span className="eca-champ-label">Échantillon (image)</span>
            <div className="eca-vignettes">
              <div className="eca-vignette">
                <div className="eca-vignette-image">{image(s.typos.echantillon_key, "Échantillon des typographies")}</div>
                <input
                  className="eca-fichier"
                  type="file"
                  accept="image/*"
                  onChange={(e) => remplacerEchantillon(e.target.files?.[0])}
                />
              </div>
            </div>
            <span className="eca-champ-aide">
              Une image rendue par l&apos;atelier : le site ne sert jamais un fichier de police (licences).
            </span>
          </div>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Les couvertures</legend>
        {s.couvertures.length === 0 ? <p className="eca-vide">Aucune couverture.</p> : null}
        <div className="eca-vignettes">
          {s.couvertures.map((c, i) => (
            <div className="eca-vignette" key={c.cle}>
              <div className="eca-vignette-image eca-vignette-image--couverture">{image(c.image_key, `Couverture ${i + 1}`)}</div>
              <input
                className="eca-input"
                placeholder="Légende"
                value={c.legende}
                onChange={(e) =>
                  maj({ couvertures: s.couvertures.map((x, j) => (j === i ? { ...x, legende: e.target.value } : x)) })
                }
              />
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => maj({ couvertures: s.couvertures.filter((_, j) => j !== i) })}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
        <div className="eca-barre" style={{ marginTop: 12 }}>
          <input
            ref={fichierCouvertures}
            className="eca-fichier"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => ajouterCouvertures(e.target.files)}
          />
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Les cinq doubles pages types</legend>
        <div className="eca-vignettes">
          {s.doubles.map((d, i) => (
            <div className="eca-vignette" key={d.type}>
              <span className="eca-vignette-titre">{TYPES_DOUBLES.find((t) => t.cle === d.type)?.libelle}</span>
              <div className="eca-vignette-image">{image(d.image_key, `Double page ${d.type}`)}</div>
              <input
                className="eca-fichier"
                type="file"
                accept="image/*"
                onChange={(e) => remplacerDouble(i, e.target.files?.[0])}
              />
              <input
                className="eca-input"
                placeholder="Légende"
                value={d.legende}
                onChange={(e) => maj({ doubles: s.doubles.map((x, j) => (j === i ? { ...x, legende: e.target.value } : x)) })}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="eca-pied">
        <div>
          <p className="eca-message">
            {publie ? <span className="ate-camp ate-camp--atelier">Sur le mur</span> : <span className="ate-camp">Brouillon</span>}{" "}
            {envois > 0 ? `Envoi de ${envois} image${envois > 1 ? "s" : ""}…` : modifie ? "Modifications non enregistrées." : "Tout est enregistré."}
          </p>
          {!publie && manques.length ? <p className="eca-manques">Pour publier, il manque : {manques.join(", ")}.</p> : null}
          {message ? (
            <p className={`eca-message ${message.ok ? "eca-message--ok" : "eca-message--erreur"}`} role="status">
              {message.texte}
            </p>
          ) : null}
        </div>
        <div className="eca-barre">
          <button type="button" className="adm-btn" disabled={occupe || envois > 0 || !modifie} onClick={() => enregistrer()}>
            Enregistrer
          </button>
          {publie ? (
            <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe || envois > 0} onClick={() => enregistrer(false)}>
              Retirer du mur
            </button>
          ) : (
            <button
              type="button"
              className="adm-btn adm-btn--ghost"
              disabled={occupe || envois > 0 || manques.length > 0}
              onClick={() => enregistrer(true)}
            >
              Publier sur le mur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
