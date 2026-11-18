"use client";

/* L'agenda et le lien visio de chaque interlocuteur (D23) : « Enregistrer »,
   puis « Tester », qui lit les disponibilités ET pose puis retire un événement
   d'essai (les deux droits d'un rendez-vous). Le test ne montre qu'un
   nombre de plages occupées, jamais leur contenu. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConnexionGoogle, Interlocuteur } from "@/lib/collectif/rendezvous";

type Props = { interlocuteurs: Interlocuteur[]; compte: boolean; oauth: boolean; connexions: ConnexionGoogle[] | null };

export default function Agendas({ interlocuteurs, compte, oauth, connexions }: Props) {
  return (
    <div className="eca-liste-agendas">
      {interlocuteurs.map((i) => (
        <Personne key={i.cle} i={i} compte={compte} oauth={oauth} google={connexions?.find((c) => c.cle === i.cle)?.email ?? null} migration={connexions !== null} />
      ))}
    </div>
  );
}

function Personne({ i, compte, oauth, google, migration }: { i: Interlocuteur; compte: boolean; oauth: boolean; google: string | null; migration: boolean }) {
  const router = useRouter();
  const [agenda, setAgenda] = useState(i.agenda_id ?? "");
  const [meet, setMeet] = useState(i.meet_url ?? "");
  const [actif, setActif] = useState(i.actif);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);

  async function appeler(corps: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setEnvoi(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/collectif/agendas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cle: i.cle, ...corps }),
      });
      const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
      if (!rep.ok) {
        setMessage({ texte: String(json.message ?? `Refusé (erreur ${rep.status}).`), ok: false });
        return null;
      }
      return json;
    } catch {
      setMessage({ texte: "Le réseau n'a pas répondu.", ok: false });
      return null;
    } finally {
      setEnvoi(false);
    }
  }

  async function enregistrer() {
    const r = await appeler({ action: "regler", agenda_id: agenda, meet_url: meet, actif });
    if (r) {
      setMessage({ texte: "Enregistré.", ok: true });
      router.refresh();
    }
  }

  async function deconnecter() {
    const r = await appeler({ action: "deconnecter" });
    if (r) {
      setMessage({ texte: "Déconnecté.", ok: true });
      router.refresh();
    }
  }

  async function tester() {
    const r = await appeler({ action: "tester" });
    if (!r) return;
    if (r.ok === true) setMessage({ texte: `${String(r.message)} (${String(r.occupes)} plage(s) occupée(s) sur sept jours.)`, ok: true });
    else setMessage({ texte: `${r.etape === "ecriture" ? "Lecture ok, écriture refusée : " : ""}${String(r.message)}`, ok: false });
  }

  return (
    <div className="eca-agenda">
      <h3 className="eca-agenda-nom">{i.prenom}</h3>
      <div className="eca-champ">
        <span className="eca-champ-label">Google</span>
        {google ? (
          <span className="eca-champ-aide">
            Connecté : <strong>{google}</strong>.{" "}
            <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={deconnecter}>
              Déconnecter
            </button>
          </span>
        ) : !migration ? (
          <span className="eca-champ-aide">Migration à appliquer : 20261118_partenaires_rendez_vous.sql.</span>
        ) : oauth ? (
          /* Un vrai lien : la route redirige vers Google (un document, pas un fetch). */
          <a className="adm-btn" href={`/api/admin/collectif/agendas/google?cle=${i.cle}`}>
            Connecter Google
          </a>
        ) : (
          <span className="eca-champ-aide">Poser d&apos;abord la connexion de l&apos;atelier (étape 1).</span>
        )}
        <span className="eca-champ-aide">À faire par {i.prenom}, avec son propre compte Google.</span>
      </div>
      <label className="eca-champ">
        <span className="eca-champ-label">Agenda Google</span>
        <input className="eca-input" value={agenda} placeholder="son adresse Gmail" onChange={(e) => setAgenda(e.target.value)} />
        <span className="eca-champ-aide">Pour l&apos;agenda principal : l&apos;adresse Gmail de la personne.</span>
      </label>
      <label className="eca-champ">
        <span className="eca-champ-label">Lien visio</span>
        <input className="eca-input" value={meet} placeholder="https://meet.google.com/…" onChange={(e) => setMeet(e.target.value)} />
        <span className="eca-champ-aide">Facultatif une fois connecté : sans lien fixe, Google crée une visio Meet neuve à chaque rendez-vous.</span>
      </label>
      <label className="eca-case">
        <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} /> Prend des rendez-vous
      </label>
      <div className="eca-barre">
        <button type="button" className="adm-btn" disabled={envoi} onClick={enregistrer}>
          Enregistrer
        </button>
        <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi || !(compte || google) || !i.agenda_id} onClick={tester} title={!(compte || google) ? "Connecter d'abord Google" : !i.agenda_id ? "Enregistrer d'abord l'agenda" : undefined}>
          Tester la connexion
        </button>
      </div>
      {message ? (
        <p className={message.ok ? "eca-message" : "eca-message eca-message--erreur"} role={message.ok ? "status" : "alert"}>
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}
