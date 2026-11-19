"use client";

/* Les rendez-vous pris depuis /partenaires, et le geste pour en annuler un
   (18/11). Deux temps : « Annuler », puis « Confirmer » : Google prévient
   alors le prospect, on n'annule pas d'un clic de travers. La ligne quitte
   l'écran dès que la route a répondu (elle rend ce qu'elle a fait). */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RdvProspectAtelier } from "@/lib/collectif/prospects";
import { periodeEvenement } from "@/lib/collectif/prospectsSaisie";

export type RdvAffiche = RdvProspectAtelier & { quand: string };

export default function RdvProspects({ rendezVous }: { rendezVous: RdvAffiche[] }) {
  const router = useRouter();
  const [partis, setPartis] = useState<string[]>([]);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const liste = rendezVous.filter((r) => !partis.includes(r.id));

  async function annuler(id: string) {
    setEnvoi(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/collectif/prospects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "annuler", id }),
      });
      const json = (await rep.json().catch(() => ({}))) as { avertissement?: string | null; message?: string };
      if (!rep.ok) {
        setMessage({ texte: json.message ?? `Refusé (erreur ${rep.status}).`, ok: false });
        return;
      }
      setPartis((p) => [...p, id]);
      setMessage(json.avertissement ? { texte: json.avertissement, ok: false } : { texte: "Annulé. Google prévient les invités.", ok: true });
      router.refresh();
    } catch {
      setMessage({ texte: "Le réseau n'a pas répondu.", ok: false });
    } finally {
      setEnvoi(false);
      setAConfirmer(null);
    }
  }

  return (
    <>
      {liste.length === 0 ? <p className="eca-sous">Aucun rendez-vous à venir.</p> : null}
      <ul className="eca-rdvp">
        {liste.map((r) => (
          <li key={r.id} className="eca-rdvp-ligne">
            <div className="eca-rdvp-corps">
              <strong className="eca-rdvp-quand">{r.quand}</strong>
              <span>
                {r.nom} · {r.organisation}
              </span>
              <span className="eca-sous">
                <a href={`mailto:${r.email}`}>{r.email}</a>
                {r.telephone ? ` · ${r.telephone}` : ""}
                {r.visio_url ? (
                  <>
                    {" · "}
                    <a href={r.visio_url} target="_blank" rel="noreferrer">
                      Visio
                    </a>
                  </>
                ) : null}
              </span>
              {r.evenement_debut || r.participants ? (
                <span className="eca-sous">
                  {[r.evenement_debut && r.evenement_fin ? `Événement ${periodeEvenement(r.evenement_debut, r.evenement_fin)}` : null, r.participants ? `${r.participants} participants` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              ) : null}
              {r.message ? <span className="eca-sous">{r.message}</span> : null}
            </div>
            {aConfirmer === r.id ? (
              <div className="eca-barre">
                <button type="button" className="adm-btn" disabled={envoi} onClick={() => void annuler(r.id)}>
                  Confirmer
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={() => setAConfirmer(null)}>
                  Garder
                </button>
              </div>
            ) : (
              <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={() => setAConfirmer(r.id)}>
                Annuler
              </button>
            )}
          </li>
        ))}
      </ul>
      {message ? (
        <p className={message.ok ? "eca-message" : "eca-message eca-message--erreur"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </>
  );
}
