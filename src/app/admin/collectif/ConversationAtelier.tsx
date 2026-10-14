"use client";

/* Une conversation avec un client, côté atelier (PRD §7, T-152). Le même fil
   que celui du client, relu toutes les 3,5 s quand l'onglet est visible ;
   l'ouvrir marque lus les messages du client (par un effet, jamais au rendu).
   Aucun mail ne part : le client voit la réponse dans « Parler à l'atelier ».

   Posée dans la fiche d'une édition ET dans la boîte de réception de
   l'atelier : une seule façon d'écrire, des deux côtés. « Répondre » cite un
   message du fil (migration 20261018 : sans elle, la route dit laquelle
   manque et rien ne part). */

import { useState } from "react";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { extraitDe, type Message } from "@/lib/collectif/messages";
import { useMessagerie } from "../../edition/_composants/useMessagerie";

const auteurDe = (m: { auteur: "client" | "atelier"; qui: string | null }) => (m.auteur === "atelier" ? `Atelier · ${m.qui ?? ""}` : `Client · ${m.qui ?? ""}`);

export default function ConversationAtelier({ id, initiaux, pleine }: { id: string; initiaux: Message[]; pleine?: boolean }) {
  const [texte, setTexte] = useState("");
  const [reponse, setReponse] = useState<Message | null>(null);
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
    envoyer: async (t, joint) => {
      try {
        const rep = await fetch(base, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ texte: t, reponseA: joint?.reponseA ?? null }),
        });
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
    if (await envoyer(texte, { documentId: null, fichier: null, reponseA: reponse?.id ?? null })) {
      setTexte("");
      setReponse(null);
    }
  }

  function aller(cible: string) {
    const el = document.getElementById(`eca-msg-${cible}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("eca-bulle--eclair");
    void el.offsetWidth;
    el.classList.add("eca-bulle--eclair");
  }

  return (
    <div className={pleine ? "eca-conversation eca-conversation--pleine" : "eca-conversation"}>
      <div className="eca-fil" aria-live="polite">
        {messages.length === 0 ? (
          <p className="eca-vide">Aucun message. Le client écrit depuis « Parler à l&apos;atelier ».</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} id={`eca-msg-${m.id}`} className={m.auteur === "atelier" ? "eca-bulle eca-bulle--atelier" : "eca-bulle"}>
              <span className="eca-bulle-qui">
                {auteurDe(m)} · {formaterInstantParis(m.created_at)}
                <button type="button" className="eca-bulle-repondre" onClick={() => setReponse(m)} aria-label={`Répondre au message de ${auteurDe(m)}`}>
                  Répondre
                </button>
              </span>
              {m.reponseA ? (
                <button type="button" className="eca-citation" onClick={() => m.reponseA && aller(m.reponseA.id)}>
                  <span className="eca-citation-qui">{auteurDe(m.reponseA)}</span>
                  <span className="eca-citation-texte">{m.reponseA.extrait}</span>
                </button>
              ) : null}
              {m.document ? (
                <span className="eca-bulle-joint">
                  Document cité :{" "}
                  {m.document.voir ?? m.document.url ? (
                    <a href={(m.document.voir ?? m.document.url) as string} target="_blank" rel="noopener noreferrer">
                      {m.document.libelle}
                    </a>
                  ) : (
                    m.document.libelle
                  )}
                </span>
              ) : null}
              {m.contenu ? (
                <span className="eca-bulle-joint">
                  Envoi du client cité :{" "}
                  {m.contenu.voir ?? m.contenu.url ? (
                    <a href={(m.contenu.voir ?? m.contenu.url) as string} target="_blank" rel="noopener noreferrer">
                      {m.contenu.libelle}
                    </a>
                  ) : (
                    m.contenu.libelle
                  )}
                </span>
              ) : null}
              {m.texte}
              {m.piece ? (
                <span className="eca-bulle-joint">
                  Pièce jointe :{" "}
                  {m.piece.voir ?? m.piece.url ? (
                    <a href={(m.piece.voir ?? m.piece.url) as string} target="_blank" rel="noopener noreferrer">
                      {m.piece.nom}
                    </a>
                  ) : (
                    m.piece.nom
                  )}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
      <form onSubmit={soumettre} className="eca-form eca-conversation-ecrire">
        {reponse ? (
          <div className="eca-citation eca-citation--ecrire">
            <span className="eca-citation-qui">Réponse à {auteurDe(reponse)}</span>
            <span className="eca-citation-texte">{extraitDe(reponse.texte)}</span>
            <button type="button" className="eca-citation-retirer" aria-label="Ne plus répondre à ce message" onClick={() => setReponse(null)}>
              ✕
            </button>
          </div>
        ) : null}
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
          <span className="eca-champ-aide">⌘ + Entrée envoie. Aucun mail ne part : le client lit la réponse dans son espace.</span>
        </div>
        {erreur ? (
          <p className="eca-message eca-message--erreur" role="alert">
            {erreur}
          </p>
        ) : null}
      </form>
    </div>
  );
}
