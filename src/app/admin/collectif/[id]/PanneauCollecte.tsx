"use client";

/* La collecte, côté atelier (PRD §8) : combien de photos, de qui, combien de
   signalées, et le téléchargement du lot (tout, ou une provenance). Depuis
   T-182 (19/10), la SÉLECTION du client : combien, ses vignettes, et son
   téléchargement à part ; et « collecte terminée par le client » (D25).

   Le lot s'écrit DIRECTEMENT sur le disque (Chrome et Edge :
   `showDirectoryPicker`, ouvert AVANT tout `await`, comme le lot du B2C).
   Ailleurs, un fichier de liens à passer à `xargs curl -OJ`. */

import { useState } from "react";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { choisirDossier, supporteDossier } from "../../../admin/atelier/[token]/telechargement";

type Ligne = { libelle: string; n: number };

export default function PanneauCollecte({
  id,
  total,
  participants,
  signalees,
  parProvenance,
  sansVignette,
  selection,
  selectionApercus,
  terminee,
  apercus,
  doublons,
}: {
  id: string;
  total: number;
  participants: number;
  signalees: number;
  parProvenance: Ligne[];
  sansVignette: number;
  selection: number;
  selectionApercus: string[];
  terminee: { par: string; le: string } | null;
  apercus: string[];
  doublons: number;
}) {
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function telecharger(provenance: string | null, choisies = false) {
    /* Le sélecteur AVANT tout aller-retour réseau : Chrome exige un clic frais. */
    const dossier = supporteDossier() ? await choisirDossier() : null;
    if (supporteDossier() && !dossier) return;
    setOccupe(true);
    setEtat("Préparation du lot…");
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/lot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provenance, selection: choisies }),
      });
      if (!rep.ok) throw new Error(String(rep.status));
      const { photos } = (await rep.json()) as { photos: { nom: string; url: string | null }[] };
      if (!dossier) {
        const liste = photos.filter((p) => p.url).map((p) => p.url).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([liste], { type: "text/plain" }));
        a.download = "liens-du-lot.txt";
        a.click();
        setEtat(`${photos.length} liens téléchargés (xargs -n1 curl -sOJ < liens-du-lot.txt).`);
        return;
      }
      const sous = await dossier.getDirectoryHandle(
        choisies ? "Sélection du client" : provenance ? `Lot - ${provenance.replace(/[\\/:*?"<>|]/g, " ")}` : "Lot complet",
        { create: true }
      );
      let faites = 0;
      const ratees: string[] = [];
      let curseur = 0;
      const ouvrier = async () => {
        for (;;) {
          const i = curseur++;
          if (i >= photos.length) return;
          const p = photos[i];
          try {
            if (!p.url) throw new Error("sans lien");
            const r = await fetch(p.url, { cache: "no-store" });
            if (!r.ok || !r.body) throw new Error(String(r.status));
            const f = await sous.getFileHandle(p.nom, { create: true });
            await r.body.pipeTo(await f.createWritable());
            faites++;
          } catch {
            ratees.push(p.nom);
          }
          setEtat(`${faites} sur ${photos.length} écrites…`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, photos.length) }, ouvrier));
      setEtat(ratees.length ? `${faites} écrites, ${ratees.length} ratées : ${ratees.slice(0, 5).join(", ")}…` : `${faites} photos écrites dans « ${sous.name} ».`);
    } catch {
      setEtat("Le lot n'a pas pu se préparer. Réessayer.");
    } finally {
      setOccupe(false);
    }
  }

  const n = (x: number, mot: string) => `${x.toLocaleString("fr-FR")} ${mot}${x > 1 ? "s" : ""}`;
  /* T-185 (planche 7) : trois cartes, comme la vue d'ensemble. Les grands chiffres et les
     dernières arrivées ; la sélection du client (T-182) ; qui a déposé, et le lot. */
  return (
    <div className="eca-cartes eca-cartes--deux">
      <section className="eca-carte">
        <span className="eca-carte-tete">
          <h2 className="eca-carte-titre">La collecte</h2>
        </span>
        {terminee ? (
          <p className="eca-bandeau eca-bandeau--ok">
            <strong>Collecte terminée par {terminee.par}</strong> le {formaterInstantParis(terminee.le)} : toutes les photos sont là.
          </p>
        ) : null}
        <span className="eca-chiffre">
          <strong>{total.toLocaleString("fr-FR")}</strong>
          <span>
            photo{total > 1 ? "s" : ""} · {n(participants, "personne")}
          </span>
        </span>
        {apercus.length ? (
          <div className="eca-mosaique" aria-label="Les dernières photos arrivées">
            {apercus.map((u, i) => (
              <img key={i} src={u} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        ) : (
          <p className="eca-vide">{total ? "Pas encore d'aperçu à montrer." : "Aucune photo encore."}</p>
        )}
        <span className="eca-carte-pied eca-puces">
          {doublons ? <span className="eca-puce">{n(doublons, "doublon")}</span> : null}
          {signalees ? <span className="eca-puce eca-puce--ambre">{n(signalees, "signalée")} « à ne pas publier »</span> : null}
          {sansVignette ? <span className="eca-puce">{sansVignette.toLocaleString("fr-FR")} sans aperçu (HEIC)</span> : null}
          {!doublons && !signalees && !sansVignette ? <span>Ni doublon, ni photo signalée.</span> : null}
        </span>
      </section>

      <section className="eca-carte">
        <span className="eca-carte-tete">
          <h2 className="eca-carte-titre">Sélection du client</h2>
          <span className="eca-puce">{selection ? n(selection, "photo") : "vide"}</span>
        </span>
        {selectionApercus.length ? (
          <div className="eca-mosaique" aria-label="Les premières photos de la sélection du client">
            {selectionApercus.slice(0, 8).map((u, i) => (
              <img key={i} src={u} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        ) : (
          <p className="eca-vide">Le client met de côté les photos qu&apos;il préfère (facultatif). Elles arriveront ici.</p>
        )}
        <span className="eca-carte-pied eca-mag-pied">
          <span>{selection ? "Ce qu'il préfère, pour composer." : "Rien de choisi pour l'instant."}</span>
          <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe || selection === 0} onClick={() => telecharger(null, true)}>
            Télécharger la sélection
          </button>
        </span>
      </section>

      <section className="eca-carte eca-carte--large">
        <span className="eca-carte-tete">
          <h2 className="eca-carte-titre">Qui a déposé</h2>
          <button type="button" className="adm-btn" disabled={occupe || total === 0} onClick={() => telecharger(null)}>
            Télécharger tout le lot
          </button>
        </span>
        {parProvenance.length ? (
          <ul className="eca-provenances">
            {parProvenance.map((l) => (
              <li key={l.libelle}>
                <span>
                  {l.libelle} <span className="eca-sous">{l.n.toLocaleString("fr-FR")}</span>
                </span>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe} onClick={() => telecharger(l.libelle)}>
                  Télécharger
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="eca-vide">Personne n&apos;a encore déposé.</p>
        )}
        {etat ? (
          <p className="eca-message" role="status">
            {etat}
          </p>
        ) : null}
      </section>
    </div>
  );
}
