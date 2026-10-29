"use client";

import Link from "next/link";
import { libelleAnnuler, libelleRetablir, pagesLibelle, photosIndisponibles, idsPlanche } from "@/lib/mise-en-page/editeur";
import { cls, pluriel, useEd, type Projet } from "./contexte";
import { Ico } from "./icones";
import type { EtatSauvegarde } from "./sauvegardeClient";

/* La barre fine du haut et les bandeaux. Les mots de la sauvegarde sont courts : « Sauvé sur ce Mac » est l'état
   ATTENDU tant que la table n'existe pas, jamais une erreur. */

const MOT_SAUVEGARDE: Record<EtatSauvegarde["etat"], string> = {
  enregistre: "Enregistré",
  en_attente: "Enregistrement",
  envoi: "Enregistrement",
  hors_ligne: "Hors ligne",
  erreur: "Pas enregistré",
  migration_absente: "Sauvé sur ce Mac",
  conflit: "Conflit",
  lecture_seule: "Lecture seule",
};

const MOT_SOURCE = { particulier: "Particulier", edition: "Édition", libre: "Libre" } as const;

export function Barre({ projet, sv, reessayer, lien, selecteur, onExporter }: {
  projet: Projet; sv: EtatSauvegarde; reessayer: () => void; lien: { href: string; libelle: string }; selecteur: React.ReactNode; onExporter: () => void;
}) {
  const { etat, envoyer, lectureSeule: ro } = useEd();
  const pl = pagesLibelle(etat);
  const la = libelleAnnuler(etat);
  const lr = libelleRetablir(etat);
  return (
    <div className="ed-haut">
      <Link href={lien.href} className="ed-retour" aria-label={lien.libelle}>{Ico.retour}<span>{lien.libelle}</span></Link>
      <span className="ed-sep" aria-hidden="true" />
      <span className="ed-nom" title={projet.nom}>{projet.nom}</span>
      <span className="ate-tag">{MOT_SOURCE[projet.source]}</span>
      {selecteur}
      <span className={cls("ed-pages", pl.depasse && "ed-pages--trop")} title={pl.cible ? "Pages payées" : undefined}>
        {pl.cible ? <><b>{pl.pages}</b> / {pl.cible} pages</> : <><b>{pl.pages}</b> pages</>}
      </span>
      <span className="ed-esp" />
      <span className={cls("ed-sauve", `ed-sauve--${sv.etat}`)} role="status"><i aria-hidden="true" />{MOT_SAUVEGARDE[sv.etat]}</span>
      {sv.etat === "erreur" || sv.etat === "hors_ligne" ? <button type="button" className="ed-lien" onClick={reessayer}>Réessayer</button> : null}
      <span className="ed-sep" aria-hidden="true" />
      <button type="button" className="ed-ico" disabled={!la || ro} title={la ?? "Rien à annuler"} aria-label={la ?? "Annuler"} onClick={() => envoyer({ type: "annuler" })}>{Ico.annuler}</button>
      <button type="button" className="ed-ico" disabled={!lr || ro} title={lr ?? "Rien à rétablir"} aria-label={lr ?? "Rétablir"} onClick={() => envoyer({ type: "retablir" })}>{Ico.retablir}</button>
      <button type="button" className="adm-btn ed-exporter" onClick={onExporter}>Exporter</button>
    </div>
  );
}

export function Bandeaux({ projet, sv, collecteOuverte, prendreSaVersion, garderLaMienne }: {
  projet: Projet; sv: EtatSauvegarde; collecteOuverte: boolean; prendreSaVersion: () => void; garderLaMienne: () => void;
}) {
  const { etat, envoyer } = useEd();
  const out: React.ReactNode[] = [];
  const lectureSeuleRaison = etat.sauvegarde.etat === "lecture_seule" ? etat.sauvegarde.raison : null;
  if (collecteOuverte) out.push(<div key="c" className="ed-bandeau">Collecte ouverte : des photos peuvent encore arriver</div>);
  if (sv.etat === "conflit") {
    const le = sv.enBase.modifie_le ? new Date(sv.enBase.modifie_le) : null;
    const heure = le && !Number.isNaN(le.getTime()) ? ` à ${le.getHours()} h ${String(le.getMinutes()).padStart(2, "0")}` : "";
    out.push(
      <div key="x" className="ed-bandeau ed-bandeau--rouge">
        <strong>{sv.enBase.modifie_par ?? "Quelqu'un"} a modifié ce magazine{heure}</strong>
        <span>Lecture seule</span>
        <button type="button" className="ed-bt" onClick={prendreSaVersion}>Prendre sa version</button>
        <button type="button" className="ed-bt" onClick={garderLaMienne}>Garder la mienne</button>
      </div>
    );
  }
  if (etat.copieLocale && sv.etat !== "conflit") {
    out.push(
      <div key="l" className="ed-bandeau ed-bandeau--bleu">Votre version reste en copie locale
        <button type="button" className="ed-bt" onClick={() => envoyer({ type: "recupererCopieLocale" })}>Récupérer ma version</button>
      </div>
    );
  }
  if (lectureSeuleRaison) out.push(<div key="r" className="ed-bandeau ed-bandeau--rouge">{lectureSeuleRaison === "archive" ? "Projet archivé · lecture seule" : "Lecture seule"}</div>);
  const indispo = photosIndisponibles(etat.magazine, etat.catalogue);
  if (indispo.length) {
    out.push(
      <div key="i" className="ed-bandeau">{pluriel(indispo.length, "photo indisponible", "photos indisponibles")}
        <button type="button" className="ed-bt" onClick={() => {
          const pl = etat.magazine.planches.find((x) => idsPlanche(x).some((id) => indispo.includes(id)));
          if (pl) envoyer({ type: "naviguer", plancheId: pl.id });
        }}>Voir</button>
      </div>
    );
  }
  void projet;
  return out.length ? <div className="ed-bandeaux">{out}</div> : null;
}

