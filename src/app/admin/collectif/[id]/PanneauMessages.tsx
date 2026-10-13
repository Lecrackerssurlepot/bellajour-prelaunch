"use client";

/* La messagerie, côté atelier (PRD §7). Le même fil que celui du client,
   relu toutes les 3,5 s quand l'onglet est visible. Ouvrir la fiche marque
   lus les messages du client (par un effet, jamais au rendu). Aucun mail ne
   part : le client voit la réponse dans « Votre dossier ». */

import { useState } from "react";
import { formaterInstantParis } from "@/lib/collectif/dates";
import type { Message } from "@/lib/collectif/messages";
import { useMessagerie } from "../../../edition/_composants/useMessagerie";

export default function PanneauMessages({ id, initiaux }: { id: string; initiaux: Message[] }) {
  const [texte, setTexte] = useState("");
  const base = `/api/admin/collectif/editions/${id}/messages`;
  const { messages, envoyer, envoi, erreur } = useMessagerie({
    initiaux,
    lecteur: "atelier",
    charger: async (depuis) => {
      try {
        const rep = await fetch(depuis ? `${base}?depuis=${encodeURIComponent(depuis)}` : base, { cache: "no-store" });
        if (!rep.ok) return null;
        return ((await rep.json()) as { messages?: Message[] }).messages ?? [];
      } catch {
        return null;
      }
    },
    envoyer: async (t) => {
      try {
        const rep = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texte: t }) });
        const json = (await rep.json().catch(() => ({}))) as { message?: Message | string };
        if (rep.ok && json.message && typeof json.message === "object") return json.message;
        return typeof json.message === "string" ? json.message : `Message non envoyé (erreur ${rep.status}).`;
      } catch {
        return "Le réseau n'a pas répondu. Message non envoyé.";
      }
    },
    marquerLus: async () => {
      try {
        await fetch(base, { method: "PATCH" });
      } catch {
        /* rattrapé à la prochaine ouverture */
      }
    },
  });

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    if (await envoyer(texte)) setTexte("");
  }

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Messages</h2>
      <div className="eca-fil" aria-live="polite">
        {messages.length === 0 ? (
          <p className="eca-vide">Aucun message. Le client écrit depuis « Votre dossier ».</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.auteur === "atelier" ? "eca-bulle eca-bulle--atelier" : "eca-bulle"}>
              <span className="eca-bulle-qui">
                {m.auteur === "atelier" ? `Atelier · ${m.qui ?? ""}` : `Client · ${m.qui ?? ""}`} · {formaterInstantParis(m.created_at)}
              </span>
              {m.texte}
            </div>
          ))
        )}
      </div>
      <form onSubmit={soumettre} className="eca-form" style={{ marginTop: 12, gap: 8 }}>
        <textarea
          className="eca-textarea"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Répondre au client"
          aria-label="Répondre au client"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void soumettre(e);
          }}
        />
        <div className="eca-barre">
          <button type="submit" className="adm-btn" disabled={envoi || !texte.trim()}>
            {envoi ? "Envoi…" : "Envoyer"}
          </button>
          <span className="eca-champ-aide">Aucun mail ne part : le client lit la réponse dans son espace.</span>
        </div>
        {erreur ? (
          <p className="eca-message eca-message--erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </form>
    </section>
  );
}
