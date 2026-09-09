import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  /* Test sur appareil reel (iPhone) via l'IP LAN du Mac.
     Sans cette liste, `next dev` repond 403 a toute requete /_next/* portant
     un en-tete Origin autre que localhost : le HTML arrive, le bundle JS est
     bloque, React n'hydrate jamais. Symptome trompeur — la page s'affiche
     mais aucun bouton ne repond, et les IntersectionObserver ne s'arment pas.
     Cle DEV UNIQUEMENT : elle n'existe pas dans le build de production et
     ne change donc rien pour /preventes en ligne.
     Le motif couvre les IP privees courantes, l'IP du Mac changeant en DHCP. */
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.*', '192.168.0.*', '10.0.0.*'],
  /* ── LE CACHE DES IMAGES (09/09/2026, audit de vitesse) ──────────────
     Vercel sert `public/` en `max-age=14400, must-revalidate` : passé quatre
     heures, CHAQUE image de la page repart en requête conditionnelle avant
     d'être réaffichée. Sur l'accueil c'est une dizaine d'allers-retours pour
     s'entendre répondre « rien n'a changé », et ils sont sur le chemin de
     l'affichage.

     Un jour de fraîcheur, puis trente jours de `stale-while-revalidate` : au
     retour, l'image s'affiche IMMÉDIATEMENT depuis le cache et le navigateur
     va vérifier en arrière-plan, sans rien retenir à l'écran.

     ⚠️ LE PRIX, ET IL EST RÉEL. Ces fichiers n'ont pas de nom versionné : si
     tu remplaces `brand-01.webp` par un autre visuel, quelqu'un qui l'a déjà
     vu peut continuer à voir l'ancien jusqu'à un jour (puis une fois de plus,
     le temps de la revalidation de fond). Pour qu'un remplacement soit visible
     TOUT DE SUITE, changer le NOM du fichier — `brand-01b.webp` — et le lien
     qui le désigne. C'est la contrepartie acceptée le 09/09.
     Les fichiers de `_next/static` ne sont pas concernés : ils portent déjà
     une empreinte dans leur nom, et Vercel les sert en `immutable`. */
  async headers() {
    return [
      {
        source: "/images/:chemin*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      /* BASCULE DU 24/08/2026 — la racine EST l'Atelier.
         Le 307 `/` → `/preventes` (bascule du 13 juin) est retiré : la page
         de vente de la prévente reste joignable par son URL, mais elle n'est
         plus la porte d'entrée du site.

         Les deux redirections ci-dessous sont PERMANENTES (308) et ne sont
         pas de la coquetterie : `/atelier` circule déjà dans les mails de
         l'atelier, sur Instagram et dans les liens de preview partagés. Sans
         elles, chaque lien déjà donné devient un 404 et Google repart de zéro
         sur la nouvelle racine au lieu d'hériter de l'ancienne.

         ⚠️ Une 308 est mise en cache par les navigateurs, parfois pour
         longtemps. Ne pas les inverser à la légère : si /atelier devait un
         jour redevenir une page à part entière, les visiteurs déjà passés
         continueraient d'être renvoyés sur `/`. */
      {
        source: "/atelier",
        destination: "/",
        permanent: true,
      },
      {
        source: "/atelier/composer",
        destination: "/composer",
        permanent: true,
      },

      /* RETRAIT DE LA PRÉVENTE — 28/08/2026, décision de Mathias.
         `/preventes`, `/preventes/prix` et `/lancement` ne sont plus servies.
         Leur code est dans `archive/`, hors build (voir archive/preventes/README.md).

         ⚠️ TEMPORAIRES (307), et ce n'est pas une hésitation. Une 308 se grave
         dans le cache des navigateurs, parfois pour des mois : le jour où l'on
         voudrait rouvrir l'une de ces URL, tous les visiteurs déjà passés
         continueraient d'être renvoyés sur `/` sans qu'aucun déploiement n'y
         puisse rien. Ces trois lignes se retirent en dix secondes ; une 308 ne
         se retire pas du navigateur de quelqu'un d'autre.

         ⚠️ Pourquoi une redirection et pas un 410. Les mails déjà partis
         (W6, P1, P2) pointent sur /preventes, et 14 fondateurs peuvent rouvrir
         un vieux message n'importe quand. C'est l'argument que `lib/prevente.ts`
         oppose depuis le début au 404 : « une lectrice perdue pour rien ».
         Elles atterrissent sur l'Atelier, qui est ce qu'on vend aujourd'hui.

         ⚠️ `/preventes/prix` est écrit À PART. Une source `/preventes` ne
         couvre QUE ce chemin exact : sans cette seconde entrée, la page prix
         resterait en ligne toute seule, et personne ne s'en apercevrait — elle
         n'est liée que depuis /preventes.

         ⚠️ Ce qui n'est PAS redirigé, et ne doit pas l'être : `/merci` (les
         fondateurs y reviennent depuis leur mail de confirmation), les pages
         légales, `/ambassadeurs`, `/inviter`, et les routes d'API — les
         remboursements et les crédits de parrainage passent par là. */
      {
        source: "/preventes",
        destination: "/",
        permanent: false,
      },
      {
        source: "/preventes/prix",
        destination: "/",
        permanent: false,
      },
      {
        source: "/lancement",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
