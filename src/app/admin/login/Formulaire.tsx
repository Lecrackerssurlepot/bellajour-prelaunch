"use client";

import { useState } from "react";
import "../admin.css";

/* Login du back-office — on choisit QUI on est, puis son mot de passe.
   Le prénom n'est pas décoratif : il est signé dans le cookie et recopié dans
   `evenements` à chaque transition. Un journal qui dit « admin » ne dit rien.
   POST JSON vers /api/admin/login ; le cookie est posé par la réponse serveur. */

export default function Formulaire({ comptes }: { comptes: Array<{ cle: string; prenom: string }> }) {
  const [qui, setQui] = useState(comptes[0]?.cle ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qui, password }),
      });
      if (res.ok) {
        window.location.assign("/admin/atelier");
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <div className="adm-root adm-login-root">
      <form className="adm-login-card" onSubmit={onSubmit}>
        <h1 className="adm-login-title">Bellajour — l&apos;Atelier</h1>
        <p className="adm-login-sub">Qui est là ?</p>

        {/* Un seul compte configuré : pas de choix à faire, pas de bouton à
            afficher. C'est le cas d'un déploiement qui n'a encore que
            l'ancien ADMIN_PASSWORD partagé. */}
        {comptes.length > 1 ? (
        <div className="adm-seg adm-login-seg">
          {comptes.map((c) => (
            <button
              key={c.cle}
              type="button"
              className={qui === c.cle ? "adm-seg-btn adm-seg-btn--active" : "adm-seg-btn"}
              onClick={() => {
                setQui(c.cle);
                if (error) setError(false);
              }}
            >
              {c.prenom}
            </button>
          ))}
        </div>
        ) : null}

        <input
          className="adm-input adm-login-input"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(false);
          }}
        />
        {/* Le message ne distingue pas compte inconnu de mauvais mot de passe :
            la réponse serveur ne le fait pas non plus, volontairement. */}
        {error ? <p className="adm-login-error">Identifiants incorrects.</p> : null}
        <button
          className="adm-btn adm-login-btn"
          type="submit"
          disabled={loading || password.length === 0 || !qui}
        >
          {loading ? "Connexion…" : "Entrer"}
        </button>
      </form>
    </div>
  );
}
