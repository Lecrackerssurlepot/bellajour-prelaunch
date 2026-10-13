"use client";

/* Les trois liens d'une édition : copier, ouvrir, régénérer (PRD §8).
   Régénérer coupe l'ancien lien AUSSITÔT : jamais d'un seul clic. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBELLE_LIEN, QUELS_LIENS, type QuelLien } from "@/lib/collectif/liens";

export default function PanneauLiens({ id, liens }: { id: string; liens: Record<QuelLien, string> }) {
  const router = useRouter();
  const [copie, setCopie] = useState<QuelLien | null>(null);
  const [arme, setArme] = useState<QuelLien | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function copier(quel: QuelLien) {
    try {
      await navigator.clipboard.writeText(liens[quel]);
      setCopie(quel);
      setTimeout(() => setCopie((c) => (c === quel ? null : c)), 2000);
    } catch {
      setErreur("Copie impossible : sélectionner le lien et le copier à la main.");
    }
  }

  async function regenerer(quel: QuelLien) {
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/lien`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quel }),
      });
      if (!rep.ok) {
        setErreur(`Le lien n'a pas été régénéré (erreur ${rep.status}). L'ancien fonctionne toujours.`);
        return;
      }
      setArme(null);
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu. L'ancien lien fonctionne toujours.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Les liens</h2>
      {QUELS_LIENS.map((quel) => (
        <div className="eca-lien" key={quel}>
          <span className="eca-lien-titre">{LIBELLE_LIEN[quel].titre}</span>
          <span className="eca-champ-aide">{LIBELLE_LIEN[quel].aide}</span>
          <div className="eca-lien-ligne">
            <input
              className="eca-input"
              readOnly
              value={liens[quel]}
              aria-label={LIBELLE_LIEN[quel].titre}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="adm-btn" onClick={() => copier(quel)}>
              {copie === quel ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="eca-barre">
            <a className="ate-lien-discret" href={liens[quel]} target="_blank" rel="noopener noreferrer">
              Ouvrir
            </a>
            {arme === quel ? null : (
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArme(quel)}>
                Régénérer
              </button>
            )}
          </div>
          {arme === quel ? (
            <div className="eca-confirm">
              <p>
                <strong>L&apos;ancien lien cessera de fonctionner tout de suite.</strong> Quiconque l&apos;a reçu
                tombera sur une page introuvable. Il faudra envoyer le nouveau.
              </p>
              <div className="eca-barre">
                <button type="button" className="adm-btn" disabled={envoi} onClick={() => regenerer(quel)}>
                  {envoi ? "Régénération…" : "Confirmer"}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArme(null)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
      {erreur ? (
        <p className="eca-message eca-message--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </section>
  );
}
