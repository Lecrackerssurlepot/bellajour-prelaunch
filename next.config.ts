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
      {
        // Bascule 13 juin : la waitlist (/) ferme → tout part sur /preventes.
        // source: "/" matche UNIQUEMENT la racine exacte (pas /preventes, /merci,
        // /api/*, ni les assets). Next.js préserve automatiquement la query string
        // → /?ref=BJ-XXXX devient /preventes?ref=BJ-XXXX (parrainages préservés).
        // permanent: false → 307 temporaire (non mis en cache), retiré au lancement 15 août.
        source: "/",
        destination: "/preventes",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
