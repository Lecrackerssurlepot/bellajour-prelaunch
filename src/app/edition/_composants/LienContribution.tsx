"use client";

/* Le lien de contribution (PRD §14.2) : une personne ou un groupe, et SON
   nombre de photos au curseur. Deux temps dans une même fenêtre :
   1. le nom et le plafond (raccourcis 10 / 30 / 50 / Sans limite, la valeur
      en grand) → « Créer le lien » ;
   2. le lien prêt : QR code, Copier, WhatsApp, Mail, télécharger le QR.
   Le lien est `/depot/<token_depot>?p=<clé aléatoire>` : jamais un mot
   lisible (droits.ts), même si la maquette en montrait un. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CURSEUR_LIEN, RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import { svgQr } from "@/lib/collectif/qr";
import Fenetre from "./Fenetre";
import QrCode from "./QrCode";

export type LienPartage = { libelle: string; url: string; plafond: string; recues?: number };

function messagePartage(evenement: string, url: string, tu: boolean): string {
  return tu ? `${evenement} : dépose ici tes photos. ${url}` : `${evenement} : déposez ici vos photos. ${url}`;
}

/** Copier, WhatsApp, Mail (et le QR code en fichier) : les gestes de partage d'un lien. */
export function BoutonsPartage({ lien, evenement, tu, avecQr }: { lien: LienPartage; evenement: string; tu: boolean; avecQr?: boolean }) {
  const [copie, setCopie] = useState<"" | "ok" | "non">("");
  const texte = messagePartage(evenement, lien.url, tu);
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien.url);
      setCopie("ok");
      setTimeout(() => setCopie(""), 2000);
    } catch {
      setCopie("non");
    }
  }
  function telechargerQr() {
    const blob = new Blob([svgQr(lien.url)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${lien.libelle.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase() || "lien"}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <div className={avecQr ? "ec-partage ec-partage--quatre" : "ec-partage"}>
      <button type="button" className="ec-bouton ec-bouton--petit" onClick={copier}>
        {copie === "ok" ? "Copié" : copie === "non" ? "Copie impossible" : "Copier le lien"}
      </button>
      <a className="ec-bouton ec-bouton--clair ec-bouton--petit" href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a
        className="ec-bouton ec-bouton--clair ec-bouton--petit"
        href={`mailto:?subject=${encodeURIComponent(evenement)}&body=${encodeURIComponent(texte)}`}
      >
        Mail
      </a>
      {avecQr ? (
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={telechargerQr}>
          QR code
        </button>
      ) : null}
    </div>
  );
}

/** La carte d'un lien déjà créé : son QR, son nom, son plafond, ce qu'il a reçu. */
export function CarteLien({ lien, evenement, tu, cloture }: { lien: LienPartage; evenement: string; tu: boolean; cloture: string }) {
  return (
    <div className="ec-carte-lien">
      <QrCode texte={lien.url} taille={120} etiquette={`QR code du lien « ${lien.libelle} »`} />
      <div className="ec-carte-lien-texte">
        <strong>{lien.libelle}</strong>
        <span className="ec-note">
          {lien.plafond.charAt(0).toLowerCase() + lien.plafond.slice(1)} · {lien.recues ?? 0} photo{(lien.recues ?? 0) > 1 ? "s" : ""} reçue{(lien.recues ?? 0) > 1 ? "s" : ""}
          {cloture ? ` · ouvert jusqu'au ${cloture}` : ""}
        </span>
        <BoutonsPartage lien={lien} evenement={evenement} tu={tu} />
      </div>
    </div>
  );
}

/** La fenêtre en deux temps : créer le lien, puis le partager. */
export default function FenetreLien({
  token,
  max,
  evenement,
  cloture,
  tu,
  onFermer,
}: {
  token: string;
  /** Le plafond le plus haut pour un lien (`plafondLienMax`). */
  max: number;
  evenement: string;
  cloture: string;
  tu: boolean;
  onFermer: () => void;
}) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const min = Math.min(CURSEUR_LIEN.min, max);
  const [nom, setNom] = useState("");
  const [valeur, setValeur] = useState(Math.min(30, max));
  const [sansLimite, setSansLimite] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cree, setCree] = useState<LienPartage | null>(null);

  function fermer() {
    if (cree) router.refresh();
    onFermer();
  }

  async function creer() {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/provenances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sansLimite ? { token, libelle: nom, sansPlafond: true } : { token, libelle: nom, plafond: valeur }),
      });
      const json = (await rep.json().catch(() => ({}))) as { chemin?: string; libelle?: string; plafond?: string; message?: string };
      if (!rep.ok || !json.chemin) {
        setErreur(json.message ?? `Lien non créé (erreur ${rep.status}).`);
        return;
      }
      setCree({ libelle: json.libelle ?? nom, url: `${window.location.origin}${json.chemin}`, plafond: json.plafond ?? "" });
    } catch {
      setErreur("Le réseau n'a pas répondu. Aucun lien créé.");
    } finally {
      setOccupe(false);
    }
  }

  if (cree) {
    return (
      <Fenetre titre="Votre lien est prêt" onFermer={fermer} large>
        <div className="ec-lien-pret">
          <QrCode texte={cree.url} taille={136} etiquette={`QR code du lien « ${cree.libelle} »`} />
          <div className="ec-lien-pret-texte">
            <strong>{cree.libelle}</strong>
            <span className="ec-note">{cree.plafond}</span>
            <input className="ec-champ ec-lien-url" readOnly value={cree.url} onFocus={(e) => e.currentTarget.select()} aria-label="Le lien" />
            {cloture ? <span className="ec-note">Ouvert jusqu&apos;au {cloture}.</span> : null}
          </div>
        </div>
        <BoutonsPartage lien={cree} evenement={evenement} tu={tu} avecQr />
        <button type="button" className="ec-bouton ec-bouton--plein" onClick={fermer}>
          Terminé
        </button>
      </Fenetre>
    );
  }

  return (
    <Fenetre
      titre="Créer un lien de contribution"
      sous={v(
        "La personne dépose depuis son téléphone, sans compte. Ses photos arrivent dans un dossier à son nom.",
        "La personne dépose depuis son téléphone, sans compte. Ses photos arrivent dans un dossier à son nom."
      )}
      onFermer={fermer}
    >
      <label className="ec-curseur">
        Le nom de la personne ou du groupe
        <input
          className="ec-champ"
          value={nom}
          maxLength={80}
          placeholder="Tous les participants, Le photographe, Équipe Lyon…"
          onChange={(e) => setNom(e.target.value)}
        />
      </label>
      <div className="ec-lien-plafond">
        <div className="ec-lien-plafond-tete">
          <span className="ec-texte">Combien de photos pour cette personne ?</span>
          <strong className="ec-lien-valeur">{sansLimite ? "Sans limite" : `${valeur} photo${valeur > 1 ? "s" : ""}`}</strong>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={valeur}
          disabled={sansLimite}
          aria-label="Nombre de photos par personne"
          onChange={(e) => {
            setValeur(Number(e.target.value));
            setSansLimite(false);
          }}
        />
        <div className="ec-puces">
          {RACCOURCIS_LIEN.filter((n) => n <= max).map((n) => (
            <button
              key={n}
              type="button"
              className="ec-onglet"
              aria-pressed={!sansLimite && valeur === n}
              onClick={() => {
                setValeur(n);
                setSansLimite(false);
              }}
            >
              {n}
            </button>
          ))}
          <button type="button" className="ec-onglet" aria-pressed={sansLimite} onClick={() => setSansLimite(true)}>
            Sans limite
          </button>
        </div>
      </div>
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe || !nom.trim()} onClick={creer}>
        Créer le lien
      </button>
    </Fenetre>
  );
}
