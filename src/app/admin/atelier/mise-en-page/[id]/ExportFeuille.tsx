"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { avertissementsExport, idsMagazine, pagesLibelle } from "@/lib/mise-en-page/editeur";
import type { CatalogueCharge, SourceCatalogue } from "./chargerCatalogue";
import { cls, pluriel, useEd, type Projet } from "./contexte";
import { Ico } from "./icones";
import { choisirDestination, exporter, parentMemorise, peutEcrireDansUnDossier, type ProgressionExport, type ResultatExport } from "./exporter";
import { dossierAbsolu, nomDeDossier, nomDossierValide } from "./exporterPur";

/* La feuille d'export : le dossier absolu (les liens de l'IDML en dépendent), ce que le paquet contiendra, ce qu'il
   faut vérifier, puis la progression avec « Annuler ». Le sélecteur de dossier s'ouvre dans le clic, avant tout await. */

type Etape = { nom: "choix" } | { nom: "cours"; prog: ProgressionExport } | { nom: "fin"; r: Extract<ResultatExport, { ok: true }> } | { nom: "erreur"; message: string };

const mo = (o: number): string => (o > 1e9 ? `${(o / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Go` : `${Math.max(1, Math.round(o / 1e6)).toLocaleString("fr-FR")} Mo`);

export function ExportFeuille({ catalogue, source, projet, suite, onFermer }: {
  catalogue: CatalogueCharge; source: SourceCatalogue; projet: Projet; suite: { href: string; mot: string }; onFermer: () => void;
}) {
  const { etat, envoyer } = useEd();
  const [parent, setParent] = useState(() => parentMemorise());
  const [nom, setNom] = useState(() => nomDeDossier(projet.nom));
  const [etape, setEtape] = useState<Etape>({ nom: "choix" });
  const [sans, setSans] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  const av = avertissementsExport(etat);
  const ids = [...new Set(idsMagazine(etat.magazine))].filter((id) => etat.catalogue.has(id));
  const pl = pagesLibelle(etat);
  const parentOk = dossierAbsolu(parent);
  const nomOk = nomDossierValide(nom);
  const dossier = parentOk.ok && nomOk.ok ? `${parentOk.dossier}/${nomOk.nom}` : "";
  const dossierOk = dossierAbsolu(dossier);
  const peutDossier = peutEcrireDansUnDossier();
  const nbAvert = av.indisponibles.length + av.signaleesPosees.length + av.bassesDef.length + (av.pagesAuDessus ? 1 : 0);
  const bloque = !ids.length || (av.indisponibles.length > 0 && !sans);

  const lancer = () => {
    if (!dossierOk.ok) return;
    /* ⚠️ le sélecteur de dossier s'ouvre ICI, de façon synchrone : Chrome exige une activation utilisateur fraîche. */
    const destination = choisirDestination();
    void (async () => {
      const dest = await destination;
      if (!dest) return;
      const c = new AbortController();
      ctrl.current = c;
      setEtape({ nom: "cours", prog: { fait: 0, total: ids.length, photo: null } });
      const r = await exporter({
        magazine: etat.magazine, catalogue, source, dossier, destination: dest, titre: projet.nom,
        onProgression: (prog) => setEtape((e) => (e.nom === "cours" ? { nom: "cours", prog } : e)), signal: c.signal,
      });
      ctrl.current = null;
      if (r.ok) setEtape({ nom: "fin", r });
      else if (r.raison === "annule") setEtape({ nom: "choix" });
      else setEtape({ nom: "erreur", message: r.message });
    })();
  };

  return (
    <div className="ed-voile" onClick={(e) => { if (e.target === e.currentTarget && etape.nom !== "cours") onFermer(); }}>
      <div className="ed-feuille-ex" role="dialog" aria-modal="true" aria-label="Exporter">
        <div className="ed-ex-tete">
          <h2>Exporter pour Affinity</h2>
          <button type="button" className="ed-ico" aria-label="Fermer" onClick={onFermer} disabled={etape.nom === "cours"}>{Ico.fermer}</button>
        </div>
        {etape.nom === "choix" ? (
          <>
            <label className="ed-ex-champ">
              <span>Dossier des projets</span>
              <input className="adm-input" type="text" value={parent} placeholder="/Users/…/Bellajour/test-idml" spellCheck={false} autoComplete="off"
                onChange={(e) => setParent(e.currentTarget.value)} aria-invalid={!parentOk.ok} />
              {!parentOk.ok ? <small className="ed-ex-err">{parentOk.message}</small> : <small>{peutDossier ? "À choisir à l'étape suivante" : "Décompresser le zip ici"}</small>}
            </label>
            <label className="ed-ex-champ">
              <span>Nom du dossier</span>
              <input className="adm-input" type="text" value={nom} spellCheck={false} autoComplete="off"
                onChange={(e) => setNom(e.currentTarget.value)} aria-invalid={!nomOk.ok} />
              {!nomOk.ok ? <small className="ed-ex-err">{nomOk.message}</small> : <small>Créé tout seul</small>}
            </label>
            <ul className="ed-ex-arbre" aria-label="Contenu de l'export">
              <li><span>magazine.idml</span><span>{pluriel(av.planches, "planche")} · {pluriel(pl.pages, "page")}</span></li>
              <li><span>Links/</span><span>{pluriel(ids.length, "photo")}</span></li>
              <li><span>photos-utilisees.txt</span><span>{ids.length}</span></li>
              <li><span>photos-non-utilisees.txt</span><span>{Math.max(0, etat.catalogue.size - ids.length)}</span></li>
            </ul>
            {nbAvert ? (
              <div className="ed-ex-avert">
                {av.indisponibles.length ? <span className="ed-ex-rouge">{pluriel(av.indisponibles.length, "photo indisponible", "photos indisponibles")} · cadre vide</span> : null}
                {av.signaleesPosees.length ? <span>{pluriel(av.signaleesPosees.length, "photo à ne pas publier posée", "photos à ne pas publier posées")}</span> : null}
                {av.bassesDef.slice(0, 3).map((z) => (
                  <button key={`${z.photoId}${z.plancheId}`} type="button" onClick={() => { onFermer(); envoyer({ type: "naviguer", plancheId: z.plancheId }); }}>
                    Basse déf. · planche {z.numero} · {z.dpi} dpi →
                  </button>
                ))}
                {av.bassesDef.length > 3 ? <span className="ed-sous">et {av.bassesDef.length - 3} autres</span> : null}
                {av.pagesAuDessus ? <span>{pl.pages} pages pour {pl.cible} payées</span> : null}
              </div>
            ) : null}
            {av.indisponibles.length ? (
              <label className="ed-ex-sans"><input type="checkbox" checked={sans} onChange={(e) => setSans(e.currentTarget.checked)} /> Exporter sans elles</label>
            ) : null}
            <div className="ed-ex-actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onFermer}>Annuler</button>
              <button type="button" className="adm-btn" disabled={bloque || !dossierOk.ok} onClick={lancer}>Exporter</button>
            </div>
          </>
        ) : null}
        {etape.nom === "cours" ? (
          <>
            <p className="ed-ex-ligne">{etape.prog.photo ? `Links/ · ${etape.prog.fait} / ${etape.prog.total}` : etape.prog.fait >= etape.prog.total && etape.prog.total > 0 ? "magazine.idml" : "Préparation"}</p>
            <div className="ed-prog" role="progressbar" aria-label="Progression" aria-valuemin={0} aria-valuemax={100} aria-valuenow={etape.prog.total ? Math.round((etape.prog.fait / etape.prog.total) * 100) : 0}>
              <b style={{ width: `${etape.prog.total ? (etape.prog.fait / etape.prog.total) * 100 : 0}%` }} />
            </div>
            <div className="ed-ex-actions"><button type="button" className="adm-btn adm-btn--ghost" onClick={() => ctrl.current?.abort()}>Annuler</button></div>
          </>
        ) : null}
        {etape.nom === "erreur" ? (
          <>
            <div className="ed-ex-avert"><span className="ed-ex-rouge">{etape.message}</span></div>
            <div className="ed-ex-actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onFermer}>Fermer</button>
              <button type="button" className="adm-btn" onClick={() => setEtape({ nom: "choix" })}>Réessayer</button>
            </div>
          </>
        ) : null}
        {etape.nom === "fin" ? (
          <div className="ed-ex-ok">
            <span className="ate-tag ate-tag--choix">Export terminé</span>
            <p className="ed-ex-ligne">
              {etape.r.livraison === "dossier" ? `${pluriel(etape.r.nbPhotos, "photo")} écrite${etape.r.nbPhotos > 1 ? "s" : ""} dans ${etape.r.dossier.slice(etape.r.dossier.lastIndexOf("/") + 1)}` : `${etape.r.nomZip ?? "Le zip"} téléchargé · à décompresser dans ${etape.r.dossier.slice(0, etape.r.dossier.lastIndexOf("/"))}`}
              {" · "}{mo(etape.r.octets)}
            </p>
            {etape.r.indisponibles.length ? <p className="ed-ex-ligne ed-ex-rouge">{pluriel(etape.r.indisponibles.length, "photo illisible", "photos illisibles")} · cadre vide</p> : null}
            {etape.r.tournees.length ? <p className="ed-ex-ligne">{pluriel(etape.r.tournees.length, "photo couchée", "photos couchées")} à regarder en premier</p> : null}
            <ol className="ed-ex-etapes">
              <li>Ouvrir magazine.idml dans Affinity</li>
              <li>Finir, exporter le PDF</li>
              <li>Déposer le PDF dans {suite.mot}</li>
            </ol>
            <div className="ed-ex-actions ed-ex-actions--debut">
              {projet.source === "libre" ? null : <Link className="adm-btn" href={suite.href}>{suite.mot} ↗</Link>}
              <button type="button" className={cls("adm-btn", "adm-btn--ghost")} onClick={onFermer}>Rester ici</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
