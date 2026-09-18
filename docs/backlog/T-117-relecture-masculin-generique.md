---
id: T-117
titre: Des féminins résiduels subsistent dans le visible, contraires à la règle du masculin générique
etat: nouveau
domaine: contenu
gravite: confort
autonomie: avis-requis
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Relire tout le visible (pages, mails, back-office, docx légaux) pour traquer les féminins
résiduels contraires à la règle du masculin générique. Deux coquilles trouvées le 18/09
(« prévenue » sur /numero état payée, PR #165, et deux alertes admin, PR #166) laissent penser
qu'il en reste d'autres. »

## Ce que j'ai vérifié
(rien encore)

Ce qu'on sait déjà au moment d'ouvrir : la règle vient de la PR #25 (fondateur, le client, il ;
codes Stripe `FONDATEUR-`). Les deux coquilles du 18/09 étaient réelles et sont corrigées en
production. Les commentaires de code, les identifiants (`fondatrice.ts`, `CREDIT_FONDATRICE`) et
la doc interne parlent encore « de la cliente » : ce n'est pas du visible, hors périmètre.

## Ce que je propose
Un inventaire avant toute correction, par surface, avec chemin et ligne pour chaque occurrence :
1. **Pages** : `src/app/**` hors commentaires (grep des formes en `-ée`, `-euse`, `-trice`,
   « elle », « la cliente », « fondatrice », « chère », « vous êtes … » accordé). Correction libre.
2. **Back-office** : `src/app/admin/**`, mêmes formes. Correction libre.
3. **Mails** : les sujets et corps M0 à M10 dans `src/lib/atelier/mails.ts` ET les templates
   réellement poussés chez Brevo (l'API dit ce qui est en ligne, pas le dépôt). Une correction
   suppose de repousser un template : **accord de Mathias**, jamais de `--pousser` par Claude.
4. **Docx légaux** : CGV v4.0 FR/PT/EN, remboursement, mentions, livraison, dans `legal-source/`
   et `src/app/legal/content/`. Texte légal : **accord de Mathias** avant tout changement.
Livrer l'inventaire d'abord ; corriger 1 et 2 dans une PR ; soumettre 3 et 4 à Mathias avec le
mot avant et le mot après, occurrence par occurrence.

## Ce qui a été fait
(rien encore)
