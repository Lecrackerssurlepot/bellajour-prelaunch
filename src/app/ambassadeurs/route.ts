import { NextResponse } from "next/server";

/* GET /ambassadeurs — la page de vente du Cercle Ambassadeur (Vague 1) est
   archivée depuis le 08/09/2026 (T-067) : décision de Mathias, programme
   clos le 01/09/2026, plus aucune inscription. Le code retiré vit dans
   `archive/ambassadeurs/` (voir son README) et revient par un `git mv` inverse.

   410 Gone, jamais 404 : le contenu a existé et son retrait est volontaire —
   c'est ce que 410 dit à Google, qui désindexe au lieu de réessayer un
   contenu simplement absent (même doctrine que `preventeFermee()` dans
   `@/lib/prevente`, appliquée à `/api/checkout`).

   Route Handler et non `page.tsx` : dans l'App Router, une page ne choisit
   pas son propre code de statut HTTP — seul un handler le peut. Ce fichier
   remplace donc l'ancien `page.tsx` à cet unique segment ; `/ambassadeurs/
   espace` et `/ambassadeurs/charte`, qui servent les ambassadeurs EXISTANTS,
   restent des pages ordinaires, inchangées.

   Contenu inline (pas d'import de `tokens.css` ni de composant React) : un
   handler n'entre jamais dans l'arbre de rendu ni le `layout.tsx` du
   segment, donc aucune police ni feuille de style du site ne s'y applique
   automatiquement. */

const HTML = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Cercle Ambassadeur — programme clos | Bellajour</title>
<style>
  html, body { margin: 0; padding: 0; }
  body {
    background: #f7f1e9;
    color: #1c1c1c;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 32px;
    box-sizing: border-box;
  }
  main { max-width: 440px; }
  h1 { font-size: 1.4rem; line-height: 1.3; margin: 0 0 12px; }
  p { line-height: 1.6; margin: 0 0 16px; color: #4a4a4a; }
  a { color: #4a90d9; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <main>
    <h1>Le Cercle Ambassadeur, Vague&nbsp;1, est clos</h1>
    <p>Ce programme n&rsquo;accepte plus de nouvelle inscription depuis le 1<sup>er</sup>&nbsp;septembre 2026.</p>
    <p>
      D&eacute;j&agrave; ambassadeur&nbsp;? <a href="/ambassadeurs/espace">Retrouvez votre espace</a>.<br>
      Sinon, direction <a href="/">l&rsquo;accueil</a>.
    </p>
  </main>
</body>
</html>`;

export async function GET() {
  return new NextResponse(HTML, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
