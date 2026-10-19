"use client";

/* Les rendez-vous d'une édition, côté atelier (D23, T-148).
   1. L'interlocuteur du projet : ses disponibilités sont celles que le
      client voit dans son espace. Sans interlocuteur (ou sans agenda relié),
      l'espace garde le lien de rendez-vous des réglages.
   2. Les rendez-vous pris, à venir et passés ; « Annuler » retire aussi
      l'événement de l'agenda (deux gestes). Supprimer l'événement dans Google
      Agenda seulement ne prévient pas l'espace : annuler ICI. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type InterlocuteurFiche = { cle: string; prenom: string; relie: boolean };
export type RendezVousFiche = { id: string; libelle: string; avec: string; motif: string | null; statut: "pris" | "annule"; aVenir: boolean };

export default function PanneauRendezVous({
  id,
  absent,
  migration,
  interlocuteurs,
  courant,
  rendezVous,
  compteRelie,
}: {
  id: string;
  absent: boolean;
  migration: string;
  interlocuteurs: InterlocuteurFiche[];
  courant: string | null;
  rendezVous: RendezVousFiche[];
  compteRelie: boolean;
}) {
  const router = useRouter();
  const [choix, setChoix] = useState(courant ?? "");
  const [armer, setArmer] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  async function appeler(corps: Record<string, unknown>, reussi: string) {
    setEnvoi(true);
    setMessage(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/rendez-vous`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string; avertissement?: string | null };
      if (!rep.ok) return setMessage({ texte: json.message ?? `Refusé (erreur ${rep.status}).`, ok: false });
      setMessage({ texte: json.avertissement ?? reussi, ok: !json.avertissement });
      setArmer(null);
      router.refresh();
    } catch {
      setMessage({ texte: "Le réseau n'a pas répondu.", ok: false });
    } finally {
      setEnvoi(false);
    }
  }

  if (absent) {
    return (
      <section className="eca-carte">
        <span className="eca-carte-tete">
          <h2 className="eca-carte-titre">Rendez-vous</h2>
        </span>
        <p className="eca-sous">
          Migration à appliquer : <code>{migration}</code>. En attendant, le client voit le lien de rendez-vous des réglages.
        </p>
      </section>
    );
  }

  const choisi = interlocuteurs.find((i) => i.cle === choix) ?? null;
  const aVenir = rendezVous.filter((r) => r.statut === "pris" && r.aVenir);
  const autres = rendezVous.filter((r) => !(r.statut === "pris" && r.aVenir));

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Rendez-vous</h2>
      </span>
      <label className="eca-champ">
        <span className="eca-champ-label">Interlocuteur du projet</span>
        <select
          className="eca-input"
          value={choix}
          disabled={envoi}
          onChange={(e) => {
            setChoix(e.target.value);
            void appeler({ action: "interlocuteur", cle: e.target.value || null }, e.target.value ? "Interlocuteur enregistré." : "Interlocuteur retiré.");
          }}
        >
          <option value="">Personne pour l&apos;instant</option>
          {interlocuteurs.map((i) => (
            <option key={i.cle} value={i.cle}>
              {i.prenom}
              {i.relie ? "" : " (agenda pas encore relié)"}
            </option>
          ))}
        </select>
        <span className="eca-champ-aide">
          {!compteRelie ? (
            <>
              Le compte Google de l&apos;atelier n&apos;est pas encore posé : le client voit le lien de rendez-vous des réglages.{" "}
              <Link href="/admin/collectif/agendas">Les agendas</Link>
            </>
          ) : choisi && !choisi.relie ? (
            <>
              L&apos;agenda de {choisi.prenom} n&apos;est pas relié : le client voit encore le lien des réglages.{" "}
              <Link href="/admin/collectif/agendas">Le relier</Link>
            </>
          ) : choisi ? (
            `Le client voit les créneaux libres de ${choisi.prenom} et réserve dans son espace.`
          ) : (
            "Sans interlocuteur, le client voit le lien de rendez-vous des réglages."
          )}
        </span>
      </label>

      {aVenir.length ? (
        <ul className="eca-liste-rdv">
          {aVenir.map((r) => (
            <li key={r.id}>
              <span>
                <strong>{r.libelle}</strong> · avec {r.avec}
                {r.motif ? <span className="eca-sous"> · {r.motif}</span> : null}
              </span>
              {armer === r.id ? (
                <span className="eca-barre">
                  <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={() => appeler({ action: "annuler", rdvId: r.id }, "Rendez-vous annulé.")}>
                    Confirmer l&apos;annulation
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArmer(null)}>
                    Garder
                  </button>
                </span>
              ) : (
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setArmer(r.id)}>
                  Annuler
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="eca-sous">Aucun rendez-vous à venir.</p>
      )}
      {autres.length ? (
        <details className="eca-sous">
          <summary>Passés et annulés ({autres.length})</summary>
          <ul className="eca-liste-rdv">
            {autres.map((r) => (
              <li key={r.id}>
                <span>
                  {r.libelle} · avec {r.avec} · {r.statut === "annule" ? "annulé" : "passé"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {message ? (
        <p className={message.ok ? "eca-message" : "eca-message eca-message--erreur"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </section>
  );
}
