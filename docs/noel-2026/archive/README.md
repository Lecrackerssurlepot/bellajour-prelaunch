# Noël 2026 : les documents remplacés

Gardés pour l'histoire, jamais pour décider. Chacun a été remplacé le 16/11/2026.

| Fichier | Écrit le | Pourquoi il ne fait plus foi | Ce qui le remplace |
|---|---|---|---|
| `TARIFICATION.md` | 13/11 | ses prix de magazine (25 / 35 / 45 / 55 €) étaient faux, et ses options de carte ont été tranchées | `DECISIONS-16-11.md` et `src/lib/atelier/grille.ts` |
| `CA-PREVISION.md` | 13/11 | des scénarios bâtis sur ces faux prix (magazine moyen à 35 €) ; jamais des données | rien : à refaire sur les ventes réelles |
| `PARCOURS-ACHAT.md` | 13/11 | le parcours a été construit autrement (reliquat au compte et non sur le code, e-mail ET impression, pas d'ajout de carte au panier du magazine) | le tableau des lots de `DECISIONS-16-11.md` et le code de `/offrir`, `/carte`, `/numero` |
| `PROMPT-TOTAL.md` | 13/11 | le prompt unique pour lancer le chantier, lancé | le développement par lots sur `noel-2026` |
| `LOOP.md` | 13/11 | la liste de tâches du /loop, jamais tenue à jour après le 13/11 | l'état des lots de `DECISIONS-16-11.md` |

Le texte « Wording » de `PARCOURS-ACHAT.md` alimente encore `src/app/(atelier)/noel-preview/contenu.ts` : il sera relu au nouveau ton.
