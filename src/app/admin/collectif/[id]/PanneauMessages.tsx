"use client";

/* La messagerie, côté atelier, dans la fiche d'une édition (PRD §7). Le fil
   et la zone d'écriture vivent dans `ConversationAtelier`, partagée avec la
   boîte de réception de l'atelier (T-152). T-188 : le même trait « N nouveaux
   messages », les mêmes jours, et « Marquer comme non lu » dans l'en-tête. */

import type { Message } from "@/lib/collectif/messages";
import ConversationAtelier from "../ConversationAtelier";
import MarquerNonLu from "../MarquerNonLu";

export default function PanneauMessages({
  id,
  initiaux,
  premierNouveau = null,
  maintenant,
}: {
  id: string;
  initiaux: Message[];
  premierNouveau?: string | null;
  maintenant: string;
}) {
  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Messages</h2>
        <MarquerNonLu id={id} possible={initiaux.some((m) => m.auteur === "client")} />
      </span>
      <ConversationAtelier id={id} initiaux={initiaux} premierNouveau={premierNouveau} maintenant={maintenant} />
    </section>
  );
}
