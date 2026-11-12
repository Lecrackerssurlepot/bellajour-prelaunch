"use client";

import Link from "next/link";
import { libelleAnnuler, libelleRetablir, pagesLibelle, photosIndisponibles, idsPlanche, type Projet } from "@/lib/mise-en-page/editeur";
import { CLE_AIMANT, basculerGrille, cls, pluriel, useEd } from "./contexte";
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
  const { etat, envoyer, ui, majUi, lectureSeule: ro } = useEd();
  const pl = pagesLibelle(etat);
  const basculerAimant = () => {
    const aimant = !ui.aimant;
    majUi({ aimant });
    try { window.localStorage.setItem(CLE_AIMANT, aimant ? "1" : "0"); } catch { /* stockage refusé : l'état vaut pour la séance */ }
  };
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
      <button type="button" className={cls("ed-ico", "ed-aimant", ui.aimant && "ed-aimant--on")} aria-pressed={ui.aimant}
        title={ui.aimant ? "Aimant · ⌘ pendant le glisser pour le couper" : "Aimant coupé"} aria-label="Aimant" onClick={basculerAimant}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 3v7a5 5 0 0 0 10 0V3M5 6.5h3M12 6.5h3M8 3v7a2 2 0 0 0 4 0V3" />
        </svg>
      </button>
      <button type="button" className={cls("ed-ico", "ed-aimant", ui.grille && "ed-aimant--on")} aria-pressed={ui.grille}
        title={ui.grille ? "Grille d'artiste affichée : tiers, nombre d'or, diagonales · O" : "Grille d'artiste : tiers, nombre d'or, diagonales · O"} aria-label="Grille d'artiste" onClick={() => basculerGrille(ui, majUi)}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="14" height="14" rx="1.5" /><path d="M7.7 3v14M12.3 3v14M3 7.7h14M3 12.3h14" />
        </svg>
      </button>
      <button type="button" className={cls("ed-ico", "ed-aimant", ui.lecture && "ed-aimant--on")} aria-pressed={ui.lecture}
        title={ui.lecture ? "Lecture affichée : chaleur, visages, zone protégée · L" : "Voir ce que la machine a lu · L"} aria-label="Lecture" onClick={() => majUi({ lecture: !ui.lecture })}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1.5 10s3-5.5 8.5-5.5S18.5 10 18.5 10s-3 5.5-8.5 5.5S1.5 10 1.5 10z" /><circle cx="10" cy="10" r="2.6" />
        </svg>
      </button>
      <button type="button" className={cls("ed-ico", "ed-aimant", (ui.style || etat.magazine.style) && "ed-aimant--on")} aria-pressed={ui.style}
        title={etat.magazine.style ? "Style du magazine : polices et couleurs" : "Style : choisir les polices et les couleurs"} aria-label="Style" onClick={() => majUi({ style: !ui.style })}>
        <span className="ed-ico-aa" aria-hidden="true">Aa</span>
      </button>
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

