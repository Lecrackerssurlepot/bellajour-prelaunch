"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminData, AdminInscrit, AdminAmbassadeur } from "./page";

/* Dashboard interne — composant client interactif (3 vues). Lecture seule :
   aucun appel d'écriture, juste du tri/filtre/recherche/export sur des données
   déjà fetchées côté serveur. Le refresh relance le server component (router.refresh).
   UI sobre, dense, charte --bj-*. */

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

/* "YYYY-MM-DD" (date-only, sans tz) → "JJ/MM/AAAA" sans décalage de fuseau. */
function fmtDay(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
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

/* ───────────────────────── CSV (client-side) ───────────────────────── */

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v == null ? "" : String(v);
    // Échappe si virgule, guillemet, point-virgule ou retour de ligne.
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))];
  // BOM UTF-8 → accents corrects à l'ouverture dans Excel.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function NewBadge() {
  return <span className="adm-badge-new">nouveau</span>;
}

/* Segmented control charté (pills) — purement présentationnel, pilote un état string. */
function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="adm-filter">
      <span className="adm-filter-label">{label}</span>
      <div className="adm-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? "adm-seg-btn adm-seg-btn--active" : "adm-seg-btn"}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Graphique inscrits/jour (SVG maison) ───────────────────────── */

function InscritsChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="adm-note">Aucune donnée sur la période.</p>;
  }
  const H = 190;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 30;
  const STEP = 38;
  const BAR_W = 22;
  const R = 6; // rayon des coins hauts (~--bj-r-sm visuel)
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = Math.max(data.length * STEP, 120);
  const total = data.reduce((s, d) => s + d.count, 0);
  const baseY = PAD_TOP + innerH;

  // Barre à coins HAUTS arrondis (bas droit), r borné à la largeur/hauteur dispo.
  const barPath = (x: number, w: number, top: number) => {
    const r = Math.max(0, Math.min(R, w / 2, baseY - top));
    return `M${x},${baseY} L${x},${top + r} Q${x},${top} ${x + r},${top} L${
      x + w - r
    },${top} Q${x + w},${top} ${x + w},${top + r} L${x + w},${baseY} Z`;
  };

  // 3 lignes de repère horizontales (en plus de la ligne de base).
  const grid = [1, 2, 3].map((i) => PAD_TOP + (innerH * i) / 3);

  return (
    <div className="adm-chart">
      <div className="adm-chart-head">
        <h3>Inscrits par jour</h3>
        <span className="adm-chart-sub">
          {total} inscrit{total > 1 ? "s" : ""} du {fmtDay(data[0].date)} au{" "}
          {fmtDay(data[data.length - 1].date)}
        </span>
      </div>
      <div className="adm-chart-scroll">
        <svg
          className="adm-chart-svg"
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          role="img"
          aria-label="Inscrits par jour"
        >
          <defs>
            <linearGradient id="admBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="adm-chart-grad-top" />
              <stop offset="1" className="adm-chart-grad-bottom" />
            </linearGradient>
          </defs>
          {/* Grille horizontale discrète */}
          {grid.map((gy, i) => (
            <line key={i} x1="0" y1={gy} x2={width} y2={gy} className="adm-chart-grid" />
          ))}
          {/* Ligne de base */}
          <line x1="0" y1={baseY} x2={width} y2={baseY} className="adm-chart-axis" />
          {data.map((d, i) => {
            const h = (d.count / max) * innerH;
            const x = i * STEP + (STEP - BAR_W) / 2;
            const top = baseY - h;
            const [, mm, dd] = d.date.split("-");
            return (
              <g key={d.date}>
                <title>
                  {fmtDay(d.date)} — {d.count} inscrit{d.count > 1 ? "s" : ""}
                </title>
                {d.count > 0 ? (
                  <>
                    <text x={x + BAR_W / 2} y={top - 7} className="adm-chart-val">
                      {d.count}
                    </text>
                    <path
                      d={barPath(x, BAR_W, top)}
                      className="adm-chart-bar"
                      style={{ animationDelay: `${i * 28}ms` }}
                    />
                  </>
                ) : null}
                <text
                  x={x + BAR_W / 2}
                  y={H - 10}
                  className={`adm-chart-label${i % 2 === 1 ? " adm-chart-label--odd" : ""}`}
                >
                  {dd}/{mm}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ───────────────────────── Vue d'ensemble ───────────────────────── */

function Overview({ data }: { data: AdminData }) {
  const k = data.kpis;
  const n = data.nouveautes;
  const totalNouveautes = n.inscrits + n.clients + n.ambassadeurs;
  const founderPct = k.founderCap > 0 ? Math.min(100, (k.founderConfirmed / k.founderCap) * 100) : 0;

  return (
    <div className="adm-overview">
      {totalNouveautes > 0 ? (
        <div className="adm-banner">
          <strong>
            {totalNouveautes} nouveauté{totalNouveautes > 1 ? "s" : ""}
          </strong>{" "}
          depuis ta dernière visite ({fmtDate(data.lastSeen)}) : {n.inscrits} inscrit
          {n.inscrits > 1 ? "s" : ""}, {n.clients} client{n.clients > 1 ? "s" : ""},{" "}
          {n.ambassadeurs} ambassadeur{n.ambassadeurs > 1 ? "s" : ""}.
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
        <div className="adm-card">
          <div className="adm-card-value">
            {k.conversionRate.toFixed(1).replace(".", ",")}
            <span className="adm-card-sub"> %</span>
          </div>
          <div className="adm-card-label">Taux de conversion</div>
          <div className="adm-card-foot">clients ÷ inscrits</div>
        </div>
        <div className="adm-card adm-card--accent">
          <div className="adm-card-value">
            {k.placesRestantes}
            <span className="adm-card-sub"> / {k.founderCap}</span>
          </div>
          <div className="adm-card-label">Places Fondateur restantes</div>
          <div className="adm-progress" aria-hidden="true">
            <div className="adm-progress-fill" style={{ width: `${founderPct}%` }} />
          </div>
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

      <InscritsChart data={data.inscritsParJour} />
    </div>
  );
}

/* ───────────────────────── Inscrits ───────────────────────── */

type SortKey = "createdAt" | "email" | "prenom" | "status" | "offerType" | "numeroFondateur";

function Inscrits({ rows }: { rows: AdminInscrit[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "client" | "nonclient">("all");
  const [offerFilter, setOfferFilter] = useState<string>("all");
  const [ambFilter, setAmbFilter] = useState<"all" | "amb" | "nonamb">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (q) {
        // Recherche : email, prénom, statut ambassadeur, parrain.
        const hay = `${r.email} ${r.prenom} ${r.isAmbassadeur ? "ambassadeur amb" : ""} ${
          r.parrainLabel ?? ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === "client" && r.status !== "confirmed") return false;
      if (statusFilter === "nonclient" && r.status === "confirmed") return false;
      if (offerFilter !== "all" && r.offerType !== offerFilter) return false;
      if (ambFilter === "amb" && !r.isAmbassadeur) return false;
      if (ambFilter === "nonamb" && r.isAmbassadeur) return false;
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
  }, [rows, search, statusFilter, offerFilter, ambFilter, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };
  const arrow = (key: SortKey) => (sortKey === key ? (sortAsc ? " ▲" : " ▼") : "");

  const exportCsv = () => {
    downloadCsv(
      "inscrits.csv",
      [
        "Prénom",
        "Email",
        "Statut",
        "Offre",
        "N° fondateur",
        "Ambassadeur",
        "Parrainé par",
        "Inscrit le",
        "Ref code",
      ],
      filtered.map((r) => [
        r.prenom,
        r.email,
        STATUS_LABEL[r.status] || r.status,
        r.offerType ? OFFER_LABEL[r.offerType] || r.offerType : "",
        r.numeroFondateur ?? "",
        r.isAmbassadeur ? "oui" : "non",
        r.parrainLabel ?? "",
        fmtDate(r.createdAt),
        r.refCode ?? "",
      ]),
    );
  };

  return (
    <div className="adm-inscrits">
      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          placeholder="Rechercher email, prénom, parrain, « ambassadeur »…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Segmented
          label="Statut"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
          options={[
            { value: "all", label: "Tous" },
            { value: "client", label: "Clients" },
            { value: "nonclient", label: "Non-clients" },
          ]}
        />
        <div className="adm-filter">
          <span className="adm-filter-label">Offre</span>
          <div className="adm-select-wrap">
            <select
              className="adm-select"
              value={offerFilter}
              onChange={(e) => setOfferFilter(e.target.value)}
            >
              <option value="all">Toutes</option>
              <option value="founder">Fondateur</option>
              <option value="standard">Standard</option>
              <option value="influencer">Influenceur</option>
            </select>
          </div>
        </div>
        <Segmented
          label="Ambassadeur"
          value={ambFilter}
          onChange={(v) => setAmbFilter(v as typeof ambFilter)}
          options={[
            { value: "all", label: "Tous" },
            { value: "amb", label: "Ambassadeurs" },
            { value: "nonamb", label: "Non-amb." },
          ]}
        />
        <button className="adm-btn" onClick={exportCsv} disabled={filtered.length === 0}>
          Exporter CSV
        </button>
        <span className="adm-count">
          {filtered.length} affiché{filtered.length > 1 ? "s" : ""} sur {rows.length}
        </span>
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
              <th>Ambassadeur</th>
              <th>Parrainé par</th>
              <th onClick={() => toggleSort("createdAt")}>Inscrit le{arrow("createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.isNew ? "adm-row-new" : undefined}>
                <td>
                  {r.prenom || "—"}
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
                <td>
                  {r.isAmbassadeur ? <span className="adm-tag-amb">oui</span> : <span className="adm-faint">non</span>}
                </td>
                <td>{r.parrainLabel || "—"}</td>
                <td>{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="adm-empty">
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

function Ambassadeurs({ rows }: { rows: AdminAmbassadeur[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) =>
      `${a.prenom} ${a.email} ${a.refCode ?? ""}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const exportCsv = () => {
    downloadCsv(
      "ambassadeurs.csv",
      [
        "Rang",
        "Prénom",
        "Email",
        "Ref code",
        "Filleuls N1 confirmés",
        "N1 en attente",
        "Filleuls N2 confirmés",
        "N2 en attente",
        "Pages gagnées",
        "Pages en attente",
        "Inscrit le",
      ],
      filtered.map((a, i) => [
        i + 1,
        a.prenom,
        a.email,
        a.refCode ?? "",
        a.niveau1Confirmed,
        a.niveau1Pending,
        a.niveau2Confirmed,
        a.niveau2Pending,
        a.pagesGagnees,
        a.pagesPending,
        fmtDate(a.createdAt),
      ]),
    );
  };

  return (
    <div className="adm-ambassadeurs">
      <div className="adm-toolbar">
        <input
          className="adm-input"
          type="search"
          placeholder="Rechercher prénom, email, ref code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="adm-btn" onClick={exportCsv} disabled={filtered.length === 0}>
          Exporter CSV
        </button>
        <span className="adm-count">
          {filtered.length} affiché{filtered.length > 1 ? "s" : ""} sur {rows.length} — classés par
          pages gagnées
        </span>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Prénom</th>
              <th>Email</th>
              <th>Ref</th>
              <th className="adm-num">Filleuls N1</th>
              <th className="adm-num">Filleuls N2</th>
              <th className="adm-num">Pages gagnées</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={a.email} className={a.isNew ? "adm-row-new" : undefined}>
                <td className="adm-num">{i + 1}</td>
                <td>
                  {a.prenom || "—"}
                  {a.isNew ? <NewBadge /> : null}
                </td>
                <td className="adm-mono">{a.email}</td>
                <td className="adm-mono">{a.refCode || "—"}</td>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="adm-empty">
                  Aucun ambassadeur ne correspond.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="adm-note">
        N1 = filleuls directs · N2 = filleuls indirects (grand-parrainage). « att. » = en attente
        de paiement. Pages gagnées = pages confirmées (niveau 1+2), comme sur l&apos;espace
        ambassadeur.
      </p>
    </div>
  );
}

/* ───────────────────────── Shell ───────────────────────── */

export default function AdminDashboard({ data }: { data: AdminData }) {
  const [tab, setTab] = useState<Tab>("overview");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  return (
    <div className="adm-root">
      <header className="adm-header">
        <h1>Bellajour — Admin</h1>
        <span className="adm-fetched">données au {fmtDate(data.fetchedAt)}</span>
        <button
          className="adm-btn adm-btn--refresh"
          onClick={refresh}
          disabled={isPending}
          aria-busy={isPending}
        >
          <span className={isPending ? "adm-spin" : undefined} aria-hidden="true">
            ↻
          </span>{" "}
          {isPending ? "Actualisation…" : "Rafraîchir"}
        </button>
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
        {tab === "ambassadeurs" ? <Ambassadeurs rows={data.ambassadeurs} /> : null}
      </main>
    </div>
  );
}
