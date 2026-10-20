# Les gabarits des mails de l'Édition collective, avant le 20/10/2026

Archivés le 20/10/2026, à la relecture de Mathias (« aligne les couleurs et les visuels », « dis plutôt
où elle peut retrouver les liens pour les envoyer depuis la plateforme »).

- `mailsRdv.ts` : l'ancienne mise en page propre aux trois mails de rendez-vous (lien « ouvrir mon
  espace » cuivre `#b56a45`, « Bonjour, » sans prénom). Les rendez-vous passent désormais par
  `pageMail` de `src/lib/collectif/mailsTextes.ts`.
- `mailsTextes.ts` : la version qui écrivait en clair le lien de l'équipe et celui des participants
  dans « Votre espace est prêt » et « Le lien des participants a changé » (variante « adresse en
  clair » des blocs, constante `ACTION_TEXTE`), et le fond crème `#f6f2ec`.

Rien ici n'est importé : ce sont des copies de lecture. Le code vivant est dans `src/lib/collectif/`.
