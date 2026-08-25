"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NoteVue } from "../types";

/**
 * Le carnet de l'éditeur, et le lien de travail.
 *
 * Deux choses qui n'ont qu'un point commun, mais il est décisif : elles ne
 * sortent JAMAIS de l'atelier. Aucune note, aucun lien d'édition ne part chez
 * la cliente. C'est ce qui permet d'y écrire ce qu'on pense vraiment d'un
 * dossier sans peser ses mots.
 */

function quand(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Carnet({
  token,
  notes,
  indisponibles,
  canvaTravail,
  moi,
  demo,
}: {
  token: string;
  notes: NoteVue[];
  indisponibles: boolean;
  canvaTravail: string | null;
  /** L'identifiant du compte connecté — décide qui peut supprimer quoi. */
  moi: string;
  demo?: boolean;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [lien, setLien] = useState(canvaTravail ?? "");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lienEtat, setLienEtat] = useState<"repos" | "enregistre" | "erreur">("repos");

  async function ajouter() {
    const t = texte.trim();
    if (!t || demo) {
      if (demo) setErreur("Démonstration : rien n'est enregistré.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, texte: t }),
      });
      if (r.status === 503) {
        setErreur("Le carnet n'est pas encore installé (migration « notes » à appliquer).");
        return;
      }
      if (!r.ok) {
        setErreur("La note n'a pas pu être enregistrée.");
        return;
      }
      setTexte("");
      router.refresh();
    } catch {
      setErreur("Réseau interrompu.");
    } finally {
      setOccupe(false);
    }
  }

  async function supprimer(id: string) {
    if (demo) return;
    try {
      await fetch("/api/admin/atelier/note", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } catch {
      /* Une note qui résiste à la suppression reste affichée : rien de perdu,
         et un message d'erreur pour ça serait disproportionné. */
    }
  }

  async function enregistrerLien() {
    if (demo) return;
    setLienEtat("repos");
    try {
      const r = await fetch("/api/admin/atelier/interne", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, canva_travail: lien.trim() }),
      });
      setLienEtat(r.ok ? "enregistre" : "erreur");
      if (r.ok) setTimeout(() => setLienEtat("repos"), 2500);
    } catch {
      setLienEtat("erreur");
    }
  }

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Le carnet</h2>

      {/* ── le lien de travail ──
          Étiqueté sans ambiguïté possible : c'est le champ qu'on confond avec
          celui qui part chez la cliente, et la confusion se découvre à la
          livraison (PRD §11). */}
      <label className="ate-champ">
        <span className="ate-champ-label">Canva de travail — édition, INTERNE</span>
        <div className="ate-carnet-lien">
          <input
            className="adm-input"
            type="url"
            value={lien}
            placeholder="https://www.canva.com/design/…/edit"
            onChange={(e) => {
              setLien(e.target.value);
              setLienEtat("repos");
            }}
            onBlur={enregistrerLien}
          />
          {lien ? (
            <a className="adm-btn adm-btn--ghost" href={lien} target="_blank" rel="noreferrer">
              Ouvrir
            </a>
          ) : null}
        </div>
        <span className="ate-champ-aide">
          Ne part jamais chez la cliente. Le lien partagé, en commentaire, se saisit au moment de
          publier la maquette.
        </span>
        {lienEtat === "enregistre" ? <span className="ate-fait">Enregistré.</span> : null}
        {lienEtat === "erreur" ? (
          <span className="ate-erreur">Non enregistré (colonne « canva_travail » absente ?).</span>
        ) : null}
      </label>

      {/* ── les notes ── */}
      <h3 className="ate-sous-titre">Notes</h3>

      {indisponibles ? (
        <p className="ate-erreur">
          Carnet non installé — migration <code>notes</code> à appliquer.
        </p>
      ) : null}

      <div className="ate-note-saisie">
        <textarea
          className="adm-input ate-note-champ"
          rows={2}
          placeholder="Ce qu'il faut savoir avant de composer…"
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            setErreur(null);
          }}
          onKeyDown={(e) => {
            /* ⌘+Entrée : on écrit une note en trois secondes ou on ne l'écrit
               pas. Entrée seule reste un retour à la ligne — une note fait
               souvent deux phrases. */
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ajouter();
          }}
        />
        <button
          className="adm-btn"
          type="button"
          onClick={ajouter}
          disabled={occupe || !texte.trim()}
        >
          {occupe ? "…" : "Noter"}
        </button>
      </div>
      {erreur ? <p className="ate-erreur">{erreur}</p> : null}

      {notes.length === 0 && !indisponibles ? (
        <p className="ate-faint">Rien de noté sur ce dossier.</p>
      ) : (
        <ul className="ate-notes">
          {notes.map((n) => (
            <li key={n.id} className="ate-note">
              <p className="ate-note-texte">{n.texte}</p>
              <p className="ate-note-pied">
                <span className="ate-note-qui">{n.prenom}</span>
                <span className="ate-faint">{quand(n.createdAt)}</span>
                {/* Sa note, pas celle des autres : effacer la remarque de
                    quelqu'un qui compose, c'est lui retirer sa mémoire. */}
                {n.qui === moi ? (
                  <button
                    type="button"
                    className="ate-note-suppr"
                    onClick={() => supprimer(n.id)}
                    aria-label="Supprimer ma note"
                  >
                    ×
                  </button>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
