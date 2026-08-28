import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  /* ⚠️ Un motif qui ne commence pas par une double etoile suivie d'une barre
     ne matche QUE la racine. Or
     .claude/worktrees/ contient des copies du depot avec leur propre .next
     compile : `npx eslint .` analysait 753 fichiers et rendait plus de
     23 000 problemes, dont la quasi-totalite venait de code COMPILE. Les
     vrais defauts de src/ etaient noyes a 1 %, la commande mettait des
     minutes, et personne ne lance un lint dont la sortie est illisible. */
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/node_modules/**",
    ".claude/**",
    "next-env.d.ts",
    /* L'ancienne landing de prevente, rangee et non supprimee (voir
       archive/landing-waitlist/README.md). Rien ne l'importe : elle ne part
       dans aucun bundle. Elle portait 32 des 55 problemes du depot, dont TOUS
       les react-hooks/refs, exhaustive-deps et immutability. Corriger des
       regles de memoisation dans du code qu'aucun compilateur ne voit passer,
       c'est payer un travail pour un gain nul. */
    "archive/**",
  ]),

  /* `no-img-element` reproche d'appliquer la regle maison : ZERO next/image,
     <img> nu uniquement (CLAUDE.md). Elle produisait 155 des 174
     avertissements de src/ — c'est-a-dire tout le bruit. */
  {
    rules: { "@next/next/no-img-element": "off" },
  },
]);

export default eslintConfig;
