import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
