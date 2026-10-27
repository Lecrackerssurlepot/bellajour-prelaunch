import { fileURLToPath } from "node:url";

// Turbopack résout un chemin relatif depuis son propre dossier de build :
// le plugin local se donne donc en chemin absolu.
const survol = fileURLToPath(new URL("./postcss-survol.cjs", import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Le survol n'existe que pour une souris (voir postcss-survol.cjs).
    [survol]: {},
  },
};

export default config;
