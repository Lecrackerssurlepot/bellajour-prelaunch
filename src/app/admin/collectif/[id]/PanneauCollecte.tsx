"use client";

/* La collecte, côté atelier (PRD §8) : combien de photos, de qui, combien de
   signalées, et le téléchargement du lot. Depuis T-182 (19/10), la SÉLECTION du
   client : combien, ses vignettes, et son téléchargement à part ; et « collecte
   terminée par le client » (D25).

   « Qui a déposé » se range PAR LIEN (T-193, 20/10) : le nom que le responsable a
   donné à chaque lien (« Bateau 3 »), puis « Lien général » et « Le responsable »,
   et sous chaque lien ses personnes avec leur nombre de photos. Trois gestes :
   « Télécharger tout le lot » (un sous-dossier par lien), « Télécharger ce lien »
   (le dossier « Lot - <lien> ») et « Télécharger » une personne. Les noms de
   fichiers (`lotCollectif.ts`, calculés par la route) portent le rang, le lien, la
   personne, la date et le nom d'origine : sans sous-dossiers, ils disent encore
   de quel bateau ils viennent.

   Le lot s'écrit DIRECTEMENT sur le disque (Chrome et Edge :
   `showDirectoryPicker`, ouvert AVANT tout `await`, comme le lot du B2C).
   Ailleurs, un fichier de liens à passer à `xargs curl -OJ`. */

import { useState } from "react";
import { formaterInstantParis } from "@/lib/collectif/dates";
import type { LienDepose } from "@/lib/collectif/grille";
import { choisirDossier, supporteDossier } from "../../../admin/atelier/[token]/telechargement";

/** Ce que l'on veut télécharger : un lien (clé de `cleDuLien`), une personne de ce lien, la sélection du client ; rien = tout le lot. */
type Demande = { lien?: string; personne?: string; selection?: boolean };

export default function PanneauCollecte({
  id,
  total,
  participants,
  signalees,
  parLien,
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
  parLien: LienDepose[];
  sansVignette: number;
  selection: number;
  selectionApercus: string[];
  terminee: { par: string; le: string } | null;
  apercus: string[];
  doublons: number;
}) {
  const [etat, setEtat] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function telecharger(demande: Demande) {
    const choisies = demande.selection === true;
    /* Le sélecteur AVANT tout aller-retour réseau : Chrome exige un clic frais. */
    const dossier = supporteDossier() ? await choisirDossier() : null;
    if (supporteDossier() && !dossier) return;
    setOccupe(true);
    setEtat("Préparation du lot…");
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/lot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lien: demande.lien ?? null, personne: demande.personne ?? null, selection: choisies }),
      });
      if (!rep.ok) {
        /* Un lot incomplet (T-167 : moins de photos lues que la base n'en compte) se DIT, avec
           les deux nombres : jamais « 1 000 photos écrites » sur un lot qui en a perdu. */
        const refus = (await rep.json().catch(() => null)) as { message?: unknown } | null;
        setEtat(typeof refus?.message === "string" ? refus.message : "Le lot n'a pas pu se préparer. Réessayer.");
        return;
      }
      const { photos, dossier: nomLot } = (await rep.json()) as { photos: { nom: string; dossier: string | null; url: string | null }[]; dossier?: string };
      if (photos.length === 0) {
        setEtat("Aucune photo dans ce lot pour l'instant.");
        return;
      }
      if (!dossier) {
        /* Pas d'écriture sur le disque : la liste de liens. Chaque nom de fichier porte déjà le lien et la
           personne (`lotCollectif.ts`) : c'est lui qui range le lot, à défaut de sous-dossiers. */
        const liste = photos.filter((p) => p.url).map((p) => p.url).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([liste], { type: "text/plain" }));
        a.download = "liens-du-lot.txt";
        a.click();
        setEtat(`${photos.length} liens téléchargés (xargs -n1 curl -sOJ < liens-du-lot.txt). Chaque fichier porte le nom de son lien et de sa personne.`);
        return;
      }
      const sous = await dossier.getDirectoryHandle(nomLot || (choisies ? "Sélection du client" : "Lot complet"), { create: true });
      /* « Tout le lot » : un sous-dossier par lien, créé une seule fois même quand quatre fichiers l'ouvrent ensemble. */
      const sousDossiers = new Map<string, Promise<FileSystemDirectoryHandle>>();
      const cible = (nom: string | null) => {
        if (!nom) return Promise.resolve(sous);
        let d = sousDossiers.get(nom);
        if (!d) {
          d = sous.getDirectoryHandle(nom, { create: true });
          sousDossiers.set(nom, d);
        }
        return d;
      };
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
            const f = await (await cible(p.dossier)).getFileHandle(p.nom, { create: true });
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

  /* Les liens dépliés : quand il n'y en a qu'un ou deux, on voit tout de suite leurs personnes ; au-delà (huit
     bateaux), la liste reste courte et chaque lien s'ouvre à la demande. */
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(() => new Set(parLien.length <= 2 ? parLien.map((l) => l.cle) : []));
  const basculer = (cle: string) =>
    setOuverts((o) => {
      const suite = new Set(o);
      if (!suite.delete(cle)) suite.add(cle);
      return suite;
    });

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
          <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe || selection === 0} onClick={() => telecharger({ selection: true })}>
            Télécharger la sélection
          </button>
        </span>
      </section>

      <section className="eca-carte eca-carte--large">
        <span className="eca-carte-tete eca-carte-tete--gestes">
          <h2 className="eca-carte-titre">Qui a déposé</h2>
          <button type="button" className="adm-btn" disabled={occupe || total === 0} onClick={() => telecharger({})}>
            Télécharger tout le lot
          </button>
        </span>
        {parLien.length ? (
          <ul className="eca-dep">
            {parLien.map((l, i) => {
              const ouvert = l.n > 0 && ouverts.has(l.cle);
              return (
                <li key={l.cle} className="eca-dep-lien">
                  <div className="eca-dep-tete">
                    <button
                      type="button"
                      className="eca-dep-bascule"
                      aria-expanded={ouvert}
                      aria-controls={`eca-dep-${i}`}
                      disabled={l.n === 0}
                      onClick={() => basculer(l.cle)}
                    >
                      <svg className="eca-dep-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                      <span className="eca-dep-titres">
                        <span className="eca-dep-nom">{l.nom}</span>
                        <span className="eca-sous">
                          {l.n ? `${n(l.n, "photo")} · ${n(l.nbPersonnes, "personne")}` : "Aucune photo pour l'instant"}
                        </span>
                      </span>
                    </button>
                    {l.retire ? <span className="eca-puce eca-puce--gris">Supprimé</span> : null}
                    <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe || l.n === 0} onClick={() => telecharger({ lien: l.cle })}>
                      Télécharger ce lien
                    </button>
                  </div>
                  {ouvert ? (
                    <ul className="eca-dep-pers" id={`eca-dep-${i}`}>
                      {l.personnes.map((p) => (
                        <li key={p.cle}>
                          <span className="eca-dep-pers-nom">
                            {p.nom}
                            {p.telephones ? <span className="eca-sous">{p.telephones} téléphones</span> : null}
                          </span>
                          <span className="eca-dep-pers-n">{n(p.n, "photo")}</span>
                          <button type="button" className="adm-btn adm-btn--ghost" disabled={occupe} onClick={() => telecharger({ lien: l.cle, personne: p.cle })}>
                            Télécharger
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
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
