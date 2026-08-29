# Bellajour — où on va

## Ce qu'on vend
Un magazine photo personnalisé, en édition d'un exemplaire. La cliente dépose ses photos et
raconte son moment ; l'atelier compose ; on imprime et on livre. Trente à quarante-cinq euros
selon la pagination, livraison comprise, en France, Belgique et Luxembourg.

## La promesse
« Vivez. Nous composons. » La cliente ne fait pas de mise en page, ne choisit pas de gabarit,
ne trie pas ses photos. Elle raconte, on fabrique. C'est une maison d'édition, pas un outil.

## Ce que ça implique dans le code
- **Le silence est le pire défaut.** Ce produit tient sur des mails qui partent et des états qui
  avancent. Une variable oubliée, un mail sauté, une colonne non migrée : rien ne casse, tout se
  tait, et une cliente attend. Presque tous les incidents de ce projet sont de cette famille.
- **Chaque écran doit dire de qui c'est le tour.** Un dossier qui n'avance plus est un dossier
  dont personne ne sait qui l'attend.
- **On ne promet pas ce qu'on n'a pas mesuré.** Un grammage, un délai, une matière : s'ils ne
  sont pas vérifiés en amont, ils ne s'écrivent pas sur la page produit.
- **Premium ne veut pas dire solennel.** Le ton peut être drôle. Il n'est jamais mou.

## Qui fait quoi
Mathias décide et compose les numéros ; il n'est pas développeur. Louis a un accès à l'atelier.
Personne d'autre ne roule les migrations. Le développement est fait par Claude, sur des branches,
jamais directement en production.

## Ce qui est déjà vrai
Le site, le questionnaire, le dépôt, le back-office, les douze mails, Stripe et l'impression par
API sont branchés et ont tourné en vrai. L'état daté est dans `docs/reference/ETAT-PRODUCTION.md`.
