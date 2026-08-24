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
    ];
  },
};

export default nextConfig;
