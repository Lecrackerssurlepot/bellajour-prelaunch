"use client";

import { useEffect, useState } from "react";
import { chargerCatalogue, type CatalogueCharge, type ResultatCatalogue, type SourceCatalogue } from "./chargerCatalogue";
import { cls, type Projet } from "./contexte";
import EditeurMagazine from "./EditeurMagazine";
import { cleLocale, type RattachementMep } from "./sauvegardeClient";

/**
 * L'éditeur d'un projet : il lit les photos (dossier d'un particulier ou édition), choisit le magazine (une
 * édition peut en porter plusieurs), puis ouvre `EditeurMagazine`. Une création libre n'a pas de photos :
 * l'import de fichiers locaux viendra plus tard.
 */

export type CibleEditeur =
  | { type: "dossier"; token: string }
  | { type: "edition"; editionId: string }
  | { type: "libre"; id: string };

const LIBRE: CatalogueCharge = {
  ok: true, photos: [], magazines: [], originaux: {}, obtenuLe: 0, ttlOriginauxSecondes: 0,
  projet: { nom: "Création libre", source: "particulier", nbPagesCible: null, collecteOuverte: false, archive: false },
};

const RETOUR = { href: "/admin/atelier/mise-en-page", libelle: "Mise en page" };

export default function Editeur({ cible }: { cible: CibleEditeur }) {
  const [res, setRes] = useState<ResultatCatalogue | null>(null);
  const [essai, setEssai] = useState(0);
  const [rang, setRang] = useState(0);
  const libre = cible.type === "libre";
  const cleCible = cible.type === "dossier" ? cible.token : cible.type === "edition" ? cible.editionId : cible.id;

  useEffect(() => {
    if (cible.type === "libre") return;
    const c = new AbortController();
    const source: SourceCatalogue = cible.type === "dossier" ? { type: "dossier", token: cible.token } : { type: "edition", id: cible.editionId };
    void chargerCatalogue(source, c.signal).then((r) => { if (!c.signal.aborted) setRes(r); });
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cible.type, cleCible, essai]);

  const resultat: ResultatCatalogue | null = libre ? LIBRE : res;
  if (!resultat) {
    return (
      <div className="ed-racine ed-racine--attente" aria-busy="true" aria-live="polite">
        <span className="ed-sous">Chargement des photos</span>
      </div>
    );
  }
  if (!resultat.ok) {
    return (
      <div className="ed-racine ed-racine--attente">
        <div className="ed-erreur">
          <p>{resultat.message}</p>
          {resultat.raison === "reseau" || resultat.raison === "erreur" || resultat.raison === "lecture_incomplete" ? (
            <button type="button" className="adm-btn" onClick={() => { setRes(null); setEssai((n) => n + 1); }}>Réessayer</button>
          ) : null}
        </div>
      </div>
    );
  }

  const cat = resultat;
  const magazines = cat.magazines;
  let rattachement: RattachementMep;
  let source: SourceCatalogue;
  let projet: Projet;
  let suite: { href: string; mot: string };
  let cleId: string;
  if (cible.type === "dossier") {
    rattachement = { source: "particulier", numeroToken: cible.token };
    source = { type: "dossier", token: cible.token };
    projet = { nom: cat.projet.nom, source: "particulier", nbPagesCible: cat.projet.nbPagesCible };
    suite = { href: `/admin/atelier/${cible.token}`, mot: "Fichiers d'impression" };
    cleId = cible.token;
  } else if (cible.type === "edition") {
    const mag = magazines[Math.min(rang, magazines.length - 1)];
    if (!mag) {
      return <div className="ed-racine ed-racine--attente"><div className="ed-erreur"><p>Aucun magazine à composer.</p></div></div>;
    }
    rattachement = { source: "edition", editionId: cible.editionId, magazineId: mag.id };
    source = { type: "edition", id: cible.editionId, magazineId: mag.id };
    projet = { nom: cat.projet.nom, source: "edition", nbPagesCible: null };
    suite = { href: `/admin/collectif/${cible.editionId}`, mot: "Bon à tirer" };
    cleId = mag.id;
  } else {
    rattachement = { source: "libre" };
    source = { type: "dossier", token: "libre" };
    projet = { nom: cat.projet.nom, source: "libre", nbPagesCible: null };
    suite = { href: RETOUR.href, mot: "Mise en page" };
    cleId = cible.id;
  }
  const cle = { cle: cleLocale(rattachement, cible.type === "libre" ? cible.id : undefined), rattachement, titre: projet.nom };
  const selecteur = magazines.length > 1 ? (
    <span className="ed-seg" role="group" aria-label="Magazine">
      {magazines.map((m, i) => (
        <button key={m.id} type="button" aria-pressed={i === rang} className={cls(i === rang && "ed-seg-actif")} onClick={() => setRang(i)}>{m.nom}</button>
      ))}
    </span>
  ) : null;

  return (
    <EditeurMagazine key={`${cible.type}:${cleId}`} catalogue={cat} source={source} cle={cle} projet={projet}
      archive={cat.projet.archive} collecteOuverte={cat.projet.collecteOuverte} retour={RETOUR} suite={suite} selecteur={selecteur} />
  );
}
