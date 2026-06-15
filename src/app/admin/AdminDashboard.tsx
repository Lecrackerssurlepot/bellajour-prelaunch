"use client";

import { useMemo, useState } from "react";
import type { AdminData, AdminInscrit } from "./page";

/* Dashboard interne — composant client interactif (3 vues). Lecture seule :
   aucun appel d'écriture, juste du tri/filtre/recherche sur des données déjà
   fetchées côté serveur. UI sobre, dense, desktop d'abord. */

type Tab = "overview" | "inscrits" | "ambassadeurs";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  waitlist: "Waitlist",
  pending: "En attente",
  confirmed: "Client",
  refunded: "Remboursé",
};

const OFFER_LABEL: Record<string, string> = {
  founder: "Fondateur",
  standard: "Standard",
  influencer: "Influenceur",
};

function NewBadge() {
  return <span className="adm-badge-new">nouveau</span>;
}

/* ───────────────────────── Vue d'ensemble ───────────────────────── */

function Overview({ data }: { data: AdminData }) {
  const k = data.kpis;
  const n = data.nouveautes;
  const totalNouveautes = n.inscrits + n.clients + n.ambassadeurs;

  return (
    <div className="adm-overview">
      {totalNouveautes > 0 ? (
        <div className="adm-banner">
          <strong>{totalNouveautes} nouveauté{totalNouveautes > 1 ? "s" : ""}</strong> depuis ta
          dernière visite ({fmtDate(data.lastSeen)}) :{" "}
          {n.inscrits} inscrit{n.inscrits > 1 ? "s" : ""}, {n.clients} client
          {n.clients > 1 ? "s" : ""}, {n.ambassadeurs} ambassadeur
          {n.ambassadeurs > 1 ? "s" : ""}.
        </div>
      ) : (
        <div className="adm-banner adm-banner--muted">
          Aucune nouveauté depuis ta dernière visite ({fmtDate(data.lastSeen)}).
        </div>
      )}

      <div className="adm-cards">
        <div className="adm-card">
          <div className="adm-card-value">{k.totalInscrits}</div>
          <div className="adm-card-label">Inscrits</div>
        </div>
        <div className="adm-card">
          <div className="adm-card-value">{k.totalClients}</div>
          <div className="adm-card-label">Clients (acompte confirmé)</div>
        </div>
        <div className="adm-card adm-card--accent">
          <div className="adm-card-value">
            {k.placesRestantes}
            <span className="adm-card-sub"> / {k.founderCap}</span>
          </div>
          <div className="adm-card-label">Places Fondateur restantes</div>
          <div className="adm-card-foot">{k.founderConfirmed} fondateurs confirmés</div>
        </div>
        <div className="adm-card">
          <div className="adm-card-value">{k.totalAmbassadeurs}</div>
          <div className="adm-card-label">Ambassadeurs</div>
        </div>
        <div className="adm-card">
          <div className="adm-card-value">{k.refunded}</div>
          <div className="adm-card-label">Remboursés</div>
        </div>
      </div>

      <div className="adm-breakdown">
        <h3>Répartition des clients par offre</h3>
        <div className="adm-breakdown-row">
          <span className="adm-pill adm-pill--founder">
            Fondateur <b>{k.founderConfirmed}</b>
          </span>
          <span className="adm-pill adm-pill--standard">
            Standard <b>{k.standardConfirmed}</b>
          </span>
          <span className="adm-pill adm-pill--influencer">
            Influenceur <b>{k.influencerConfirmed}</b>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Inscrits ───────────────────────── */

type SortKey = "createdAt" | "email" | "prenom" | "status" | "offerType" | "numeroFondateur";

function Inscrits({ rows }: { rows: AdminInscrit[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "client" | "nonclient">("all");
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (q && !r.email.toLowerCase().includes(q) && !r.prenom.toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter === "client" && r.status !== "confirmed") return false;
      if (statusFilter === "nonclient" && r.status === "confirmed") return false;
      if (offerFilter !== "all" && r.offerType !== offerFilter) return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "prenom":
          cmp = a.prenom.localeCompare(b.prenom);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "offerType":
          cmp = (a.offerType || "").localeCompare(b.offerType || "");
          break;
        case "numeroFondateur":
          cmp = (a.numeroFondateur ?? Infinity) - (b.numeroFondateur ?? Infinity);
          break;
        case "createdAt":
        default:
          cmp =
            (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
            (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [rows, search, statusFilter, offerFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortAsc ? " ▲" : " ▼") : "");

  return (
    <div className="adm-inscrits">
      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          placeholder="Rechercher email ou prénom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="adm-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">Tous statuts</option>
          <option value="client">Clients</option>
          <option value="nonclient">Non-clients</option>
        </select>
        <select
          className="adm-select"
          value={offerFilter}
          onChange={(e) => setOfferFilter(e.target.value)}
        >
          <option value="all">Toutes offres</option>
          <option value="founder">Fondateur</option>
          <option value="standard">Standard</option>
          <option value="influencer">Influenceur</option>
        </select>
        <span className="adm-count">{filtered.length} ligne{filtered.length > 1 ? "s" : ""}</span>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th onClick={() => toggleSort("prenom")}>Prénom{arrow("prenom")}</th>
              <th onClick={() => toggleSort("email")}>Email{arrow("email")}</th>
              <th onClick={() => toggleSort("status")}>Statut{arrow("status")}</th>
              <th onClick={() => toggleSort("offerType")}>Offre{arrow("offerType")}</th>
              <th onClick={() => toggleSort("numeroFondateur")} className="adm-num">
                N° fond.{arrow("numeroFondateur")}
              </th>
              <th onClick={() => toggleSort("createdAt")}>Inscrit le{arrow("createdAt")}</th>
              <th>Parrain (ref)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.isNew ? "adm-row-new" : undefined}>
                <td>
                  {r.prenom || "—"}
                  {r.isAmbassadeur ? <span className="adm-tag-amb">amb.</span> : null}
                  {r.isNew ? <NewBadge /> : null}
                </td>
                <td className="adm-mono">{r.email}</td>
                <td>
                  <span className={`adm-status adm-status--${r.status}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td>{r.offerType ? OFFER_LABEL[r.offerType] || r.offerType : "—"}</td>
                <td className="adm-num">{r.numeroFondateur ?? "—"}</td>
                <td>{fmtDate(r.createdAt)}</td>
                <td className="adm-mono">{r.referredBy || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm-empty">
                  Aucun inscrit ne correspond.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────── Ambassadeurs ───────────────────────── */

function Ambassadeurs({ data }: { data: AdminData }) {
  const rows = data.ambassadeurs;
  return (
    <div className="adm-ambassadeurs">
      <div className="adm-toolbar">
        <span className="adm-count">
          {rows.length} ambassadeur{rows.length > 1 ? "s" : ""} — classés par pages gagnées
        </span>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Prénom</th>
              <th>Email</th>
              <th className="adm-num">Filleuls N1</th>
              <th className="adm-num">Filleuls N2</th>
              <th className="adm-num">Pages gagnées</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={a.email} className={a.isNew ? "adm-row-new" : undefined}>
                <td className="adm-num">{i + 1}</td>
                <td>
                  {a.prenom || "—"}
                  {a.isNew ? <NewBadge /> : null}
                </td>
                <td className="adm-mono">{a.email}</td>
                <td className="adm-num">
                  {a.niveau1Confirmed}
                  {a.niveau1Pending > 0 ? (
                    <span className="adm-pending"> +{a.niveau1Pending} att.</span>
                  ) : null}
                </td>
                <td className="adm-num">
                  {a.niveau2Confirmed}
                  {a.niveau2Pending > 0 ? (
                    <span className="adm-pending"> +{a.niveau2Pending} att.</span>
                  ) : null}
                </td>
                <td className="adm-num">
                  <b>{a.pagesGagnees}</b>
                  {a.pagesPending > 0 ? (
                    <span className="adm-pending"> +{a.pagesPending} att.</span>
                  ) : null}
                </td>
                <td>{fmtDate(a.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="adm-empty">
                  Aucun ambassadeur.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="adm-note">
        N1 = filleuls directs · N2 = filleuls indirects (grand-parrainage). « att. » =
        en attente de paiement. Pages gagnées = pages confirmées (niveau 1+2), comme
        sur l'espace ambassadeur.
      </p>
    </div>
  );
}

/* ───────────────────────── Shell ───────────────────────── */

export default function AdminDashboard({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="adm-root">
      <header className="adm-header">
        <h1>Bellajour — Admin</h1>
        <span className="adm-fetched">données au {fmtDate(data.fetchedAt)}</span>
      </header>

      <nav className="adm-tabs">
        <button
          className={tab === "overview" ? "adm-tab adm-tab--active" : "adm-tab"}
          onClick={() => setTab("overview")}
        >
          Vue d&apos;ensemble
        </button>
        <button
          className={tab === "inscrits" ? "adm-tab adm-tab--active" : "adm-tab"}
          onClick={() => setTab("inscrits")}
        >
          Inscrits ({data.inscrits.length})
        </button>
        <button
          className={tab === "ambassadeurs" ? "adm-tab adm-tab--active" : "adm-tab"}
          onClick={() => setTab("ambassadeurs")}
        >
          Ambassadeurs ({data.ambassadeurs.length})
        </button>
      </nav>

      <main className="adm-main">
        {tab === "overview" ? <Overview data={data} /> : null}
        {tab === "inscrits" ? <Inscrits rows={data.inscrits} /> : null}
        {tab === "ambassadeurs" ? <Ambassadeurs data={data} /> : null}
      </main>
    </div>
  );
}
