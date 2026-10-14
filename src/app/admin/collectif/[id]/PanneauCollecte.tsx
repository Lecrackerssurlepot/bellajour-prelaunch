"use client";

/* La collecte, côté atelier (PRD §8) : combien de photos, de qui, combien de
   signalées, et le téléchargement du lot (tout, ou une provenance).

   Le lot s'écrit DIRECTEMENT sur le disque (Chrome et Edge :
   `showDirectoryPicker`, ouvert AVANT tout `await`, comme le lot du B2C).
   Ailleurs, un fichier de liens à passer à `xargs curl -OJ`. */

import { useState } from "react";
import { choisirDossier, supporteDossier } from "../../../admin/atelier/[token]/telechargement";

type Ligne = { libelle: string; n: number };

export default function PanneauCollecte({
  id,
  total,
  participants,
  signalees,
  parProvenance,
  sansVignette,
}: {
  id: string;
  total: number;
  participants: number;
  signalees: number;
  parProvenance: Ligne[];
  sansVignette: number;
}) {
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function telecharger(provenance: string | null) {
    /* Le sélecteur AVANT tout aller-retour réseau : Chrome exige un clic frais. */
    const dossier = supporteDossier() ? await choisirDossier() : null;
    if (supporteDossier() && !dossier) return;
    setOccupe(true);
    setEtat("Préparation du lot…");
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/lot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provenance }),
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
      const sous = await dossier.getDirectoryHandle(provenance ? `Lot - ${provenance.replace(/[\\/:*?"<>|]/g, " ")}` : "Lot complet", { create: true });
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

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">La collecte</h2>
      <ul className="eca-mag-liste">
        <li>
          <span>Photos arrivées</span>
          <strong>{total}</strong>
        </li>
        <li>
          <span>Participants (appareils)</span>
          <strong>{participants}</strong>
        </li>
        <li>
          <span>Signalées « à ne pas publier »</span>
          <strong>{signalees}</strong>
        </li>
        {sansVignette ? (
          <li>
            <span>Sans vignette (HEIC lu par Chrome)</span>
            <strong>{sansVignette}</strong>
          </li>
        ) : null}
      </ul>
      {parProvenance.length ? (
        <>
          <p className="eca-champ-aide" style={{ marginTop: 12 }}>
            Par provenance
          </p>
          <ul className="eca-mag-liste">
            {parProvenance.map((l) => (
              <li key={l.libelle}>
                <span>
                  {l.libelle} <span className="eca-sous">{l.n}</span>
                </span>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe} onClick={() => telecharger(l.libelle)}>
                  Télécharger
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="eca-barre" style={{ marginTop: 12 }}>
        <button type="button" className="adm-btn" disabled={occupe || total === 0} onClick={() => telecharger(null)}>
          Télécharger tout le lot
        </button>
      </div>
      {etat ? (
        <p className="eca-message" role="status">
          {etat}
        </p>
      ) : null}
    </section>
  );
}
