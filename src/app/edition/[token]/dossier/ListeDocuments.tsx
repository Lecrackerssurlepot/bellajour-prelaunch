"use client";

/* La liste des documents (T-152) : « Ouvrir » ouvre le document DANS la page
   (la visionneuse), l'icône le télécharge sans l'ouvrir, « Répondre » ouvre
   la conversation avec ce document déjà cité (seulement pour qui écrit). */

import Link from "next/link";

import { formaterInstantParis } from "@/lib/collectif/dates";
import { useVisionneuse } from "../../_composants/Visionneuse";
import type { DocumentDossier } from "../donnees";

export default function ListeDocuments({ documents, aLire, versAtelier }: { documents: DocumentDossier[]; aLire: string[]; versAtelier: string | null }) {
  const vision = useVisionneuse();
  return (
    <>
      <ul className="ec-docs-lignes ec-defile">
        {documents.map((d) => (
          <li key={d.id}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 3h8l4 4v14H6z" />
              <path d="M14 3v4h4" />
            </svg>
            <span className="ec-docs-nom">
              <span>{d.libelle}</span>
              <span className="ec-note">
                {d.libelleType} · {formaterInstantParis(d.quand)}
              </span>
            </span>
            {d.statut ? <span className="ec-docs-statut">{d.statut}</span> : aLire.includes(d.id) ? <span className="ec-docs-statut ec-docs-accent">À lire</span> : null}
            {d.voir ? (
              <span className="ec-docs-gestes">
                <button
                  type="button"
                  className="ec-bouton ec-bouton--clair ec-bouton--petit"
                  onClick={() => vision.ouvrir({ titre: d.libelle, sous: `${d.libelleType} · ${formaterInstantParis(d.quand)}`, voir: d.voir as string, telecharger: d.url })}
                >
                  Ouvrir
                </button>
                {versAtelier ? (
                  <Link className="ec-bouton ec-bouton--clair ec-bouton--petit" href={`${versAtelier}?citer=${d.id}`} prefetch={false}>
                    Répondre
                  </Link>
                ) : null}
                {d.url ? (
                  <a className="ec-docs-telecharger" href={d.url} download aria-label={`Télécharger « ${d.libelle} »`} title="Télécharger">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                    </svg>
                  </a>
                ) : null}
              </span>
            ) : (
              <span className="ec-note">indisponible</span>
            )}
          </li>
        ))}
      </ul>
      {vision.rendu}
    </>
  );
}
