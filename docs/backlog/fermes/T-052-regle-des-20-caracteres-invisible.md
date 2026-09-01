---
id: T-052
titre: On refuse une histoire trop courte sans jamais dire qu'elle est trop courte
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/atelier/questionnaire.ts:38` — `MIN_HISTOIRE = 20`. Le message associé (`:104`) dit
« Racontez-nous ce moment, en une phrase au moins. » et `Screen2Histoire.tsx:16-22` n'affiche ni
compteur ni indication.
La règle réelle n'est donc écrite nulle part : ni avant la saisie, ni dans le refus. Quelqu'un qui
tape « Super week-end » (14 caractères) est refusé ; il réécrit « C'était génial » (14) et est
refusé à l'identique, **sans jamais savoir que c'est la longueur qu'on lui reproche**.
Le seuil a été calé sur un dossier réel de 35 caractères : la marge entre « passe » et « bloque »
est trop fine pour être devinée.
## Ce que je propose
Un compteur discret sous le champ, et un message de refus qui dit la règle. Ne pas remonter le
seuil (D14 : il bloquerait de vraies clientes), le rendre visible.
## Ce qui a été fait
**31/08/2026 — confirmé, corrigé.** Le seuil reste à 20 (D14), il devient VISIBLE :
- `questionnaire.ts` : le message de refus dit la règle — « Racontez-nous ce moment, en une
  phrase au moins — il en faut 20 caractères. C'est là-dessus que l'atelier compose. » Le nombre
  vient de `MIN_HISTOIRE` en gabarit, jamais recopié. Rien de l'ancien texte n'a été retiré.
- `Screen2Histoire.tsx` : compteur discret sous le champ (« 14 caractères — il en faut au
  moins 20. »), importé de `MIN_HISTOIRE`, affiché seulement entre 1 et 19 caractères, sans
  région live (une annonce par frappe serait du bruit). Style `.at-compte` dans composer.css,
  préfixé `.bj-atelier` (piège de la marge des <p>).
Vérifié au navigateur, 375 px et desktop : compteur sous le champ, refus explicite au clic,
compteur disparu à 20+. Harnais : TOUT PASSE (les 223 assertions ne figent pas ce message).
