"use client";

import { useState } from "react";
import "../admin.css";

/* Page de login admin — un seul champ mot de passe, charte --bj-*.
   POST JSON vers /api/admin/login ; le cookie est posé par la réponse serveur.
   Succès → navigation pleine vers /admin (le middleware revalide avec le cookie). */

export default function AdminLogin() {
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
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.assign("/admin");
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
        <h1 className="adm-login-title">Bellajour — Admin</h1>
        <p className="adm-login-sub">Accès réservé. Entre le mot de passe partagé.</p>
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
        {error ? <p className="adm-login-error">Mot de passe incorrect.</p> : null}
        <button
          className="adm-btn adm-login-btn"
          type="submit"
          disabled={loading || password.length === 0}
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
