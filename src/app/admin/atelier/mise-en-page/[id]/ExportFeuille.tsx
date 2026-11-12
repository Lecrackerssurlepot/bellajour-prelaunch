"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { avertissementsExport, idsMagazine, pagesLibelle, type Lecon, type Projet } from "@/lib/mise-en-page/editeur";
import type { Memoire } from "./leconsClient";
import type { CatalogueCharge, SourceCatalogue } from "./chargerCatalogue";
import { cls, pluriel, useEd } from "./contexte";
import { Ico } from "./icones";
import { choisirDestination, exporter, parentMemorise, peutEcrireDansUnDossier, type ProgressionExport, type ResultatExport } from "./exporter";
import { dossierAbsolu, nomDeDossier, nomDossierValide } from "./exporterPur";
import { exporterPdf, type ResultatExportPdf } from "./exporterPdf";

/* La feuille d'export. Deux sorties (11/11) : Canva, un PDF téléchargé d'un clic ; Affinity, le dossier absolu (les liens de l'IDML en dépendent), ce que le paquet contiendra, ce qu'il
   faut vérifier, puis la progression avec « Annuler ». Le sélecteur de dossier s'ouvre dans le clic, avant tout await. */

type Etape =
  | { nom: "choix" }
  | { nom: "cours"; prog: ProgressionExport }
  | { nom: "fin"; r: Extract<ResultatExport, { ok: true }> }
  | { nom: "finPdf"; r: Extract<ResultatExportPdf, { ok: true }> }
  | { nom: "erreur"; message: string };

type Sortie = "canva" | "affinity";
const CLE_SORTIE = "bj-mep-sortie";
const sortieMemorisee = (): Sortie => {
  try { return window.localStorage.getItem(CLE_SORTIE) === "affinity" ? "affinity" : "canva"; } catch { return "canva"; }
};

const mo = (o: number): string => (o > 1e9 ? `${(o / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Go` : `${Math.max(1, Math.round(o / 1e6)).toLocaleString("fr-FR")} Mo`);

export function ExportFeuille({ catalogue, source, projet, suite, onFermer, onExporte, memoire }: {
  catalogue: CatalogueCharge; source: SourceCatalogue; projet: Projet; suite: { href: string; mot: string }; onFermer: () => void;
  /** Lot 2 : appelé quand l'export a abouti (jalon et instantané de la mémoire), pour Affinity comme pour Canva. */
  onExporte?: (dossier: string, format?: "IDML" | "PDF") => void;
  /** Lot 3 (G3) : la mémoire, pour poser au plus trois questions à la fin. */
  memoire?: Memoire;
}) {
  const { etat, envoyer } = useEd();
  const [parent, setParent] = useState(() => parentMemorise());
  const [nom, setNom] = useState(() => nomDeDossier(projet.nom));
  const [etape, setEtape] = useState<Etape>({ nom: "choix" });
  const [sans, setSans] = useState(false);
  const [sortie, setSortie] = useState<Sortie>(() => sortieMemorisee());
  const choisirSortie = (s: Sortie) => {
    setSortie(s);
    try { window.localStorage.setItem(CLE_SORTIE, s); } catch { /* stockage refusé : Canva par défaut */ }
  };
  const ctrl = useRef<AbortController | null>(null);
  const av = avertissementsExport(etat);
  const ids = [...new Set(idsMagazine(etat.magazine))].filter((id) => etat.catalogue.has(id));
  const pl = pagesLibelle(etat);
  const parentOk = dossierAbsolu(parent);
  const nomOk = nomDossierValide(nom);
  const dossier = parentOk.ok && nomOk.ok ? `${parentOk.dossier}/${nomOk.nom}` : "";
  const dossierOk = dossierAbsolu(dossier);
  const peutDossier = peutEcrireDansUnDossier();
  const nbAvert = av.indisponibles.length + av.signaleesPosees.length + av.bassesDef.length + (av.pagesAuDessus ? 1 : 0)
    + av.flouesPosees.length + av.visagesAuPli.length + (av.hesitationsOuvertes ? 1 : 0) + av.pagesVides.length;
  const bloque = !ids.length || (av.indisponibles.length > 0 && !sans);

  const lancerPdf = () => {
    const c = new AbortController();
    ctrl.current = c;
    setEtape({ nom: "cours", prog: { fait: 0, total: ids.length, photo: null } });
    void (async () => {
      const r = await exporterPdf({
        magazine: etat.magazine, catalogue, source, titre: projet.nom,
        onProgression: (prog) => setEtape((e) => (e.nom === "cours" ? { nom: "cours", prog } : e)), signal: c.signal,
      });
      ctrl.current = null;
      if (r.ok) { setEtape({ nom: "finPdf", r }); onExporte?.(r.nomFichier, "PDF"); }
      else if (r.raison === "annule") setEtape({ nom: "choix" });
      else setEtape({ nom: "erreur", message: r.message });
    })();
  };

  const lancer = () => {
    if (sortie === "canva") { lancerPdf(); return; }
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
      if (r.ok) { setEtape({ nom: "fin", r }); onExporte?.(dossier); }
      else if (r.raison === "annule") setEtape({ nom: "choix" });
      else setEtape({ nom: "erreur", message: r.message });
    })();
  };

  return (
    <div className="ed-voile" onClick={(e) => { if (e.target === e.currentTarget && etape.nom !== "cours") onFermer(); }}>
      <div className="ed-feuille-ex" role="dialog" aria-modal="true" aria-label="Exporter">
        <div className="ed-ex-tete">
          <h2>Exporter</h2>
          <button type="button" className="ed-ico" aria-label="Fermer" onClick={onFermer} disabled={etape.nom === "cours"}>{Ico.fermer}</button>
        </div>
        {etape.nom === "choix" ? (
          <>
            <span className="ed-seg ed-ex-sortie" role="group" aria-label="Pour">
              {(["canva", "affinity"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={sortie === s} onClick={() => choisirSortie(s)}>
                  {s === "canva" ? "Canva" : "Affinity"}
                </button>
              ))}
            </span>
            {sortie === "canva" ? (
              <ul className="ed-ex-arbre" aria-label="Contenu de l'export">
                <li><span>magazine.pdf</span><span>{pluriel(av.planches, "planche")} · {pluriel(ids.length, "photo")}</span></li>
              </ul>
            ) : (
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
            </>
            )}
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
                {av.flouesPosees.length ? <span>{pluriel(av.flouesPosees.length, "photo floue posée", "photos floues posées")} · p. {av.flouesPosees.slice(0, 4).map((z) => z.numero).join(", ")}</span> : null}
                {av.visagesAuPli.length ? <span className="ed-ex-rouge">{pluriel(av.visagesAuPli.length, "visage dans le pli", "visages dans le pli")} · p. {av.visagesAuPli.slice(0, 4).map((z) => z.numero).join(", ")}</span> : null}
                {av.hesitationsOuvertes ? <span>{pluriel(av.hesitationsOuvertes, "hésitation ouverte", "hésitations ouvertes")} · seule la photo de devant part</span> : null}
                {av.pagesVides.length ? <span>{pluriel(av.pagesVides.length, "planche vide", "planches vides")} · p. {av.pagesVides.slice(0, 4).join(", ")}</span> : null}
                {av.pagesAuDessus ? <span>{pl.pages} pages pour {pl.cible} payées</span> : null}
              </div>
            ) : null}
            {av.indisponibles.length ? (
              <label className="ed-ex-sans"><input type="checkbox" checked={sans} onChange={(e) => setSans(e.currentTarget.checked)} /> Exporter sans elles</label>
            ) : null}
            <div className="ed-ex-actions">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onFermer}>Annuler</button>
              <button type="button" className="adm-btn" disabled={bloque || (sortie === "affinity" && !dossierOk.ok)} onClick={lancer}>Exporter</button>
            </div>
          </>
        ) : null}
        {etape.nom === "cours" ? (
          <>
            <p className="ed-ex-ligne">{etape.prog.photo ? `${sortie === "canva" ? "Photos" : "Links/"} · ${etape.prog.fait} / ${etape.prog.total}` : etape.prog.fait >= etape.prog.total && etape.prog.total > 0 ? (sortie === "canva" ? "magazine.pdf" : "magazine.idml") : "Préparation"}</p>
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
        {etape.nom === "finPdf" ? (
          <div className="ed-ex-ok">
            <span className="ate-tag ate-tag--choix">PDF téléchargé</span>
            <p className="ed-ex-ligne">{etape.r.nomFichier} · {pluriel(etape.r.pages, "page")} · {mo(etape.r.octets)}</p>
            {etape.r.indisponibles.length ? <p className="ed-ex-ligne ed-ex-rouge">{pluriel(etape.r.indisponibles.length, "photo illisible", "photos illisibles")} · cadre gris</p> : null}
            {etape.r.secours.length ? <p className="ed-ex-ligne">{pluriel(etape.r.secours.length, "photo en définition réduite", "photos en définition réduite")}</p> : null}
            <ol className="ed-ex-etapes">
              <li>Ouvrir Canva</li>
              <li>Importer le PDF</li>
            </ol>
            {memoire ? <Questions memoire={memoire} /> : null}
            <div className="ed-ex-actions ed-ex-actions--debut">
              <a className="adm-btn" href="https://www.canva.com/" target="_blank" rel="noopener noreferrer">Canva ↗</a>
              <button type="button" className={cls("adm-btn", "adm-btn--ghost")} onClick={onFermer}>Rester ici</button>
            </div>
          </div>
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
            {memoire ? <Questions memoire={memoire} /> : null}
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

/** G3 (lot 3, 09/11) : au plus trois questions sur ce que la machine a proposé et que l'atelier a renversé. Une réponse, un clic. */
function Questions({ memoire }: { memoire: Memoire }) {
  const [qs] = useState(() => memoire.questions());
  const [faites, setFaites] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  if (!qs.length) return null;
  const MOTS: Record<string, string> = {
    floue_gardee: "La machine la disait floue, tu l'as gardée.",
    pile_autre_gardee: "La machine avait mis une autre photo de la pile dessus, tu as pris celle-ci.",
    pile_pas_un_doublon: "La machine la rangeait sous une autre, tu as gardé les deux.",
    tete_ecartee: "La machine l'avait mise dessus (la plus nette), tu l'as écartée.",
    pretri_renverse: "Tu as changé la marque proposée par le pré-tri.",
  };
  const choix = (i: number, q: Lecon, c: "machine" | "atelier" | "depend") => { memoire.repondre(q, c, notes[i] ?? ""); setFaites((f) => ({ ...f, [i]: c })); };
  return (
    <div className="ed-ex-questions">
      <p className="ed-ex-ligne"><b>Trois questions pour la machine</b> · facultatif</p>
      {qs.map((q, i) => (
        <div key={`${q.type}-${i}`} className="ed-ex-q">
          <p>{MOTS[q.type] ?? q.proposition}<span className="ed-sous"> {q.proposition} · {q.photos[0]}</span></p>
          {faites[i] ? <span className="ate-tag ate-tag--choix">Noté</span> : (
            <>
              <input type="text" placeholder="Un mot si tu veux" aria-label="Ta note" value={notes[i] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [i]: e.currentTarget.value }))} />
              <span className="ed-ex-q-bt">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => choix(i, q, "machine")}>Elle avait raison</button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => choix(i, q, "atelier")}>J&apos;avais raison</button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => choix(i, q, "depend")}>Ça dépend</button>
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
