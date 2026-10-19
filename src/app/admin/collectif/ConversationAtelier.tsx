"use client";

/* Une conversation avec un client, côté atelier (PRD §7, T-152). Le même fil
   que celui du client, relu toutes les 3,5 s quand l'onglet est visible ;
   l'ouvrir marque lus les messages du client (par un effet, jamais au rendu).
   Aucun mail ne part : le client voit la réponse dans « Parler à l'atelier ».

   Posée dans la fiche d'une édition ET dans la boîte de réception de
   l'atelier : une seule façon d'écrire, des deux côtés. « Répondre » cite un
   message du fil (migration 20261018 : sans elle, la route dit laquelle
   manque et rien ne part).

   T-188 (planche 8, 19/10) : les jours sont séparés (« Aujourd'hui »,
   « Hier », la date) et un TRAIT « N nouveaux messages » est posé avant le
   premier message du client que l'atelier n'avait pas lu. Ce repère vient du
   rendu SERVEUR (`premierNouveau`, lu avant tout marquage) et reste en état
   local tant qu'on est dans la conversation : le marquage qui suit ne le
   déplace pas. Les nouveaux portent un liseré, les anciens sont atténués.
   Le marquage est BORNÉ au dernier message affiché (`jusqua`), puis les
   compteurs se relisent (la barre, et la page à l'ouverture). */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formaterHeureParis, formaterInstantParis } from "@/lib/collectif/dates";
import { extraitDe, type Message } from "@/lib/collectif/messages";
import { filAtelier, jourRelatif, libelleNouveaux } from "@/lib/collectif/nouveaux";
import { useMessagerie } from "../../edition/_composants/useMessagerie";
import { relireCompte } from "./compteMessages";

const auteurDe = (m: { auteur: "client" | "atelier"; qui: string | null }) => (m.auteur === "atelier" ? `Atelier · ${m.qui ?? ""}` : `Client · ${m.qui ?? ""}`);

/** La signature sous une bulle (planche 8) : « Claire », « Vous (Mathias) ». */
const signatureDe = (m: Message) => (m.auteur === "atelier" ? `Vous${m.qui ? ` (${m.qui})` : ""}` : (m.qui ?? "Le client"));

export default function ConversationAtelier({
  id,
  initiaux,
  pleine,
  premierNouveau = null,
  maintenant,
}: {
  id: string;
  initiaux: Message[];
  pleine?: boolean;
  /** Le premier message du client non lu par l'atelier AU RENDU serveur (`premierNouveau`, lib/collectif/nouveaux). */
  premierNouveau?: string | null;
  /** L'instant du rendu serveur (ISO) : « Aujourd'hui » et « Hier » se disent par rapport à lui. */
  maintenant: string;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [reponse, setReponse] = useState<Message | null>(null);
  /* Le repère et ce qui était à l'écran à l'ouverture : figés pour toute la conversation. */
  const [premier] = useState(premierNouveau);
  const [initiauxIds] = useState(() => new Set(initiaux.map((m) => m.id)));
  const ouverture = useRef(true);
  const fil = useRef<HTMLDivElement>(null);
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
    marquerLus: async (jusqua) => {
      const premiere = ouverture.current;
      ouverture.current = false;
      try {
        const rep = await fetch(base, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jusqua }),
        });
        const json = (await rep.json().catch(() => ({}))) as { marques?: unknown };
        if (!rep.ok || typeof json.marques !== "number" || json.marques === 0) return;
        /* Les compteurs suivent : la barre tout de suite, la page (liste, « À traiter », « Répondre ») à l'ouverture. */
        void relireCompte();
        if (premiere) router.refresh();
      } catch {
        /* rattrapé à la prochaine ouverture */
      }
    },
  });

  const jour = new Date(maintenant);
  const elements = filAtelier(messages, { premier, initiaux: initiauxIds, jourDe: (iso) => jourRelatif(iso, jour) });

  /* À l'ouverture, le fil se place sur le trait, sinon sur le dernier message. Le
     défilement est celui du FIL (jamais de la page) ; un DOM, pas un état. */
  useEffect(() => {
    const zone = fil.current;
    if (!zone || zone.scrollHeight <= zone.clientHeight) return;
    const trait = zone.querySelector<HTMLElement>(".eca-fil-trait");
    zone.scrollTop = trait ? Math.max(0, trait.offsetTop - zone.offsetTop - 12) : zone.scrollHeight;
  }, []);

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
      <div className="eca-fil" aria-live="polite" ref={fil}>
        {messages.length === 0 ? (
          <p className="eca-vide">Aucun message. Le client écrit depuis « Parler à l&apos;atelier ».</p>
        ) : (
          elements.map((el) => {
            if (el.genre === "jour") {
              return (
                <span key={el.cle} className="eca-fil-jour">
                  {el.jour}
                </span>
              );
            }
            if (el.genre === "trait") {
              return (
                <div key={el.cle} className="eca-fil-trait" role="separator">
                  {libelleNouveaux(el.nombre)}
                </div>
              );
            }
            const m = el.message;
            const classes = [
              "eca-bulle",
              m.auteur === "atelier" ? "eca-bulle--atelier" : "",
              el.ton === "ancien" ? "eca-bulle--ancien" : el.ton === "nouveau" ? "eca-bulle--nouveau" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={el.cle} id={`eca-msg-${m.id}`} className={classes}>
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
                <span className="eca-bulle-texte">{m.texte}</span>
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
                <span className="eca-bulle-qui">
                  <span>
                    {signatureDe(m)} ·{" "}
                    <time dateTime={m.created_at} title={formaterInstantParis(m.created_at)}>
                      {formaterHeureParis(m.created_at)}
                    </time>
                    {el.lu ? " · lu" : ""}
                  </span>
                  <button type="button" className="eca-bulle-repondre" onClick={() => setReponse(m)} aria-label={`Répondre au message de ${auteurDe(m)}`}>
                    Répondre
                  </button>
                </span>
              </div>
            );
          })
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
