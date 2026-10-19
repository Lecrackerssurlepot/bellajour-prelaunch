/* La barre de l'atelier (T-152, 14/10) : la MÊME en haut de chaque écran,
   particuliers comme éditions, pour qu'on ait l'impression d'un seul
   logiciel et non de deux sites. À gauche la marque, puis le commutateur
   « Particuliers | Éditions » (Mathias : « un switch, pas des boutons ») ;
   à droite les écrans propres au monde ouvert, puis « Quitter ».

   Sans `COLLECTIF_OUVERT`, le commutateur n'apparaît pas : la table de
   travail reste seule, comme avant. La barre elle-même n'a ni état ni effet :
   elle se pose dans un composant serveur comme dans un composant client.

   T-188 (planche 8, 19/10) : « Messages » porte le nombre de CONVERSATIONS qui
   attendent une réponse. Côté éditions, ce nombre est VIVANT (VeilleMessages :
   une lecture légère par minute, onglet visible, et le titre de l'onglet
   « (3) Atelier · … ») ; côté particuliers, la pastille du commutateur garde le
   compte de la page, que Rafraichissement relit déjà chaque minute. */

import Link from "next/link";
import { PastilleMessages, VeilleMessages } from "./collectif/VeilleMessages";

export type MondeAtelier = "particuliers" | "editions";

/** `compteMessages` : la pastille de ce lien est le nombre VIVANT des conversations qui attendent (« Messages »). */
export type LienBarre = { href: string; libelle: string; badge?: number | null; courant?: boolean; compteMessages?: boolean };

export default function BarreAtelier({
  monde,
  collectif,
  nonLus,
  nonLusLe,
  rafraichir,
  liens,
}: {
  monde: MondeAtelier;
  /** L'interrupteur `COLLECTIF_OUVERT`, lu côté serveur. */
  collectif: boolean;
  /** Les conversations des éditions qui attendent une réponse (`compterConversationsEnAttente`), lues avec la page. */
  nonLus?: number | null;
  /** L'instant serveur de cette lecture (ISO) : la valeur la plus récente gagne, celle de la page ou celle de la relève. */
  nonLusLe?: string | null;
  /** Un écran dont la liste suit le compte (boîte de réception, liste des éditions) : `router.refresh()` quand il change. */
  rafraichir?: boolean;
  liens: LienBarre[];
}) {
  const editions = monde === "editions";
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
            <PastilleMessages initial={nonLus} le={nonLusLe} suivre={editions} />
          </Link>
          <span className={`atb-switch-curseur atb-switch-curseur--${monde}`} aria-hidden="true" />
        </nav>
      ) : null}
      <nav className="atb-liens" aria-label={monde === "editions" ? "Les écrans des éditions" : "Les écrans de l'atelier"}>
        {liens.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.courant ? "page" : undefined}>
            {l.libelle}
            {l.compteMessages ? (
              <PastilleMessages initial={nonLus ?? l.badge} le={nonLus != null ? nonLusLe : null} />
            ) : l.badge ? (
              <span className="atb-badge">{l.badge}</span>
            ) : null}
          </Link>
        ))}
        <form action="/api/admin/logout" method="post" className="adm-logout-form">
          <button className="adm-btn adm-btn--ghost" type="submit">
            Quitter
          </button>
        </form>
      </nav>
      {collectif && editions ? <VeilleMessages initial={nonLus} le={nonLusLe} rafraichir={rafraichir} /> : null}
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

/** Les écrans du monde « Éditions » : « Messages » porte les conversations qui attendent (T-188, nom de la planche 8). */
export function liensEditions(courant: "liste" | "messages" | "styles" | "agendas" | null, nonLus?: number | null): LienBarre[] {
  return [
    { href: "/admin/collectif", libelle: "Éditions", courant: courant === "liste" },
    { href: "/admin/collectif/messages", libelle: "Messages", badge: nonLus ?? null, courant: courant === "messages", compteMessages: true },
    { href: "/admin/collectif/styles", libelle: "Styles du mur", courant: courant === "styles" },
    { href: "/admin/collectif/agendas", libelle: "Agendas", courant: courant === "agendas" },
  ];
}
