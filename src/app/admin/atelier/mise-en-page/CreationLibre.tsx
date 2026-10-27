"use client";

import { useRouter } from "next/navigation";

/* « Création libre » : un magazine vierge, sans dossier client (brief §2).
   L'identifiant naît au clic, dans le navigateur ; rien n'est écrit. */

export default function CreationLibre() {
  const router = useRouter();
  return (
    <button
      className="adm-btn"
      type="button"
      onClick={() => router.push(`/admin/atelier/mise-en-page/libre-${crypto.randomUUID()}`)}
    >
      Création libre
    </button>
  );
}
