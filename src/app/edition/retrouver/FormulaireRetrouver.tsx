"use client";

/* Le formulaire de « Retrouver mon espace » : une adresse, un bouton, une
   réponse qui ne dit JAMAIS si l'adresse est connue (la route non plus). */

import { useState } from "react";

export default function FormulaireRetrouver({ ouvert }: { ouvert: boolean }) {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("envoi");
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/retrouver", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setErreur(json.message ?? "Demande non envoyée. Réessayez.");
        setEtat("saisie");
        return;
      }
      setEtat("fait");
    } catch {
      setErreur("Pas de réseau. Réessayez.");
      setEtat("saisie");
    }
  }

  if (!ouvert) {
    return (
      <div className="ec-retrouver">
        <p>Ce service ouvre bientôt. En attendant, écrivez à l&apos;atelier : il vous renverra votre lien.</p>
        <a className="ec-retrouver-mail" href="mailto:contact@bellajour.com">
          contact@bellajour.com
        </a>
      </div>
    );
  }

  if (etat === "fait") {
    return (
      <div className="ec-retrouver">
        <p>
          {/* L'espace explicite : SWC avale celui qui suit la balise quand le texte porte une entité et va à la ligne (src/app/CLAUDE.md). */}
          Si <strong>{email}</strong>{" "}est connue, le lien arrive.
        </p>
        <p className="ec-retrouver-note">Rien reçu ? Regardez les indésirables.</p>
      </div>
    );
  }

  return (
    <form className="ec-retrouver" onSubmit={envoyer}>
      <p>E-mail du responsable de l&apos;édition.</p>
      <label className="ec-retrouver-label" htmlFor="ec-retrouver-email">
        Adresse e-mail
      </label>
      <input
        id="ec-retrouver-email"
        className="ec-retrouver-champ"
        type="email"
        autoComplete="email"
        inputMode="email"
        enterKeyHint="send"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nom@entreprise.fr"
      />
      <button type="submit" className="ec-retrouver-bouton" disabled={etat === "envoi" || !email.includes("@")}>
        {etat === "envoi" ? "Envoi…" : "Recevoir mon lien"}
      </button>
      {erreur ? (
        <p className="ec-retrouver-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </form>
  );
}
