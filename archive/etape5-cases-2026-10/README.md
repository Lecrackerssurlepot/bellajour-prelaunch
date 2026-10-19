# L'étape « À envoyer par le client » en cinq cases (13/10/2026 → 19/10/2026)

`FormulaireEdition-etape5.tsx` garde l'étape 5 du formulaire d'une édition telle qu'elle était au
commit 0e30902 (planche 5 du 19/10) : cinq cases à cocher figées (le logo, le programme, le mot du
dirigeant, la liste des participants, une rubrique), chacune disant sous elle le nom de la case
chez le client. La base n'acceptait que ces cinq types (`collectif_contenus.type`, migration
20261013).

Remplacée le 19/10/2026 au soir (T-191, planche 12 de
`docs/produit/collectif/maquettes/propositions-19-10/retours-19-10-soir.html`, validée par
Mathias) : « C'est nous qui mettons le nom et le type de fichier accepté, ou alors tout. » L'atelier
compose désormais des DEMANDES (un nom, une forme : images, PDF ou SVG, tout, ou le questionnaire
du « mot de… ») dans `src/app/admin/collectif/DemandesClient.tsx`, sur la règle pure
`src/lib/collectif/demandes.ts`. Les cinq clés d'origine restent lues telles quelles (demandes
« héritées ») : aucune édition existante ne change.

Hors du périmètre du build (`archive/` est exclu de `tsconfig.json` et d'ESLint, rien ne
l'importe). Les règles CSS `.eca-cases-effet` / `.eca-case-effet` sont restées dans
`collectif.css`, inutilisées.
