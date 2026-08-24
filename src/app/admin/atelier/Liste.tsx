"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LigneDossier, VueListe } from "./types";
import type { Pile } from "@/lib/atelier/urgence";

/**
 * La table de travail (PRD §12).
 *
 * Trois idées, et rien d'autre :
 *   1. les dossiers sont groupés par QUI ATTEND QUOI, pas par date ;
 *   2. le bandeau du matin dit en une phrase s'il y a du travail ;
 *   3. tout ce qui tourne sans nous est replié par défaut.
 *
 * Aucun appel réseau ici : la page serveur a déjà tout calculé. Ce composant
 * filtre, cherche et affiche.
 */

const ORDRE: Pile[] = ["retard", "a_faire", "attente_cliente", "dehors", "termine"];

const TITRE_PILE: Record<Pile, string> = {
  retard: "En retard",
  a_faire: "À faire",
  attente_cliente: "Chez la cliente",
  dehors: "En route",
  termine: "Terminés",
};

const SOUS_TITRE_PILE: Record<Pile, string> = {
  retard: "La promesse faite à la cliente est dépassée.",
  a_faire: "La balle est dans notre camp.",
  attente_cliente: "Elle doit payer, valider, ou compléter ses photos.",
  dehors: "Chez l'imprimeur ou chez le transporteur.",
  termine: "Livrés.",
};

function initiales(l: LigneDossier): string {
  const p = (l.prenom || "").trim();
  return p ? p[0].toUpperCase() : "·";
}

function fmtJour(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function Ligne({ l, base }: { l: LigneDossier; base: string }) {
  return (
    <Link
      href={`${base}/${l.token}`}
      className={l.urgence.enRetard ? "ate-ligne ate-ligne--retard" : "ate-ligne"}
    >
      <span className="ate-avatar" aria-hidden>
        {initiales(l)}
      </span>

      <span className="ate-ligne-corps">
        <span className="ate-ligne-titre">
          {l.titre?.trim() || <em className="ate-faint">Sans titre</em>}
          {l.rembourse ? <span className="ate-tag ate-tag--alerte">remboursé</span> : null}
        </span>
        <span className="ate-ligne-sous">
          {l.prenom || "—"}
          <span className="ate-sep">·</span>
          {l.nbPhotos} photo{l.nbPhotos > 1 ? "s" : ""}
          {l.nbPages ? (
            <>
              <span className="ate-sep">·</span>
              {l.nbPages} pages
            </>
          ) : null}
          {l.euros ? (
            <>
              <span className="ate-sep">·</span>
              <strong>{l.euros}&nbsp;€</strong>
            </>
          ) : null}
        </span>
      </span>

      <span className={`ate-etat ate-etat--${l.etat}`}>
        <span className="ate-etape">{l.etape}</span>
        {l.libelleEtat}
      </span>

      <span className="ate-delai">
        <span className={l.urgence.enRetard ? "ate-delai-val ate-delai-val--retard" : "ate-delai-val"}>
          {l.urgence.libelle}
        </span>
        {l.urgence.promesse ? <span className="ate-delai-sub">{l.urgence.promesse}</span> : null}
      </span>

      <span className="ate-date">{fmtJour(l.createdAt)}</span>
    </Link>
  );
}

export default function Liste({ vue }: { vue: VueListe }) {
  const [recherche, setRecherche] = useState("");
  const [replies, setReplies] = useState<Set<Pile>>(new Set<Pile>(["dehors", "termine"]));

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return vue.lignes;
    /* La recherche sert à UNE chose : retrouver en trois secondes la cliente
       qui vient d'écrire « bonjour, où en est mon album ? » sans rien
       préciser. Elle porte donc sur tout ce qu'elle peut avoir mentionné,
       token compris (elle colle parfois son lien). */
    return vue.lignes.filter((l) =>
      [l.titre, l.prenom, l.email, l.token].some((v) => (v || "").toLowerCase().includes(q)),
    );
  }, [vue.lignes, recherche]);

  const groupes = useMemo(() => {
    const g = new Map<Pile, LigneDossier[]>();
    for (const l of filtrees) {
      const arr = g.get(l.urgence.pile) ?? [];
      arr.push(l);
      g.set(l.urgence.pile, arr);
    }
    return g;
  }, [filtrees]);

  const base = vue.demo ? "/admin/atelier/demo" : "/admin/atelier";
  const aFaire = vue.compteurs.a_faire;
  const enRetard = vue.compteurs.retard;

  return (
    <div className="adm-root ate-root">
      {vue.demo ? (
        <div className="ate-demo-bar">
          Mode démonstration — dossiers fictifs, aucune action ne part en base.{" "}
          <Link href="/admin/atelier">Revenir aux vrais dossiers</Link>
        </div>
      ) : null}

      <header className="ate-header">
        <div>
          <h1 className="ate-h1">L&apos;Atelier</h1>
          <p className="ate-bonjour">
            Bonjour {vue.qui}.{" "}
            {enRetard > 0 ? (
              <>
                <strong className="ate-alerte">
                  {enRetard} dossier{enRetard > 1 ? "s" : ""} en retard
                </strong>
                {aFaire > 0 ? `, ${aFaire} à traiter.` : "."}
              </>
            ) : aFaire > 0 ? (
              <>
                <strong>
                  {aFaire} dossier{aFaire > 1 ? "s" : ""} à traiter
                </strong>
                .
              </>
            ) : (
              <strong>rien ne vous attend.</strong>
            )}
          </p>
        </div>

        <div className="ate-header-outils">
          <input
            className="adm-input ate-recherche"
            type="search"
            placeholder="Prénom, titre, email, lien…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <nav className="ate-liens">
            <Link href="/admin">Prévente</Link>
            {vue.demo ? null : <Link href="/admin/atelier/demo">Démo</Link>}
            <form action="/api/admin/logout" method="post" className="adm-logout-form">
              <button className="adm-btn adm-btn--ghost" type="submit">
                Quitter
              </button>
            </form>
          </nav>
        </div>
      </header>

      {vue.lignes.length === 0 ? (
        <p className="ate-vide">Aucun numéro pour l&apos;instant.</p>
      ) : null}

      {ORDRE.map((pile) => {
        const lignes = groupes.get(pile);
        if (!lignes?.length) return null;
        const replie = replies.has(pile);
        return (
          <section key={pile} className={`ate-pile ate-pile--${pile}`}>
            <button
              type="button"
              className="ate-pile-tete"
              onClick={() =>
                setReplies((s) => {
                  const n = new Set(s);
                  if (n.has(pile)) n.delete(pile);
                  else n.add(pile);
                  return n;
                })
              }
              aria-expanded={!replie}
            >
              <span className="ate-pile-titre">{TITRE_PILE[pile]}</span>
              <span className="ate-pile-compte">{lignes.length}</span>
              <span className="ate-pile-sous">{SOUS_TITRE_PILE[pile]}</span>
              <span className="ate-chevron" aria-hidden>
                {replie ? "▸" : "▾"}
              </span>
            </button>
            {replie ? null : (
              <div className="ate-lignes">
                {lignes.map((l) => (
                  <Ligne key={l.token} l={l} base={base} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      <p className="adm-fetched ate-pied">
        Lu le{" "}
        {new Date(vue.fetchedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
