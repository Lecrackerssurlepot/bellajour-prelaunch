"use client";

/* La messagerie, côté atelier, dans la fiche d'une édition (PRD §7). Le fil
   et la zone d'écriture vivent dans `ConversationAtelier`, partagée avec la
   boîte de réception de l'atelier (T-152). */

import type { Message } from "@/lib/collectif/messages";
import ConversationAtelier from "../ConversationAtelier";

export default function PanneauMessages({ id, initiaux }: { id: string; initiaux: Message[] }) {
  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Messages</h2>
      <ConversationAtelier id={id} initiaux={initiaux} />
    </section>
  );
}
