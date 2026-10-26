"use client";

/* Le code pour modifier (T-154) : le lien du responsable s'ouvre en lecture
   sur un appareil que l'espace ne connaît pas encore. Un clic envoie un code
   à SON adresse (montrée masquée : qui a le lien sans la boîte mail ne la
   découvre pas), il le tape, l'appareil est reconnu et l'espace se recharge
   avec tous ses droits. Affiché dans une fenêtre (`AppareilContexte`). */

import { useState } from "react";

type Etat = "repos" | "envoye" | "envoi" | "verification";

function phrases(v: (vous: string, toi: string) => string): Record<string, string> {
  return {
    coupe: v("Envoi des codes coupé. Écrivez à l'atelier.", "Envoi des codes coupé. Écris à l'atelier."),
    trop: v("Trop de codes. Attendez une heure.", "Trop de codes. Attends une heure."),
    echec: v("Code non envoyé. Réessayez.", "Code non envoyé. Réessaie."),
    migration_absente: v("Codes indisponibles. Réessayez plus tard.", "Codes indisponibles. Réessaie plus tard."),
    expire: v("Code expiré\u00a0: demandez-en un nouveau.", "Code expiré\u00a0: demandes-en un nouveau."),
    bloque: v("Trop d'essais\u00a0: demandez un nouveau code.", "Trop d'essais\u00a0: demande un nouveau code."),
    inactif: v("Rechargez la page.", "Recharge la page."),
  };
}

export default function CodeAppareil({ token, adresse, tu }: { token: string; adresse: string; tu: boolean }) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [etat, setEtat] = useState<Etat>("repos");
  const [saisie, setSaisie] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const PHRASES = phrases(v);

  async function appeler(corps: Record<string, unknown>): Promise<{ etat?: string; restants?: number } | null> {
    try {
      const rep = await fetch("/api/collectif/appareil", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, ...corps }),
      });
      return (await rep.json().catch(() => ({}))) as { etat?: string; restants?: number };
    } catch {
      return null;
    }
  }

  async function demander() {
    setEtat("envoi");
    setMessage(null);
    const r = await appeler({ action: "demander" });
    if (r?.etat === "envoye") {
      setEtat("envoye");
      setSaisie("");
      return;
    }
    setEtat("repos");
    setMessage(PHRASES[r?.etat ?? "echec"] ?? PHRASES.echec);
  }

  async function verifier(e: React.FormEvent) {
    e.preventDefault();
    setEtat("verification");
    setMessage(null);
    const r = await appeler({ action: "verifier", code: saisie });
    if (r?.etat === "ok" || r?.etat === "inactif") {
      window.location.reload();
      return;
    }
    if (r?.etat === "faux") {
      setEtat("envoye");
      setMessage(`Ce n'est pas le bon code. ${r.restants ?? 0} essai${(r.restants ?? 0) > 1 ? "s" : ""} encore.`);
      return;
    }
    setEtat(r?.etat === "expire" || r?.etat === "bloque" ? "repos" : "envoye");
    setMessage(PHRASES[r?.etat ?? "echec"] ?? PHRASES.echec);
  }

  return (
    <div className="ec-code">
      <p>
        {v(
          "Pour modifier, un code part à ",
          "Pour modifier, un code part à "
        )}
        <strong>{adresse}</strong>.
      </p>
      {etat === "repos" || etat === "envoi" ? (
        <button type="button" className="ec-bouton" disabled={etat === "envoi"} onClick={demander}>
          {etat === "envoi" ? "Envoi…" : v("Recevoir mon code", "Recevoir mon code")}
        </button>
      ) : (
        <form className="ec-code-form" onSubmit={verifier}>
          <label className="ec-code-label" htmlFor="ec-code-saisie">
            {v("Le code reçu par mail", "Le code reçu par mail")}
          </label>
          <input
            id="ec-code-saisie"
            className="ec-code-champ"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123 456"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            autoFocus
          />
          <button type="submit" className="ec-bouton" disabled={etat === "verification" || saisie.replace(/\D/g, "").length !== 6}>
            {etat === "verification" ? "Vérification…" : "Valider le code"}
          </button>
          <button type="button" className="ec-code-renvoyer" onClick={demander}>
            {v("Renvoyer un code", "Renvoyer un code")}
          </button>
        </form>
      )}
      {message ? (
        <p className="ec-code-message" role="status">
          {message}
        </p>
      ) : null}
      <p className="ec-code-note">
        {"Reconnu ensuite pendant un an."}
      </p>
    </div>
  );
}
