"use client";

/* Le lien de contribution (PRD §14.2) : une personne ou un groupe, et SON
   nombre de photos au curseur. Deux temps dans une même fenêtre :
   1. le nom et le plafond (raccourcis 10 / 30 / 50 / Sans limite, la valeur
      en grand) → « Créer le lien » ;
   2. le lien prêt : QR code, Copier, WhatsApp, Mail, télécharger le QR.
   Le message qui part avec le lien est écrit pour CE groupe et CET événement
   (`partage.ts`, retours du 14/10) ; `FenetrePartage` le montre et le laisse
   retoucher avant l'envoi.
   Le lien est `/depot/<token_depot>?p=<clé aléatoire>` : jamais un mot
   lisible (droits.ts), même si la maquette en montrait un.

   Planche 5 (21/10) : l'adresse de BASE `/depot/<token_depot>` (l'ancien « lien
   général ») n'est plus jamais montrée ni envoyée. `FenetrePartage` et `FenetreQr`
   refusent un lien `general` : elles disent pourquoi au lieu de préparer le
   message ou le QR. Le formulaire de création (`FenetreCreerLien`) s'ouvre aussi
   depuis l'état vide de « Les liens », avec un nom déjà écrit (les pastilles
   « Bateau 1 », « Équipe Lyon », « Le photographe »). */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messagePartage, NOMS_POUR_COMMENCER } from "@/lib/collectif/partage";
import { CURSEUR_LIEN, RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import { imprimerPage } from "@/lib/collectif/imprimer";
import { nomFichierQr, pageQrImprimable, svgQr } from "@/lib/collectif/qr";
import Fenetre from "./Fenetre";
import QrCode from "./QrCode";

export type LienPartage = {
  libelle: string;
  url: string;
  plafond: string;
  recues?: number;
  /** L'adresse de base (l'ancien lien général) : elle ne se partage plus (planche 5, 21/10). */
  general?: boolean;
};

/** Un lien que la route vient d'écrire : de quoi l'afficher aussitôt (son id et sa clé, si la route les rend). */
export type LienCree = LienPartage & { id: string | null; cle: string | null; plafondNombre: number | null; sansPlafond: boolean };

/** L'exemple du champ « nom » : les trois noms pour commencer (« Tous les participants » n'y est plus, planche 5B). */
export const EXEMPLE_NOM_LIEN = `${NOMS_POUR_COMMENCER.join(", ")}…`;

/** Ce que le message dit de l'événement : l'organisation, l'événement, la clôture, le registre. */
export type ContexteMessage = { organisation: string; evenement: string; cloture: string; tu: boolean };

function texteDuLien(lien: LienPartage, c: ContexteMessage) {
  return messagePartage({ groupe: lien.general ? null : lien.libelle, organisation: c.organisation, evenement: c.evenement, url: lien.url, plafond: lien.plafond, cloture: c.cloture, tu: c.tu });
}

function telechargerQr(lien: LienPartage) {
  const blob = new Blob([svgQr(lien.url)], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomFichierQr(lien.libelle);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Copier, WhatsApp, Mail (et le QR code en fichier) : les gestes de partage d'un lien. */
export function BoutonsPartage({ lien, contexte, avecQr }: { lien: LienPartage; contexte: ContexteMessage; avecQr?: boolean }) {
  const [copie, setCopie] = useState<"" | "ok" | "non">("");
  const { texte, objet } = texteDuLien(lien, contexte);
  async function copier() {
    try {
      await navigator.clipboard.writeText(lien.url);
      setCopie("ok");
      setTimeout(() => setCopie(""), 2000);
    } catch {
      setCopie("non");
    }
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
        href={`mailto:?subject=${encodeURIComponent(objet)}&body=${encodeURIComponent(texte)}`}
      >
        Mail
      </a>
      {avecQr ? (
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => telechargerQr(lien)}>
          QR code
        </button>
      ) : null}
    </div>
  );
}

/** La carte d'un lien déjà créé : son QR, son nom, son plafond, ce qu'il a reçu. */
export function CarteLien({ lien, contexte }: { lien: LienPartage; contexte: ContexteMessage }) {
  const { cloture } = contexte;
  return (
    <div className="ec-carte-lien">
      <QrCode texte={lien.url} taille={120} etiquette={`QR code du lien « ${lien.libelle} »`} />
      <div className="ec-carte-lien-texte">
        <strong>{lien.libelle}</strong>
        <span className="ec-note">
          {lien.plafond.charAt(0).toLowerCase() + lien.plafond.slice(1)} · {lien.recues ?? 0} photo{(lien.recues ?? 0) > 1 ? "s" : ""} reçue{(lien.recues ?? 0) > 1 ? "s" : ""}
          {cloture ? ` · ouvert jusqu'au ${cloture}` : ""}
        </span>
        <BoutonsPartage lien={lien} contexte={contexte} />
      </div>
    </div>
  );
}

/** La fenêtre en deux temps : créer le lien, puis le partager. */
export default function FenetreLien({
  token,
  max,
  contexte,
  nomInitial,
  onFermer,
}: {
  token: string;
  /** Le plafond le plus haut pour un lien (`plafondLienMax`). */
  max: number;
  contexte: ContexteMessage;
  /** Un nom déjà écrit dans le champ (une pastille de l'état vide). */
  nomInitial?: string;
  onFermer: () => void;
}) {
  const { cloture } = contexte;
  const router = useRouter();
  const [cree, setCree] = useState<LienPartage | null>(null);

  function fermer() {
    if (cree) router.refresh();
    onFermer();
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
        <BoutonsPartage lien={cree} contexte={contexte} avecQr />
        <button type="button" className="ec-bouton ec-bouton--plein" onClick={fermer}>
          Terminé
        </button>
      </Fenetre>
    );
  }

  return <FenetreCreerLien token={token} max={max} tu={contexte.tu} nomInitial={nomInitial} onCree={setCree} onFermer={fermer} />;
}

/**
 * Le premier temps seul : le nom et le nombre de photos, puis « Créer le lien ». `onCree` reçoit
 * le lien écrit (son id et sa clé quand la route les rend), à l'appelant de le montrer : la
 * fenêtre en deux temps passe au QR, l'état vide de « Les liens » l'ajoute à la liste et ouvre
 * « Partager ». La règle est celle du serveur (`/api/collectif/provenances`), qui refuse un nom
 * réservé et dit pourquoi.
 */
export function FenetreCreerLien({
  token,
  max,
  tu,
  nomInitial,
  onCree,
  onFermer,
}: {
  token: string;
  max: number;
  tu: boolean;
  nomInitial?: string;
  onCree: (lien: LienCree) => void;
  onFermer: () => void;
}) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const min = Math.min(CURSEUR_LIEN.min, max);
  const [nom, setNom] = useState(nomInitial ?? "");
  const [valeur, setValeur] = useState(Math.min(30, max));
  const [sansLimite, setSansLimite] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/provenances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sansLimite ? { token, libelle: nom, sansPlafond: true } : { token, libelle: nom, plafond: valeur }),
      });
      const json = (await rep.json().catch(() => ({}))) as {
        chemin?: string;
        libelle?: string;
        plafond?: string;
        message?: string;
        lien?: { id?: unknown; cle?: unknown; plafondNombre?: unknown; sansPlafond?: unknown };
      };
      if (!rep.ok || !json.chemin) {
        setErreur(json.message ?? `Lien non créé (erreur ${rep.status}).`);
        return;
      }
      const ecrit = json.lien;
      onCree({
        libelle: json.libelle ?? nom,
        url: `${window.location.origin}${json.chemin}`,
        plafond: json.plafond ?? "",
        recues: 0,
        id: typeof ecrit?.id === "string" ? ecrit.id : null,
        cle: typeof ecrit?.cle === "string" ? ecrit.cle : null,
        plafondNombre: typeof ecrit?.plafondNombre === "number" ? ecrit.plafondNombre : null,
        sansPlafond: ecrit?.sansPlafond === true,
      });
    } catch {
      setErreur("Le réseau n'a pas répondu. Aucun lien créé.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Fenetre
      titre="Créer un lien de contribution"
      sous={v(
        "La personne dépose depuis son téléphone, sans compte. Ses photos arrivent dans un dossier à son nom.",
        "La personne dépose depuis son téléphone, sans compte. Ses photos arrivent dans un dossier à son nom."
      )}
      onFermer={onFermer}
    >
      <label className="ec-curseur">
        Le nom de la personne ou du groupe
        <input className="ec-champ" value={nom} maxLength={80} placeholder={EXEMPLE_NOM_LIEN} onChange={(e) => setNom(e.target.value)} />
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

/**
 * L'adresse de base ne se partage plus (planche 5, 21/10) : si un écran demande quand même
 * à la partager ou à en montrer le QR, la fenêtre dit pourquoi et ne prépare rien (ni
 * message, ni QR, ni adresse). Les photos déjà arrivées par elle restent sous « Sans groupe ».
 */
function FenetreSansPartage({ tu, onFermer }: { tu: boolean; onFermer: () => void }) {
  return (
    <Fenetre
      titre="Ces photos n'ont pas de groupe"
      sous={tu ? "Elles restent dans « Sans groupe », en lecture seule. Pour inviter, crée un lien par groupe." : "Elles restent dans « Sans groupe », en lecture seule. Pour inviter, créez un lien par groupe."}
      onFermer={onFermer}
    >
      <button type="button" className="ec-bouton ec-bouton--plein" onClick={onFermer}>
        Compris
      </button>
    </Fenetre>
  );
}

/** Partager un lien déjà créé (maquette Partage) : le QR, le message écrit pour ce groupe et cet événement, à retoucher, puis WhatsApp, Mail, Copier le message, Télécharger le QR. */
export function FenetrePartage({ lien, contexte, onFermer }: { lien: LienPartage; contexte: ContexteMessage; onFermer: () => void }) {
  return lien.general ? <FenetreSansPartage tu={contexte.tu} onFermer={onFermer} /> : <FenetrePartageDuLien lien={lien} contexte={contexte} onFermer={onFermer} />;
}

function FenetrePartageDuLien({ lien, contexte, onFermer }: { lien: LienPartage; contexte: ContexteMessage; onFermer: () => void }) {
  const v = (vous: string, toi: string) => (contexte.tu ? toi : vous);
  const propose = texteDuLien(lien, contexte);
  const [texte, setTexte] = useState(propose.texte);
  const [copie, setCopie] = useState<"" | "ok" | "non">("");
  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie("ok");
      setTimeout(() => setCopie(""), 2000);
    } catch {
      setCopie("non");
    }
  }
  return (
    <Fenetre
      titre={`Partager le lien « ${lien.libelle} »`}
      sous={v("Le message est écrit pour ce groupe et cet événement. Retouchez-le si vous voulez.", "Le message est écrit pour ce groupe et cet événement. Retouche-le si tu veux.")}
      onFermer={onFermer}
      large
    >
      <div className="ec-partage-corps">
        <QrCode texte={lien.url} taille={136} etiquette={`QR code du lien « ${lien.libelle} »`} />
        <label className="ec-partage-message">
          Le message
          {/* Assez de rangées pour lire le message entier, lien et formule de fin compris (trois paragraphes et des lignes vides, planche 4). */}
          <textarea className="ec-champ" rows={Math.min(16, Math.max(8, propose.texte.split("\n").length + 4))} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </label>
      </div>
      <div className="ec-partage ec-partage--quatre">
        <a className="ec-bouton ec-bouton--petit" href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        <a className="ec-bouton ec-bouton--clair ec-bouton--petit" href={`mailto:?subject=${encodeURIComponent(propose.objet)}&body=${encodeURIComponent(texte)}`}>
          Mail
        </a>
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={copier}>
          {copie === "ok" ? "Copié" : copie === "non" ? "Copie impossible" : "Copier le message"}
        </button>
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => telechargerQr(lien)}>
          Télécharger le QR
        </button>
      </div>
      <p className="ec-note">Le mail reprend le même texte, avec pour objet « {propose.objet} ».</p>
    </Fenetre>
  );
}

/** Ce que la page imprimée dit sous le nom du lien : le nombre de photos et la clôture. */
function detailsDuQr(lien: LienPartage, contexte: ContexteMessage): string {
  return `${lien.plafond}${contexte.cloture ? `, ouvert jusqu'au ${contexte.cloture}` : ""}`;
}

/** Le QR code en grand, à projeter ou à imprimer le jour de l'événement : on le scanne avec l'appareil photo du téléphone.
    Le NOM du lien est sous le code (T-197) : le QR scotché à bord du bateau dit lequel c'est. « Imprimer » ne sort que
    ce nom et ce code, sur une feuille A4 (`pageQrImprimable`), jamais le reste de l'écran. */
export function FenetreQr({ lien, contexte, onFermer }: { lien: LienPartage; contexte: ContexteMessage; onFermer: () => void }) {
  if (lien.general) return <FenetreSansPartage tu={contexte.tu} onFermer={onFermer} />;
  return (
    <Fenetre titre="Le QR code du lien" sous="À projeter ou à imprimer : on le scanne avec l'appareil photo du téléphone, sans application." onFermer={onFermer}>
      <div className="ec-qr-grand">
        <QrCode texte={lien.url} taille={280} etiquette={`QR code du lien « ${lien.libelle} »`} />
        <strong className="ec-qr-grand-nom">{lien.libelle}</strong>
      </div>
      <p className="ec-note ec-qr-grand-note">{detailsDuQr(lien, contexte)}</p>
      <div className="ec-partage ec-partage--deux">
        <button
          type="button"
          className="ec-bouton ec-bouton--petit"
          onClick={() =>
            imprimerPage(
              pageQrImprimable({
                nom: lien.libelle,
                url: lien.url,
                consigne: "Pour déposer ses photos : scanner ce code avec l'appareil photo du téléphone.",
                details: detailsDuQr(lien, contexte),
              })
            )
          }
        >
          Imprimer
        </button>
        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => telechargerQr(lien)}>
          Télécharger le QR
        </button>
      </div>
    </Fenetre>
  );
}
