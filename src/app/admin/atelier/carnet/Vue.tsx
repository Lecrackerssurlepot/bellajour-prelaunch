"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  GENRES_NOTE,
  PERIODES_CARNET,
  PLAFOND_CARNET,
  dateCarnet,
  filtrerNotes,
  joursDePeriode,
  libelleDossier,
  libelleGenre,
  referenceDossier,
  type GenreNote,
  type NoteCarnet,
  type PeriodeCarnet,
} from "@/lib/atelier/carnet";
import type { VueCarnet } from "../carnet";
import "../../admin.css";
import "../atelier.css";

/**
 * Le carnet complet — l'écran qui transforme cent notes éparses en matière.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS PARTIS PRIS
 *
 *   1. LECTURE SEULE. Pas un bouton n'écrit. Pour supprimer une note, on
 *      ouvre la fiche du dossier : on ne rature pas la mémoire de l'atelier
 *      depuis l'écran qui sert à la relire.
 *   2. LE FILTRE EST DANS LE NAVIGATEUR. La page serveur a déjà tout chargé
 *      (le volume est de quelques centaines de notes) : chercher devient
 *      instantané, et une frappe ne coûte pas un aller-retour. La RÈGLE de
 *      filtrage, elle, vit dans `@/lib/atelier/carnet`, partagée avec la
 *      route d'export — sans quoi le fichier téléchargé finirait par ne plus
 *      contenir ce que l'écran montre.
 *   3. LE TEXTE D'ABORD. Une note se lit en entier, retours à la ligne
 *      compris. La date, l'auteur et le dossier passent en dessous, en petit :
 *      ce sont des repères, pas le propos.
 * ══════════════════════════════════════════════════════════════════════════
 */

function Note({ n }: { n: NoteCarnet }) {
  const genre = libelleGenre(n.genre);
  return (
    <li className="ate-cn-note">
      <p className="ate-note-texte">{n.texte}</p>
      <p className="ate-note-pied">
        {/* Discrète, et RIEN quand la note n'a pas de genre : une étiquette
            « sans genre » sur les centaines de notes déjà écrites ferait du
            bruit sur toute la colonne. */}
        {genre ? <span className="ate-tag ate-faint">{genre}</span> : null}
        {n.dossier ? (
          <Link className="ate-cn-dossier" href={`/admin/atelier/${n.dossier.token}`}>
            {libelleDossier(n.dossier)}
          </Link>
        ) : (
          /* Le dossier a disparu, la note reste. La faire disparaître avec
             lui serait une perte silencieuse de matière. */
          <span className="ate-faint">Dossier introuvable</span>
        )}
        <span className="ate-note-qui">{n.auteur}</span>
        <span className="ate-faint">{dateCarnet(n.createdAt)}</span>
        {n.dossier ? <span className="ate-faint">{referenceDossier(n.dossier)}</span> : null}
      </p>
    </li>
  );
}

export default function VueCarnetEcran({ vue }: { vue: VueCarnet }) {
  const [q, setQ] = useState("");
  const [dossier, setDossier] = useState("");
  const [auteur, setAuteur] = useState("");
  /* `""` = tous, `"sans"` = les notes sans genre, sinon l'un des cinq mots.
     La chaîne vide plutôt que `null` parce que c'est ce qu'un <select> rend. */
  const [genre, setGenre] = useState<GenreNote | "sans" | "">("");
  const [periode, setPeriode] = useState<PeriodeCarnet>("tout");

  const filtre = useMemo(
    () => ({
      q,
      dossier,
      qui: auteur,
      genre: genre === "" ? null : genre,
      jours: joursDePeriode(periode),
    }),
    [q, dossier, auteur, genre, periode],
  );

  /* Les comptes se calculent sur TOUTES les notes chargées, pas sur celles que
     les autres filtres laissent passer : un menu dont les chiffres bougent à
     chaque frappe ne sert plus à décider où regarder. */
  const comptes = useMemo(() => {
    const par = new Map<string, number>();
    let sans = 0;
    for (const n of vue.notes) {
      if (n.genre) par.set(n.genre, (par.get(n.genre) ?? 0) + 1);
      else sans++;
    }
    return { par, sans };
  }, [vue.notes]);

  const notes = useMemo(() => filtrerNotes(vue.notes, filtre), [vue.notes, filtre]);

  /* Les liens d'export portent EXACTEMENT le filtre affiché : ce qu'on
     télécharge est ce qu'on a sous les yeux, refiltré côté serveur par le
     même module pur. */
  const parametres = new URLSearchParams();
  if (q.trim()) parametres.set("q", q.trim());
  if (dossier) parametres.set("dossier", dossier);
  if (auteur) parametres.set("qui", auteur);
  if (genre) parametres.set("genre", genre);
  if (periode !== "tout") parametres.set("p", periode);
  const queue = parametres.toString();
  const lienExport = (format: "txt" | "csv") =>
    `/api/admin/atelier/carnet/export?format=${format}${queue ? `&${queue}` : ""}`;

  const filtreActif = Boolean(q.trim() || dossier || auteur || genre || periode !== "tout");

  return (
    <div className="adm-root ate-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">Le carnet</h1>
        <p className="ate-bonjour">
          Toutes les notes de tous les dossiers, la plus récente en tête. Rien de ce qui est écrit
          ici n&apos;est jamais parti chez un client. C&apos;est la matière du futur livre de
          règles de composition : on la lit à la suite, et les règles se voient.
        </p>
      </header>

      {vue.indisponible ? (
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Carnet non installé</h2>
          <p>
            La table <code>notes</code> n&apos;est pas lisible : la migration{" "}
            <code>20260825_atelier_notes_et_canva.sql</code> n&apos;a probablement pas été
            appliquée. Aucune note n&apos;est perdue, cet écran ne peut simplement pas les lire.
          </p>
        </section>
      ) : (
        <>
          <div className="ate-cn-barre">
            <div className="ate-recherche-boite">
              <input
                className="adm-input ate-recherche"
                type="search"
                value={q}
                placeholder="Chercher dans les notes…"
                aria-label="Chercher dans les notes"
                onChange={(e) => setQ(e.target.value)}
              />
              <span className="ate-recherche-compte">{notes.length}</span>
            </div>

            <div className="adm-select-wrap">
              <select
                className="adm-select"
                value={dossier}
                aria-label="Filtrer par dossier"
                onChange={(e) => setDossier(e.target.value)}
              >
                <option value="">Tous les dossiers</option>
                {vue.dossiers.map((d) => (
                  <option key={d.valeur} value={d.valeur}>
                    {d.libelle} ({d.nb})
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-select-wrap">
              <select
                className="adm-select"
                value={auteur}
                aria-label="Filtrer par auteur"
                onChange={(e) => setAuteur(e.target.value)}
              >
                <option value="">Tous les auteurs</option>
                {vue.auteurs.map((a) => (
                  <option key={a.valeur} value={a.valeur}>
                    {a.libelle} ({a.nb})
                  </option>
                ))}
              </select>
            </div>

            {/* Le genre en menu et pas en pastilles : sept choix de plus dans
                la barre la feraient passer sur trois lignes, et le filtre le
                plus utilisé reste la recherche. */}
            <div className="adm-select-wrap">
              <select
                className="adm-select"
                value={genre}
                aria-label="Filtrer par genre"
                onChange={(e) => setGenre(e.target.value as GenreNote | "sans" | "")}
              >
                <option value="">Tous les genres</option>
                {GENRES_NOTE.map((g) => (
                  <option key={g.cle} value={g.cle}>
                    {g.label} ({comptes.par.get(g.cle) ?? 0})
                  </option>
                ))}
                {/* Le filtre qui sert à RANGER l'existant : toutes les notes
                    écrites avant que le genre existe sont ici. */}
                <option value="sans">Sans genre ({comptes.sans})</option>
              </select>
            </div>

            <div className="ate-seg">
              {PERIODES_CARNET.map((p) => (
                <button
                  key={p.cle}
                  type="button"
                  className={
                    periode === p.cle ? "ate-seg-btn ate-seg-btn--actif" : "ate-seg-btn"
                  }
                  onClick={() => setPeriode(p.cle)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filtreActif ? (
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                onClick={() => {
                  setQ("");
                  setDossier("");
                  setAuteur("");
                  setGenre("");
                  setPeriode("tout");
                }}
              >
                Tout afficher
              </button>
            ) : null}
          </div>

          <p className="ate-cn-compte">
            <strong>{notes.length}</strong> note{notes.length > 1 ? "s" : ""}
            {notes.length !== vue.notes.length ? ` sur ${vue.notes.length}` : ""}
            {" · "}
            {/* Un téléchargement, jamais un envoi : le fichier ne part nulle
                part, il descend sur le poste de celui qui clique. */}
            <a className="ate-m-export" href={lienExport("txt")} download>
              Exporter en texte
            </a>
            {" · "}
            <a className="ate-m-export" href={lienExport("csv")} download>
              Exporter en CSV
            </a>
          </p>

          {vue.tronque ? (
            <p className="ate-cn-tronque">
              Seules les {PLAFOND_CARNET.toLocaleString("fr-FR")} notes les plus récentes sont
              chargées. Les plus anciennes existent toujours en base, elles ne sont simplement pas
              sur cet écran.
            </p>
          ) : null}

          {notes.length === 0 ? (
            <p className="ate-faint ate-cn-vide">
              {vue.notes.length === 0
                ? "Rien de noté pour l'instant. Les notes se prennent sur la fiche d'un dossier."
                : "Aucune note ne correspond à cette recherche."}
            </p>
          ) : (
            <ul className="ate-cn-notes">
              {notes.map((n) => (
                <Note key={n.id} n={n} />
              ))}
            </ul>
          )}
        </>
      )}

      <p className="adm-fetched ate-pied">
        Lu le{" "}
        {new Date(vue.fetchedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" · lecture seule : cet écran n'écrit rien et ne supprime rien."}
      </p>
    </div>
  );
}
