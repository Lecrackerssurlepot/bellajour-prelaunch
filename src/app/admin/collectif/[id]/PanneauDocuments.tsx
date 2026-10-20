"use client";

/* Les documents de l'espace client (« Documents »), côté atelier : devis signé, factures,
   conditions, accord sur les données, proposition complémentaire. Le fichier
   part tel quel (PDF ou image, 4 Mo au plus) et le client le télécharge
   depuis son espace. Rien ne s'efface. */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { TYPES_DOCUMENT, TYPES_FICHIER_DOCUMENT } from "@/lib/collectif/documents";
import { A_FAIRE_DEVIS, devisAEnvoyer } from "@/lib/collectif/livraison";
import type { DocumentFiche } from "../donnees";

export default function PanneauDocuments({ id, documents }: { id: string; documents: DocumentFiche[] }) {
  const router = useRouter();
  /* D26 : une proposition acceptée n'engage pas ; le devis signé, si. Tant qu'aucun devis
     n'est déposé après elle, la ligne le rappelle. */
  const aEnvoyer = new Set(devisAEnvoyer(documents).map((d) => d.id));
  const [type, setType] = useState<string>("devis");
  const [libelle, setLibelle] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const fichier = useRef<HTMLInputElement>(null);

  async function deposer(e: React.FormEvent) {
    e.preventDefault();
    const f = fichier.current?.files?.[0];
    if (!f) {
      setMessage({ ok: false, texte: "Choisir un fichier." });
      return;
    }
    if (!TYPES_FICHIER_DOCUMENT[f.type]) {
      setMessage({ ok: false, texte: "PDF, JPEG, PNG ou WebP seulement." });
      return;
    }
    setEnvoi(true);
    setMessage(null);
    try {
      const q = new URLSearchParams({ type, libelle, nom: f.name.replace(/\.[^.]+$/, "") });
      const rep = await fetch(`/api/admin/collectif/editions/${id}/documents?${q}`, {
        method: "POST",
        headers: { "content-type": f.type },
        body: f,
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setMessage({ ok: false, texte: json.message ?? `Document non déposé (erreur ${rep.status}).` });
        return;
      }
      setLibelle("");
      if (fichier.current) fichier.current.value = "";
      setMessage({ ok: true, texte: "Déposé : le client le voit dans son dossier." });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Le réseau n'a pas répondu. Rien n'est déposé." });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Documents du client</h2>
      </span>
      {documents.length ? (
        <ul className="eca-mag-liste">
          {documents.map((d) => (
            <li key={d.id}>
              <span>
                {d.libelle} <span className="eca-sous">{d.libelleType}</span>
                {aEnvoyer.has(d.id) ? (
                  <span className="eca-afaire">
                    <span className="eca-puce eca-puce--ambre">{A_FAIRE_DEVIS}</span>
                  </span>
                ) : null}
              </span>
              <span className="eca-sous">
                {formaterInstantParis(d.quand)}
                {d.statut ? ` · ${d.statut}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="eca-vide">Aucun document pour l&apos;instant.</p>
      )}
      <form className="eca-form eca-form--serre" onSubmit={deposer}>
        <select className="eca-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type du document">
          {TYPES_DOCUMENT.map((t) => (
            <option key={t.cle} value={t.cle}>
              {t.libelle}
            </option>
          ))}
        </select>
        <input className="eca-input" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Libellé (facultatif)" />
        <input ref={fichier} className="eca-fichier" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
        <div className="eca-barre">
          <button type="submit" className="adm-btn" disabled={envoi}>
            {envoi ? "Dépôt…" : "Déposer"}
          </button>
          <span className="eca-champ-aide">4 Mo au plus.</span>
        </div>
        {message ? (
          <p className={`eca-message ${message.ok ? "eca-message--ok" : "eca-message--erreur"}`} role="status">
            {message.texte}
          </p>
        ) : null}
      </form>
    </section>
  );
}
