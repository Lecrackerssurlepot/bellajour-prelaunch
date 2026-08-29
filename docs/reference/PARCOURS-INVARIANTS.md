# Le parcours de la cliente — ce qui ne doit pas casser

Écrit le 29/08/2026, à la clôture du chantier « un dossier sans titre et sans photos ».

**À quoi sert ce fichier.** Une refonte d'architecture déplace des fichiers, fusionne des
modules, réécrit des textes jugés verbeux. Chacune des garanties ci-dessous a été payée par une
perte réelle, et **aucune ne se voit dans le code sans son histoire** : une phrase d'écran
ressemble à du style, une entrée en double dans un `Set` ressemble à une coquille, un `break`
ressemble à une optimisation. Ce document dit ce qu'on perd en les touchant.

Ce n'est pas un `CLAUDE.md` : il ne se charge pas tout seul. **Le lire avant tout déplacement de
fichier ou toute réécriture de texte dans le tunnel `/composer` → `/numero` → `/admin/atelier`.**

---

## Les onze garanties, et le fichier qui les porte

| # | Garantie | Porté par | Si on la casse |
|---|---|---|---|
| 1 | Les six champs sont exigés, écran **et** serveur | `lib/atelier/questionnaire.ts` | Un dossier arrive sans titre, l'atelier compose à l'aveugle |
| 2 | Une seule règle de validation, lue des deux côtés | idem + `api/atelier/numero` | L'écran dit « c'est bon », le serveur répond « non » |
| 3 | L'écran 4 annonce le dépôt à venir | `composer/screens/Screen4Contact.tsx` | La cliente croit avoir fini et part |
| 4 | L'écran 6 nomme ce qui est arrivé | `composer/screens/Screen6Fin.tsx` | Elle doute d'avoir réussi |
| 5 | M0 part à la seconde où le dossier existe | `api/atelier/numero` | 12 à 31 h de silence après avoir donné son adresse |
| 6 | Le filet M0 et le seuil de relance lisent la MÊME constante | `lib/atelier/mails.ts` | Fenêtre où l'accusé remplace la relance, qui ne part jamais |
| 7 | `consent_photos` est le SEUL signal de dépôt terminé | `lib/atelier/urgence.ts` | On compose sans le droit d'usage des photos |
| 8 | Le tag « dépôt non terminé » sur la ligne | `admin/atelier/Liste.tsx` | « Photos reçues » avec zéro photo se lit comme une demande complète |
| 9 | Les rebonds sont écoutés | `lib/atelier/rebond.ts` + `api/brevo/webhook` | Une adresse morte = un dossier mort, invisible |
| 10 | Le webhook ne ment pas sur son succès | `api/brevo/webhook` + `lib/atelier/evenements.ts` | Brevo ne réessaie pas, le rebond est perdu |
| 11 | La faute de frappe est attrapée avant l'envoi | `lib/atelier/questionnaire.ts` | Le rebond arrive quand même, en aval |

## Les cinq pièges qui ressemblent à du ménage

Ce sont les endroits où une simplification de bonne foi casse quelque chose sans bruit.

1. **`REBONDS` contient `invalid` ET `invalidemail`.** Ce n'est pas un doublon : on s'abonne à la
   première graphie, la documentation de Brevo nomme la seconde, et rien ne dit laquelle arrive.
   Un `invalid` non reconnu est classé « ignore » — silence total. (T-036)
2. **Le filet M0 se termine par un `break`.** Sa borne DOIT rester égale à `DELAI_RELANCE_DEPOT`.
   Plus large, un dossier entre les deux part avec l'accusé et n'atteint jamais la relance. (D16)
3. **`logEvenement` rend `true`/`false` et le webhook le LIT.** La fonction ne lève jamais
   d'exception : ignorer sa valeur, c'est répondre 200 sur une écriture ratée, et un webhook ne
   réessaie que sur un code d'erreur. (T-038)
4. **`suggestionEmail` mesure en Damerau, plafond à UN caractère.** Levenshtein rate `gmial.com`
   (l'inversion de deux lettres y compte pour deux) ; un plafond à deux « corrige » `free.fr` en
   `live.fr`. Les deux erreurs sont silencieuses et opposées. (D17)
5. **`sante.ts` exclut volontairement le dépôt non terminé des « oubliés ».** Ça ressemble à un
   oubli, c'est une correction du 25/08 : la balle est chez la cliente, et une page santé qui
   crie pour rien cesse d'être crue.

## Comment prouver que rien n'est cassé

```bash
npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts
```

**223 assertions, sans base ni réseau.** Elles couvrent les garanties 1, 2, 6, 9 et 11 et les
pièges 1, 2 et 4. Une refonte qui les casse le dit tout de suite. ⚠️ Les garanties 3, 4, 8 et 10
ne sont PAS couvertes : ce sont du texte d'écran, un affichage et un code HTTP. Elles se
vérifient à l'œil (`docs/reference/RECETTE-VISUELLE.md`) et par un appel au webhook.

## D'où tout ça vient

Un dossier réel, le 27/08/2026 : occasion et histoire remplies, **aucun titre, aucune photo**.
Rien n'avait échoué — c'était le comportement normal. La cliente avait très probablement cru sa
demande terminée, et personne des deux côtés n'avait de quoi s'en apercevoir.

Le récit complet et les arbitrages : `docs/DECISIONS.md`, **D14 à D17**. L'état daté du système :
`docs/reference/ETAT-PRODUCTION.md`. Les tickets fermés au passage : `docs/backlog/fermes/`
(T-036, T-038, T-039).
