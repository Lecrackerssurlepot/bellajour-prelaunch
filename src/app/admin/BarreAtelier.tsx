/* La barre de l'atelier (T-152, 14/10) : la MÊME en haut de chaque écran,
   particuliers comme éditions, pour qu'on ait l'impression d'un seul
   logiciel et non de deux sites. À gauche la marque, puis le commutateur
   « Particuliers | Éditions » (Mathias : « un switch, pas des boutons ») ;
   à droite les écrans propres au monde ouvert, puis « Quitter ».

   Sans `COLLECTIF_OUVERT`, le commutateur n'apparaît pas : la table de
   travail reste seule, comme avant. Aucun état, aucun effet : la barre se
   pose dans un composant serveur comme dans un composant client. */

import Link from "next/link";

export type MondeAtelier = "particuliers" | "editions";

export type LienBarre = { href: string; libelle: string; badge?: number | null; courant?: boolean };

export default function BarreAtelier({
  monde,
  collectif,
  nonLus,
  liens,
}: {
  monde: MondeAtelier;
  /** L'interrupteur `COLLECTIF_OUVERT`, lu côté serveur. */
  collectif: boolean;
  /** Les messages des clients que l'atelier n'a pas lus (éditions), sur le commutateur. */
  nonLus?: number | null;
  liens: LienBarre[];
}) {
  return (
    <header className="atb">
      <Link href="/admin/atelier" className="atb-marque">
        L&apos;Atelier
      </Link>
      {collectif ? (
        <nav className="atb-switch" aria-label="Particuliers ou éditions">
          <Link href="/admin/atelier" className="atb-switch-cote" aria-current={monde === "particuliers" ? "page" : undefined}>
            Particuliers
          </Link>
          <Link href="/admin/collectif" className="atb-switch-cote" aria-current={monde === "editions" ? "page" : undefined}>
            Éditions
            {nonLus ? <span className="atb-badge" aria-label={`${nonLus} message${nonLus > 1 ? "s" : ""} non lu${nonLus > 1 ? "s" : ""}`}>{nonLus}</span> : null}
          </Link>
          <span className={`atb-switch-curseur atb-switch-curseur--${monde}`} aria-hidden="true" />
        </nav>
      ) : null}
      <nav className="atb-liens" aria-label={monde === "editions" ? "Les écrans des éditions" : "Les écrans de l'atelier"}>
        {liens.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.courant ? "page" : undefined}>
            {l.libelle}
            {l.badge ? <span className="atb-badge">{l.badge}</span> : null}
          </Link>
        ))}
        <form action="/api/admin/logout" method="post" className="adm-logout-form">
          <button className="adm-btn adm-btn--ghost" type="submit">
            Quitter
          </button>
        </form>
      </nav>
    </header>
  );
}

/** Les écrans du monde « Particuliers » (la table de travail des numéros). */
export function liensParticuliers(demo: boolean): LienBarre[] {
  return [
    { href: "/admin/atelier/carnet", libelle: "Carnet" },
    { href: "/admin/atelier/metriques", libelle: "Métriques" },
    { href: "/admin/atelier/cockpit", libelle: "Cockpit" },
    { href: "/admin/atelier/sante", libelle: "Santé" },
    { href: "/admin/atelier/factures", libelle: "Factures" },
    { href: "/admin", libelle: "Prévente" },
    ...(demo ? [] : [{ href: "/admin/atelier/demo", libelle: "Démo" }]),
  ];
}

/** Les écrans du monde « Éditions » : la messagerie d'abord, avec ses non-lus. */
export function liensEditions(courant: "liste" | "messages" | "styles" | "agendas" | null, nonLus?: number | null): LienBarre[] {
  return [
    { href: "/admin/collectif", libelle: "Éditions", courant: courant === "liste" },
    { href: "/admin/collectif/messages", libelle: "Messagerie", badge: nonLus ?? null, courant: courant === "messages" },
    { href: "/admin/collectif/styles", libelle: "Styles du mur", courant: courant === "styles" },
    { href: "/admin/collectif/agendas", libelle: "Agendas", courant: courant === "agendas" },
  ];
}
