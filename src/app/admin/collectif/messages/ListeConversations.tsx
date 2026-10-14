"use client";

/* La colonne de gauche de la boîte de réception (T-152) : chercher un
   client, n'afficher que les non-lus, ce qui est à traiter aujourd'hui, et
   les conversations. Un clic ouvre la conversation (l'adresse change : un
   rechargement la rouvre). L'aperçu ne marque rien comme lu. */

import Link from "next/link";
import { useState } from "react";
import type { Conversation } from "@/lib/collectif/boite";

export default function ListeConversations({
  conversations,
  aTraiter,
  courant,
}: {
  conversations: Conversation[];
  aTraiter: { editionId: string; texte: string }[];
  courant: string | null;
}) {
  const [recherche, setRecherche] = useState("");
  const [nonLus, setNonLus] = useState(false);
  const q = recherche.trim().toLocaleLowerCase("fr");
  const aLire = conversations.filter((c) => c.nonLus && c.id !== courant).length;
  const visibles = conversations.filter(
    (c) => (!nonLus || (c.nonLus && c.id !== courant) || c.id === courant) && (!q || `${c.organisation} ${c.evenement}`.toLocaleLowerCase("fr").includes(q))
  );

  return (
    <section className="eca-boite-liste" aria-label="Les conversations">
      <div className="eca-boite-tete">
        <h1 className="eca-boite-titre">Messagerie</h1>
        <input
          className="eca-input eca-boite-chercher"
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un client, un événement…"
          aria-label="Chercher une conversation"
        />
        <div className="ate-seg" role="group" aria-label="Filtrer">
          <button type="button" className={nonLus ? "ate-seg-btn" : "ate-seg-btn ate-seg-btn--actif"} aria-pressed={!nonLus} onClick={() => setNonLus(false)}>
            Tout
          </button>
          <button type="button" className={nonLus ? "ate-seg-btn ate-seg-btn--actif" : "ate-seg-btn"} aria-pressed={nonLus} onClick={() => setNonLus(true)}>
            Non lus{aLire ? <span className="ate-seg-compte">{aLire}</span> : null}
          </button>
        </div>
      </div>

      {aTraiter.length ? (
        <div className="eca-boite-traiter">
          <span className="eca-boite-etiquette">À traiter aujourd&apos;hui</span>
          {aTraiter.map((t, i) => (
            <Link key={i} href={`/admin/collectif/messages?e=${t.editionId}`} className="eca-boite-notif">
              <span className="eca-boite-point" aria-hidden="true" />
              {t.texte}
            </Link>
          ))}
        </div>
      ) : null}

      <ul className="eca-boite-convs">
        {visibles.length === 0 ? (
          <li className="eca-vide">{q ? `Rien ne correspond à « ${recherche.trim()} ».` : nonLus ? "Tout est lu." : "Aucune édition ouverte."}</li>
        ) : (
          visibles.map((c) => {
            const actif = c.id === courant;
            const badge = c.nonLus && !actif ? c.nonLus : 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/admin/collectif/messages?e=${c.id}`}
                  className={`eca-boite-conv${actif ? " eca-boite-conv--actif" : ""}${badge ? " eca-boite-conv--alire" : ""}`}
                  aria-current={actif ? "page" : undefined}
                >
                  <span className="eca-boite-ini" aria-hidden="true">
                    {c.initiales}
                  </span>
                  <span className="eca-boite-conv-texte">
                    <span className="eca-boite-conv-ligne">
                      <strong>{c.organisation}</strong>
                      {c.quand ? <span className="eca-sous">{c.quand}</span> : null}
                    </span>
                    <span className="eca-sous">{c.evenement}</span>
                    <span className="eca-boite-conv-ligne">
                      <span className="eca-boite-apercu">{c.apercu ?? "Aucun message encore."}</span>
                      {badge ? <span className="eca-pastille">{badge}</span> : null}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
