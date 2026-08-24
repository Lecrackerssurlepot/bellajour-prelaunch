"use client";

import Link from "next/link";
import ActionRapide from "./ActionRapide";
import type { ColonneVue, LigneDossier } from "./types";

/**
 * La vue tableau — une colonne par étape du parcours.
 *
 * C'est la lecture qu'aucune liste ne donne : combien de dossiers attendent
 * une couverture, combien sont payés sans maquette, combien dorment à l'état
 * 2 sans jamais devenir des paiements. Le déséquilibre saute aux yeux, et
 * c'est exactement ce qu'on veut voir en fin de semaine.
 *
 * Les cartes NE SE GLISSENT PAS d'une colonne à l'autre, volontairement. Un
 * glisser-déposer suggère qu'une étape se change à la main : ici chaque
 * transition a ses conditions (une pagination, trois visuels, un lien Canva)
 * et déclenche un mail. On garde donc le même bouton armé que la liste.
 */

export default function Tableau({
  lignes,
  colonnes,
  demo,
  onFait,
}: {
  lignes: LigneDossier[];
  colonnes: ColonneVue[];
  demo?: boolean;
  onFait: (m: string) => void;
}) {
  const base = demo ? "/admin/atelier/demo" : "/admin/atelier";

  const parEtat = new Map<string, LigneDossier[]>();
  for (const l of lignes) {
    const arr = parEtat.get(l.etat) ?? [];
    arr.push(l);
    parEtat.set(l.etat, arr);
  }

  /* Une colonne vide reste affichée : son vide EST l'information (« plus
     rien n'attend d'être imprimé »). Sauf « photos insuffisantes », qui est
     un détour et non une étape — l'afficher vide en permanence ajouterait
     une colonne morte à un tableau déjà large. */
  const visibles = colonnes.filter(
    (c) => c.etat !== "photos_insuffisantes" || (parEtat.get(c.etat)?.length ?? 0) > 0,
  );

  return (
    <div className="ate-tableau">
      {visibles.map((c) => {
        const dossiers = parEtat.get(c.etat) ?? [];
        const retards = dossiers.filter((d) => d.urgence.enRetard).length;
        return (
          <section key={c.etat} className="ate-col">
            <header className="ate-col-tete">
              <span className={`ate-etat ate-etat--${c.etat}`}>
                <span className="ate-etape">{c.etape}</span>
                {c.titre}
              </span>
              <span className="ate-col-compte">
                {dossiers.length}
                {retards > 0 ? <span className="ate-col-retard">{retards} en retard</span> : null}
              </span>
            </header>

            <div className="ate-col-corps">
              {dossiers.length === 0 ? (
                <p className="ate-col-vide">—</p>
              ) : (
                dossiers.map((l) => (
                  <article
                    key={l.token}
                    className={l.urgence.enRetard ? "ate-carte-d ate-carte-d--retard" : "ate-carte-d"}
                  >
                    <Link href={`${base}/${l.token}`} className="ate-carte-d-lien">
                      <span className="ate-carte-d-titre">
                        {l.nouveau ? (
                          <span className="ate-point-neuf" title="Jamais ouvert" aria-label="Jamais ouvert" />
                        ) : null}
                        {l.titre?.trim() || "Sans titre"}
                        {l.rembourse ? <span className="ate-tag ate-tag--alerte">remboursé</span> : null}
                      </span>
                      <span className="ate-carte-d-sous">
                        {l.prenom || "—"}
                        <span className="ate-sep">·</span>
                        {l.nbPhotos} ph.
                        {l.euros ? (
                          <>
                            <span className="ate-sep">·</span>
                            <strong>{l.euros}&nbsp;€</strong>
                          </>
                        ) : null}
                      </span>
                      <span
                        className={
                          l.urgence.enRetard ? "ate-delai-val ate-delai-val--retard" : "ate-delai-val"
                        }
                      >
                        {l.urgence.libelle}
                      </span>
                    </Link>
                    <div className="ate-carte-d-act">
                      <ActionRapide ligne={l} demo={demo} onFait={onFait} />
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
