"use client";

import { useState } from "react";

/**
 * Les fichiers d'impression — VOIR ce qui va partir chez l'imprimeur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Jusqu'ici les PDF print-ready se déposaient au coffre et partaient chez
 * Cloudprinter sans avoir jamais été affichés : la seule vérification était
 * l'empreinte md5 et la taille. Cette carte montre chaque PDF déposé
 * (lien + aperçu intégré repliable), et offre un contrôle technique à la
 * demande : nombre de pages, dimensions en mm, verdicts contre les specs
 * relevées le 30/08/2026 (docs/reference/SPECS-CLOUDPRINTER.md — la source
 * unique, portée par impression.ts).
 *
 * Le contrôle est un BOUTON, jamais automatique : il télécharge des PDF de
 * plusieurs dizaines de Mo côté serveur, ce n'est pas un coût de rendu.
 * Son résultat vit dans l'état local — rien n'est écrit nulle part.
 * ══════════════════════════════════════════════════════════════════════════
 */

export type FichierImpression = {
  type: "product" | "cover" | "book";
  label: string;
  cle: string;
  /** URL GET signée au rendu de la fiche (1 h), null si la signature a raté. */
  url: string | null;
};

type DimensionMm = { largeur: number; hauteur: number };

type VerdictPages =
  | { genre: "conforme"; attendu: number }
  | { genre: "ecart"; attendu: number }
  | { genre: "constat" };

type VerdictTaille = "conforme" | "sans_fond_perdu" | "hors_format" | "constat";

type ControleFichier = {
  type: "product" | "cover" | "book";
  label: string;
  cle: string;
  taille: number | null;
} & (
  | { lisible: false; probleme: string }
  | {
      lisible: true;
      nbPages: number;
      pageMm: DimensionMm;
      trimMm: DimensionMm | null;
      taillesUniformes: boolean;
      autresTaillesMm: DimensionMm[];
      verdict: VerdictPages;
      verdictTaille: VerdictTaille;
      multiple: { ok: boolean; regle: string } | null;
    }
);

type EtatControle =
  | { phase: "repos" }
  | { phase: "encours" }
  | { phase: "fini"; fichiers: ControleFichier[]; nbPagesDossier: number | null }
  | { phase: "erreur"; message: string };

function mm(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function nomDe(cle: string): string {
  return cle.split("/").pop() ?? cle;
}

/** Le format, en une phrase — les mm constatés d'abord, le verdict ensuite. */
function ligneTaille(r: ControleFichier & { lisible: true }): { texte: string; ton: "ok" | "attention" | "alerte" } {
  const dims = `${mm(r.pageMm.largeur)} × ${mm(r.pageMm.hauteur)} mm`;
  const trim = r.trimMm ? `, zone rognée ${mm(r.trimMm.largeur)} × ${mm(r.trimMm.hauteur)} mm` : "";
  switch (r.verdictTaille) {
    case "conforme":
      return { texte: `${dims}${trim} : fini + fond perdu, conforme.`, ton: "ok" };
    case "sans_fond_perdu":
      return {
        texte: `${dims}${trim} : format FINI, sans fond perdu — le rognage mordra le bord de l'image. Attendu : 216 × 303 mm.`,
        ton: "attention",
      };
    case "constat":
      /* Une cover de dos carré : la largeur dépend de l'épaisseur du dos
         (formule non relevée), seule la hauteur est jugée. */
      return { texte: `${dims}${trim} : hauteur conforme, largeur non jugée (elle dépend de l'épaisseur du dos).`, ton: "ok" };
    case "hors_format":
      return {
        texte: `${dims}${trim} : hors format. Attendu : 216 × 303 mm (210 × 297 fini + 3 mm de fond perdu de chaque côté).`,
        ton: "alerte",
      };
  }
}

function lignePages(r: ControleFichier & { lisible: true }): { texte: string; ton: "ok" | "attention" | "alerte" } {
  if (r.verdict.genre === "conforme") {
    return { texte: `${r.nbPages} pages, comme le dossier.`, ton: "ok" };
  }
  if (r.verdict.genre === "ecart") {
    return {
      texte: `${r.nbPages} pages constatées, ${r.verdict.attendu} au dossier : à vérifier.`,
      ton: "attention",
    };
  }
  return { texte: `${r.nbPages} page${r.nbPages > 1 ? "s" : ""} constatée${r.nbPages > 1 ? "s" : ""}.`, ton: "ok" };
}

export default function Impression({
  token,
  fichiers,
}: {
  token: string;
  fichiers: FichierImpression[];
}) {
  const [controle, setControle] = useState<EtatControle>({ phase: "repos" });
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  if (!fichiers.length) return null;

  async function controler() {
    setControle({ phase: "encours" });
    try {
      const r = await fetch("/api/admin/atelier/impression/controle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        setControle({ phase: "erreur", message: "Le contrôle a échoué. Les fichiers n'ont pas bougé, réessaie." });
        return;
      }
      const data = (await r.json()) as { fichiers?: ControleFichier[]; nbPagesDossier?: number | null };
      if (!Array.isArray(data.fichiers)) {
        setControle({ phase: "erreur", message: "Réponse illisible du serveur. Réessaie." });
        return;
      }
      setControle({ phase: "fini", fichiers: data.fichiers, nbPagesDossier: data.nbPagesDossier ?? null });
    } catch {
      setControle({ phase: "erreur", message: "Réseau interrompu pendant le contrôle. Rien n'a bougé, réessaie." });
    }
  }

  const resultatPour = (cle: string): ControleFichier | null =>
    controle.phase === "fini" ? (controle.fichiers.find((f) => f.cle === cle) ?? null) : null;

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Les fichiers d&apos;impression</h2>
      <p className="ate-carte-sous">
        Ce qui partira chez l&apos;imprimeur, tel quel. Ouvre-les avant d&apos;envoyer — personne
        d&apos;autre ne les verra avant la presse.
      </p>

      <ul className="ate-impr-liste">
        {fichiers.map((f) => {
          const r = resultatPour(f.cle);
          return (
            <li key={f.type} className="ate-impr-item">
              <div className="ate-impr-tete">
                <span className="ate-impr-label">{f.label}</span>
                <span className="ate-impr-nom ate-mono">{nomDe(f.cle)}</span>
                {f.url ? (
                  <a className="ate-lien-page" href={f.url} target="_blank" rel="noreferrer">
                    Ouvrir ↗
                  </a>
                ) : (
                  <span className="ate-faint">lien indisponible — recharge la page</span>
                )}
              </div>

              {f.url ? (
                /* Repliable, et l'iframe n'existe QUE déplié : trois PDF de
                   magazine chargés d'office feraient ramer la fiche entière. */
                <details
                  className="ate-impr-plis"
                  open={Boolean(ouverts[f.type])}
                  onToggle={(e) =>
                    setOuverts((o) => ({ ...o, [f.type]: (e.target as HTMLDetailsElement).open }))
                  }
                >
                  <summary>Aperçu dans la page</summary>
                  {ouverts[f.type] ? (
                    <iframe className="ate-impr-cadre" src={f.url} title={f.label} loading="lazy" />
                  ) : null}
                </details>
              ) : null}

              {r ? (
                r.lisible ? (
                  <ul className="ate-impr-verdicts">
                    <li className={`ate-impr-verdict ate-impr-verdict--${lignePages(r).ton}`}>{lignePages(r).texte}</li>
                    {r.multiple && !r.multiple.ok ? (
                      <li className="ate-impr-verdict ate-impr-verdict--alerte">
                        Ne respecte pas la règle du produit : {r.multiple.regle} pages.
                      </li>
                    ) : r.multiple ? (
                      <li className="ate-impr-verdict ate-impr-verdict--ok">
                        Règle du produit respectée ({r.multiple.regle}).
                      </li>
                    ) : null}
                    <li className={`ate-impr-verdict ate-impr-verdict--${ligneTaille(r).ton}`}>{ligneTaille(r).texte}</li>
                    {!r.taillesUniformes ? (
                      <li className="ate-impr-verdict ate-impr-verdict--alerte">
                        Les pages n&apos;ont pas toutes la même taille — autres formats :{" "}
                        {r.autresTaillesMm.map((d) => `${mm(d.largeur)} × ${mm(d.hauteur)} mm`).join(", ")}.
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <ul className="ate-impr-verdicts">
                    <li className="ate-impr-verdict ate-impr-verdict--alerte">{r.probleme}</li>
                  </ul>
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="ate-impr-outils">
        <button
          type="button"
          className="adm-btn"
          disabled={controle.phase === "encours"}
          onClick={controler}
        >
          {controle.phase === "encours" ? "Contrôle en cours…" : "Contrôler les fichiers"}
        </button>
        <span className="ate-faint">
          Pages, dimensions et fond perdu, contre les specs Cloudprinter relevées le 30/08/2026.
        </span>
      </div>

      {controle.phase === "encours" ? (
        <p className="ate-faint" role="status">
          Le serveur télécharge et ouvre chaque PDF — quelques dizaines de secondes pour un gros
          fichier.
        </p>
      ) : null}
      {controle.phase === "erreur" ? <p className="ate-erreur ate-erreur--bloc">{controle.message}</p> : null}
      {controle.phase === "fini" && controle.fichiers.length === 0 ? (
        <p className="ate-faint">Aucun PDF au coffre pour ce dossier.</p>
      ) : null}
    </section>
  );
}
