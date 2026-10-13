"use client";

/* La messagerie du client, dans « Votre dossier » (PRD §7, maquette Dossier).
   « L'atelier vous répond ici. » : pas de mail en phase 2 (PRD §0.5).
   Le lien d'équipe lit le fil, sans champ pour écrire. */

import { useState } from "react";
import { formaterInstantParis } from "@/lib/collectif/dates";
import type { Message } from "@/lib/collectif/messages";
import { useMessagerie } from "../../_composants/useMessagerie";

type Props = { token: string; initiaux: Message[]; peutEcrire: boolean; tu: boolean };

async function appeler(url: string, corps: Record<string, unknown>) {
  const rep = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corps) });
  const json = (await rep.json().catch(() => ({}))) as { messages?: Message[]; message?: Message | string };
  return { rep, json };
}

export default function Messagerie({ token, initiaux, peutEcrire, tu }: Props) {
  const [texte, setTexte] = useState("");
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const { messages, envoyer, envoi, erreur } = useMessagerie({
    initiaux,
    lecteur: "client",
    charger: async (depuis) => {
      try {
        const { rep, json } = await appeler("/api/collectif/messages", { token, depuis });
        return rep.ok ? json.messages ?? [] : null;
      } catch {
        return null;
      }
    },
    envoyer: async (t) => {
      try {
        const { rep, json } = await appeler("/api/collectif/messages/envoyer", { token, texte: t });
        if (rep.ok && json.message && typeof json.message === "object") return json.message;
        return typeof json.message === "string" ? json.message : `Message non envoyé (erreur ${rep.status}).`;
      } catch {
        return "Le réseau n'a pas répondu. Message non envoyé.";
      }
    },
    marquerLus: peutEcrire
      ? async () => {
          try {
            await appeler("/api/collectif/messages/lus", { token });
          } catch {
            /* un accusé de lecture manqué se rattrape à la visite suivante */
          }
        }
      : undefined,
  });

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim() || envoi) return;
    if (await envoyer(texte)) setTexte("");
  }

  return (
    <section className="ec-carte" aria-labelledby="ec-messages">
      <div className="ec-carte-tete">
        <span>Messagerie</span>
      </div>
      <h2 className="ec-h2" id="ec-messages">
        {v("Écrire à l'atelier", "Écrire à l'atelier")}
      </h2>
      <p className="ec-note">{v("L'atelier vous répond ici.", "L'atelier te répond ici.")}</p>
      <div className="ec-fil" aria-live="polite">
        {messages.length === 0 ? (
          <p className="ec-note">Aucun message pour l&apos;instant.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.auteur === "client" ? "ec-bulle ec-bulle--moi" : "ec-bulle"}>
              <span className="ec-bulle-qui">
                {m.auteur === "atelier" ? `L'atelier${m.qui ? ` · ${m.qui}` : ""}` : m.qui ?? "Vous"} ·{" "}
                {formaterInstantParis(m.created_at)}
              </span>
              {m.texte}
            </div>
          ))
        )}
      </div>
      {peutEcrire ? (
        <form onSubmit={soumettre} className="ec-curseur">
          <textarea
            className="ec-zone"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder={v("Votre message", "Ton message")}
            aria-label={v("Votre message", "Ton message")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void soumettre(e);
            }}
          />
          <button type="submit" className="ec-bouton" disabled={envoi || !texte.trim()}>
            {envoi ? "Envoi…" : "Envoyer"}
          </button>
          {erreur ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
