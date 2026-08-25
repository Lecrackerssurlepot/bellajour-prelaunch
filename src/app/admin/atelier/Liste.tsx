"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ActionRapide from "./ActionRapide";
import Activite from "./Activite";
import Flux from "./Flux";
import Tableau from "./Tableau";
import Vues, { useReglages } from "./Vues";
import type { LigneDossier, VueListe } from "./types";
import type { Pile } from "@/lib/atelier/urgence";

/**
 * La table de travail (PRD §12).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'ON PEUT FAIRE SANS OUVRIR UN DOSSIER
 *
 * Un back-office se juge à ce qu'il évite : ici, l'aller-retour. Chaque ligne
 * porte son action, armée en deux temps (cf. ActionRapide). Seule la
 * publication d'un aperçu ouvre la fiche, parce qu'elle demande trois images
 * et qu'elle engage un prix.
 *
 * TROIS AUTRES IDÉES, ET RIEN D'AUTRE
 *   1. les dossiers sont groupés par QUI ATTEND QUOI, pas par date ;
 *   2. le bandeau du matin dit en une phrase s'il y a du travail ;
 *   3. tout ce qui tourne sans nous est replié par défaut.
 *
 * Aucune lecture réseau ici : la page serveur a tout calculé, y compris les
 * actions possibles. Ce composant filtre, cherche, affiche et déclenche.
 * ══════════════════════════════════════════════════════════════════════════
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

/* Les filtres du haut. « Tout ce qui bouge » est le filtre par défaut d'un
   lundi matin : il retire les livrés, qui n'ont plus rien à raconter. */
type Filtre = "actifs" | "moi" | "nouveaux" | "tous";
const FILTRES: Array<{ cle: Filtre; label: string }> = [
  { cle: "actifs", label: "En cours" },
  { cle: "moi", label: "Ce qui m'attend" },
  { cle: "nouveaux", label: "Jamais ouverts" },
  { cle: "tous", label: "Tout" },
];

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

function Ligne({
  l,
  base,
  demo,
  onFait,
}: {
  l: LigneDossier;
  base: string;
  demo?: boolean;
  onFait: (m: string) => void;
}) {
  return (
    <div className={l.urgence.enRetard ? "ate-ligne ate-ligne--retard" : "ate-ligne"}>
      {/* Le lien couvre toute la ligne SAUF la zone d'action : un bouton
          imbriqué dans un <a> n'est ni valide ni utilisable au clavier. */}
      <Link href={`${base}/${l.token}`} className="ate-ligne-lien" aria-label={l.titre ?? "Dossier"} />

      <span className="ate-avatar" aria-hidden>
        {initiales(l)}
      </span>

      <span className="ate-ligne-corps">
        <span className="ate-ligne-titre">
          {l.nouveau ? <span className="ate-point-neuf" title="Jamais ouvert" aria-label="Jamais ouvert" /> : null}
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

      <span className="ate-ligne-act">
        <ActionRapide ligne={l} demo={demo} onFait={onFait} />
      </span>
    </div>
  );
}

export default function Liste({ vue }: { vue: VueListe }) {
  const [recherche, setRecherche] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("actifs");
  const [reglages, majReglages] = useReglages();
  const [replies, setReplies] = useState<Set<string>>(new Set<string>(["dehors", "termine"]));
  const [toast, setToast] = useState<string | null>(null);
  const champRecherche = useRef<HTMLInputElement | null>(null);

  /* « / » met le curseur dans la recherche, comme partout ailleurs. Le
     raccourci est ignoré si on est déjà en train d'écrire, sinon il volerait
     la barre oblique d'une URL de suivi collée dans une action. */
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const enSaisie =
        cible?.tagName === "INPUT" || cible?.tagName === "TEXTAREA" || cible?.isContentEditable;
      if (e.key === "/" && !enSaisie) {
        e.preventDefault();
        champRecherche.current?.focus();
      }
      if (e.key === "Escape" && cible === champRecherche.current) {
        setRecherche("");
        champRecherche.current?.blur();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return vue.lignes.filter((l) => {
      if (filtre === "actifs" && l.urgence.pile === "termine") return false;
      /* « Ce qui m'attend » = strictement ce sur quoi on peut agir. C'est le
         filtre qui répond à « par quoi je commence ». */
      if (filtre === "moi" && l.urgence.pile !== "retard" && l.urgence.pile !== "a_faire") return false;
      if (filtre === "nouveaux" && !l.nouveau) return false;
      if (!q) return true;
      /* La recherche sert à UNE chose : retrouver en trois secondes la
         cliente qui écrit « bonjour, où en est mon album ? » sans rien
         préciser. Token compris — elle colle parfois son lien. */
      return [l.titre, l.prenom, l.email, l.token].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [vue.lignes, recherche, filtre]);

  /**
   * Le regroupement, en une seule structure quel que soit le critère.
   *
   * `aucun` produit un unique groupe sans en-tête : une liste plate n'est pas
   * un cas particulier, c'est un regroupement à un seul seau. Le rendu ne
   * connaît donc qu'une forme.
   */
  const groupes = useMemo(() => {
    if (reglages.groupe === "aucun") {
      return [{ cle: "tout", titre: null, sous: null, lignes: filtrees }];
    }

    if (reglages.groupe === "etape") {
      return vue.colonnes
        .map((c) => ({
          cle: c.etat,
          titre: `${c.etape} · ${c.titre}`,
          sous: null as string | null,
          lignes: filtrees.filter((l) => l.etat === c.etat),
        }))
        .filter((g) => g.lignes.length > 0);
    }

    return ORDRE.map((pile) => ({
      cle: pile,
      titre: TITRE_PILE[pile],
      sous: SOUS_TITRE_PILE[pile] as string | null,
      lignes: filtrees.filter((l) => l.urgence.pile === pile),
    })).filter((g) => g.lignes.length > 0);
  }, [filtrees, reglages.groupe, vue.colonnes]);

  const base = vue.demo ? "/admin/atelier/demo" : "/admin/atelier";
  const aFaire = vue.compteurs.a_faire;
  const enRetard = vue.compteurs.retard;
  const vide = filtrees.length === 0;
  const messageVide =
    vue.lignes.length === 0
      ? "Aucun numéro pour l'instant."
      : recherche
        ? `Rien ne correspond à « ${recherche} ».`
        : filtre === "nouveaux"
          ? "Tout a été regardé."
          : "Rien dans ce filtre.";

  return (
    <div
      className={`adm-root ate-root ate-root--${reglages.densite}${
        reglages.mode === "liste" && reglages.groupe === "etape" ? " ate-root--groupe-etape" : ""
      }`}
    >
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

        <nav className="ate-liens">
          <Link href="/admin/atelier/sante">Santé</Link>
          <Link href="/admin">Prévente</Link>
          {vue.demo ? null : <Link href="/admin/atelier/demo">Démo</Link>}
          <form action="/api/admin/logout" method="post" className="adm-logout-form">
            <button className="adm-btn adm-btn--ghost" type="submit">
              Quitter
            </button>
          </form>
        </nav>
      </header>

      <Flux
        flux={vue.flux}
        tokens={filtrees.map((l) => l.token)}
        demo={vue.demo}
        actif={filtre === "nouveaux"}
        onFiltrer={() => setFiltre(filtre === "nouveaux" ? "actifs" : "nouveaux")}
      />

      <Activite activite={vue.activite} base={base} fetchedAt={vue.fetchedAt} />

      {/* Barre collante : les filtres et la recherche restent sous la main
          quand on descend dans une longue liste. */}
      <div className="ate-barre">
        <div className="ate-seg">
          {FILTRES.map((f) => (
            <button
              key={f.cle}
              type="button"
              className={filtre === f.cle ? "ate-seg-btn ate-seg-btn--actif" : "ate-seg-btn"}
              onClick={() => setFiltre(f.cle)}
            >
              {f.label}
              {f.cle === "moi" && enRetard + aFaire > 0 ? (
                <span className="ate-seg-compte">{enRetard + aFaire}</span>
              ) : null}
              {f.cle === "nouveaux" && vue.flux.nouveaux > 0 ? (
                <span className="ate-seg-compte">{vue.flux.nouveaux}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="ate-barre-droite">
          <Vues reglages={reglages} onChange={majReglages} />
          <div className="ate-recherche-boite">
            <input
              ref={champRecherche}
              className="adm-input ate-recherche"
              type="search"
              placeholder="Prénom, titre, email, lien…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            {recherche ? (
              <span className="ate-recherche-compte">{filtrees.length}</span>
            ) : (
              <kbd className="ate-kbd">/</kbd>
            )}
          </div>
        </div>
      </div>

      {reglages.mode === "liste" ? (
        <>
          {/* En-tête de colonnes, aligné sur la grille des lignes. */}
          <div className="ate-entete" aria-hidden>
            <span />
            <span>Dossier</span>
            <span>État</span>
            <span>Délai</span>
            <span className="ate-date">Ouvert</span>
            <span>Action</span>
          </div>

          {vide ? <p className="ate-vide">{messageVide}</p> : null}

          {groupes.map((g) => {
            const replie = replies.has(g.cle);
            return (
              <section key={g.cle} className={`ate-pile ate-pile--${g.cle}`}>
                {g.titre ? (
                  <button
                    type="button"
                    className="ate-pile-tete"
                    onClick={() =>
                      setReplies((s) => {
                        const n = new Set(s);
                        if (n.has(g.cle)) n.delete(g.cle);
                        else n.add(g.cle);
                        return n;
                      })
                    }
                    aria-expanded={!replie}
                  >
                    <span className="ate-pile-titre">{g.titre}</span>
                    <span className="ate-pile-compte">{g.lignes.length}</span>
                    <span className="ate-pile-sous">{g.sous}</span>
                    <span className="ate-chevron" aria-hidden>
                      {replie ? "▸" : "▾"}
                    </span>
                  </button>
                ) : null}
                {replie ? null : (
                  <div className="ate-lignes">
                    {g.lignes.map((l) => (
                      <Ligne key={l.token} l={l} base={base} demo={vue.demo} onFait={setToast} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </>
      ) : (
        <>
          {vide ? <p className="ate-vide">{messageVide}</p> : null}
          <Tableau
            lignes={filtrees}
            colonnes={vue.colonnes}
            demo={vue.demo}
            onFait={setToast}
          />
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
      </p>

      {/* `aria-live` : le retour d'une action doit être annoncé, pas seulement
          affiché — c'est la seule confirmation qu'un mail est parti. */}
      <div className="ate-toast-zone" aria-live="polite">
        {toast ? (
          <div className="ate-toast">
            {toast}
            <button type="button" onClick={() => setToast(null)} aria-label="Fermer">
              ×
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
